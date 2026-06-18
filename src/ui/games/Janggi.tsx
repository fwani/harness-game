import { useState } from "react";
import {
  WIDTH,
  HEIGHT,
  legalMovesFrom,
  isInCheck,
  type Side,
  type Pos,
} from "../../domain/janggi";
import { startGame, applyMove, type JanggiState } from "../../application/playJanggi";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";
import {
  pieceGlyph,
  sideMark,
  pieceName,
  pieceAriaLabel,
  capturedPieces,
} from "./janggiView";
import {
  isCpuTurn,
  chooseCpuJanggiMove,
  noMovesOutcome,
  janggiOutcome,
  janggiWinSide,
  HUMAN_SIDE,
} from "./janggiCpuView";

const SIDE_LABEL: Record<Side, string> = { cho: "초(楚)", han: "한(漢)" };

/** 따낸 기물이 속했던(잃은) 진영 = 잡은 진영의 반대. */
const lostSideOf = (capturer: Side): Side => (capturer === "cho" ? "han" : "cho");

type Mode = "local" | "cpu";

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

export function Janggi() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<JanggiState>(() => startGame());
  const [selected, setSelected] = useState<Pos | null>(null);
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    WIDTH,
    HEIGHT,
  );
  // 직전 수(from→to) 칸 강조용. 상대(또는 CPU)가 무엇을 두고 잡았는지 인지하게 한다.
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);

  // 선택한 기물이 갈 수 있는 합법 수(현재 차례 기준).
  const targets: Pos[] =
    selected === null ? [] : legalMovesFrom(state.board, state.next, selected);

  const isTarget = (x: number, y: number) =>
    targets.some((t) => t.x === x && t.y === y);

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(초=a/한=b, 빅장 무승부=draw).
  const recordIfFinished = (prev: JanggiState, next: JanggiState) => {
    if (!next.finished || prev.finished) {
      return;
    }
    const [labelA, labelB] = mode === "cpu" ? ["나", "CPU"] : ["초", "한"];
    recordGame("janggi", labelA, labelB, janggiWinSide(next));
  };

  const click = (x: number, y: number) => {
    focusOn(x, y);
    if (state.finished) {
      return;
    }
    // vs CPU: 사람(초) 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.next !== HUMAN_SIDE) {
      return;
    }
    const piece = state.board[y]![x]!;
    // 선택된 기물이 있고 클릭 칸이 합법 수면 이동한다.
    if (selected && isTarget(x, y)) {
      let next = applyMove(state, selected, { x, y });
      let nextLast = { from: selected, to: { x, y } };
      // vs CPU: 사람 수로 끝나지 않았다면 CPU(한)가 곧바로 한 수 둔다.
      if (mode === "cpu" && isCpuTurn(next)) {
        const cpuMove = chooseCpuJanggiMove(next, rng);
        if (cpuMove === null) {
          // CPU가 둘 수 없으면(합법 수 없음) 사람 승리로 종료.
          next = noMovesOutcome(next);
        } else {
          next = applyMove(next, cpuMove.from, cpuMove.to);
          nextLast = cpuMove;
        }
      }
      setState(next);
      setSelected(null);
      setLastMove(nextLast);
      recordIfFinished(state, next);
      return;
    }
    // 현재 차례의 기물을 클릭하면 선택(토글).
    if (piece && piece.side === state.next) {
      setSelected(selected && selected.x === x && selected.y === y ? null : { x, y });
      return;
    }
    setSelected(null);
  };

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    setState(startGame());
    setSelected(null);
    setLastMove(null);
  };

  const reset = () => {
    setState(startGame());
    setSelected(null);
    setLastMove(null);
  };

  const inCheck = !state.finished && isInCheck(state.board, state.next);
  const outcome = janggiOutcome(state, mode);

  // 진행 중 턴 안내 문구(차례 + vs CPU 보조 안내).
  const turnHint =
    `${SIDE_LABEL[state.next]} 차례 — 기물을 누르면 갈 수 있는 곳이 표시됩니다.` +
    (mode === "cpu" ? " · 한(漢)은 CPU가 자동으로 둡니다." : "");

  // 따냄 현황(보드만으로 도출). captured[side] = 그 진영이 잡은 상대 기물 집계.
  const captured = capturedPieces(state.board);
  const isLastMove = (x: number, y: number) =>
    lastMove !== null &&
    ((lastMove.from.x === x && lastMove.from.y === y) ||
      (lastMove.to.x === x && lastMove.to.y === y));

  // 한 진영의 따냄 목록을 글자+텍스트(색 비의존)로 렌더한다. 비어 있으면 "없음".
  const renderCaptures = (side: Side) => {
    const list = captured[side];
    const lost = lostSideOf(side);
    if (list.length === 0) {
      return <span className="janggi-captures-empty">없음</span>;
    }
    return list.map((c) => (
      <span key={c.type} className="janggi-captured-item">
        <span
          className={`piece ${lost} legend-mark`}
          aria-hidden="true"
        >
          {pieceGlyph(c.type, lost)}
        </span>
        <span className="janggi-captured-name">
          {pieceName(c.type, lost)}×{c.count}
        </span>
      </span>
    ));
  };

  return (
    <section className="game">
      <h2>장기 ({mode === "cpu" ? "vs CPU" : "2인"})</h2>
      <div className="controls" role="group" aria-label="모드 선택">
        <button
          className={mode === "local" ? "primary" : ""}
          onClick={() => switchMode("local")}
          aria-pressed={mode === "local"}
        >
          2인 로컬
        </button>
        <button
          className={mode === "cpu" ? "primary" : ""}
          onClick={() => switchMode("cpu")}
          aria-pressed={mode === "cpu"}
        >
          vs CPU
        </button>
      </div>
      {outcome.finished ? (
        <p className="outcome">
          종료 · <strong>{outcome.text}</strong>
        </p>
      ) : (
        <p className="hint">
          {turnHint}
          {inCheck ? " · 장군! (장군을 푸는 수만 둘 수 있습니다)" : ""}
        </p>
      )}
      <p className="hint janggi-legend">
        진영 구분(색에 의존하지 않음):{" "}
        <span className="piece cho legend-mark" aria-hidden="true">
          {sideMark("cho")}
        </span>{" "}
        초(楚)는 원형·이체자(俥砲傌像仕),{" "}
        <span className="piece han legend-mark" aria-hidden="true">
          {sideMark("han")}
        </span>{" "}
        한(漢)은 각형·정자(車包馬象士).
        {mode === "cpu" ? " 사람은 초(楚), CPU는 한(漢)입니다." : ""}
      </p>
      <div className="hint janggi-captures" role="status" aria-live="polite">
        <span className="janggi-captures-row">
          <strong>{SIDE_LABEL.cho} 따냄:</strong> {renderCaptures("cho")}
        </span>
        <span className="janggi-captures-row">
          <strong>{SIDE_LABEL.han} 따냄:</strong> {renderCaptures("han")}
        </span>
      </div>
      <div
        className="board janggi"
        style={boardGridStyle(WIDTH)}
        role="grid"
        aria-label="장기 보드 (방향 키로 칸 이동, Enter/Space로 선택·이동)"
        onKeyDown={onKeyDown}
      >
        {state.board.map((row, y) =>
          row.map((piece, x) => {
            const sel = selected && selected.x === x && selected.y === y;
            const cls = [
              "cell",
              "janggi-cell",
              sel ? "selected" : "",
              isTarget(x, y) ? "target" : "",
              isLastMove(x, y) ? "last-move" : "",
            ]
              .filter(Boolean)
              .join(" ");
            // vs CPU에서 CPU(한) 차례면 사람 입력을 막는다(종료 시에도 비활성).
            const blocked =
              state.finished || (mode === "cpu" && state.next !== HUMAN_SIDE);
            return (
              <button
                key={`${x},${y}`}
                ref={setCellRef(x, y)}
                className={cls}
                role="gridcell"
                tabIndex={tabIndexFor(x, y)}
                onClick={() => click(x, y)}
                aria-disabled={blocked}
              >
                {piece && (
                  <span
                    className={`piece ${piece.side}`}
                    aria-label={pieceAriaLabel(piece.type, piece.side)}
                    title={pieceAriaLabel(piece.type, piece.side)}
                  >
                    {pieceGlyph(piece.type, piece.side)}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
      <button className="primary" onClick={reset}>
        새 게임
      </button>
    </section>
  );
}

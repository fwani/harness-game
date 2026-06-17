import { useState } from "react";
import {
  WIDTH,
  legalMovesFrom,
  isInCheck,
  type Side,
  type Pos,
} from "../../domain/janggi";
import { startGame, applyMove, type JanggiState } from "../../application/playJanggi";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";
import {
  pieceGlyph,
  sideMark,
  pieceName,
  pieceAriaLabel,
  capturedPieces,
} from "./janggiView";

const SIDE_LABEL: Record<Side, string> = { cho: "초(楚)", han: "한(漢)" };

/** 따낸 기물이 속했던(잃은) 진영 = 잡은 진영의 반대. */
const lostSideOf = (capturer: Side): Side => (capturer === "cho" ? "han" : "cho");

export function Janggi() {
  const [state, setState] = useState<JanggiState>(() => startGame());
  const [selected, setSelected] = useState<Pos | null>(null);
  // 직전 수(from→to) 칸 강조용. 2인 핫시트에서 상대가 무엇을 두고 잡았는지 인지하게 한다.
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);

  // 선택한 기물이 갈 수 있는 합법 수(현재 차례 기준).
  const targets: Pos[] =
    selected === null ? [] : legalMovesFrom(state.board, state.next, selected);

  const isTarget = (x: number, y: number) =>
    targets.some((t) => t.x === x && t.y === y);

  const click = (x: number, y: number) => {
    if (state.finished) {
      return;
    }
    const piece = state.board[y]![x]!;
    // 선택된 기물이 있고 클릭 칸이 합법 수면 이동한다.
    if (selected && isTarget(x, y)) {
      const next = applyMove(state, selected, { x, y });
      setState(next);
      setSelected(null);
      setLastMove({ from: selected, to: { x, y } });
      if (next.finished && next.winner !== null) {
        recordGame("janggi", "초", "한", next.winner === "cho" ? "a" : "b");
      }
      return;
    }
    // 현재 차례의 기물을 클릭하면 선택(토글).
    if (piece && piece.side === state.next) {
      setSelected(selected && selected.x === x && selected.y === y ? null : { x, y });
      return;
    }
    setSelected(null);
  };

  const reset = () => {
    setState(startGame());
    setSelected(null);
    setLastMove(null);
  };

  const inCheck = !state.finished && isInCheck(state.board, state.next);

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
      <h2>장기 (2인)</h2>
      <p className="hint">
        {state.finished
          ? state.endReason === "bikjang"
            ? "무승부 (빅장 — 장군 마주보기)"
            : `${SIDE_LABEL[state.winner!]} 승리! 🎉 ${
                state.endReason === "checkmate"
                  ? "(외통수(체크메이트)로 승리)"
                  : "(상대 장 포획)"
              }`
          : `${SIDE_LABEL[state.next]} 차례 — 기물을 누르면 갈 수 있는 곳이 표시됩니다.`}
        {inCheck ? " · 장군! (장군을 푸는 수만 둘 수 있습니다)" : ""}
      </p>
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
            return (
              <button
                key={`${x},${y}`}
                className={cls}
                onClick={() => click(x, y)}
                disabled={state.finished}
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

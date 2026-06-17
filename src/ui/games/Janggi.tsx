import { useState } from "react";
import {
  WIDTH,
  legalMovesFrom,
  isInCheck,
  type PieceType,
  type Side,
  type Pos,
} from "../../domain/janggi";
import { startGame, applyMove, type JanggiState } from "../../application/playJanggi";
import { recordGame } from "../records";

// [cho 쪽 한자, han 쪽 한자]
const GLYPH: Record<PieceType, [string, string]> = {
  general: ["楚", "漢"],
  guard: ["士", "士"],
  elephant: ["象", "象"],
  horse: ["馬", "馬"],
  chariot: ["車", "車"],
  cannon: ["包", "包"],
  soldier: ["卒", "兵"],
};

function glyph(type: PieceType, side: Side): string {
  return GLYPH[type][side === "cho" ? 0 : 1];
}

const SIDE_LABEL: Record<Side, string> = { cho: "초(楚)", han: "한(漢)" };

export function Janggi() {
  const [state, setState] = useState<JanggiState>(() => startGame());
  const [selected, setSelected] = useState<Pos | null>(null);

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
  };

  const inCheck = !state.finished && isInCheck(state.board, state.next);

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
        {inCheck ? " · 장군!" : ""}
      </p>
      <div
        className="board janggi"
        style={{ gridTemplateColumns: `repeat(${WIDTH}, 1fr)` }}
      >
        {state.board.map((row, y) =>
          row.map((piece, x) => {
            const sel = selected && selected.x === x && selected.y === y;
            const cls = [
              "cell",
              "janggi-cell",
              sel ? "selected" : "",
              isTarget(x, y) ? "target" : "",
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
                  <span className={`piece ${piece.side}`}>
                    {glyph(piece.type, piece.side)}
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

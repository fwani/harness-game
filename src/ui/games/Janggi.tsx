import {
  createInitialBoard,
  WIDTH,
  type PieceType,
  type Side,
} from "../../domain/janggi";

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

const board = createInitialBoard();

export function Janggi() {
  return (
    <section className="game">
      <h2>장기</h2>
      <p className="hint">초기 배치(위: 한 漢, 아래: 초 楚). 이동 규칙은 아직 미구현 — 보기 전용입니다.</p>
      <div
        className="board janggi"
        style={{ gridTemplateColumns: `repeat(${WIDTH}, 1fr)` }}
      >
        {board.map((row, y) =>
          row.map((piece, x) => (
            <div key={`${x},${y}`} className="cell janggi-cell">
              {piece && (
                <span className={`piece ${piece.side}`}>
                  {glyph(piece.type, piece.side)}
                </span>
              )}
            </div>
          )),
        )}
      </div>
    </section>
  );
}

import { useState } from "react";
import {
  startReversiGame,
  applyReversiTurn,
  reversiResult,
  type ReversiState,
} from "../../application/playReversi";
import { countReversiDiscs } from "../../domain/reversiScore";
import { recordGame } from "../records";
import { moveKey, legalMoveKeySet, reversiWinSide } from "./reversiView";
import { boardGridStyle } from "./boardView";

const SIZE = 8;

const STONE = { black: "●", white: "○" } as const;
const LABEL = { black: "흑", white: "백" } as const;

export function Reversi() {
  const [state, setState] = useState<ReversiState>(() => startReversiGame());

  // 현재 차례의 합법 수만 클릭 가능하게 한다(불법 수는 애초에 비활성). 합법 수 열거·계가·승자
  // 판정은 application/domain에 위임하고 UI에서 규칙을 재구현하지 않는다.
  const legal = state.finished
    ? new Set<string>()
    : legalMoveKeySet(state.board, state.next);

  const place = (x: number, y: number) => {
    if (state.finished || !legal.has(moveKey(x, y))) {
      return;
    }
    const next = applyReversiTurn(state, x, y);
    setState(next);
    // 이번 착수로 막 종료됐다면 전적에 결과를 기록한다(종료 전환 시 1회).
    if (next.finished && !state.finished) {
      const result = reversiResult(next);
      if (result !== null) {
        recordGame("reversi", LABEL.black, LABEL.white, reversiWinSide(result));
      }
    }
  };

  const reset = () => setState(startReversiGame());

  const discs = countReversiDiscs(state.board);
  const result = reversiResult(state);
  const winnerLabel =
    result === null
      ? null
      : result === "draw"
        ? "무승부"
        : `${LABEL[result]} 승리! 🎉`;

  return (
    <section className="game">
      <h2>
        오델로 ({SIZE}×{SIZE})
      </h2>
      <p className="hint">
        하이라이트된 합법 수 칸만 둘 수 있습니다 · ●(흑) 선공 / ○(백) 후공 ·
        한쪽이 둘 곳이 없으면 자동으로 차례가 넘어갑니다.
      </p>
      {state.finished ? (
        <p className="outcome">
          종료 · 흑 {discs.black} / 백 {discs.white} ·{" "}
          <strong>{winnerLabel}</strong>
        </p>
      ) : (
        <p className="hint">
          {STONE[state.next]} {LABEL[state.next]} 차례 · 흑 {discs.black} / 백{" "}
          {discs.white}
          {state.lastWasPass
            ? ` · 상대가 둘 곳이 없어 ${LABEL[state.next]}이(가) 연속해서 둡니다(패스)`
            : ""}
        </p>
      )}
      <div
        className="board reversi"
        style={boardGridStyle(SIZE)}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => {
            const playable = !state.finished && legal.has(moveKey(x, y));
            return (
              <button
                key={moveKey(x, y)}
                className={playable ? "cell legal" : "cell"}
                onClick={() => place(x, y)}
                disabled={!playable}
                aria-label={
                  cell
                    ? `${x + 1}열 ${y + 1}행 ${LABEL[cell]}`
                    : `${x + 1}열 ${y + 1}행 ${playable ? "둘 수 있음" : "빈 칸"}`
                }
              >
                {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
              </button>
            );
          }),
        )}
      </div>
      <div className="controls">
        <button className="primary" onClick={reset}>
          새 게임
        </button>
      </div>
    </section>
  );
}

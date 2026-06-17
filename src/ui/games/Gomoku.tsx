import { useState } from "react";
import { startGame, applyMove, type GomokuState } from "../../application/playGomoku";
import { isBoardFull, type Stone } from "../../domain/gomoku";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame, type WinSide } from "../records";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";
import { chooseCpuGomokuMove } from "./gomokuCpuView";

const SIZE = 15;

const STONE = { black: "●", white: "○" } as const;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

/** 게임이 끝났는지: 5목 승자가 있거나 빈 칸이 없으면(무승부) 종료. */
function isOver(state: GomokuState): boolean {
  return state.winner !== null || isBoardFull(state.board);
}

export function Gomoku() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<GomokuState>(() => startGame(SIZE));
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    SIZE,
    SIZE,
  );

  // 모드별 플레이어 라벨. vs CPU에서는 사람(흑)="나" / CPU(백)="CPU".
  const label = (stone: Stone): string =>
    mode === "cpu"
      ? stone === "black"
        ? "나"
        : "CPU"
      : stone === "black"
        ? "흑"
        : "백";

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(승자 흑=a/백=b, 빈칸 소진 무승부=draw).
  const recordIfFinished = (prev: GomokuState, next: GomokuState) => {
    if (!isOver(next) || isOver(prev)) {
      return;
    }
    const win: WinSide =
      next.winner === null ? "draw" : next.winner === "black" ? "a" : "b";
    recordGame("gomoku", label("black"), label("white"), win);
  };

  const place = (x: number, y: number) => {
    focusOn(x, y);
    if (isOver(state) || state.board[y]![x] !== null) {
      return;
    }
    // vs CPU: 사람(흑) 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.next !== "black") {
      return;
    }

    let next = applyMove(state, x, y);
    // vs CPU: 사람 수로 끝나지 않았다면 CPU(백)가 곧바로 한 수 둔다.
    if (mode === "cpu" && !isOver(next)) {
      const cpuMove = chooseCpuGomokuMove(next.board, rng);
      if (cpuMove !== null) {
        next = applyMove(next, cpuMove.x, cpuMove.y);
      }
    }

    setState(next);
    recordIfFinished(state, next);
  };

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    setState(startGame(SIZE));
  };

  const reset = () => setState(startGame(SIZE));

  const over = isOver(state);
  const draw = over && state.winner === null;
  const outcome = !over
    ? null
    : draw
      ? "무승부! 🤝"
      : `${label(state.winner!)} 승리! 🎉`;

  return (
    <section className="game">
      <h2>오목 ({mode === "cpu" ? "vs CPU" : "2인"})</h2>
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
      {over ? (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      ) : (
        <p className="hint">
          {STONE[state.next]} {label(state.next)} 차례
          {mode === "cpu" ? " · 백(○)은 CPU가 자동으로 둡니다" : ""}
        </p>
      )}
      <div
        className="board"
        style={boardGridStyle(SIZE)}
        role="grid"
        aria-label="오목 보드 (방향 키로 칸 이동, Enter/Space로 착수)"
        onKeyDown={onKeyDown}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => {
            const blocked =
              over || cell !== null || (mode === "cpu" && state.next !== "black");
            return (
              <button
                key={`${x},${y}`}
                ref={setCellRef(x, y)}
                className="cell"
                role="gridcell"
                tabIndex={tabIndexFor(x, y)}
                onClick={() => place(x, y)}
                aria-disabled={blocked}
                aria-label={
                  cell
                    ? `${x + 1}열 ${y + 1}행 ${label(cell)}`
                    : `${x + 1}열 ${y + 1}행 빈 칸`
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

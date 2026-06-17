import { useState } from "react";
import { createTicTacToeBoard, type Board, type Mark } from "../../domain/ticTacToe";
import { playTicTacToeMove, type TicTacToeMoveResult } from "../../application/playTicTacToe";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";
import { chooseCpuTicTacToeMove } from "./ticTacToeCpuView";

// 사람=X(선), CPU=O(후). 색만이 아니라 기호(X/O)로 구분한다.
const HUMAN: Mark = "X";
const CPU: Mark = "O";

/** 3×3 보드. 한 칸 폭을 키워 작은 보드도 충분히 크게 보이도록 한다. */
const SIZE = 3;
const CELL_PX = 72;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

/** 화면 상태: 현재 보드 + 마지막 진행의 승패/무승부 판정. */
interface ViewState {
  board: Board;
  winner: Mark | null;
  draw: boolean;
  over: boolean;
}

function initialState(): ViewState {
  return { board: createTicTacToeBoard(), winner: null, draw: false, over: false };
}

const label = (mark: Mark): string => (mark === HUMAN ? "나(X)" : "CPU(O)");

export function TicTacToe() {
  const [state, setState] = useState<ViewState>(initialState);

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(사람=a, CPU=b, 무승부=draw).
  const recordResult = (result: TicTacToeMoveResult) => {
    if (!result.over) {
      return;
    }
    const win = result.winner === null ? "draw" : result.winner === HUMAN ? "a" : "b";
    recordGame("tictactoe", label(HUMAN), label(CPU), win);
  };

  const place = (row: number, col: number) => {
    if (state.over || state.board[row]![col] !== null) {
      return;
    }
    // 사람(X) 착수.
    let result = playTicTacToeMove(state.board, row, col, HUMAN);
    // 사람 수로 끝나지 않았다면 CPU(O)가 곧바로 한 수 둔다.
    if (!result.over) {
      const cpuMove = chooseCpuTicTacToeMove(result.board, rng);
      if (cpuMove !== null) {
        result = playTicTacToeMove(result.board, cpuMove.row, cpuMove.col, CPU);
      }
    }
    setState({
      board: result.board,
      winner: result.winner,
      draw: result.draw,
      over: result.over,
    });
    recordResult(result);
  };

  const reset = () => setState(initialState());

  const outcome = !state.over
    ? null
    : state.draw
      ? "무승부! 🤝"
      : `${label(state.winner!)} 승리! 🎉`;

  return (
    <section className="game">
      <h2>틱택토 (vs CPU)</h2>
      {state.over ? (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      ) : (
        <p className="hint">
          빈 칸을 눌러 두세요 · 당신은 <strong>X</strong>(선), CPU는 <strong>O</strong>입니다
        </p>
      )}
      <div className="board tictactoe" style={boardGridStyle(SIZE, CELL_PX)}>
        {state.board.map((cells, row) =>
          cells.map((cell, col) => {
            const blocked = state.over || cell !== null;
            return (
              <button
                key={`${row},${col}`}
                className="cell"
                onClick={() => place(row, col)}
                disabled={blocked}
                aria-label={
                  cell
                    ? `${row + 1}행 ${col + 1}열 ${cell}`
                    : `${row + 1}행 ${col + 1}열 빈 칸`
                }
              >
                {cell && <span className={`ttt-mark mark-${cell}`}>{cell}</span>}
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

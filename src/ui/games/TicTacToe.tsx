import { useState } from "react";
import { createTicTacToeBoard, type Board, type Mark } from "../../domain/ticTacToe";
import { playTicTacToeMove, type TicTacToeMoveResult } from "../../application/playTicTacToe";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";
import { chooseCpuTicTacToeMove } from "./ticTacToeCpuView";
import {
  DEFAULT_TICTACTOE_HUMAN_FIRST,
  ticTacToeFirstPlayerOptions,
} from "./ticTacToeStartOptionsView";

// 마크는 X/O. 색이 아니라 기호(X/O)로 구분한다. vs CPU에서 humanFirst=true면 사람이 X(선공),
// false면 사람이 O(후공)이고 CPU가 X로 시작과 동시에 첫 수를 선착한다. 도메인은 항상 X→O가
// 아니라 "둔 사람이 누구냐"만 보므로 진영 선택은 사람/CPU의 마크 매핑만 바꾼다(도메인 변경 없음).
const FIRST_OPTIONS = ticTacToeFirstPlayerOptions();

/** 3×3 보드. 한 칸 폭을 키워 작은 보드도 충분히 크게 보이도록 한다. */
const SIZE = 3;
const CELL_PX = 72;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

/** humanFirst에 따른 사람/CPU 마크 매핑(X 선공이면 사람=X·CPU=O, O 후공이면 사람=O·CPU=X). */
function marks(humanFirst: boolean): { human: Mark; cpu: Mark } {
  return humanFirst ? { human: "X", cpu: "O" } : { human: "O", cpu: "X" };
}

/** 화면 상태: 현재 보드 + 마지막 진행의 승패/무승부 판정. */
interface ViewState {
  board: Board;
  winner: Mark | null;
  draw: boolean;
  over: boolean;
}

/**
 * humanFirst 옵션에 맞는 시작 상태를 만든다. 사람이 O(후공)이면 CPU(X)가 첫 수를 선착한 보드에서
 * 사람 차례로 시작한다(한 수만 둔 보드는 절대 종료되지 않으므로 over=false).
 */
function startState(humanFirst: boolean): ViewState {
  const { cpu } = marks(humanFirst);
  let board = createTicTacToeBoard();
  if (!humanFirst) {
    const cpuMove = chooseCpuTicTacToeMove(board, rng);
    if (cpuMove !== null) {
      board = playTicTacToeMove(board, cpuMove.row, cpuMove.col, cpu).board;
    }
  }
  return { board, winner: null, draw: false, over: false };
}

export function TicTacToe() {
  const [humanFirst, setHumanFirst] = useState(DEFAULT_TICTACTOE_HUMAN_FIRST);
  const [state, setState] = useState<ViewState>(() =>
    startState(DEFAULT_TICTACTOE_HUMAN_FIRST),
  );

  const { human, cpu } = marks(humanFirst);
  const label = (mark: Mark): string =>
    mark === human ? `나(${human})` : `CPU(${cpu})`;

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(사람=a, CPU=b, 무승부=draw). 집계 키는 진영(X/O)과
  // 무관하게 안정적으로 유지해 진영을 바꿔도 같은 게임(tictactoe)으로 묶인다.
  const recordResult = (result: TicTacToeMoveResult) => {
    if (!result.over) {
      return;
    }
    const win = result.winner === null ? "draw" : result.winner === human ? "a" : "b";
    recordGame("tictactoe", label(human), label(cpu), win);
  };

  const place = (row: number, col: number) => {
    if (state.over || state.board[row]![col] !== null) {
      return;
    }
    // 사람 착수.
    let result = playTicTacToeMove(state.board, row, col, human);
    // 사람 수로 끝나지 않았다면 CPU가 곧바로 한 수 둔다.
    if (!result.over) {
      const cpuMove = chooseCpuTicTacToeMove(result.board, rng);
      if (cpuMove !== null) {
        result = playTicTacToeMove(result.board, cpuMove.row, cpuMove.col, cpu);
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

  const reset = () => setState(startState(humanFirst));

  // 선공/후공 선택. 진행 중 판은 그 옵션으로 새 게임을 리셋한다(O 후공이면 CPU가 선착).
  const changeHumanFirst = (next: boolean) => {
    if (next === humanFirst) {
      return;
    }
    setHumanFirst(next);
    setState(startState(next));
  };

  const outcome = !state.over
    ? null
    : state.draw
      ? "무승부! 🤝"
      : `${label(state.winner!)} 승리! 🎉`;

  return (
    <section className="game">
      <h2>틱택토 (vs CPU)</h2>
      <div className="controls" role="group" aria-label="선공·후공 선택">
        {FIRST_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            className={humanFirst === opt.value ? "primary" : ""}
            aria-pressed={humanFirst === opt.value}
            onClick={() => changeHumanFirst(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {state.over ? (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          빈 칸을 눌러 두세요 · 당신은 <strong>{human}</strong>, CPU는{" "}
          <strong>{cpu}</strong>입니다
          {humanFirst ? "" : " · CPU(X)가 먼저 한 수를 두었습니다"}
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

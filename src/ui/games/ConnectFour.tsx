import { useState } from "react";
import {
  createConnectFourBoard,
  isColumnFull,
  type Board,
  type Cell,
  type Player,
} from "../../domain/connectFour";
import { playConnectFourMove } from "../../application/playConnectFour";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame, type WinSide } from "../records";
import { boardGridStyle } from "./boardView";
import { chooseCpuConnectFourColumn } from "./connectFourCpuView";

const COLS = 7;

// 색만으로 1·2를 구분하지 않도록 기호(●/○)도 다르게 쓴다(채움 vs 테두리 = 색 비의존).
const DISC = { 1: "●", 2: "○" } as const;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

// vs CPU 모드: 사람은 1(선공·●), CPU는 2(후공·○).
const HUMAN: Player = 1;
const CPU: Player = 2;

/** 화면 상태: 보드 + 다음 차례 + 종료 판정(application 결과를 그대로 보관). */
interface UiState {
  board: Board;
  next: Player;
  winner: Player | null;
  draw: boolean;
  over: boolean;
}

function freshState(): UiState {
  return { board: createConnectFourBoard(), next: 1, winner: null, draw: false, over: false };
}

const other = (p: Player): Player => (p === 1 ? 2 : 1);

export function ConnectFour() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<UiState>(freshState);

  // 모드별 플레이어 라벨. vs CPU에서는 사람(1)="나" / CPU(2)="CPU".
  const label = (p: Player): string =>
    mode === "cpu" ? (p === HUMAN ? "나" : "CPU") : p === 1 ? "1P(●)" : "2P(○)";

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(승자 1=a/2=b, 보드 가득 무승부=draw).
  const recordIfFinished = (prev: UiState, next: UiState) => {
    if (!next.over || prev.over) {
      return;
    }
    const win: WinSide = next.winner === null ? "draw" : next.winner === 1 ? "a" : "b";
    recordGame("connectfour", label(1), label(2), win);
  };

  const drop = (col: number) => {
    if (state.over || isColumnFull(state.board, col)) {
      return;
    }
    // vs CPU: 사람(1) 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.next !== HUMAN) {
      return;
    }

    const result = playConnectFourMove(state.board, col, state.next);
    let next: UiState = {
      board: result.board,
      next: other(state.next),
      winner: result.winner,
      draw: result.draw,
      over: result.over,
    };

    // vs CPU: 사람 수로 끝나지 않았다면 CPU(2)가 곧바로 한 수 둔다.
    if (mode === "cpu" && !next.over) {
      const cpuCol = chooseCpuConnectFourColumn(next.board, rng);
      if (cpuCol === null) {
        // 둘 곳이 없으면 무승부로 종료한다(방어적: 보드 가득 등).
        next = { ...next, draw: true, over: true };
      } else {
        const cpuResult = playConnectFourMove(next.board, cpuCol, CPU);
        next = {
          board: cpuResult.board,
          next: HUMAN,
          winner: cpuResult.winner,
          draw: cpuResult.draw,
          over: cpuResult.over,
        };
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
    setState(freshState());
  };

  const reset = () => setState(freshState());

  const over = state.over;
  const outcome = !over
    ? null
    : state.draw
      ? "무승부! 🤝"
      : `${label(state.winner!)} 승리! 🎉`;

  return (
    <section className="game">
      <h2>커넥트포 ({mode === "cpu" ? "vs CPU" : "2인"})</h2>
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
        <p className="hint" aria-live="polite">
          <span className={`disc p${state.next}`}>{DISC[state.next]}</span> {label(state.next)} 차례
          · 열 버튼(▼)을 눌러 디스크를 떨어뜨립니다(가득 찬 열은 비활성)
          {mode === "cpu" ? " · 후공(○)은 CPU가 자동으로 둡니다" : ""}
        </p>
      )}
      <div
        className="connectfour-cols"
        style={boardGridStyle(COLS)}
        role="group"
        aria-label="열 선택"
      >
        {Array.from({ length: COLS }, (_unused, col) => {
          const full = isColumnFull(state.board, col);
          const blocked = over || full || (mode === "cpu" && state.next !== HUMAN);
          return (
            <button
              key={col}
              className="col-drop"
              onClick={() => drop(col)}
              disabled={blocked}
              aria-label={`${col + 1}열에 두기${full ? " (가득 참)" : ""}`}
            >
              ▼
            </button>
          );
        })}
      </div>
      <div className="board connectfour" style={boardGridStyle(COLS)}>
        {state.board.map((row, y) =>
          row.map((cell: Cell, x) => (
            <div
              key={`${x},${y}`}
              className="cell"
              aria-label={
                cell
                  ? `${x + 1}열 ${y + 1}행 ${label(cell)}`
                  : `${x + 1}열 ${y + 1}행 빈 칸`
              }
            >
              {cell !== 0 && <span className={`disc p${cell}`}>{DISC[cell]}</span>}
            </div>
          )),
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

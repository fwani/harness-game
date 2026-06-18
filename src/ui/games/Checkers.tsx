import { useEffect, useRef, useState } from "react";
import {
  createCheckersBoard,
  isDarkSquare,
  pieceAt,
  type CheckersBoard,
  type CheckersColor,
  type CheckersCoord,
  type CheckersMove,
} from "../../domain/checkers";
import { playCheckersMove } from "../../application/playCheckers";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { boardGridStyle } from "./boardView";
import {
  cellKey,
  checkersCellView,
  checkersOutcomeLabel,
  checkersTurnLabel,
  checkersWinSide,
  hasForcedJump,
  legalDestinations,
  movablePieceKeys,
} from "./checkersView";
import { chooseCpuCheckersMove } from "./checkersCpuView";

const SIZE = 8;

type Mode = "local" | "cpu";

// vs CPU 모드: 사람은 dark(선공), CPU는 light(후공) — 기존 게임의 "사람=선" 컨벤션과 일치.
const HUMAN: CheckersColor = "dark";
const CPU: CheckersColor = "light";

// UI 난수 어댑터(부수효과는 infrastructure에). 테스트는 헬퍼에 스텁을 주입한다.
const rng = new MathRandomSource();

/** 화면 상태: 보드 + 현재 차례 + (사람) 선택 기물 + 멀티 점프 연속 잠금 + 승부. */
interface ViewState {
  board: CheckersBoard;
  toMove: CheckersColor;
  /** 사람이 선택한 기물(하이라이트·착수 대상). 없으면 미선택. */
  selected: CheckersCoord | null;
  /** 멀티 점프 연속 중 잠긴 기물(같은 기물만 이어서 둠). 없으면 연속 아님. */
  continuingFrom: CheckersCoord | null;
  winner: CheckersColor | null;
  over: boolean;
}

function initialState(): ViewState {
  return {
    board: createCheckersBoard(),
    toMove: "dark", // 체커는 dark(흑)가 선공.
    selected: null,
    continuingFrom: null,
    winner: null,
    over: false,
  };
}

/** 한 수(move)를 진행한 다음 화면 상태. 한 번 더(연속 점프)면 같은 색·같은 기물로 잠근다. */
function advance(prev: ViewState, move: CheckersMove): ViewState {
  const result = playCheckersMove(prev.board, move, prev.toMove);
  return {
    board: result.board,
    toMove: result.nextToMove,
    selected: result.continues ? move.to : null,
    continuingFrom: result.continues ? move.to : null,
    winner: result.winner,
    over: result.over,
  };
}

export function Checkers() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<ViewState>(initialState);
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드.
  const recorded = useRef(false);

  // vs CPU 모드에서 CPU(light) 차례면 한 수 자동 진행한다. 멀티 점프 연속이면 toMove가
  // 그대로 CPU라 state 변화로 effect가 재실행되어 같은 기물로 이어서 둔다.
  useEffect(() => {
    if (mode !== "cpu" || state.over || state.toMove !== CPU) {
      return;
    }
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.over || prev.toMove !== CPU) {
          return prev;
        }
        const move = chooseCpuCheckersMove(
          prev.board,
          CPU,
          rng,
          prev.continuingFrom ?? undefined,
        );
        // toMove===CPU면 둘 곳이 있다(없으면 findCheckersWinner가 이미 승부를 냈다).
        // 방어적으로 null이면 그대로 둔다.
        if (move === null) {
          return prev;
        }
        return advance(prev, move);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [mode, state]);

  // 종료되면(사람/CPU 어느 수로든) 결과를 전적에 1회 기록한다.
  useEffect(() => {
    if (!state.over || state.winner === null || recorded.current) {
      return;
    }
    recorded.current = true;
    const [a, b] =
      mode === "cpu" ? (["나", "CPU"] as const) : (["흑", "백"] as const);
    recordGame("checkers", a, b, checkersWinSide(state.winner));
  }, [state, mode]);

  // vs CPU 모드에선 사람(dark) 차례에만 입력을 허용한다.
  const humanTurn = mode === "local" || state.toMove === HUMAN;
  const active = !state.over && humanTurn;

  // 현재 선택 기물에서 둘 수 있는 합법 목적지(없으면 빈 배열).
  const destinations =
    active && state.selected !== null
      ? legalDestinations(state.board, state.selected, state.toMove)
      : [];
  const destByKey = new Map(destinations.map((m) => [cellKey(m.to.row, m.to.col), m]));

  // 연속 점프 중이 아닐 때 선택 가능한(합법 수가 있는) 자기 기물 좌표.
  const movable = active && state.continuingFrom === null
    ? movablePieceKeys(state.board, state.toMove)
    : new Set<string>();

  const selectedKey =
    state.selected === null ? null : cellKey(state.selected.row, state.selected.col);

  const handleCell = (row: number, col: number) => {
    if (!active) {
      return;
    }
    const key = cellKey(row, col);
    // 1) 선택된 기물의 합법 목적지를 클릭 → 착수.
    const move = destByKey.get(key);
    if (move !== undefined) {
      setState((prev) => advance(prev, move));
      return;
    }
    // 2) 연속 점프 중에는 잠긴 기물만 다룰 수 있어 다른 칸 클릭은 무시.
    if (state.continuingFrom !== null) {
      return;
    }
    // 3) 자기 기물(합법 수 있음)을 클릭 → 선택/토글.
    if (movable.has(key)) {
      setState((prev) => ({
        ...prev,
        selected: key === selectedKey ? null : { row, col },
      }));
    }
  };

  const startGame = () => {
    recorded.current = false;
    setState(initialState());
  };

  const changeMode = (next: Mode) => {
    if (next === mode) {
      return;
    }
    recorded.current = false;
    setMode(next);
    setState(initialState());
  };

  const forcedJump = active && hasForcedJump(state.board, state.toMove);
  const cpuThinking = mode === "cpu" && !state.over && state.toMove === CPU;
  const outcome = checkersOutcomeLabel(state.winner);

  return (
    <section className="game">
      <h2>
        체커 ({SIZE}×{SIZE})
      </h2>
      <div className="controls" role="group" aria-label="플레이 모드 선택">
        <button
          className={mode === "local" ? "primary" : ""}
          aria-pressed={mode === "local"}
          onClick={() => changeMode("local")}
        >
          2인 로컬
        </button>
        <button
          className={mode === "cpu" ? "primary" : ""}
          aria-pressed={mode === "cpu"}
          onClick={() => changeMode("cpu")}
        >
          vs CPU
        </button>
      </div>
      <p className="hint">
        어두운 칸에서 대각선으로 한 칸 이동하거나 상대를 뛰어넘어 따냅니다 · 따낼 수 있으면
        반드시 점프(강제) · 끝 줄에 닿으면 왕(♚/♔)으로 승급해 뒤로도 움직입니다.
        {mode === "cpu" ? " · vs CPU: 내가 흑(●), CPU가 백(○)." : ""}
      </p>
      {state.over ? (
        <p className="outcome">
          종료 · <strong>{mode === "cpu" ? cpuOutcome(state.winner) : outcome}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {cpuThinking
            ? "CPU(○ 백) 생각 중…"
            : checkersTurnLabel(state.toMove, mode === "cpu", state.continuingFrom !== null)}
          {forcedJump ? " · 점프(따냄) 강제" : ""}
        </p>
      )}
      <div className="board checkers" style={boardGridStyle(SIZE)}>
        {state.board.map((cells, row) =>
          cells.map((cell, col) => {
            const key = cellKey(row, col);
            const dark = isDarkSquare(row, col);
            const view = checkersCellView(cell);
            const isDest = destByKey.has(key);
            const isSelected = key === selectedKey;
            const ownMovable = movable.has(key);
            const playable = active && (isDest || ownMovable || isSelected);
            const piece = pieceAt(state.board, row, col);
            const classes = ["cell"];
            classes.push(dark ? "sq-dark" : "sq-light");
            if (isDest) classes.push("legal");
            if (isSelected) classes.push("selected");
            return (
              <button
                key={key}
                className={classes.join(" ")}
                onClick={() => handleCell(row, col)}
                disabled={!playable}
                aria-pressed={isSelected}
                aria-label={`${row + 1}행 ${col + 1}열 ${view.label}${
                  isDest ? " · 둘 수 있음" : ""
                }`}
              >
                {piece && (
                  <span className={`checker ${piece.color}${piece.king ? " king" : ""}`}>
                    {view.glyph}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
      <div className="controls">
        <button className="primary" onClick={startGame}>
          새 게임
        </button>
      </div>
    </section>
  );
}

/** vs CPU 종료 문구: 승자를 "나"/"CPU"로 표기(사람=dark). */
function cpuOutcome(winner: CheckersColor | null): string {
  if (winner === null) {
    return "";
  }
  return winner === HUMAN ? "내가 승리! 🎉" : "CPU 승리…";
}

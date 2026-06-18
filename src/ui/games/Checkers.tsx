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
import {
  checkersFirstPlayerOptions,
  checkersHumanColor,
  normalizeCheckersStartOptions,
  type CheckersStartOptions,
} from "./checkersStartOptionsView";

const SIZE = 8;

type Mode = "local" | "cpu";

// 색 기호(색만이 아니라 기호로 구분): 흑=●, 백=○. (안내 문구 구성용.)
const COLOR_GLYPH: Record<CheckersColor, string> = { dark: "●", light: "○" };
const COLOR_LABEL: Record<CheckersColor, string> = { dark: "흑", light: "백" };

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
  // 폼에서 고르는 시작 옵션(사람 선공 여부). 기본 사람 선공(●·흑).
  const [options, setOptions] = useState<CheckersStartOptions>(() =>
    normalizeCheckersStartOptions({}),
  );
  // 진행 중인 판이 시작된 시점의 색 설정(폼을 바꿔도 진행 중 판의 라벨/턴 분기가 흔들리지 않게 고정).
  const [activeHumanFirst, setActiveHumanFirst] = useState(options.humanFirst);
  const [state, setState] = useState<ViewState>(initialState);
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드.
  const recorded = useRef(false);

  // vs CPU에서 사람이 조작하는 색(현재 판 기준). 선공이면 흑(dark), 후공이면 백(light). CPU는 그 반대.
  const humanColor = checkersHumanColor(activeHumanFirst);
  const cpuColor: CheckersColor = humanColor === "dark" ? "light" : "dark";

  // vs CPU 모드에서 CPU 차례면 한 수 자동 진행한다. 멀티 점프 연속이면 toMove가
  // 그대로 CPU라 state 변화로 effect가 재실행되어 같은 기물로 이어서 둔다.
  // 체커는 흑(dark)이 선착하므로, 사람이 후공(백)이면 초기 보드의 toMove(dark)가 CPU라 이 effect가
  // 시작 직후 곧바로 CPU 선수를 둔다.
  useEffect(() => {
    if (mode !== "cpu" || state.over || state.toMove !== cpuColor) {
      return;
    }
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.over || prev.toMove !== cpuColor) {
          return prev;
        }
        const move = chooseCpuCheckersMove(
          prev.board,
          cpuColor,
          rng,
          prev.continuingFrom ?? undefined,
        );
        // toMove===cpuColor면 둘 곳이 있다(없으면 findCheckersWinner가 이미 승부를 냈다).
        // 방어적으로 null이면 그대로 둔다.
        if (move === null) {
          return prev;
        }
        return advance(prev, move);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [mode, state, cpuColor]);

  // 종료되면(사람/CPU 어느 수로든) 결과를 전적에 1회 기록한다.
  // vs CPU: 항상 사람=a / CPU=b 라벨로 기록한다. checkersWinSide는 dark→a/light→b이므로
  // 사람이 백(light)이면 승/패 위치를 사람=a 기준으로 뒤집어, 색 선택과 무관하게 집계 의미를 보존한다.
  // 2인 로컬: 기존 흑=a/백=b 핫시트 기록을 그대로 유지한다.
  useEffect(() => {
    if (!state.over || state.winner === null || recorded.current) {
      return;
    }
    recorded.current = true;
    if (mode === "cpu") {
      const raw = checkersWinSide(state.winner); // dark→a, light→b
      const win = humanColor === "dark" ? raw : raw === "a" ? "b" : "a";
      recordGame("checkers", "나", "CPU", win);
    } else {
      recordGame("checkers", "흑", "백", checkersWinSide(state.winner));
    }
  }, [state, mode, humanColor]);

  // vs CPU 모드에선 사람 색 차례에만 입력을 허용한다.
  const humanTurn = mode === "local" || state.toMove === humanColor;
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

  // 선택한 옵션으로 새 게임을 시작한다(진행 판의 색 설정 고정 + 보드 초기화).
  // 사람이 후공(백)이면 초기 toMove(dark)가 CPU라 위 effect가 시작 직후 CPU 선수를 둔다.
  const startWith = (humanFirst: boolean) => {
    setActiveHumanFirst(humanFirst);
    recorded.current = false;
    setState(initialState());
  };

  const startGame = () => startWith(options.humanFirst);

  const changeMode = (next: Mode) => {
    if (next === mode) {
      return;
    }
    setMode(next);
    startWith(options.humanFirst);
  };

  const selectHumanFirst = (humanFirst: boolean) => {
    setOptions({ humanFirst });
    startWith(humanFirst);
  };

  const forcedJump = active && hasForcedJump(state.board, state.toMove);
  const cpuThinking = mode === "cpu" && !state.over && state.toMove === cpuColor;
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
      {mode === "cpu" && (
        <div className="controls" role="group" aria-label="선공/후공 선택">
          <span className="hint">내 차례:</span>
          {checkersFirstPlayerOptions().map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              className={options.humanFirst === opt.value ? "primary" : ""}
              aria-pressed={options.humanFirst === opt.value}
              onClick={() => selectHumanFirst(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <p className="hint">
        어두운 칸에서 대각선으로 한 칸 이동하거나 상대를 뛰어넘어 따냅니다 · 따낼 수 있으면
        반드시 점프(강제) · 끝 줄에 닿으면 왕(♚/♔)으로 승급해 뒤로도 움직입니다.
        {mode === "cpu"
          ? ` · vs CPU: 내가 ${COLOR_GLYPH[humanColor]} ${COLOR_LABEL[humanColor]}(${
              activeHumanFirst ? "선" : "후"
            }), CPU가 ${COLOR_GLYPH[cpuColor]} ${COLOR_LABEL[cpuColor]}. 흑(●)이 먼저 둡니다.`
          : ""}
      </p>
      {state.over ? (
        <p className="outcome">
          종료 ·{" "}
          <strong>{mode === "cpu" ? cpuOutcome(state.winner, humanColor) : outcome}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {cpuThinking
            ? `CPU(${COLOR_GLYPH[cpuColor]} ${COLOR_LABEL[cpuColor]}) 생각 중…`
            : checkersTurnLabel(
                state.toMove,
                mode === "cpu" ? humanColor : null,
                state.continuingFrom !== null,
              )}
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

/** vs CPU 종료 문구: 승자를 "나"/"CPU"로 표기(사람 색 기준). */
function cpuOutcome(winner: CheckersColor | null, humanColor: CheckersColor): string {
  if (winner === null) {
    return "";
  }
  return winner === humanColor ? "내가 승리! 🎉" : "CPU 승리…";
}

import { useState } from "react";
import { startGame, applyMove, isFinished, type GomokuState } from "../../application/playGomoku";
import { type Stone } from "../../domain/gomoku";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame, type WinSide } from "../records";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";
import { chooseCpuGomokuMove } from "./gomokuCpuView";
import {
  gomokuBoardSizeOptions,
  normalizeGomokuStartOptions,
  type GomokuStartOptions,
} from "./gomokuStartOptionsView";

const STONE = { black: "●", white: "○" } as const;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

/** 게임이 끝났는지: 5목 승자가 있거나 무승부(보드 가득)면 종료(application 상태로 판정). */
const isOver = isFinished;

/** 상대 색. */
const opponent = (stone: Stone): Stone => (stone === "black" ? "white" : "black");

/** vs CPU에서 사람이 잡는 색(선공이면 흑, 후공이면 백). */
const humanStone = (humanFirst: boolean): Stone => (humanFirst ? "black" : "white");

/**
 * 선택한 옵션으로 새 게임을 시작한다. vs CPU에서 CPU가 선공(흑)이면 곧바로 첫 수를 둔다
 * (사람이 백을 골랐을 때 화면이 사람 차례로 시작하도록).
 */
function startNewGame(opts: GomokuStartOptions, mode: Mode): GomokuState {
  let next = startGame(opts.size);
  if (mode === "cpu" && !isOver(next) && next.next !== humanStone(opts.humanFirst)) {
    const cpuMove = chooseCpuGomokuMove(next.board, rng);
    if (cpuMove !== null) {
      next = applyMove(next, cpuMove.x, cpuMove.y);
    }
  }
  return next;
}

export function Gomoku() {
  const [mode, setMode] = useState<Mode>("local");
  // 폼에서 고르는 시작 옵션(보드 크기·선공). 기본 15×15·사람 선공.
  const [options, setOptions] = useState<GomokuStartOptions>(() =>
    normalizeGomokuStartOptions({}),
  );
  // 현재 진행 중인 판이 시작된 시점의 선공 설정(폼을 바꿔도 진행 중 판의 라벨이 흔들리지 않게 고정).
  const [activeHumanFirst, setActiveHumanFirst] = useState(options.humanFirst);
  const [state, setState] = useState<GomokuState>(() =>
    startNewGame(options, "local"),
  );

  const size = state.board.length;
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    size,
    size,
  );

  // vs CPU에서 사람이 잡는 색(현재 판 기준).
  const humanSide = humanStone(activeHumanFirst);

  // 모드별 플레이어 라벨. vs CPU에서는 사람 색="나" / CPU 색="CPU".
  const label = (stone: Stone): string =>
    mode === "cpu"
      ? stone === humanSide
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
    // vs CPU: 사람 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.next !== humanSide) {
      return;
    }

    let next = applyMove(state, x, y);
    // vs CPU: 사람 수로 끝나지 않았다면 CPU가 곧바로 한 수 둔다(다음 차례가 CPU 색).
    if (mode === "cpu" && !isOver(next)) {
      const cpuMove = chooseCpuGomokuMove(next.board, rng);
      if (cpuMove !== null) {
        next = applyMove(next, cpuMove.x, cpuMove.y);
      }
    }

    setState(next);
    recordIfFinished(state, next);
  };

  /** 옵션을 적용해 새 게임을 시작한다(진행 판의 선공 고정·포커스 초기화 포함). */
  const applyOptions = (next: GomokuStartOptions, nextMode: Mode) => {
    setOptions(next);
    setActiveHumanFirst(next.humanFirst);
    setState(startNewGame(next, nextMode));
    focusOn(0, 0);
  };

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    applyOptions(options, nextMode);
  };

  const selectSize = (value: number) => {
    applyOptions(normalizeGomokuStartOptions({ ...options, size: value }), mode);
  };

  const selectHumanFirst = (humanFirst: boolean) => {
    applyOptions({ ...options, humanFirst }, mode);
  };

  const reset = () => applyOptions(options, mode);

  const over = isOver(state);
  const draw = state.isDraw;
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
      <div className="controls" role="group" aria-label="보드 크기 선택">
        <span className="hint">보드 크기:</span>
        {gomokuBoardSizeOptions().map((opt) => (
          <button
            key={opt.value}
            className={options.size === opt.value ? "primary" : ""}
            onClick={() => selectSize(opt.value)}
            aria-pressed={options.size === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {mode === "cpu" && (
        <div className="controls" role="group" aria-label="선공 선택">
          <span className="hint">선공:</span>
          <button
            className={options.humanFirst ? "primary" : ""}
            onClick={() => selectHumanFirst(true)}
            aria-pressed={options.humanFirst}
          >
            사람 선공 (흑 ●)
          </button>
          <button
            className={!options.humanFirst ? "primary" : ""}
            onClick={() => selectHumanFirst(false)}
            aria-pressed={!options.humanFirst}
          >
            CPU 선공 (사람 백 ○)
          </button>
        </div>
      )}
      {over ? (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      ) : (
        <p className="hint">
          {STONE[state.next]} {label(state.next)} 차례
          {mode === "cpu"
            ? ` · 사람은 ${STONE[humanSide]}, CPU(${STONE[opponent(humanSide)]})는 자동으로 둡니다`
            : ""}
        </p>
      )}
      <div
        className="board"
        style={boardGridStyle(size)}
        role="grid"
        aria-label="오목 보드 (방향 키로 칸 이동, Enter/Space로 착수)"
        onKeyDown={onKeyDown}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => {
            const blocked =
              over || cell !== null || (mode === "cpu" && state.next !== humanSide);
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

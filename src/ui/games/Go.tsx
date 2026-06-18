import { useState } from "react";
import { scoreArea, type GoScore } from "../../domain/goScore";
import type { Stone } from "../../domain/go";
import { startGame, applyMove, pass, type GoState } from "../../application/playGo";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { goErrorMessage } from "./goView";
import { chooseCpuGoMove } from "./goCpuView";
import { recordGame, type WinSide } from "../records";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";
import {
  goBoardSizeOptions,
  normalizeGoStartOptions,
  type GoStartOptions,
} from "./goStartOptionsView";

const STONE = { black: "●", white: "○" } as const;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

/** 상대 색. */
const opponent = (stone: Stone): Stone => (stone === "black" ? "white" : "black");

/** vs CPU에서 사람이 잡는 색(선공이면 흑, 후공이면 백). */
const humanStone = (humanFirst: boolean): Stone =>
  humanFirst ? "black" : "white";

/**
 * 선택한 옵션으로 새 게임을 시작한다. vs CPU에서 CPU가 선공(흑)이면 곧바로 첫 수를 둔다
 * (사람이 백을 골랐을 때 화면이 사람 차례로 시작하도록).
 */
function startNewGame(opts: GoStartOptions, mode: Mode): GoState {
  let next = startGame(opts.size);
  const human = humanStone(opts.humanFirst);
  if (mode === "cpu" && !next.finished && next.next !== human) {
    const cpuMove = chooseCpuGoMove(next.board, next.next, rng);
    if (cpuMove !== null) {
      next = applyMove(next, cpuMove.x, cpuMove.y);
    }
  }
  return next;
}

export function Go() {
  const [mode, setMode] = useState<Mode>("local");
  // 폼에서 고르는 시작 옵션(보드 크기·선공). 기본 9×9·사람 선공.
  const [options, setOptions] = useState<GoStartOptions>(() =>
    normalizeGoStartOptions({}),
  );
  // 진행 중인 판이 시작된 시점의 선공 설정(폼을 바꿔도 진행 중 판의 라벨이 흔들리지 않게 고정).
  const [activeHumanFirst, setActiveHumanFirst] = useState(options.humanFirst);
  const [state, setState] = useState<GoState>(() => startNewGame(options, "local"));
  const [error, setError] = useState<string | null>(null);
  // vs CPU에서 CPU가 둘 곳이 없어 패스했을 때의 안내(기존 자동 패스 안내 패턴).
  const [notice, setNotice] = useState<string | null>(null);

  const size = state.board.length;
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    size,
    size,
  );

  // vs CPU에서 사람·CPU가 잡는 색(현재 판 기준).
  const humanSide = humanStone(activeHumanFirst);
  const cpuSide = opponent(humanSide);

  // 모드별 플레이어 라벨. vs CPU에서는 사람 색="나" / CPU 색="CPU".
  const label = (stone: Stone): string =>
    mode === "cpu"
      ? stone === humanSide
        ? "나"
        : "CPU"
      : stone === "black"
        ? "흑"
        : "백";

  // 종료로 막 전환됐을 때(연속 2회 패스) 1회 계가 결과를 기록한다.
  const recordIfFinished = (prev: GoState, next: GoState) => {
    if (!next.finished || prev.finished) {
      return;
    }
    const s = scoreArea(next.board);
    const win: WinSide =
      s.winner === null ? "draw" : s.winner === "black" ? "a" : "b";
    recordGame("go", label("black"), label("white"), win);
  };

  // vs CPU: CPU 차례를 한 번 처리한다. 둘 곳이 있으면 착수, 없으면 패스.
  const cpuTurn = (s: GoState): { state: GoState; passed: boolean } => {
    const move = chooseCpuGoMove(s.board, cpuSide, rng);
    if (move === null) {
      return { state: pass(s), passed: true };
    }
    return { state: applyMove(s, move.x, move.y), passed: false };
  };

  // 사람의 한 수(착수/패스) 이후 vs CPU면 곧바로 CPU 차례를 처리하고 상태를 반영한다.
  const commit = (humanNext: GoState) => {
    let next = humanNext;
    let cpuPassed = false;
    if (mode === "cpu" && !next.finished && next.next === cpuSide) {
      const r = cpuTurn(next);
      next = r.state;
      cpuPassed = r.passed;
    }
    setState(next);
    setError(null);
    setNotice(
      cpuPassed
        ? `CPU(${label(cpuSide)} ${STONE[cpuSide]})가 둘 곳이 없어 패스했습니다.`
        : null,
    );
    recordIfFinished(state, next);
  };

  const place = (x: number, y: number) => {
    focusOn(x, y);
    if (state.finished) {
      return;
    }
    // 이미 돌이 있는 칸은 둘 수 없다(기존 비활성 칸 동작 유지: no-op).
    if (state.board[y]![x] !== null) {
      return;
    }
    // vs CPU: 사람 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.next !== humanSide) {
      return;
    }
    try {
      commit(applyMove(state, x, y));
    } catch (e) {
      setError(goErrorMessage(e));
    }
  };

  const doPass = () => {
    if (state.finished) {
      return;
    }
    if (mode === "cpu" && state.next !== humanSide) {
      return;
    }
    commit(pass(state));
  };

  /** 옵션을 적용해 새 게임을 시작한다(진행 판의 선공 고정·포커스 초기화 포함). */
  const applyOptions = (next: GoStartOptions, nextMode: Mode) => {
    setOptions(next);
    setActiveHumanFirst(next.humanFirst);
    setState(startNewGame(next, nextMode));
    setError(null);
    setNotice(null);
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
    applyOptions(normalizeGoStartOptions({ ...options, size: value }), mode);
  };

  const selectHumanFirst = (humanFirst: boolean) => {
    applyOptions({ ...options, humanFirst }, mode);
  };

  const reset = () => applyOptions(options, mode);

  // 연속 2회 패스로 종료되면 영역 계가로 집·점수·승자를 계산한다.
  const score: GoScore | null = state.finished ? scoreArea(state.board) : null;

  const winnerLabel =
    score === null
      ? null
      : score.winner === null
        ? "무승부! 🤝"
        : `${label(score.winner)} 승리! 🎉`;

  // vs CPU에서는 사람 수 직후 CPU가 즉시 응수하므로, 미종료 시 차례는 항상 사람.
  const blockBoard = state.finished || (mode === "cpu" && state.next !== humanSide);

  return (
    <section className="game">
      <h2>
        바둑 ({size}×{size}
        {mode === "cpu" ? ", vs CPU" : ""})
      </h2>
      <p className="hint">
        교차점을 눌러 돌을 둡니다. 둘 곳이 없거나 마치려면 패스하세요(연속 2회 패스 시 종료·계가).
      </p>
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
        {goBoardSizeOptions().map((value) => (
          <button
            key={value}
            className={options.size === value ? "primary" : ""}
            onClick={() => selectSize(value)}
            aria-pressed={options.size === value}
          >
            {value}×{value}
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
      {state.finished ? (
        <p className="outcome">
          종료(연속 2회 패스) · 흑 {score!.black} / 백 {score!.white} ·{" "}
          <strong>{winnerLabel}</strong>
        </p>
      ) : (
        <p className="hint">
          {STONE[state.next]} {label(state.next)} 차례 · 따냄 흑{" "}
          {state.captures.black} / 백 {state.captures.white}
          {mode === "cpu"
            ? ` · ${STONE[cpuSide]}은 CPU가 자동으로 둡니다`
            : ""}
          {state.lastWasPass ? " · 직전 패스(한 번 더 패스하면 종료)" : ""}
        </p>
      )}
      {notice && !state.finished && <p className="hint">{notice}</p>}
      <div
        className="board go"
        style={boardGridStyle(size)}
        role="grid"
        aria-label="바둑 보드 (방향 키로 칸 이동, Enter/Space로 착수)"
        onKeyDown={onKeyDown}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x},${y}`}
              ref={setCellRef(x, y)}
              className="cell"
              role="gridcell"
              tabIndex={tabIndexFor(x, y)}
              onClick={() => place(x, y)}
              aria-disabled={cell !== null || blockBoard}
              aria-label={
                cell
                  ? `${x + 1}열 ${y + 1}행 ${label(cell)}`
                  : `${x + 1}열 ${y + 1}행 빈 칸`
              }
            >
              {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
            </button>
          )),
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="controls">
        <button className="primary" onClick={doPass} disabled={blockBoard}>
          패스
        </button>
        <button className="primary" onClick={reset}>
          새 게임
        </button>
      </div>
    </section>
  );
}

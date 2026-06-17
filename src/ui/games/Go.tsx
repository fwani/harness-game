import { useState } from "react";
import { scoreArea, type GoScore } from "../../domain/goScore";
import type { Stone } from "../../domain/go";
import { startGame, applyMove, pass, type GoState } from "../../application/playGo";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { goErrorMessage } from "./goView";
import { chooseCpuGoMove } from "./goCpuView";
import { recordGame, type WinSide } from "../records";
import { boardGridStyle } from "./boardView";

const SIZE = 9;

const STONE = { black: "●", white: "○" } as const;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

export function Go() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<GoState>(() => startGame(SIZE));
  const [error, setError] = useState<string | null>(null);
  // vs CPU에서 CPU가 둘 곳이 없어 패스했을 때의 안내(기존 자동 패스 안내 패턴).
  const [notice, setNotice] = useState<string | null>(null);

  // 모드별 플레이어 라벨. vs CPU에서는 사람(흑)="나" / CPU(백)="CPU".
  const label = (stone: Stone): string =>
    mode === "cpu"
      ? stone === "black"
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

  // vs CPU: 백(CPU) 차례를 한 번 처리한다. 둘 곳이 있으면 착수, 없으면 패스.
  const cpuTurn = (s: GoState): { state: GoState; passed: boolean } => {
    const move = chooseCpuGoMove(s.board, "white", rng);
    if (move === null) {
      return { state: pass(s), passed: true };
    }
    return { state: applyMove(s, move.x, move.y), passed: false };
  };

  // 사람의 한 수(착수/패스) 이후 vs CPU면 곧바로 CPU 차례를 처리하고 상태를 반영한다.
  const commit = (humanNext: GoState) => {
    let next = humanNext;
    let cpuPassed = false;
    if (mode === "cpu" && !next.finished) {
      const r = cpuTurn(next);
      next = r.state;
      cpuPassed = r.passed;
    }
    setState(next);
    setError(null);
    setNotice(cpuPassed ? "CPU(백 ○)가 둘 곳이 없어 패스했습니다." : null);
    recordIfFinished(state, next);
  };

  const place = (x: number, y: number) => {
    if (state.finished) {
      return;
    }
    // vs CPU: 사람(흑) 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.next !== "black") {
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
    if (mode === "cpu" && state.next !== "black") {
      return;
    }
    commit(pass(state));
  };

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    setState(startGame(SIZE));
    setError(null);
    setNotice(null);
  };

  const reset = () => {
    setState(startGame(SIZE));
    setError(null);
    setNotice(null);
  };

  // 연속 2회 패스로 종료되면 영역 계가로 집·점수·승자를 계산한다.
  const score: GoScore | null = state.finished ? scoreArea(state.board) : null;

  const winnerLabel =
    score === null
      ? null
      : score.winner === null
        ? "무승부! 🤝"
        : `${label(score.winner)} 승리! 🎉`;

  // vs CPU에서는 사람 수 직후 CPU가 즉시 응수하므로, 미종료 시 차례는 항상 사람(흑).
  const blockBoard = state.finished || (mode === "cpu" && state.next !== "black");

  return (
    <section className="game">
      <h2>바둑 ({SIZE}×{SIZE}{mode === "cpu" ? ", vs CPU" : ""})</h2>
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
      {state.finished ? (
        <p className="outcome">
          종료(연속 2회 패스) · 흑 {score!.black} / 백 {score!.white} ·{" "}
          <strong>{winnerLabel}</strong>
        </p>
      ) : (
        <p className="hint">
          {STONE[state.next]} {label(state.next)} 차례 · 따냄 흑{" "}
          {state.captures.black} / 백 {state.captures.white}
          {mode === "cpu" ? " · 백(○)은 CPU가 자동으로 둡니다" : ""}
          {state.lastWasPass ? " · 직전 패스(한 번 더 패스하면 종료)" : ""}
        </p>
      )}
      {notice && !state.finished && <p className="hint">{notice}</p>}
      <div className="board go" style={boardGridStyle(SIZE)}>
        {state.board.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x},${y}`}
              className="cell"
              onClick={() => place(x, y)}
              disabled={cell !== null || blockBoard}
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

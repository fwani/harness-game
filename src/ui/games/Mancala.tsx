import { useState, useSyncExternalStore } from "react";
import {
  createMancalaBoard,
  applyMancalaMove,
  type MancalaBoard,
  type MancalaPlayer,
} from "../../domain/mancala";
import { chooseRandomMancalaMove, playMancalaTurn } from "../../application/playMancala";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe, type WinSide } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  mancalaCaptureLabel,
  mancalaOutcomeLabel,
  mancalaPitAriaLabel,
  mancalaScoreLabel,
  mancalaStoreAriaLabel,
  mancalaTurnLabel,
  type MancalaLabeler,
} from "./mancalaView";

// 표준 Kalah 6·4: 한쪽 구덩이 6개, 각 구덩이 씨앗 4개.
const PITS_PER_SIDE = 6;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

// vs CPU 모드: 사람은 1(선), CPU는 2(후).
const HUMAN: MancalaPlayer = 1;
const CPU: MancalaPlayer = 2;

/** 화면 상태: 보드 + 현재 차례 + 직전 수의 한 번 더/포획 + 승부 판정(application 결과 보관). */
interface UiState {
  board: MancalaBoard;
  current: MancalaPlayer;
  /** 직전 수의 마지막 씨앗이 자기 곳간에 떨어져 같은 플레이어가 한 번 더 두는 중이면 true(안내용). */
  again: boolean;
  /** 직전 수로 포획한 씨앗 수(없으면 0). */
  captured: number;
  /** 그 포획을 한 플레이어(표시용). */
  capturedBy: MancalaPlayer;
  winner: MancalaPlayer | null;
  over: boolean;
}

function freshState(): UiState {
  return {
    board: createMancalaBoard(PITS_PER_SIDE),
    current: 1,
    again: false,
    captured: 0,
    capturedBy: 1,
    winner: null,
    over: false,
  };
}

/** 한 수(씨 뿌리기)를 진행한 다음 상태를 만든다(application playMancalaTurn에 위임). */
function applyTurn(state: UiState, pit: number): UiState {
  const result = playMancalaTurn(state.board, state.current, pit);
  // playMancalaTurn은 포획 수(captured)를 노출하지 않으므로, 표시용으로만 도메인 applyMancalaMove의
  // captured를 읽는다(동일 입력 → 동일 결과, UI에서 규칙을 재구현하지 않음).
  const { captured } = applyMancalaMove(state.board, state.current, pit);
  return {
    board: result.board,
    current: result.nextToMove,
    again: result.again,
    captured,
    capturedBy: state.current,
    // winner: 진행 중이면 null → over로 종료 판정.
    winner: result.winner,
    over: result.over,
  };
}

export function Mancala() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<UiState>(freshState);

  // vs CPU 모드의 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "mancala");

  // 모드별 플레이어 라벨. vs CPU에서는 사람(1)="나"(SELF_PLAYER)·CPU(2)="CPU".
  const label: MancalaLabeler = (p) =>
    mode === "cpu" ? (p === HUMAN ? SELF_PLAYER : "CPU") : `P${p}`;

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(승자 1=a/2=b, 동수 무승부=draw).
  const recordIfFinished = (prev: UiState, next: UiState) => {
    if (!next.over || prev.over) {
      return;
    }
    const win: WinSide = next.winner === null ? "draw" : next.winner === 1 ? "a" : "b";
    recordGame("mancala", label(1), label(2), win);
  };

  // CPU 차례가 이어지는 동안(한 번 더 포함) 무작위로 합법 수를 골라 자동 진행한다.
  const runCpuTurns = (start: UiState): UiState => {
    let cur = start;
    while (!cur.over && cur.current === CPU) {
      const pit = chooseRandomMancalaMove(cur.board, CPU, rng);
      if (pit === null) {
        break; // 둘 곳이 없으면 중단(방어적 — over면 루프가 이미 끝났을 것).
      }
      cur = applyTurn(cur, pit);
    }
    return cur;
  };

  const sow = (player: MancalaPlayer, pit: number) => {
    if (state.over || state.current !== player) {
      return;
    }
    // vs CPU: 사람(1) 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.current !== HUMAN) {
      return;
    }

    let next = applyTurn(state, pit);
    // vs CPU: 사람 수로 턴이 CPU에게 넘어갔다면 CPU가 곧바로 (한 번 더 포함) 자동으로 둔다.
    if (mode === "cpu") {
      next = runCpuTurns(next);
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
  const outcome = over ? mancalaOutcomeLabel(state.winner, label) : null;
  const capture = mancalaCaptureLabel(state.capturedBy, state.captured, label);

  const pitPlayable = (owner: MancalaPlayer, seeds: number): boolean =>
    !over && seeds > 0 && state.current === owner && !(mode === "cpu" && state.current !== HUMAN);

  // 표시 순서: 윗줄은 P2 구덩이를 역순(5..0)으로 둬 P1 구덩이와 포획 맞은편이 세로로 정렬되게 한다.
  const topPits = Array.from({ length: PITS_PER_SIDE }, (_, col) => PITS_PER_SIDE - 1 - col);

  const renderPit = (player: MancalaPlayer, index: number, gridRow: number, gridColumn: number) => {
    const seeds = state.board.pits[player][index]!;
    const playable = pitPlayable(player, seeds);
    return (
      <button
        key={`p${player}-${index}`}
        type="button"
        className={`mancala-pit owner-p${player}${state.current === player && !over ? " current" : ""}`}
        style={{ gridRow, gridColumn }}
        onClick={() => sow(player, index)}
        disabled={!playable}
        aria-label={mancalaPitAriaLabel(player, index, seeds, label)}
      >
        <span className="mancala-pit-label" aria-hidden="true">
          {label(player)}
        </span>
        <span className="mancala-seeds">{seeds}</span>
      </button>
    );
  };

  const renderStore = (player: MancalaPlayer, gridColumn: number) => (
    <div
      className={`mancala-store owner-p${player}`}
      style={{ gridColumn, gridRow: "1 / 3" }}
      role="img"
      aria-label={mancalaStoreAriaLabel(player, state.board.stores[player], label)}
    >
      <span className="mancala-store-label" aria-hidden="true">
        {label(player)}
      </span>
      <span className="mancala-seeds">{state.board.stores[player]}</span>
    </div>
  );

  return (
    <section className="game">
      <h2>만칼라 ({mode === "cpu" ? "vs CPU" : "2인"})</h2>
      <p className="hint">
        자기 구덩이의 씨앗을 집어 반시계 방향으로 한 알씩 뿌립니다. 마지막 알이 <strong>자기 곳간</strong>에
        떨어지면 <strong>한 번 더</strong>, 비어 있던 자기 구덩이에 떨어지면 맞은편 씨앗을 <strong>포획</strong>합니다.
        한쪽 구덩이가 모두 비면 종료, 곳간에 씨앗이 많은 쪽이 승리합니다.
      </p>

      <div className="controls" role="group" aria-label="모드 선택">
        <button
          type="button"
          className={mode === "local" ? "primary" : ""}
          onClick={() => switchMode("local")}
          aria-pressed={mode === "local"}
        >
          2인 로컬
        </button>
        <button
          type="button"
          className={mode === "cpu" ? "primary" : ""}
          onClick={() => switchMode("cpu")}
          aria-pressed={mode === "cpu"}
        >
          vs CPU
        </button>
      </div>

      <p className="hint" aria-live="polite">
        점수 · <strong>{mancalaScoreLabel(state.board, label)}</strong>
      </p>

      {over ? (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {mancalaTurnLabel(state.current, state.again, label)}
          {mode === "cpu" ? " · 후공(CPU)은 자동으로 둡니다" : ""}
        </p>
      )}

      {capture && (
        <p className="hint" aria-live="polite">
          {capture}
        </p>
      )}

      <div
        className="board mancala"
        role="group"
        aria-label="만칼라 보드"
        style={{ gridTemplateColumns: `auto repeat(${PITS_PER_SIDE}, 1fr) auto` }}
      >
        {renderStore(2, 1)}
        {topPits.map((index, col) => renderPit(2, index, 1, col + 2))}
        {Array.from({ length: PITS_PER_SIDE }, (_, index) => renderPit(1, index, 2, index + 2))}
        {renderStore(1, PITS_PER_SIDE + 2)}
      </div>

      <div className="controls">
        <button type="button" className="primary" onClick={reset}>
          새 게임
        </button>
      </div>

      {mode === "cpu" && <StreakPanel title="내 전적 (나)" summary={streak} />}
    </section>
  );
}

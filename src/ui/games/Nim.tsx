import { useState, useSyncExternalStore } from "react";
import { createNimPiles, isLegalNimMove, type NimPiles, type NimPlayer } from "../../domain/nim";
import { chooseRandomNimMove, playNimTurn } from "../../application/playNim";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  nimMoveAriaLabel,
  nimMoveSummary,
  nimOutcomeLabel,
  nimPileAriaLabel,
  nimPileLabel,
  nimPileViews,
  nimStonesSymbol,
  nimTurnLabel,
  nimWinSide,
  type NimLabeler,
} from "./nimView";

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

// vs CPU: 사람=선(1), CPU=후(2).
const HUMAN: NimPlayer = 1;
const CPU: NimPlayer = 2;

/** 직전 라운드에 둔 한 수(표시용). */
interface MoveLog {
  player: NimPlayer;
  pile: number;
  count: number;
}

/** 화면 상태: 더미 + 다음 차례 + 승부 판정 + 직전 라운드 수 로그. */
interface UiState {
  piles: NimPiles;
  /** 다음에 둘 플레이어(사람만 입력; CPU는 자동). 종료면 의미 없음. */
  current: NimPlayer;
  winner: NimPlayer | null;
  over: boolean;
  /** 직전 라운드(사람 수 + 이어진 CPU 수)의 착수 로그. */
  lastMoves: MoveLog[];
}

function freshState(): UiState {
  return {
    piles: createNimPiles(),
    current: HUMAN,
    winner: null,
    over: false,
    lastMoves: [],
  };
}

export function Nim() {
  const [state, setState] = useState<UiState>(freshState);
  const [feedback, setFeedback] = useState<string | null>(null);

  // 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "nim");

  // 사람(1)="나"(SELF_PLAYER)·CPU(2)="CPU". 표시와 기록이 같은 라벨을 쓰도록 한곳에서 정의.
  const label: NimLabeler = (p) => (p === HUMAN ? SELF_PLAYER : "CPU");

  // 한 수(가져가기)를 진행한다: 사람 착수 → 미종료면 CPU 자동 착수.
  const take = (pile: number, count: number) => {
    if (state.over) {
      return;
    }
    const move = { pile, count };
    // 합법 수만 버튼으로 노출하지만, 방어적으로 검사해 불법 입력은 조용히 무시하지 않고 사유를 알린다.
    if (!isLegalNimMove(state.piles, move)) {
      setFeedback(`둘 수 없는 수입니다 · ${nimPileLabel(pile)}에서 ${count}개`);
      return;
    }
    setFeedback(null);

    const moves: MoveLog[] = [];
    const human = playNimTurn(state.piles, HUMAN, move);
    moves.push({ player: HUMAN, pile, count });

    let piles = human.piles;
    let winner = human.winner;
    let over = human.over;

    // 사람이 마지막 돌을 가져가지 않았다면(미종료) CPU가 곧바로 무작위 합법 수로 둔다.
    if (!over) {
      const cpuMove = chooseRandomNimMove(piles, rng);
      if (cpuMove) {
        const cpu = playNimTurn(piles, CPU, cpuMove);
        moves.push({ player: CPU, pile: cpuMove.pile, count: cpuMove.count });
        piles = cpu.piles;
        winner = cpu.winner;
        over = cpu.over;
      }
    }

    const next: UiState = { piles, current: HUMAN, winner, over, lastMoves: moves };
    setState(next);

    // 종료로 막 전환됐을 때 1회 전적 기록(사람=a/CPU=b). 표준 플레이엔 무승부 없음.
    if (over && !state.over) {
      recordGame("nim", label(HUMAN), label(CPU), nimWinSide(winner));
    }
  };

  const reset = () => {
    setState(freshState());
    setFeedback(null);
  };

  const { over, piles } = state;
  const pileViews = nimPileViews(piles);
  const totalStones = piles.reduce((sum, n) => sum + n, 0);

  return (
    <section className="game">
      <h2>님 (vs CPU)</h2>
      <p className="hint">
        여러 더미에서 번갈아 한 더미의 돌을 1개 이상 가져갑니다. <strong>마지막 돌을 가져가는 쪽이 승리</strong>합니다.
        사람이 선(먼저), CPU가 후입니다 — 더미를 골라 가져갈 개수 버튼을 누르세요.
      </p>

      {over ? (
        <p className="outcome">
          종료 · <strong>{nimOutcomeLabel(state.winner, label)}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {nimTurnLabel(state.current, label)} · 남은 돌 {totalStones}개
        </p>
      )}

      {state.lastMoves.length > 0 && (
        <p className="hint" aria-live="polite">
          직전 ·{" "}
          {state.lastMoves
            .map((m) => nimMoveSummary(m.player, m.pile, m.count, label))
            .join(" → ")}
        </p>
      )}

      {feedback && (
        <p className="error" role="alert">
          {feedback}
        </p>
      )}

      <div className="board nim" role="group" aria-label="님 더미">
        {pileViews.map((view) => (
          <div className="nim-pile" key={view.pile}>
            <div className="nim-pile-head">
              <span className="nim-pile-label">{nimPileLabel(view.pile)}</span>
              <span className="nim-stones" aria-label={nimPileAriaLabel(view.pile, view.stones)}>
                <span className="nim-stones-symbol" aria-hidden="true">
                  {nimStonesSymbol(view.stones)}
                </span>
                <span className="nim-stones-count">돌 {view.stones}개</span>
              </span>
            </div>
            <div className="nim-take" role="group" aria-label={`${nimPileLabel(view.pile)}에서 가져갈 개수`}>
              {view.counts.length === 0 ? (
                <span className="nim-empty">비었음</span>
              ) : (
                view.counts.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className="nim-take-btn"
                    onClick={() => take(view.pile, count)}
                    disabled={over}
                    aria-label={nimMoveAriaLabel(view.pile, count)}
                  >
                    {count}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="controls">
        <button type="button" className="primary" onClick={reset}>
          새 게임
        </button>
      </div>

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

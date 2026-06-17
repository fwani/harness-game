import { useRef, useState, useSyncExternalStore } from "react";
import type { Card } from "../../domain/card";
import {
  applyOneCardPlay,
  drawOneCard,
  findOneCardWinner,
  topDiscard,
  type OneCardState,
} from "../../domain/oneCard";
import {
  reshuffleIfNeeded,
  startOneCardGame,
} from "../../application/playOneCard";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  ONE_CARD_CPU,
  ONE_CARD_HUMAN,
  oneCardCardView,
  oneCardHandView,
  oneCardOutcomeLabel,
  oneCardTurnLabel,
  playOneCardCpuTurns,
} from "./oneCardView";

// 무작위 시작·재셔플·CPU 한 턴 진행은 application(startOneCardGame/reshuffleIfNeeded/
// playOneCardCpuTurn) + RandomSource 어댑터에 위임한다. 규칙·합법성·승자 판정은 domain(oneCard)만
// 호출하고 UI에서 재구현하지 않는다(데드 코드/보기 전용 아님).
const rng = new MathRandomSource();

/** 단일 vs CPU 화면이 기록하는 상대 라벨(다른 1인 게임과 동일하게 "CPU"). */
const OPPONENT = "CPU";

/** 사람=P0=선, CPU=P1, 손패 7장으로 한 판 시작한다. */
function newGame(): OneCardState {
  return startOneCardGame(2, 7, rng);
}

/** 색 비의존 카드 칩(무늬 기호+숫자 + aria-label). */
function CardChip({ card, big }: { card: Card; big?: boolean }) {
  const view = oneCardCardView(card);
  const cls = `card-chip${view.red ? " red" : ""}${big ? " big" : ""}`;
  return (
    <span className={cls} aria-label={view.label}>
      <span aria-hidden="true">{view.symbol}</span>
    </span>
  );
}

export function OneCard() {
  const [state, setState] = useState<OneCardState>(newGame);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawNote, setDrawNote] = useState<string | null>(null);
  // 한 판당 전적을 한 번만 기록하기 위한 가드(승자 확정 시 1회).
  const recorded = useRef(false);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "onecard");

  const winner = findOneCardWinner(state);
  const finished = winner !== null;
  const myTurn = state.currentPlayer === ONE_CARD_HUMAN && !finished;

  const myHand = oneCardHandView(state, ONE_CARD_HUMAN);
  const hasLegalPlay = myHand.some((c) => c.legal);
  const cpuHandCount = state.hands[ONE_CARD_CPU]?.length ?? 0;
  const top = topDiscard(state);

  // 승자 확정 시 전적을 1회 기록한다. 사람 승=a, CPU 승=b.
  const finalize = (next: OneCardState) => {
    setState(next);
    const w = findOneCardWinner(next);
    if (w !== null && !recorded.current) {
      recorded.current = true;
      recordGame("onecard", SELF_PLAYER, OPPONENT, w === ONE_CARD_HUMAN ? "a" : "b");
    }
  };

  const startGame = () => {
    recorded.current = false;
    setState(newGame());
    setLog([]);
    setError(null);
    setDrawNote(null);
  };

  // 사람 차례 종료 후 CPU 자동 턴을 진행하고 다시 사람 차례/승자까지 반영한다.
  const advanceThroughCpu = (afterHuman: OneCardState) => {
    if (findOneCardWinner(afterHuman) !== null) {
      setLog([]);
      finalize(afterHuman);
      return;
    }
    const cpu = playOneCardCpuTurns(afterHuman, rng);
    setLog(cpu.log);
    finalize(cpu.state);
  };

  // 손패의 합법 카드를 낸다(불법·손패에 없는 카드는 domain throw를 사유로 표시).
  const playCard = (card: Card) => {
    if (!myTurn) return;
    setError(null);
    setDrawNote(null);
    let afterHuman: OneCardState;
    try {
      afterHuman = applyOneCardPlay(state, card);
    } catch (e) {
      setError(e instanceof Error ? e.message : "그 카드는 지금 낼 수 없습니다.");
      return;
    }
    advanceThroughCpu(afterHuman);
  };

  // 낼 카드가 없을 때 한 장 뽑는다(필요하면 재셔플 후). drawOneCard가 차례를 CPU로 넘긴다.
  const drawCard = () => {
    if (!myTurn) return;
    setError(null);
    setDrawNote(null);
    const reshuffled = reshuffleIfNeeded(state, rng);
    if (reshuffled.drawPile.length === 0) {
      // 재셔플 후에도 뽑을 카드가 없다(극히 드묾). 소프트락 방지로 안내만 한다.
      setError("더 뽑을 카드가 없습니다. 새 게임을 시작해 주세요.");
      return;
    }
    const drawn = reshuffled.drawPile[0]!;
    let afterDraw: OneCardState;
    try {
      afterDraw = drawOneCard(reshuffled);
    } catch (e) {
      setError(e instanceof Error ? e.message : "지금은 카드를 뽑을 수 없습니다.");
      return;
    }
    setDrawNote(`뽑은 카드: ${oneCardCardView(drawn).label}`);
    advanceThroughCpu(afterDraw);
  };

  return (
    <section className="game">
      <h2>원카드</h2>
      <p className="hint">
        버림더미 맨 위 카드와 <strong>같은 무늬 또는 같은 숫자</strong> 카드를 내는 1인 vs CPU
        카드 게임입니다. 낼 카드가 없으면 “한 장 뽑기”로 진행하세요. 손패를 먼저 모두 비우면
        이깁니다. 카드는 색뿐 아니라 무늬 기호(♠♥♦♣)와 숫자로 구분됩니다.
      </p>

      <div className="controls">
        <span className="hint">
          내 손패 {myHand.length}장 · CPU 손패 {cpuHandCount}장 · 드로우더미{" "}
          {state.drawPile.length}장
        </span>
        <button type="button" className="primary" onClick={startGame}>
          새 게임
        </button>
      </div>

      {finished ? (
        <p className="outcome">{oneCardOutcomeLabel(state)}</p>
      ) : (
        <p className="hint">{oneCardTurnLabel(state)}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* 버림더미 맨 위 카드(낼 기준). */}
      <div className="hand">
        <div className="hand-label">버림더미</div>
        <div className="hand-cards">
          <CardChip card={top} big />
        </div>
      </div>

      {/* 내 손패: 합법 카드만 활성. */}
      <div className="hand">
        <div className="hand-label">내 손패</div>
        <div className="hand-cards" role="group" aria-label="내 손패">
          {myHand.map((c, i) => (
            <button
              key={`${c.card.suit}-${c.card.rank}-${i}`}
              type="button"
              className={`card-chip${oneCardCardView(c.card).red ? " red" : ""}`}
              onClick={() => playCard(c.card)}
              disabled={!myTurn || !c.legal}
              aria-label={`${c.label}${c.legal ? " (낼 수 있음)" : " (낼 수 없음)"}`}
              title={c.legal ? "이 카드 내기" : "지금 낼 수 없는 카드"}
            >
              <span aria-hidden="true">{c.symbol}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="controls">
        <button
          type="button"
          onClick={drawCard}
          disabled={!myTurn || hasLegalPlay}
          title={
            hasLegalPlay
              ? "낼 수 있는 카드가 있으면 카드를 내세요"
              : "드로우더미에서 한 장 뽑기"
          }
        >
          한 장 뽑기
        </button>
        {myTurn && !hasLegalPlay && (
          <span className="hint">낼 카드가 없습니다 — 한 장 뽑으세요.</span>
        )}
      </div>

      {drawNote && <p className="hint">{drawNote}</p>}

      {/* CPU 자동 턴 로그. */}
      <div className="hand" role="log" aria-label="CPU 동작 기록">
        <div className="hand-label">CPU</div>
        <div>
          {log.length === 0 ? (
            <p className="hint">CPU 차례가 진행되면 동작이 여기에 표시됩니다.</p>
          ) : (
            <ul className="hint" style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {finished && (
        <div className="result">
          <p className="outcome">{oneCardOutcomeLabel(state)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

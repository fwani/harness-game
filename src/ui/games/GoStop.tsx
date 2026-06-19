import { useState, useSyncExternalStore } from "react";
import type { HwatuCard } from "../../domain/hwatu";
import { createHwatuDeck } from "../../domain/hwatu";
import type { GoStopFinalScore } from "../../domain/goStopBak";
import { scoreGoStopTotal } from "../../domain/goStopTotal";
import { canCallGo, GO_MIN_SCORE } from "../../domain/goStopGo";
import { shuffle, deal } from "../../application/dealCards";
import {
  settleGoStopShowdown,
  type GoStopShowdownResult,
} from "../../application/settleGoStopShowdown";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import {
  describeHwatuCard,
  buildGoStopScoreBreakdown,
  describeGoStopOutcome,
} from "./goStopView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

// 한 판 쇼다운용으로 양측에 따낸 패를 나눠줄 장수(데모: 점수·박이 의미 있게 나오도록 넉넉히).
const CARDS_PER_PLAYER = 12;
// 선택 가능한 「고」 횟수(0 이상 정수). 색이 아닌 텍스트 버튼으로 제공한다.
const GO_OPTIONS = [0, 1, 2, 3, 4, 5];
// CPU의 「고」 횟수는 결정적으로 0(고를 외치지 않음).
const CPU_GO_COUNT = 0;

function HwatuChip({ card }: { card: HwatuCard }) {
  const d = describeHwatuCard(card);
  // 월과 분류(광/열끗/띠/피)를 함께 표시 — 어떤 카드가 점수에 기여하는지 색이 아닌 텍스트로 알린다.
  return (
    <span className="card-chip" aria-label={d.label}>
      <span className="card-chip-month">{d.month}월</span>
      <span className="card-chip-category">{d.category}</span>
    </span>
  );
}

function CapturedPile({ label, cards }: { label: string; cards: HwatuCard[] }) {
  return (
    <div>
      <div className="hand-label">
        {label} · 따낸 패 {cards.length}장
      </div>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <HwatuChip key={`${card.month}-${card.index}-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

function ScoreLine({
  label,
  captured,
  score,
  goCount,
  winner,
}: {
  label: string;
  captured: HwatuCard[];
  score: GoStopFinalScore;
  goCount: number;
  winner: boolean;
}) {
  // 점수 산출 근거를 분해해 표시한다: 카드 기본 점수(광·열끗·띠·피) → 고 보너스 → 고 배수 → 박 배수 → 최종.
  const b = buildGoStopScoreBreakdown(captured, goCount, score);
  return (
    <div className="score-line">
      <p className="hint">
        <strong>{label}</strong> · 고 {b.goCount}회 · 최종 <strong>{b.total}점</strong>
        {b.flagLabels.length > 0 ? ` · ${b.flagLabels.join(" · ")}` : ""}
        {winner ? " · 승자" : ""}
      </p>
      <p className="score-breakdown">
        카드 {b.cardTotal}점 (광 {b.gwang} · 열끗 {b.yeol} · 띠 {b.tti} · 피 {b.pi}) · 고 보너스 +
        {b.goBonus} · 고 배수 ×{b.goMultiplier} · 박 배수 ×{b.bakMultiplier}
        <br />= ({b.cardTotal} + {b.goBonus}) × {b.goMultiplier} × {b.bakMultiplier} ={" "}
        {b.total}점
      </p>
    </div>
  );
}

export function GoStop() {
  const [piles, setPiles] = useState<{ a: HwatuCard[]; b: HwatuCard[] } | null>(null);
  const [goCount, setGoCount] = useState(0);
  const [result, setResult] = useState<GoStopShowdownResult | null>(null);
  // 고스톱 통산 전적("gostop")을 화면에 표시한다(저장 변경을 구독해 즉시 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "gostop");

  // 「고」는 표준 규칙대로 "날 수 있는 점수"(승점 GO_MIN_SCORE) 이상일 때만 외칠 수 있다.
  // 카드 점수와 무관하게 「고」로 일방 승리하던 결함(#537) 방지.
  const myBase = piles ? scoreGoStopTotal(piles.a) : 0;
  const goAllowed = piles ? canCallGo(myBase) : false;

  function startDeal() {
    const deck = shuffle(createHwatuDeck(), rng);
    const { hands } = deal(deck, 2, CARDS_PER_PLAYER);
    setPiles({ a: hands[0]!, b: hands[1]! });
    setGoCount(0);
    setResult(null);
  }

  function showdown() {
    if (!piles) {
      return;
    }
    const r = settleGoStopShowdown(
      { captured: piles.a, goCount },
      { captured: piles.b, goCount: CPU_GO_COUNT },
    );
    setResult(r);
    // 매치 단위로 한 번만 기록(쇼다운 확정 시점).
    // 표시(selfStreakSummary)와 기록이 동일 라벨을 쓰도록 SELF_PLAYER 상수 사용.
    recordGame("gostop", SELF_PLAYER, "CPU", r.winner);
  }

  function reset() {
    setPiles(null);
    setGoCount(0);
    setResult(null);
  }

  return (
    <section className="game">
      <h2>고스톱</h2>
      <p className="hint">
        양측이 따낸 화투 패로 한 판 점수를 겨룹니다. 「고」 횟수를 정하고 쇼다운하세요(광·열끗·띠·피 +
        고 보너스 · 광박/피박 배수).
      </p>

      {!piles && (
        <button className="primary" onClick={startDeal}>
          패 나누기
        </button>
      )}

      {piles && (
        <div className="result">
          <div className="versus">
            <CapturedPile label="나" cards={piles.a} />
            <span className="vs">vs</span>
            <CapturedPile label="CPU" cards={piles.b} />
          </div>

          {!result && (
            <>
              <p className="hint" id="go-count-label">
                내 카드 {myBase}점 · 내 「고」 횟수 선택 (CPU는 {CPU_GO_COUNT}회)
              </p>
              {!goAllowed && (
                <p className="hint">
                  「고」는 카드 점수가 승점({GO_MIN_SCORE}점) 이상일 때만 외칠 수 있습니다 (현재{" "}
                  {myBase}점). 점수가 모자라면 {GO_OPTIONS[0]}고로 쇼다운하세요.
                </p>
              )}
              <div className="hand-cards" role="group" aria-labelledby="go-count-label">
                {GO_OPTIONS.map((n) => {
                  // 0고는 항상 가능. 1고 이상은 승점 도달(goAllowed) 시에만 선택 가능.
                  const disabled = n > 0 && !goAllowed;
                  return (
                    <button
                      key={n}
                      className={n === goCount ? "tab active" : "tab"}
                      aria-pressed={n === goCount}
                      aria-disabled={disabled}
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) {
                          setGoCount(n);
                        }
                      }}
                    >
                      {n}고
                    </button>
                  );
                })}
              </div>
              <button className="primary" onClick={showdown}>
                쇼다운! (나 {goCount}고)
              </button>
            </>
          )}

          {result && (
            <>
              <ScoreLine
                label="나"
                captured={piles.a}
                score={result.a}
                goCount={goCount}
                winner={result.winner === "a"}
              />
              <ScoreLine
                label="CPU"
                captured={piles.b}
                score={result.b}
                goCount={CPU_GO_COUNT}
                winner={result.winner === "b"}
              />
              <p className="outcome">{describeGoStopOutcome(result, "a")}</p>
            </>
          )}

          <button className="primary" onClick={reset}>
            새 게임
          </button>
        </div>
      )}

      <StreakPanel title="고스톱 통산 전적 (나)" summary={streak} />
    </section>
  );
}

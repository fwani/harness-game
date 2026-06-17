import { useState, useSyncExternalStore } from "react";
import type { HwatuCard } from "../../domain/hwatu";
import { createHwatuDeck } from "../../domain/hwatu";
import type { GoStopFinalScore } from "../../domain/goStopBak";
import { shuffle, deal } from "../../application/dealCards";
import {
  settleGoStopShowdown,
  type GoStopShowdownResult,
} from "../../application/settleGoStopShowdown";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { formatGoStopFinalScore, describeGoStopOutcome } from "./goStopView";
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
  return <span className="card-chip">{card.month}월</span>;
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
  score,
  goCount,
  winner,
}: {
  label: string;
  score: GoStopFinalScore;
  goCount: number;
  winner: boolean;
}) {
  const d = formatGoStopFinalScore(score);
  return (
    <p className="hint">
      {label} · 고 {goCount}회 · 기본 {d.base}점 × 배수 {d.multiplier} = <strong>{d.total}점</strong>
      {d.flagLabels.length > 0 ? ` · ${d.flagLabels.join(" · ")}` : ""}
      {winner ? " · 승자" : ""}
    </p>
  );
}

export function GoStop() {
  const [piles, setPiles] = useState<{ a: HwatuCard[]; b: HwatuCard[] } | null>(null);
  const [goCount, setGoCount] = useState(0);
  const [result, setResult] = useState<GoStopShowdownResult | null>(null);
  // 고스톱 통산 전적("gostop")을 화면에 표시한다(저장 변경을 구독해 즉시 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "gostop");

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
                내 「고」 횟수 선택 (CPU는 {CPU_GO_COUNT}회)
              </p>
              <div className="hand-cards" role="group" aria-labelledby="go-count-label">
                {GO_OPTIONS.map((n) => (
                  <button
                    key={n}
                    className={n === goCount ? "tab active" : "tab"}
                    aria-pressed={n === goCount}
                    onClick={() => setGoCount(n)}
                  >
                    {n}고
                  </button>
                ))}
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
                score={result.a}
                goCount={goCount}
                winner={result.winner === "a"}
              />
              <ScoreLine
                label="CPU"
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

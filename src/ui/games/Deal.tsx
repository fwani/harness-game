import { useState } from "react";
import { createDeck, type Card, type Suit } from "../../domain/card";
import { shuffle, deal, type DealResult } from "../../application/dealCards";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import {
  validateDealInput,
  dealFailureMessage,
  MAX_PLAYERS,
  MAX_PER_PLAYER,
} from "./dealView";

const rng = new MathRandomSource();

const SUIT: Record<Suit, { sym: string; red: boolean }> = {
  spades: { sym: "♠", red: false },
  clubs: { sym: "♣", red: false },
  hearts: { sym: "♥", red: true },
  diamonds: { sym: "♦", red: true },
};

function CardChip({ card }: { card: Card }) {
  const s = SUIT[card.suit];
  return (
    <span className={s.red ? "card-chip red" : "card-chip"}>
      {card.rank}
      {s.sym}
    </span>
  );
}

export function Deal() {
  const [players, setPlayers] = useState(4);
  const [perPlayer, setPerPlayer] = useState(5);
  const [result, setResult] = useState<DealResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const deck = createDeck();
    // 잘못된 입력은 영어 내부 예외 대신 플레이어용 한국어 사유로 안내한다.
    const validation = validateDealInput(players, perPlayer, deck.length);
    if (!validation.ok) {
      setError(validation.reason);
      setResult(null);
      return;
    }
    try {
      const dealt = deal(shuffle(deck, rng), players, perPlayer);
      setResult(dealt);
      setError(null);
    } catch {
      // 검증을 통과했는데도 실패하면 한국어 폴백 메시지(영어 원문 노출 금지).
      setError(dealFailureMessage());
      setResult(null);
    }
  };

  return (
    <section className="game">
      <h2>카드 딜</h2>
      <p className="hint">52장 덱을 섞어 인원수만큼 나눠줍니다.</p>
      <div className="controls">
        <label>
          인원
          <input
            type="number"
            min={1}
            max={MAX_PLAYERS}
            value={players}
            onChange={(e) => setPlayers(Number(e.target.value))}
          />
        </label>
        <label>
          1인당
          <input
            type="number"
            min={0}
            max={MAX_PER_PLAYER}
            value={perPlayer}
            onChange={(e) => setPerPlayer(Number(e.target.value))}
          />
        </label>
        <button className="primary" onClick={run}>
          딜
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result">
          {result.hands.map((hand, i) => (
            <div key={i} className="hand">
              <span className="hand-label">P{i + 1}</span>
              <span className="hand-cards">
                {hand.map((c, j) => (
                  <CardChip key={j} card={c} />
                ))}
              </span>
            </div>
          ))}
          <p className="hint">남은 더미: {result.rest.length}장</p>
        </div>
      )}
    </section>
  );
}

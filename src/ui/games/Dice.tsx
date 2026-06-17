import { useState } from "react";
import { sumDice } from "../../domain/dice";
import { playDiceRound, type DiceRoundResult } from "../../application/playDiceRound";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { dieFace, diceOutcomeLabel } from "./diceView";

const rng = new MathRandomSource();

const DICE_COUNTS = [1, 2, 3, 4, 5] as const;

function DiceHand({ label, dice }: { label: string; dice: number[] }) {
  return (
    <div>
      <div className="hand-label">{label}</div>
      <div className="hand-cards">
        {dice.map((value, i) => (
          <span key={i} className="card-chip big" aria-label={`${value}`}>
            {dieFace(value)}
            {value}
          </span>
        ))}
      </div>
      <div className="dice-total">합계 {sumDice(dice)}</div>
    </div>
  );
}

export function Dice() {
  const [diceCount, setDiceCount] = useState<number>(2);
  const [round, setRound] = useState<DiceRoundResult | null>(null);

  const roll = (count: number) => {
    // result는 이미 "a"|"b"|"draw"(WinSide)이므로 그대로 전적에 전달한다.
    const result = playDiceRound(count, rng);
    setRound(result);
    recordGame("dice", "나", "CPU", result.result);
  };

  return (
    <section className="game">
      <h2>주사위</h2>
      <p className="hint">
        각자 주사위 {diceCount}개를 굴려 눈의 합이 큰 쪽이 이깁니다(같으면 무승부).
      </p>
      <div className="controls">
        <span className="hand-label">주사위 개수</span>
        {DICE_COUNTS.map((count) => (
          <button
            key={count}
            className={count === diceCount ? "tab active" : "tab"}
            aria-pressed={count === diceCount}
            onClick={() => setDiceCount(count)}
          >
            {count}
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => roll(diceCount)}>
        {round ? "다시 굴리기" : "굴리기"}
      </button>
      {round && (
        <div className="result">
          <div className="versus">
            <DiceHand label="나" dice={round.a} />
            <span className="vs">vs</span>
            <DiceHand label="CPU" dice={round.b} />
          </div>
          <p className="outcome">{diceOutcomeLabel(round.result)}</p>
        </div>
      )}
    </section>
  );
}

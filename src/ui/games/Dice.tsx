import { useState } from "react";
import { sumDice } from "../../domain/dice";
import { playDiceRound, type DiceRoundResult } from "../../application/playDiceRound";
import {
  playDiceCategoryRound,
  type DiceCategoryRoundResult,
} from "../../application/playDiceCategoryRound";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { dieFace, diceOutcomeLabel, formatDiceCategory } from "./diceView";
import type { DiceRollRank } from "../../domain/diceCategory";

const rng = new MathRandomSource();

const DICE_COUNTS = [1, 2, 3, 4, 5] as const;

// 족보 모드는 evaluateDiceRoll이 5개 굴림을 전제하므로 항상 5개를 굴린다.
const CATEGORY_DICE_COUNT = 5;

type Mode = "sum" | "category";

function DiceHand({ label, dice, rank }: { label: string; dice: number[]; rank?: DiceRollRank }) {
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
      {rank ? (
        <div className="dice-total">{formatDiceCategory(rank)}</div>
      ) : (
        <div className="dice-total">합계 {sumDice(dice)}</div>
      )}
    </div>
  );
}

export function Dice() {
  const [mode, setMode] = useState<Mode>("sum");
  const [diceCount, setDiceCount] = useState<number>(2);
  const [round, setRound] = useState<DiceRoundResult | null>(null);
  const [categoryRound, setCategoryRound] = useState<DiceCategoryRoundResult | null>(null);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    // 모드를 바꾸면 이전 모드의 결과 화면을 비워 혼동을 막는다.
    setRound(null);
    setCategoryRound(null);
  };

  const rollSum = (count: number) => {
    // result는 이미 "a"|"b"|"draw"(WinSide)이므로 그대로 전적에 전달한다.
    const result = playDiceRound(count, rng);
    setRound(result);
    recordGame("dice", "나", "CPU", result.result);
  };

  const rollCategory = () => {
    const result = playDiceCategoryRound(rng, CATEGORY_DICE_COUNT);
    setCategoryRound(result);
    recordGame("dice", "나", "CPU", result.result);
  };

  return (
    <section className="game">
      <h2>주사위</h2>
      <div className="controls" role="group" aria-label="게임 모드">
        <span className="hand-label">모드</span>
        <button
          className={mode === "sum" ? "tab active" : "tab"}
          aria-pressed={mode === "sum"}
          onClick={() => switchMode("sum")}
        >
          합계
        </button>
        <button
          className={mode === "category" ? "tab active" : "tab"}
          aria-pressed={mode === "category"}
          onClick={() => switchMode("category")}
        >
          족보(야추)
        </button>
      </div>

      {mode === "sum" ? (
        <>
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
          <button className="primary" onClick={() => rollSum(diceCount)}>
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
        </>
      ) : (
        <>
          <p className="hint">
            각자 주사위 {CATEGORY_DICE_COUNT}개를 굴려 족보(야추·포카드·풀하우스·스트레이트…)가
            높은 쪽이 이깁니다(같으면 합으로, 그래도 같으면 무승부).
          </p>
          <button className="primary" onClick={rollCategory}>
            {categoryRound ? "다시 굴리기" : "굴리기"}
          </button>
          {categoryRound && (
            <div className="result">
              <div className="versus">
                <DiceHand label="나" dice={categoryRound.a} rank={categoryRound.aRank} />
                <span className="vs">vs</span>
                <DiceHand label="CPU" dice={categoryRound.b} rank={categoryRound.bRank} />
              </div>
              <p className="outcome">{diceOutcomeLabel(categoryRound.result)}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

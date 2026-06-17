import { useState, useSyncExternalStore } from "react";
import { playRpsRound } from "../../application/playRps";
import { playMatch, type RoundOutcome } from "../../domain/match";
import type { Hand } from "../../domain/rps";
import { RandomHandSource } from "../../infrastructure/randomHandSource";
import { listRecords, recordGame, subscribe } from "../records";
import { summarizeStreakForGame } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  TARGET_OPTIONS,
  matchStatusLabel,
  roundOutcomeLabel,
  rpsResultToOutcome,
  seriesScoreLabel,
  targetLabel,
} from "./bestOfNView";

const CHOICES: { hand: Hand; emoji: string; label: string }[] = [
  { hand: "rock", emoji: "✊", label: "바위" },
  { hand: "paper", emoji: "✋", label: "보" },
  { hand: "scissors", emoji: "✌️", label: "가위" },
];

const cpu = new RandomHandSource();

const EMOJI: Record<Hand, string> = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
};

interface LastRound {
  a: Hand;
  b: Hand;
  outcome: RoundOutcome;
}

export function BestOfN() {
  const [targetWins, setTargetWins] = useState<number>(2);
  const [rounds, setRounds] = useState<RoundOutcome[]>([]);
  const [last, setLast] = useState<LastRound | null>(null);

  // 매치 단위로 기록되므로 전적 패널도 "rps-match" 기준으로 집계한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = summarizeStreakForGame(records, "rps-match", "나");

  // 시리즈 상태 판정은 도메인 playMatch에 위임한다(UI에서 재구현 금지).
  const status = playMatch(rounds, targetWins);

  const play = (hand: Hand) => {
    if (status.decided) return; // 매치 종료 후 추가 입력 차단.
    const result = playRpsRound({ choose: () => hand }, cpu);
    const outcome = rpsResultToOutcome(result.result);
    const nextRounds = [...rounds, outcome];
    setRounds(nextRounds);
    setLast({ a: result.a, b: result.b, outcome });
    // 이번 판으로 매치가 결정되면 매치 단위로 한 번만 기록한다(중복 기록 금지).
    const nextStatus = playMatch(nextRounds, targetWins);
    if (nextStatus.decided && nextStatus.winner) {
      recordGame("rps-match", "나", "CPU", nextStatus.winner);
    }
  };

  const resetMatch = () => {
    setRounds([]);
    setLast(null);
  };

  const chooseTarget = (target: number) => {
    // 선승 수를 바꾸면 새 매치로 시작한다(진행 중 점수를 다른 기준에 섞지 않음).
    setTargetWins(target);
    setRounds([]);
    setLast(null);
  };

  return (
    <section className="game">
      <h2>다전제</h2>
      <p className="hint">
        가위바위보로 CPU와 {targetWins}선승 시리즈를 겨룹니다. 먼저 {targetWins}판을
        이기는 쪽이 매치 승자이며, 무승부 판은 승수에 포함되지 않습니다.
      </p>

      <div className="controls">
        <span className="hand-label">선승 수</span>
        {TARGET_OPTIONS.map((target) => (
          <button
            key={target}
            type="button"
            className={target === targetWins ? "tab active" : "tab"}
            aria-pressed={target === targetWins}
            onClick={() => chooseTarget(target)}
          >
            {targetLabel(target)}
          </button>
        ))}
      </div>

      <p className="outcome" aria-live="polite">
        {seriesScoreLabel(status)}
      </p>
      <p className="hint" aria-live="polite">
        {matchStatusLabel(status, targetWins)}
      </p>

      <div className="choices">
        {CHOICES.map((c) => (
          <button
            key={c.hand}
            className="choice"
            onClick={() => play(c.hand)}
            disabled={status.decided}
          >
            <span className="emoji">{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {last && (
        <div className="result">
          <div className="versus">
            <span className="big">{EMOJI[last.a]}</span>
            <span className="vs">vs</span>
            <span className="big">{EMOJI[last.b]}</span>
          </div>
          <p className="outcome">{roundOutcomeLabel(last.outcome)}</p>
        </div>
      )}

      <button className="primary" type="button" onClick={resetMatch}>
        새 매치
      </button>

      <StreakPanel title="매치 전적 (나)" summary={streak} />
    </section>
  );
}

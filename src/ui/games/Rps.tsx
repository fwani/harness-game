import { useState, useSyncExternalStore } from "react";
import { playRpsRound, type RpsRoundResult } from "../../application/playRps";
import type { Hand } from "../../domain/rps";
import { RandomHandSource } from "../../infrastructure/randomHandSource";
import { listRecords, recordGame, subscribe } from "../records";
import { summarizeStreakForGame } from "./streakView";
import { StreakPanel } from "./StreakPanel";

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

const OUTCOME: Record<RpsRoundResult["result"], string> = {
  "a-win": "🎉 승리!",
  "b-win": "😢 패배",
  draw: "🤝 무승부",
};

export function Rps() {
  const [round, setRound] = useState<RpsRoundResult | null>(null);
  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = summarizeStreakForGame(records, "rps", "나");

  const play = (hand: Hand) => {
    const result = playRpsRound({ choose: () => hand }, cpu);
    setRound(result);
    recordGame(
      "rps",
      "나",
      "CPU",
      result.result === "a-win" ? "a" : result.result === "b-win" ? "b" : "draw",
    );
  };

  return (
    <section className="game">
      <h2>가위바위보</h2>
      <p className="hint">손을 선택하면 CPU와 한 판 겨룹니다.</p>
      <div className="choices">
        {CHOICES.map((c) => (
          <button key={c.hand} className="choice" onClick={() => play(c.hand)}>
            <span className="emoji">{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {round && (
        <div className="result">
          <div className="versus">
            <span className="big">{EMOJI[round.a]}</span>
            <span className="vs">vs</span>
            <span className="big">{EMOJI[round.b]}</span>
          </div>
          <p className="outcome">{OUTCOME[round.result]}</p>
        </div>
      )}
      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

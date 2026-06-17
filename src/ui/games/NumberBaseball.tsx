import { useState, useSyncExternalStore } from "react";
import {
  generateSecretBaseballNumber,
  playBaseballGuess,
  type BaseballGuessOutcome,
} from "../../application/playNumberBaseball";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { describeBaseballResult, parseGuessInput } from "./numberBaseballView";
import { summarizeStreakForGame } from "./streakView";
import { StreakPanel } from "./StreakPanel";

// 비밀 수 길이(서로 다른 0–9 숫자). 기본 3자리.
const LENGTH = 3;

// 난수는 infrastructure 어댑터로 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

interface GuessEntry {
  guess: number[];
  outcome: BaseballGuessOutcome;
}

export function NumberBaseball() {
  // 비밀 수는 마운트 시 한 번 생성하고, "새 게임"으로만 재생성한다.
  const [secret, setSecret] = useState<number[]>(() =>
    generateSecretBaseballNumber(rng, LENGTH),
  );
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = summarizeStreakForGame(records, "numberBaseball", "나");

  const won = history.length > 0 && history[history.length - 1]!.outcome.isWin;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (won) return;
    const parsed = parseGuessInput(input, LENGTH);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    // 파싱이 유효성을 보장하므로 playBaseballGuess는 throw하지 않는다.
    const outcome = playBaseballGuess(secret, parsed.digits);
    setHistory((prev) => [...prev, { guess: parsed.digits, outcome }]);
    setInput("");
    setError(null);
    if (outcome.isWin) {
      // 1인 추리 게임: 상대는 출제자 고정 라벨, 정답이면 내가 승(win="a").
      recordGame("numberBaseball", "나", "출제", "a");
    }
  };

  const newGame = () => {
    setSecret(generateSecretBaseballNumber(rng, LENGTH));
    setHistory([]);
    setInput("");
    setError(null);
  };

  return (
    <section className="game">
      <h2>숫자야구</h2>
      <p className="hint">
        서로 다른 {LENGTH}자리 숫자(0–9)를 맞혀보세요. 자리·숫자 일치는 S(스트라이크),
        숫자만 맞으면 B(볼), 하나도 없으면 아웃입니다.
      </p>

      <form className="controls" onSubmit={submit}>
        <label>
          추측
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={LENGTH + 4}
            value={input}
            disabled={won}
            placeholder={`예: ${LENGTH === 3 ? "012" : ""}`}
            onChange={(ev) => setInput(ev.target.value)}
            aria-label={`${LENGTH}자리 추측 입력`}
          />
        </label>
        <button className="primary" type="submit" disabled={won}>
          추측
        </button>
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <p className="hint">시도 {history.length}회</p>

      {won && (
        <div className="result">
          <p className="outcome">
            🎉 정답! 비밀 수는 <strong>{secret.join(" ")}</strong> 였습니다.
          </p>
          <p className="hint">{history.length}번 만에 맞혔습니다. 전적에 기록했습니다.</p>
        </div>
      )}

      {history.length > 0 && (
        <ol className="guess-history">
          {history.map((entry, i) => (
            <li key={i} className="guess-row">
              <span className="guess-no">#{i + 1}</span>
              <span className="guess-digits">{entry.guess.join(" ")}</span>
              <span className="guess-result">
                {describeBaseballResult(entry.outcome.result, LENGTH)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

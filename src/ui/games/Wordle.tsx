import { useState, useSyncExternalStore } from "react";
import {
  WORDLE_VALID_GUESSES,
  playWordleGuess,
  startWordleGame,
  type WordleStatus,
} from "../../application/playWordle";
import type { WordleState } from "../../domain/wordle";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  attemptsLabel,
  describeWordleStatus,
  guessGridRows,
  letterResultLegend,
  parseWordleGuess,
} from "./wordleView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function Wordle() {
  // 정답은 마운트 시 한 번 무작위 선택하고, "새 게임"으로만 재선택한다(정답 자체는 비노출).
  const [state, setState] = useState<WordleState>(() => startWordleGame(rng));
  const [status, setStatus] = useState<WordleStatus>("playing");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "wordle");

  const finished = status === "won" || status === "lost";
  const rows = guessGridRows(state);
  const legend = letterResultLegend();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finished) return;
    // 길이/비영문/사전 미등재는 화면에서 먼저 한국어로 안내한다(조용한 무시 금지). 보드는 불변,
    // 시도도 소진하지 않는다. 사전 미등재(예: ZXQVW 같은 비단어)는 표준 워들처럼 거른다.
    const parsed = parseWordleGuess(input, state.wordLength, WORDLE_VALID_GUESSES);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    // 채점·승패 판정은 application/도메인에 위임한다(재구현 금지).
    const result = playWordleGuess(state, parsed.guess);
    setState(result.state);
    setStatus(result.status);
    setInput("");
    setError(null);
    if (result.status === "won" || result.status === "lost") {
      // 1인 게임: 상대 라벨은 "시스템" 고정. 승리=내가 승(a), 패배=내가 패(b).
      recordGame("wordle", SELF_PLAYER, "시스템", result.status === "won" ? "a" : "b");
    }
  };

  const newGame = () => {
    setState(startWordleGame(rng));
    setStatus("playing");
    setInput("");
    setError(null);
  };

  return (
    <section className="game">
      <h2>워들</h2>
      <p className="hint">
        숨겨진 {state.wordLength}글자 영단어를 {state.maxAttempts}번 안에 맞혀보세요. 제출하면
        글자별로 적중(■)·존재(◧)·없음(·) 힌트를 줍니다.
      </p>

      <ul className="wordle-legend" aria-label="힌트 기호 안내">
        {legend.map((item) => (
          <li key={item.result}>
            <span className={`wordle-chip wordle-${item.result}`} aria-hidden="true">
              {item.symbol}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      <form className="controls" onSubmit={submit}>
        <label>
          추측
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={state.wordLength}
            value={input}
            disabled={finished}
            placeholder={`${state.wordLength}글자 영단어`}
            onChange={(ev) => setInput(ev.target.value)}
            aria-label={`${state.wordLength}글자 영단어 추측 입력`}
          />
        </label>
        <button className="primary" type="submit" disabled={finished}>
          제출
        </button>
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <p className="hint">{attemptsLabel(state)}</p>

      {finished ? (
        <p className="outcome">{describeWordleStatus(status, state.answer)}</p>
      ) : (
        <p className="hint">{describeWordleStatus(status, state.answer)}</p>
      )}

      {rows.length > 0 && (
        <div className="wordle-grid" role="group" aria-label="추측 히스토리">
          {rows.map((cells, r) => (
            <div key={r} className="wordle-row" aria-label={`${r + 1}번째 추측`}>
              {cells.map((cell, c) => (
                <span
                  key={c}
                  className={`wordle-cell wordle-${cell.result}`}
                  aria-label={cell.ariaLabel}
                >
                  <span className="wordle-letter" aria-hidden="true">
                    {cell.letter}
                  </span>
                  <span className="wordle-mark" aria-hidden="true">
                    {cell.symbol}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {finished && (
        <div className="result">
          <p className="outcome">{describeWordleStatus(status, state.answer)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

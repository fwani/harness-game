import { useState, useSyncExternalStore } from "react";
import {
  playHangmanGuess,
  startHangmanGame,
  type HangmanStatus,
} from "../../application/playHangman";
import type { HangmanState } from "../../domain/hangman";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  hangmanStatusLabel,
  letterButtons,
  maskedDisplay,
  remainingMisses,
  wrongLetters,
} from "./hangmanView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function Hangman() {
  // 정답 단어는 마운트 시 한 번 무작위 선택하고, "새 게임"으로만 재선택한다.
  const [state, setState] = useState<HangmanState>(() => startHangmanGame(rng));
  const [status, setStatus] = useState<HangmanStatus>("playing");

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "hangman");

  const finished = status === "won" || status === "lost";
  const buttons = letterButtons(state);
  const wrong = wrongLetters(state);

  const guess = (letter: string) => {
    if (finished) return;
    // 규칙·승패 판정은 application/도메인에 위임(재구현 금지). 비활성 버튼이라 불법 추측은 도달하지 않는다.
    const result = playHangmanGuess(state, letter);
    setState(result.state);
    setStatus(result.status);
    if (result.status === "won" || result.status === "lost") {
      // 1인 게임: 상대 라벨은 "시스템" 고정. 승리=내가 승(a), 패배=내가 패(b).
      recordGame("hangman", SELF_PLAYER, "시스템", result.status === "won" ? "a" : "b");
    }
  };

  const newGame = () => {
    setState(startHangmanGame(rng));
    setStatus("playing");
  };

  return (
    <section className="game">
      <h2>행맨</h2>
      <p className="hint">
        알파벳 버튼을 눌러 숨겨진 단어를 한 글자씩 추측하세요. 정답에 없는 글자를 고르면 기회가
        줄어들고, 기회를 모두 쓰기 전에 모든 글자를 맞히면 승리입니다.
      </p>

      <div className="controls">
        <span className="hint">
          남은 기회 <strong>{remainingMisses(state)}</strong> / {state.maxMisses}
        </span>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {finished ? (
        <p className="outcome">{hangmanStatusLabel(status)}</p>
      ) : (
        <p className="hint">{hangmanStatusLabel(status)}</p>
      )}

      <p className="hangman-word" aria-label={`현재 단어: ${maskedDisplay(state)}`}>
        {maskedDisplay(state)}
      </p>

      <p className="hint">
        오답 글자:{" "}
        {wrong.length > 0 ? (
          <strong>{wrong.join(", ")}</strong>
        ) : (
          <span>아직 없음</span>
        )}
      </p>

      <div className="hangman-keypad" role="group" aria-label="알파벳 키패드">
        {buttons.map(({ letter, disabled }) => (
          <button
            key={letter}
            type="button"
            className="key"
            onClick={() => guess(letter)}
            disabled={disabled}
            aria-label={`${letter} 추측`}
          >
            {letter}
          </button>
        ))}
      </div>

      {finished && (
        <div className="result">
          <p className="outcome">{hangmanStatusLabel(status)}</p>
          {status === "lost" && (
            <p className="hint">
              정답은 <strong>{state.answer}</strong> 였습니다.
            </p>
          )}
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

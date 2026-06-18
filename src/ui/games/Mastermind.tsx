import { useState, useSyncExternalStore } from "react";
import type { MastermindState, Peg } from "../../domain/mastermind";
import {
  MASTERMIND_DEFAULTS,
  playMastermindGuess,
  startMastermindGame,
  type MastermindStatus,
} from "../../application/playMastermind";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  describeMastermindStatus,
  feedbackLabel,
  pegHex,
  pegLabel,
  remainingGuessesLabel,
  validateGuess,
} from "./mastermindView";

// 무작위 비밀 코드 생성·한 추측 진행은 application(startMastermindGame/playMastermindGuess) +
// RandomSource 어댑터에 위임한다. 채점·승패 판정 규칙은 domain(mastermind)을 통해서만 호출하고
// UI에서 재구현하지 않는다(데드 코드/보기 전용 아님).
const rng = new MathRandomSource();

/** 단일 플레이 화면이 기록하는 상대 라벨(다른 1인 게임과 동일하게 "시스템" 고정). */
const OPPONENT = "시스템";

/** codeLength 길이의 빈(미입력) 핀 배열을 만든다. */
function emptyPins(codeLength: number): (Peg | null)[] {
  return Array.from({ length: codeLength }, () => null);
}

export function Mastermind() {
  const [state, setState] = useState<MastermindState>(() =>
    startMastermindGame(rng),
  );
  const [status, setStatus] = useState<MastermindStatus>("playing");
  const [pins, setPins] = useState<(Peg | null)[]>(() =>
    emptyPins(MASTERMIND_DEFAULTS.codeLength),
  );
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "mastermind");

  const view = describeMastermindStatus(state, status);
  const finished = view.over;

  const startGame = () => {
    const next = startMastermindGame(rng);
    setState(next);
    setStatus("playing");
    setPins(emptyPins(next.codeLength));
    setError(null);
  };

  // 색 팔레트 클릭: 가장 앞의 빈 칸을 그 색으로 채운다(이미 가득 차 있으면 무시).
  const placeColor = (color: Peg) => {
    if (finished) return;
    setError(null);
    setPins((prev) => {
      const idx = prev.findIndex((p) => p === null);
      if (idx === -1) return prev;
      const next = prev.slice();
      next[idx] = color;
      return next;
    });
  };

  // 핀 칸 클릭: 그 칸을 비운다(되돌리기).
  const clearSlot = (slot: number) => {
    if (finished) return;
    setError(null);
    setPins((prev) => {
      const next = prev.slice();
      next[slot] = null;
      return next;
    });
  };

  const clearAll = () => {
    if (finished) return;
    setError(null);
    setPins(emptyPins(state.codeLength));
  };

  const submit = () => {
    if (finished) return;
    // 불완전·불법 입력은 조용히 무시하지 않고 사유를 표시(시도 소진 없이 거부).
    const validation = validateGuess(state, pins);
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }
    let result: { state: MastermindState; status: MastermindStatus };
    try {
      result = playMastermindGuess(state, validation.guess);
    } catch (e) {
      setError(e instanceof Error ? e.message : "그 추측은 지금 제출할 수 없습니다.");
      return;
    }
    setState(result.state);
    setStatus(result.status);
    setPins(emptyPins(state.codeLength));
    setError(null);
    // 종료 시 전적 저장(단일 플레이). 정답=승(a)/시도 소진=패(b).
    if (result.status === "won") {
      recordGame("mastermind", SELF_PLAYER, OPPONENT, "a");
    } else if (result.status === "lost") {
      recordGame("mastermind", SELF_PLAYER, OPPONENT, "b");
    }
  };

  return (
    <section className="game">
      <h2>마스터마인드</h2>
      <p className="hint">
        숨겨진 {state.codeLength}칸 색 코드를 맞히는 1인 추리 게임입니다. 색을 골라 칸을 채우고
        제출하면, 정위치+정색(정위치)과 색만 맞은 개수(색만)를 피드백으로 받습니다. 칸은 색뿐
        아니라 기호(●/■/▲ 등)와 문자(A~{String.fromCharCode(64 + state.colorCount)})로도
        구분됩니다.
      </p>

      <div className="controls">
        <span className="hint">
          코드 {state.codeLength}칸 · 색 {state.colorCount}가지 · {remainingGuessesLabel(state)}
        </span>
        <button type="button" className="primary" onClick={startGame}>
          새 게임
        </button>
      </div>

      {finished ? (
        <p className="outcome">{view.message}</p>
      ) : (
        <p className="hint">{view.message}</p>
      )}

      {/* 패배 시 비밀 코드 공개(승리 시에는 공개하지 않음). */}
      {finished && !view.won && (
        <p className="hint" aria-label="비밀 코드 공개">
          비밀 코드:{" "}
          {state.secret.map((peg, i) => {
            const label = pegLabel(peg);
            return (
              <span
                key={i}
                className="peg"
                style={{ background: pegHex(peg) }}
                aria-label={`${i + 1}번 칸 색 ${label.text}`}
              >
                <span aria-hidden="true">
                  {label.symbol} {label.text}
                </span>
              </span>
            );
          })}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* 추측 이력: 위에서 아래로 누적(각 행: 핀 + exact/present 피드백). */}
      <div className="mastermind-history" role="list" aria-label="추측 이력">
        {state.guesses.length === 0 && (
          <p className="hint">아직 제출한 추측이 없습니다.</p>
        )}
        {state.guesses.map((entry, row) => (
          <div className="mastermind-row" role="listitem" key={row}>
            <span className="hint">{row + 1}.</span>
            <span className="mastermind-pegs">
              {entry.guess.map((peg, col) => {
                const label = pegLabel(peg);
                return (
                  <span
                    key={col}
                    className="peg"
                    style={{ background: pegHex(peg) }}
                    aria-label={`${col + 1}번 칸 색 ${label.text}`}
                  >
                    <span aria-hidden="true">
                      {label.symbol} {label.text}
                    </span>
                  </span>
                );
              })}
            </span>
            <span className="hint">{feedbackLabel(entry.feedback)}</span>
          </div>
        ))}
      </div>

      {/* 현재 입력 중인 추측 칸: 클릭하면 비운다. */}
      <div className="mastermind-current" role="group" aria-label="현재 추측 입력">
        {pins.map((peg, slot) => {
          const label = peg === null ? null : pegLabel(peg);
          return (
            <button
              key={slot}
              type="button"
              className="peg peg-slot"
              style={peg === null ? undefined : { background: pegHex(peg) }}
              onClick={() => clearSlot(slot)}
              disabled={finished || peg === null}
              aria-label={
                label
                  ? `${slot + 1}번 칸 색 ${label.text} (클릭하면 비움)`
                  : `${slot + 1}번 칸 비어 있음`
              }
            >
              <span aria-hidden="true">
                {label ? `${label.symbol} ${label.text}` : "·"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="controls palette" role="group" aria-label="색 선택">
        {Array.from({ length: state.colorCount }, (_, color) => {
          const label = pegLabel(color);
          return (
            <button
              key={color}
              type="button"
              className="flood-swatch"
              style={{ background: pegHex(color) }}
              onClick={() => placeColor(color)}
              disabled={finished}
              aria-label={`색 ${label.text} 선택`}
              title={`색 ${label.text}`}
            >
              <span aria-hidden="true">
                {label.symbol} {label.text}
              </span>
            </button>
          );
        })}
      </div>

      <div className="controls">
        <button
          type="button"
          className="primary"
          onClick={submit}
          disabled={finished}
        >
          추측 제출
        </button>
        <button type="button" onClick={clearAll} disabled={finished}>
          입력 초기화
        </button>
      </div>

      {finished && (
        <div className="result">
          <p className="outcome">{view.message}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

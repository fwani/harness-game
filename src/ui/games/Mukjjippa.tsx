import { useState, useSyncExternalStore } from "react";
import type { Hand } from "../../domain/rps";
import { createMukjjippaGame, type MukjjippaState } from "../../domain/mukjjippa";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  MUKJJIPPA_HANDS,
  mukjjippaAttackerLabel,
  mukjjippaHandLabel,
  mukjjippaOutcomeLabel,
  mukjjippaStageLabel,
  mukjjippaWinSide,
  playMukjjippaCpuRound,
} from "./mukjjippaView";

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

/** 화면 상태: 현재 게임 상태 + 마지막 라운드에 양측이 낸 손. */
interface ViewState {
  game: MukjjippaState;
  last: { a: Hand; b: Hand } | null;
}

function initialState(): ViewState {
  return { game: createMukjjippaGame(), last: null };
}

export function Mukjjippa() {
  const [state, setState] = useState<ViewState>(initialState);
  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "mukjjippa");

  const play = (hand: Hand) => {
    if (state.game.finished) {
      return; // 종료 후 입력 차단.
    }
    const result = playMukjjippaCpuRound(state.game, hand, rng);
    setState({ game: result.state, last: { a: result.a, b: result.b } });
    // 종료로 막 전환됐을 때 1회 전적을 기록한다(사람=a/CPU=b, 묵찌빠는 무승부 없음).
    if (result.state.finished) {
      const win = mukjjippaWinSide(result.state);
      if (win) {
        recordGame("mukjjippa", "나", "CPU", win);
      }
    }
  };

  const reset = () => setState(initialState());

  const outcome = mukjjippaOutcomeLabel(state.game);

  return (
    <section className="game">
      <h2>묵찌빠 (vs CPU)</h2>
      <p className="hint">
        묵(✊)·찌(✌️)·빠(✋)를 내세요. 먼저 가위바위보로 <strong>선공(공격자)</strong>을 정하고,
        공격자가 정해진 뒤 <strong>같은 손이 나오면 그 공격자가 승리</strong>합니다. 손이 다르면 이긴
        쪽이 새 공격자가 됩니다.
      </p>

      <dl className="status">
        <dt>단계</dt>
        <dd>{mukjjippaStageLabel(state.game)}</dd>
        <dt>공격자</dt>
        <dd>{mukjjippaAttackerLabel(state.game)}</dd>
      </dl>

      <div className="choices">
        {MUKJJIPPA_HANDS.map((c) => (
          <button
            key={c.hand}
            className="choice"
            onClick={() => play(c.hand)}
            disabled={state.game.finished}
            aria-label={`${c.label} 내기`}
          >
            <span className="emoji">{c.symbol}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {state.last && (
        <div className="result">
          <div className="versus">
            <span className="big" aria-label={`사람: ${mukjjippaHandLabel(state.last.a)}`}>
              {mukjjippaHandLabel(state.last.a)}
            </span>
            <span className="vs">vs</span>
            <span className="big" aria-label={`CPU: ${mukjjippaHandLabel(state.last.b)}`}>
              {mukjjippaHandLabel(state.last.b)}
            </span>
          </div>
          <p className="round-label">
            사람 {mukjjippaHandLabel(state.last.a)} · CPU {mukjjippaHandLabel(state.last.b)}
          </p>
        </div>
      )}

      {outcome && (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      )}

      <div className="controls">
        <button className="primary" onClick={reset}>
          새 게임
        </button>
      </div>

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

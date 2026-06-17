import { useState, useSyncExternalStore } from "react";
import {
  createSnakesAndLaddersGame,
  type SnakesAndLaddersState,
} from "../../domain/snakesAndLadders";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  SNL_CPU,
  SNL_HUMAN,
  describeSnlStatus,
  playSnlRound,
  snlPlayerLabel,
  snlPositionLabel,
  snlProgressRatio,
  snlTurnLabel,
  snlWinSide,
} from "./snakesAndLaddersView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function SnakesAndLadders() {
  const [state, setState] = useState<SnakesAndLaddersState>(() =>
    createSnakesAndLaddersGame(),
  );
  const [log, setLog] = useState<string[]>([]);

  // 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "snakesandladders");

  const finished = state.winner !== null;
  const myTurn = !finished && state.turn === SNL_HUMAN;

  // 종료로 막 전환됐을 때 1회만 전적 기록(사람=a/CPU=b). 이 게임엔 무승부가 없다.
  const finish = (over: SnakesAndLaddersState) => {
    setState(over);
    recordGame(
      "snakesandladders",
      snlPlayerLabel(SNL_HUMAN),
      snlPlayerLabel(SNL_CPU),
      snlWinSide(over.winner ?? SNL_HUMAN),
    );
  };

  const onRoll = () => {
    if (!myTurn) return; // 종료/CPU 차례엔 비활성이라 도달하지 않지만 방어적으로 차단.
    // 규칙·난수·CPU 진행은 application·domain에 위임(재구현 금지).
    const round = playSnlRound(state, rng);
    setLog(round.log);
    if (round.state.winner !== null) {
      finish(round.state);
    } else {
      setState(round.state);
    }
  };

  const newGame = () => {
    setState(createSnakesAndLaddersGame());
    setLog([]);
  };

  const players = [SNL_HUMAN, SNL_CPU] as const;

  return (
    <section className="game">
      <h2>뱀과 사다리 (vs CPU)</h2>
      <p className="hint">
        <strong>주사위 굴리기</strong>로 전진합니다. 사다리 바닥에 닿으면 위로 오르고, 뱀 머리에 닿으면
        아래로 미끄러집니다. 골(<strong>{state.size}</strong>칸)에 먼저 <strong>정확히</strong> 도달하면
        승리입니다(초과하면 제자리).
      </p>

      {finished ? (
        <p className="outcome" aria-live="polite">
          {describeSnlStatus(state)}
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {snlTurnLabel(state)} · {describeSnlStatus(state)}
        </p>
      )}

      <dl className="pig-scoreboard" aria-label="진행도">
        {players.map((p) => (
          <div key={p}>
            <dt>{snlPlayerLabel(p)}</dt>
            <dd>
              <strong>{snlPositionLabel(state, p)}</strong>
              <progress
                max={1}
                value={snlProgressRatio(state, p)}
                aria-label={`${snlPlayerLabel(p)} 진행도`}
              />
            </dd>
          </div>
        ))}
      </dl>

      <div className="controls">
        <button type="button" className="primary" onClick={onRoll} disabled={!myTurn}>
          주사위 굴리기
        </button>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {log.length > 0 && (
        <div className="pig-cpu-log">
          <h3>직전 라운드</h3>
          <ol aria-label="진행 로그">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>
      )}

      {finished && (
        <div className="result">
          <p className="outcome">{snlTurnLabel(state)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title={`내 전적 (${SELF_PLAYER})`} summary={streak} />
    </section>
  );
}

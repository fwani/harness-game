import { useState, useSyncExternalStore } from "react";
import { createPigGame, applyPigHold, type PigState } from "../../domain/pig";
import { rollPigDie } from "../../application/playPig";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  PIG_CPU,
  PIG_HUMAN,
  describePigStatus,
  formatPigCpuLog,
  pigDieLabel,
  pigPlayerLabel,
  pigTurnLabel,
  pigTurnTotalLabel,
  pigWinSide,
  runCpuPigTurn,
  type PigCpuLogEntry,
} from "./pigView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

/** 직전 내 굴림 표시(버스트 여부 포함). */
interface HumanRoll {
  die: number;
  busted: boolean;
}

export function Pig() {
  const [state, setState] = useState<PigState>(() => createPigGame());
  const [humanRoll, setHumanRoll] = useState<HumanRoll | null>(null);
  const [cpuLog, setCpuLog] = useState<PigCpuLogEntry[]>([]);

  // 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "pig");

  const finished = state.winner !== null;
  const myTurn = !finished && state.turn === PIG_HUMAN;

  // 종료로 막 전환됐을 때 1회만 전적 기록(사람=a/CPU=b). 표준 플레이엔 무승부 없음.
  const finish = (over: PigState) => {
    setState(over);
    recordGame(
      "pig",
      pigPlayerLabel(PIG_HUMAN),
      pigPlayerLabel(PIG_CPU),
      pigWinSide(over.winner ?? PIG_HUMAN),
    );
  };

  // 사람 행동 후 차례가 CPU로 넘어갔으면 CPU 한 턴을 끝까지 자동 진행한다.
  const advanceCpu = (afterHuman: PigState) => {
    const { state: afterCpu, log } = runCpuPigTurn(afterHuman, rng);
    setCpuLog(log);
    if (afterCpu.winner !== null) {
      finish(afterCpu);
    } else {
      setState(afterCpu);
    }
  };

  const onRoll = () => {
    if (!myTurn) return; // 종료/CPU 차례엔 비활성이라 도달하지 않지만 방어적으로 차단.
    // 규칙은 application(rollPigDie)·domain에 위임(재구현 금지).
    const result = rollPigDie(state, rng);
    setHumanRoll({ die: result.die, busted: result.busted });
    if (result.busted) {
      // 1 → 이번 턴 누계 소멸, 차례가 CPU로 전환된 상태. CPU 자동 진행.
      advanceCpu(result.state);
    } else {
      setState(result.state);
    }
  };

  const onHold = () => {
    if (!myTurn) return;
    const held = applyPigHold(state);
    setHumanRoll(null);
    if (held.winner !== null) {
      finish(held);
    } else {
      // 멈춤으로 점수 확정·차례 전환 → CPU 자동 진행.
      advanceCpu(held);
    }
  };

  const newGame = () => {
    setState(createPigGame());
    setHumanRoll(null);
    setCpuLog([]);
  };

  return (
    <section className="game">
      <h2>피그 (vs CPU)</h2>
      <p className="hint">
        자기 차례에 <strong>굴리기</strong>로 점수를 쌓고 <strong>멈추기</strong>로 확정합니다. 단, 1이
        나오면 이번 턴 누계가 모두 사라지고 차례가 넘어갑니다. 먼저 목표 점수에 도달하면 승리입니다.
      </p>

      {finished ? (
        <p className="outcome" aria-live="polite">
          {describePigStatus(state)}
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {pigTurnLabel(state)} · {describePigStatus(state)}
        </p>
      )}

      <dl className="pig-scoreboard" aria-label="점수판">
        <div>
          <dt>{pigPlayerLabel(PIG_HUMAN)}</dt>
          <dd>
            <strong>{state.scores[PIG_HUMAN]}</strong>점
          </dd>
        </div>
        <div>
          <dt>{pigPlayerLabel(PIG_CPU)}</dt>
          <dd>
            <strong>{state.scores[PIG_CPU]}</strong>점
          </dd>
        </div>
        <div>
          <dt>이번 턴 누계</dt>
          <dd>
            <strong>{state.turnTotal}</strong>점
          </dd>
        </div>
        <div>
          <dt>목표</dt>
          <dd>
            <strong>{state.target}</strong>점
          </dd>
        </div>
      </dl>

      <p className="hint" aria-live="polite">
        {pigTurnTotalLabel(state)}
      </p>

      {humanRoll && (
        <p
          className={humanRoll.busted ? "error" : "drawn"}
          role={humanRoll.busted ? "alert" : undefined}
          aria-live="polite"
        >
          내 굴림: <strong>{pigDieLabel(humanRoll.die)}</strong>
          {humanRoll.busted && " — 버스트! 이번 턴 누계가 사라졌습니다."}
        </p>
      )}

      <div className="controls">
        <button type="button" className="primary" onClick={onRoll} disabled={!myTurn}>
          굴리기
        </button>
        <button type="button" className="primary" onClick={onHold} disabled={!myTurn || state.turnTotal === 0}>
          멈추기
        </button>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {cpuLog.length > 0 && (
        <div className="pig-cpu-log">
          <h3>직전 CPU 턴</h3>
          <ol aria-label="CPU 진행 로그">
            {cpuLog.map((entry, i) => (
              <li key={i}>{formatPigCpuLog(entry)}</li>
            ))}
          </ol>
        </div>
      )}

      {finished && (
        <div className="result">
          <p className="outcome">{pigTurnLabel(state)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title={`내 전적 (${SELF_PLAYER})`} summary={streak} />
    </section>
  );
}

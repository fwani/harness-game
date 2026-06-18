import { useState, useSyncExternalStore } from "react";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe, type WinSide } from "../records";
import {
  playYutRound,
  playYutCaptureRound,
  throwsLabel,
  yutOutcomeLabel,
  YUT_FINISH,
  type YutRoundResult,
  type YutCaptureRoundResult,
} from "./yutView";
import { selfStreakSummary, SELF_PLAYER } from "./streakView";
import { StreakPanel } from "./StreakPanel";

const rng = new MathRandomSource();

type Mode = "simple" | "capture";

function ProgressRow({ label, traveled }: { label: string; traveled: number }) {
  const pct = Math.round((traveled / YUT_FINISH) * 100);
  const finished = traveled >= YUT_FINISH;
  return (
    <div className="yut-row">
      <div className="hand-label">{label}</div>
      <div className="yut-track" role="img" aria-label={`${label} ${traveled}/${YUT_FINISH}칸`}>
        <div className="yut-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="yut-count">{finished ? "완주 🏁" : `${traveled}/${YUT_FINISH}`}</div>
    </div>
  );
}

export function Yut() {
  const [mode, setMode] = useState<Mode>("capture");
  const [myTraveled, setMyTraveled] = useState(0);
  const [cpuTraveled, setCpuTraveled] = useState(0);
  const [last, setLast] = useState<YutRoundResult | null>(null);
  const [lastCapture, setLastCapture] = useState<YutCaptureRoundResult | null>(null);
  const [winner, setWinner] = useState<WinSide | null>(null);
  // 윷놀이 통산 전적("yut")을 화면에 표시한다(두 모드 공유).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "yut");

  const over = winner !== null;

  const newGame = () => {
    setMyTraveled(0);
    setCpuTraveled(0);
    setLast(null);
    setLastCapture(null);
    setWinner(null);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    newGame();
  };

  const throwSimple = () => {
    if (over) return;
    const result = playYutRound(myTraveled, cpuTraveled, rng);
    setMyTraveled(result.myTraveled);
    setCpuTraveled(result.cpuTraveled);
    setLast(result);
    if (result.winner !== null) {
      setWinner(result.winner);
      recordGame("yut", SELF_PLAYER, "CPU", result.winner);
    }
  };

  const throwCapture = () => {
    if (over) return;
    const result = playYutCaptureRound(myTraveled, cpuTraveled, rng);
    setMyTraveled(result.myTraveled);
    setCpuTraveled(result.cpuTraveled);
    setLastCapture(result);
    if (result.winner !== null) {
      setWinner(result.winner);
      recordGame("yut", SELF_PLAYER, "CPU", result.winner);
    }
  };

  return (
    <section className="game">
      <h2>윷놀이 ({mode === "capture" ? "잡기 경주" : "단순 경주"})</h2>

      <div className="controls" role="group" aria-label="게임 모드">
        <span className="hand-label">모드</span>
        <button
          className={mode === "capture" ? "tab active" : "tab"}
          aria-pressed={mode === "capture"}
          onClick={() => switchMode("capture")}
        >
          잡기 경주
        </button>
        <button
          className={mode === "simple" ? "tab active" : "tab"}
          aria-pressed={mode === "simple"}
          onClick={() => switchMode("simple")}
        >
          단순 경주
        </button>
      </div>

      <p className="hint">
        {mode === "capture"
          ? `윷을 던져 말을 외곽 ${YUT_FINISH}칸 먼저 완주시키면 승리. 상대와 같은 칸에 멈추면 상대 말을 잡아 출발점으로 보내고 한 번 더 던집니다(출발점·완주는 안전). 윷·모도 한 번 더!`
          : `윷을 던져 말을 외곽 ${YUT_FINISH}칸 먼저 완주시키면 승리(윷·모는 한 번 더 던집니다). 내가 던진 뒤 CPU가 자동으로 던집니다.`}
      </p>

      <div className="yut-board">
        <ProgressRow label="나" traveled={myTraveled} />
        <ProgressRow label="CPU" traveled={cpuTraveled} />
      </div>

      <p className="hint" aria-live="polite">
        {over ? "게임 종료 — 다시 시작하려면 새 게임을 누르세요." : "내 차례입니다."}
      </p>

      <div className="controls">
        <button
          className="primary"
          onClick={mode === "capture" ? throwCapture : throwSimple}
          disabled={over}
        >
          윷 던지기
        </button>
        <button className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {mode === "simple" && last && (
        <div className="result">
          <div className="yut-throws">
            <div className="yut-row">
              <div className="hand-label">나</div>
              <div className="yut-throw-label">{throwsLabel(last.myTurn.throws)}</div>
            </div>
            <div className="yut-row">
              <div className="hand-label">CPU</div>
              <div className="yut-throw-label">
                {last.cpuTurn ? throwsLabel(last.cpuTurn.throws) : "—"}
              </div>
            </div>
          </div>
          {over && <p className="outcome">{yutOutcomeLabel(winner)}</p>}
        </div>
      )}

      {mode === "capture" && lastCapture && (
        <div className="result">
          <div className="yut-throws">
            <div className="yut-row">
              <div className="hand-label">나</div>
              <div className="yut-throw-label">{throwsLabel(lastCapture.myThrows)}</div>
            </div>
            <div className="yut-row">
              <div className="hand-label">CPU</div>
              <div className="yut-throw-label">
                {lastCapture.cpuThrows ? throwsLabel(lastCapture.cpuThrows) : "—"}
              </div>
            </div>
          </div>
          {lastCapture.myCaptured && (
            <p className="hint" aria-live="polite">
              ✊ 내가 CPU 말을 잡았습니다(출발점으로) — 한 번 더!
            </p>
          )}
          {lastCapture.cpuCaptured && (
            <p className="hint" aria-live="polite">
              💥 CPU가 내 말을 잡았습니다(출발점으로) — CPU가 한 번 더!
            </p>
          )}
          {over && <p className="outcome">{yutOutcomeLabel(winner)}</p>}
        </div>
      )}

      <StreakPanel title="윷놀이 통산 전적 (나)" summary={streak} />
    </section>
  );
}

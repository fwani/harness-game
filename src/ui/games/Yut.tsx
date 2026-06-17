import { useState } from "react";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame, type WinSide } from "../records";
import {
  playYutRound,
  throwsLabel,
  yutOutcomeLabel,
  YUT_FINISH,
  type YutRoundResult,
} from "./yutView";

const rng = new MathRandomSource();

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
  const [myTraveled, setMyTraveled] = useState(0);
  const [cpuTraveled, setCpuTraveled] = useState(0);
  const [last, setLast] = useState<YutRoundResult | null>(null);
  const [winner, setWinner] = useState<WinSide | null>(null);

  const over = winner !== null;

  const throwYut = () => {
    if (over) return;
    const result = playYutRound(myTraveled, cpuTraveled, rng);
    setMyTraveled(result.myTraveled);
    setCpuTraveled(result.cpuTraveled);
    setLast(result);
    if (result.winner !== null) {
      setWinner(result.winner);
      recordGame("yut", "나", "CPU", result.winner);
    }
  };

  const newGame = () => {
    setMyTraveled(0);
    setCpuTraveled(0);
    setLast(null);
    setWinner(null);
  };

  return (
    <section className="game">
      <h2>윷놀이</h2>
      <p className="hint">
        윷을 던져 말을 외곽 {YUT_FINISH}칸 먼저 완주시키면 승리(윷·모는 한 번 더 던집니다).
        내가 던진 뒤 CPU가 자동으로 던집니다.
      </p>

      <div className="yut-board">
        <ProgressRow label="나" traveled={myTraveled} />
        <ProgressRow label="CPU" traveled={cpuTraveled} />
      </div>

      <p className="hint" aria-live="polite">
        {over ? "게임 종료 — 다시 시작하려면 새 게임을 누르세요." : "내 차례입니다."}
      </p>

      <div className="controls">
        <button className="primary" onClick={throwYut} disabled={over}>
          윷 던지기
        </button>
        <button className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {last && (
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
    </section>
  );
}

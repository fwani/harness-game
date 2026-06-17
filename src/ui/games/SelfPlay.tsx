import { useState } from "react";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import type { EngineGameResult } from "../../application/playEngineGame";
import { boardGridStyle } from "./boardView";
import {
  SELF_PLAY_GAMES,
  runSelfPlay,
  describeSelfPlayResult,
  selfPlayBoard,
  type SelfPlayGameKey,
} from "./selfPlayView";

/** 자동 대국 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

const STONE = { black: "●", white: "○" } as const;

export function SelfPlay() {
  const [game, setGame] = useState<SelfPlayGameKey>("gomoku");
  const [result, setResult] = useState<EngineGameResult<unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = SELF_PLAY_GAMES.find((g) => g.key === game)!;

  const run = () => {
    try {
      setResult(runSelfPlay(game, rng));
      setError(null);
    } catch {
      setResult(null);
      setError("자동 대국을 끝까지 진행하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const select = (key: SelfPlayGameKey) => {
    setGame(key);
    setResult(null);
    setError(null);
  };

  const summary = result ? describeSelfPlayResult(result) : null;
  const board = result ? selfPlayBoard(result) : [];

  return (
    <section className="game">
      <h2>관전 (자동 대국)</h2>
      <p className="hint">
        보드 게임을 골라 CPU끼리 한 판을 끝까지 자동으로 두게 하고 결과를 확인합니다.
      </p>
      <div className="controls" role="group" aria-label="게임 선택">
        {SELF_PLAY_GAMES.map((g) => (
          <button
            key={g.key}
            className={g.key === game ? "primary" : ""}
            onClick={() => select(g.key)}
            aria-pressed={g.key === game}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="controls">
        <button className="primary" onClick={run}>
          {result || error ? "다시 돌리기" : "자동 대국 시작"}
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <>
          <p className="outcome">
            {meta.label} · 종료 · <strong>{summary.outcome}</strong> · {summary.moves}
          </p>
          <div
            className={`board ${meta.boardClass}`.trim()}
            style={boardGridStyle(meta.size)}
            role="img"
            aria-label={`${meta.label} 최종 보드`}
          >
            {board.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x},${y}`}
                  className="cell"
                  aria-hidden="true"
                >
                  {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
                </div>
              )),
            )}
          </div>
        </>
      )}
    </section>
  );
}

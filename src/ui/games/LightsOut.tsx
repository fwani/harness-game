import { useState, useSyncExternalStore } from "react";
import { createScrambledLightsOut } from "../../application/createScrambledLightsOut";
import {
  isLightsOutSolved,
  pressLight,
  type LightsOutBoard,
} from "../../domain/lightsOut";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  DEFAULT_LIGHTS_OUT_SIZE,
  LIGHTS_OUT_SIZES,
  describeLightsOutStatus,
  lightsOutCellViews,
  litCountLabel,
  moveCountLabel,
  sizeLabel,
  type LightsOutSize,
} from "./lightsOutView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function LightsOut() {
  const [size, setSize] = useState<LightsOutSize>(DEFAULT_LIGHTS_OUT_SIZE);
  // 시작 상태는 application 헬퍼로 항상 풀이 가능(solvable)·미완성 보드를 만든다.
  const [board, setBoard] = useState<LightsOutBoard>(() =>
    createScrambledLightsOut(DEFAULT_LIGHTS_OUT_SIZE, rng),
  );
  const [moves, setMoves] = useState(0);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "lightsout");

  const solved = isLightsOutSolved(board);
  const status = describeLightsOutStatus(board, moves);
  const cells = lightsOutCellViews(board);

  const press = (row: number, col: number) => {
    if (solved) return; // 클리어 후 입력 차단.
    const next = pressLight(board, { row, col });
    setBoard(next);
    setMoves((m) => m + 1);
    if (isLightsOutSolved(next)) {
      // 단일 플레이: 상대 라벨은 "시스템" 고정. 클리어=승(a)만 기록한다.
      recordGame("lightsout", SELF_PLAYER, "시스템", "a");
    }
  };

  const reshuffle = (nextSize: LightsOutSize) => {
    setSize(nextSize);
    setBoard(createScrambledLightsOut(nextSize, rng));
    setMoves(0);
  };

  return (
    <section className="game">
      <h2>라이트 아웃</h2>
      <p className="hint">
        칸을 클릭(또는 Enter/Space)하면 그 칸과 상하좌우 인접 칸의 불이 토글됩니다. 모든 칸의
        불을 끄면 클리어입니다.
      </p>

      <div className="controls" role="group" aria-label="보드 크기 선택">
        <span className="hint">크기</span>
        {LIGHTS_OUT_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className={s === size ? "primary" : undefined}
            aria-pressed={s === size}
            onClick={() => reshuffle(s)}
          >
            {sizeLabel(s)}
          </button>
        ))}
        <button type="button" onClick={() => reshuffle(size)}>
          새 게임
        </button>
      </div>

      <p className="hint">
        {moveCountLabel(moves)} · {litCountLabel(board)}
      </p>

      {solved ? (
        <p className="outcome">{status}</p>
      ) : (
        <p className="hint">{status}</p>
      )}

      <div
        className="board lightsout"
        role="grid"
        aria-label={`라이트 아웃 ${sizeLabel(size)} 보드`}
        style={boardGridStyle(size, 56)}
      >
        {cells.map((rowCells) =>
          rowCells.map((cell) => (
            <button
              key={`${cell.row}-${cell.col}`}
              type="button"
              role="gridcell"
              className={`cell lo-cell ${cell.lit ? "lo-on" : "lo-off"}`}
              onClick={() => press(cell.row, cell.col)}
              disabled={solved}
              aria-label={cell.ariaLabel}
              aria-pressed={cell.lit}
            >
              <span aria-hidden="true">{cell.symbol}</span>
            </button>
          )),
        )}
      </div>

      {solved && (
        <div className="result">
          <p className="outcome">{status}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

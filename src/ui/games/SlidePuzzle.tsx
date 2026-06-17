import { useState, useSyncExternalStore } from "react";
import { createShuffledSlidePuzzle } from "../../application/createShuffledSlidePuzzle";
import {
  applySlidePuzzleMove,
  isSlidePuzzleSolved,
  type SlidePuzzleState,
} from "../../domain/slidePuzzle";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  DEFAULT_SLIDE_PUZZLE_SIZE,
  SLIDE_PUZZLE_SIZES,
  describeSlidePuzzleStatus,
  moveCountLabel,
  sizeLabel,
  slidePuzzleCells,
  type SlidePuzzleSize,
} from "./slidePuzzleView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function SlidePuzzle() {
  const [size, setSize] = useState<SlidePuzzleSize>(DEFAULT_SLIDE_PUZZLE_SIZE);
  // 시작 상태는 application 헬퍼로 항상 풀이 가능(solvable)·미완성 배치를 만든다.
  const [state, setState] = useState<SlidePuzzleState>(() =>
    createShuffledSlidePuzzle(DEFAULT_SLIDE_PUZZLE_SIZE, rng),
  );
  const [moves, setMoves] = useState(0);
  // 불법 클릭(빈 칸과 인접하지 않은 타일) 사유 — 조용히 무시하지 않고 표시한다.
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "slidepuzzle");

  const solved = isSlidePuzzleSolved(state);
  const status = describeSlidePuzzleStatus(solved);
  const cells = slidePuzzleCells(state);

  const moveTile = (tile: number) => {
    if (solved) return; // 클리어 후 입력 차단.
    try {
      const next = applySlidePuzzleMove(state, { tile });
      setState(next);
      setMoves((m) => m + 1);
      setError(null);
      if (isSlidePuzzleSolved(next)) {
        // 단일 플레이: 상대 라벨은 "시스템" 고정. 클리어=승(a)만 기록한다.
        recordGame("slidepuzzle", SELF_PLAYER, "시스템", "a");
      }
    } catch (e) {
      // 도메인 에러 메시지를 그대로 사유로 노출(불법 수: 인접하지 않은 타일 등).
      setError(e instanceof Error ? e.message : "이 타일은 밀 수 없습니다.");
    }
  };

  const reshuffle = (nextSize: SlidePuzzleSize) => {
    setSize(nextSize);
    setState(createShuffledSlidePuzzle(nextSize, rng));
    setMoves(0);
    setError(null);
  };

  return (
    <section className="game">
      <h2>슬라이드 퍼즐</h2>
      <p className="hint">
        빈 칸과 맞닿은 타일을 클릭(또는 Enter/Space)해 빈 칸으로 밀어 넣습니다. 타일을 1부터
        순서대로 배열하고 빈 칸을 맨 끝에 두면 클리어입니다.
      </p>

      <div className="controls" role="group" aria-label="퍼즐 크기 선택">
        <span className="hint">크기</span>
        {SLIDE_PUZZLE_SIZES.map((s) => (
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

      <p className="hint">{moveCountLabel(moves)}</p>

      {solved ? (
        <p className="outcome">{status.message}</p>
      ) : (
        <p className="hint">{status.message}</p>
      )}

      <div
        className="board slidepuzzle"
        role="grid"
        aria-label={`슬라이드 퍼즐 ${sizeLabel(size)} 보드`}
        style={boardGridStyle(size, 56)}
      >
        {cells.map((cell) =>
          cell.isBlank ? (
            <div
              key={cell.index}
              role="gridcell"
              className="cell sp-cell sp-blank"
              aria-label={cell.ariaLabel}
            />
          ) : (
            <button
              key={cell.index}
              type="button"
              role="gridcell"
              className={`cell sp-cell sp-tile${cell.movable ? " sp-movable" : ""}`}
              onClick={() => moveTile(cell.tile)}
              disabled={solved}
              aria-label={cell.ariaLabel}
            >
              {cell.label}
            </button>
          ),
        )}
      </div>

      {error && !solved && <p className="error">{error}</p>}

      {solved && (
        <div className="result">
          <p className="outcome">{status.message}</p>
          <p className="hint">
            {moveCountLabel(moves)}회 만에 완성했습니다. 전적에 기록했습니다. 새 게임으로 다시
            도전하세요.
          </p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

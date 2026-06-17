import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  startMemoryGame,
  playMemoryAttempt,
  type MemoryGameState,
} from "../../application/playMemory";
import type { MemoryBoard } from "../../domain/memoryMatch";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  describeMemoryStatus,
  memoryCardView,
  memoryProgressLabel,
} from "./memoryMatchView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

// 미스매치 카드를 다시 덮기 전, 두 장을 잠깐 보여주는 지연(ms).
const RESOLVE_DELAY_MS = 800;

// 간단한 난이도 선택지. 격자 배치(열 수)는 UI 책임이며 좁은 화면 대응은 boardGridStyle이 맡는다.
const LEVELS = [
  { key: "easy", label: "쉬움 (6쌍)", pairs: 6, cols: 4 },
  { key: "normal", label: "보통 (8쌍)", pairs: 8, cols: 4 },
] as const;
type LevelKey = (typeof LEVELS)[number]["key"];

export function MemoryMatch() {
  const [levelKey, setLevelKey] = useState<LevelKey>("normal");
  const level = LEVELS.find((l) => l.key === levelKey)!;

  const [state, setState] = useState<MemoryGameState>(() => startMemoryGame(level.pairs, rng));
  // 사용자가 이번 시도에서 뒤집어 보여주는(아직 판정 전) 카드 인덱스(0·1·2장). 순수 표시용 상태이며
  // 도메인 보드는 판정(playMemoryAttempt) 시점에만 갱신한다.
  const [revealed, setRevealed] = useState<number[]>([]);
  // 미스매치 카드를 다시 덮기까지의 대기 동안 추가 클릭을 막는다.
  const [locked, setLocked] = useState(false);

  // 컴포넌트 언마운트/리셋 시 대기 중인 타이머를 정리한다(누수·잘못된 setState 방지).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
  }, []);

  // 클리어 시 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "memory");

  const over = state.over;
  const status = describeMemoryStatus(over, state.attempts, level.pairs);

  // 표시용 보드: 도메인 보드에 "이번 시도에 뒤집어 보여주는" 카드를 up으로 덮어쓴다(도메인 불변).
  const displayBoard: MemoryBoard = state.board.map((card, i) =>
    revealed.includes(i) && card.status === "down" ? { ...card, status: "up" } : card,
  );

  const startLevel = (pairs: number) => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setState(startMemoryGame(pairs, rng));
    setRevealed([]);
    setLocked(false);
  };

  const newGame = () => startLevel(level.pairs);

  const switchLevel = (next: LevelKey) => {
    if (next === levelKey) {
      return;
    }
    setLevelKey(next);
    const target = LEVELS.find((l) => l.key === next)!;
    startLevel(target.pairs);
  };

  const pick = (index: number) => {
    // 종료·판정 대기 중·이미 뒤집힌/매치된 카드 클릭은 막는다(무시가 아니라 차단).
    if (over || locked) {
      return;
    }
    if (state.board[index]!.status !== "down" || revealed.includes(index)) {
      return;
    }

    if (revealed.length === 0) {
      // 첫 장: 앞면을 보여준다(도메인 보드는 아직 그대로).
      setRevealed([index]);
      return;
    }

    // 둘째 장: 두 장을 보여준 뒤 짧은 지연 후 application으로 판정한다.
    const first = revealed[0]!;
    setRevealed([first, index]);
    setLocked(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      const { state: next } = playMemoryAttempt(state, first, index);
      setState(next);
      setRevealed([]);
      setLocked(false);
      if (next.over) {
        // 단일 플레이어 퍼즐: 클리어=승으로 기록(지뢰찾기 win 처리 방식과 동일).
        recordGame("memory", SELF_PLAYER, "시스템", "a");
      }
    }, RESOLVE_DELAY_MS);
  };

  return (
    <section className="game">
      <h2>메모리 (짝 맞추기)</h2>
      <p className="hint">
        카드 두 장을 클릭(또는 Enter/Space)해 뒤집습니다. 같은 그림이면 짝으로 남고, 다르면 다시
        덮입니다. 모든 짝을 찾으면 클리어입니다.
      </p>

      <div className="controls" role="group" aria-label="난이도 선택">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            className={l.key === levelKey ? "primary" : ""}
            onClick={() => switchLevel(l.key)}
            aria-pressed={l.key === levelKey}
          >
            {l.label}
          </button>
        ))}
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className="hint" aria-live="polite">
        {memoryProgressLabel(state.attempts, state.matchedPairs, level.pairs)}
      </p>

      {over ? (
        <p className="outcome">{status.message}</p>
      ) : (
        <p className="hint" aria-live="polite">
          {status.message}
        </p>
      )}

      <div
        className="board memory"
        role="grid"
        aria-label="메모리 카드 보드"
        style={boardGridStyle(level.cols)}
      >
        {displayBoard.map((card, i) => {
          const view = memoryCardView(card, i);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`cell memory-card memory-${view.status}`}
              onClick={() => pick(i)}
              disabled={over || locked || !view.selectable}
              aria-label={view.ariaLabel}
            >
              {view.content || (view.status === "down" ? "?" : "")}
            </button>
          );
        })}
      </div>

      {over && (
        <div className="result">
          <p className="outcome">{status.message}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

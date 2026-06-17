import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { play2048, startGame } from "../../application/play2048";
import type { Board, Direction } from "../../domain/game2048";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  describe2048Status,
  formatScore,
  highestTile,
  mapKeyToDirection,
} from "./game2048View";

// 난수는 infrastructure 어댑터로 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

// 방향 버튼 정의(텍스트 화살표 + 접근성 라벨). 색이 아니라 기호/라벨로 구분한다.
const DPAD: { dir: Direction; symbol: string; label: string }[] = [
  { dir: "up", symbol: "↑", label: "위로" },
  { dir: "left", symbol: "←", label: "왼쪽으로" },
  { dir: "down", symbol: "↓", label: "아래로" },
  { dir: "right", symbol: "→", label: "오른쪽으로" },
];

export function Game2048() {
  // 보드/누적 점수는 "새 게임"으로만 초기화한다. 마운트 시 초기 타일 2개를 스폰한다.
  const [board, setBoard] = useState<Board>(() => startGame(rng));
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<{ won: boolean; over: boolean }>({
    won: false,
    over: false,
  });
  // 마지막 입력이 막힌(변화 없는) 방향이었는지 — 잘못된 입력 피드백용.
  const [blocked, setBlocked] = useState(false);

  // 키 핸들러가 보드 div에 걸려 있어 포커스가 있어야 화살표 키가 동작한다.
  // 클릭 없이도 바로 조작 가능하도록 마운트·"새 게임" 직후 보드에 자동 포커스를 준다.
  const boardRef = useRef<HTMLDivElement>(null);
  const focusBoard = () => boardRef.current?.focus({ preventScroll: true });
  useEffect(() => {
    focusBoard();
  }, []);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "game2048");

  const finished = status.won || status.over;
  const outcome = describe2048Status(status.won, status.over);

  const move = (dir: Direction) => {
    if (finished) return;
    const result = play2048(board, dir, rng);
    if (!result.moved) {
      // 막힌/불가능한 방향: 보드 불변, 피드백만 표시한다.
      setBlocked(true);
      return;
    }
    setBlocked(false);
    setBoard(result.board);
    setScore((prev) => prev + result.gained);
    if (result.won || result.over) {
      setStatus({ won: result.won, over: result.over });
      // 1인 게임: 상대 라벨은 "시스템" 고정. 목표 도달이면 승(a), 못 움직이면 패(b).
      recordGame("game2048", SELF_PLAYER, "시스템", result.won ? "a" : "b");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = mapKeyToDirection(e.key);
    if (!dir) return;
    // 화살표 키 기본 스크롤을 막는다.
    e.preventDefault();
    move(dir);
  };

  const newGame = () => {
    setBoard(startGame(rng));
    setScore(0);
    setStatus({ won: false, over: false });
    setBlocked(false);
    // "새 게임" 클릭 후 포커스가 버튼에 남아 화살표 키가 죽지 않도록 보드로 되돌린다.
    focusBoard();
  };

  const best = highestTile(board);

  return (
    <section className="game">
      <h2>2048</h2>
      <p className="hint">
        같은 숫자 타일을 같은 방향으로 밀어 합치세요. 2048 타일을 만들면 승리,
        더 이상 움직일 수 없으면 게임 오버입니다.
      </p>

      <div className="controls">
        <span className="hint">
          점수 <strong>{formatScore(score)}</strong> · 최고 타일{" "}
          <strong>{best === 0 ? "-" : best}</strong>
        </span>
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </div>

      <div
        ref={boardRef}
        className="board2048"
        role="grid"
        aria-label="2048 보드 — 화살표 키로 타일을 미세요"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {board.map((row, r) => (
          <div className="board2048-row" role="row" key={r}>
            {row.map((tile, c) => (
              <div
                key={c}
                role="gridcell"
                className={`tile2048 tile-${tile}`}
                aria-label={tile === 0 ? "빈 칸" : String(tile)}
              >
                {tile === 0 ? "" : tile}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="controls dpad" role="group" aria-label="방향 조작">
        {DPAD.map((b) => (
          <button
            key={b.dir}
            type="button"
            onClick={() => move(b.dir)}
            disabled={finished}
            aria-label={b.label}
          >
            {b.symbol}
          </button>
        ))}
      </div>

      {blocked && !finished && (
        <p className="error">그 방향으로는 움직일 수 없습니다. 다른 방향을 눌러보세요.</p>
      )}

      <p className="hint">
        {finished ? "게임이 끝났습니다. 새 게임으로 다시 시작하세요." : outcome.message}
      </p>

      {finished && (
        <div className="result">
          <p className="outcome">{outcome.message}</p>
          <p className="hint">
            최종 점수 {formatScore(score)} · 최고 타일 {best}. 전적에 기록했습니다.
          </p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

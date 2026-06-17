import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  applySokobanMove,
  createSokobanLevel,
  isSokobanSolved,
  SOKOBAN_LEVEL_COUNT,
  type Direction,
  type SokobanState,
} from "../../domain/sokoban";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  arrowKeyToDirection,
  countRemainingTargets,
  describeSokobanStatus,
  sokobanCellViews,
  sokobanMoveErrorReason,
  SOKOBAN_MOVE_CONTROLS,
} from "./sokobanView";

// 소코반은 무작위성이 없는 결정적 단일 플레이 퍼즐이므로 UI(presentation)가 도메인을 직접
// 호출한다(하노이/슬라이드 퍼즐 선례: 별도 application 헬퍼·난수 주입 불필요). 합법성/밀기/
// 클리어 판정은 domain(sokoban)에 위임하고 UI에서 재구현하지 않는다.

const LEVEL_OPTIONS = Array.from({ length: SOKOBAN_LEVEL_COUNT }, (_, i) => i);

export function Sokoban() {
  const [level, setLevel] = useState(0);
  const [state, setState] = useState<SokobanState>(() => createSokobanLevel(0));
  const [moveCount, setMoveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 키 핸들러가 보드 div에 걸려 있어 포커스가 있어야 화살표 키가 동작한다.
  // 클릭 없이도 바로 조작 가능하도록 마운트·"다시 시작"·레벨 변경 직후 보드에 자동 포커스를 준다.
  const boardRef = useRef<HTMLDivElement>(null);
  const focusBoard = () => boardRef.current?.focus({ preventScroll: true });
  useEffect(() => {
    focusBoard();
  }, []);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "sokoban");

  const solved = isSokobanSolved(state);
  const remaining = countRemainingTargets(state);
  const status = describeSokobanStatus(state);
  const cells = sokobanCellViews(state);

  const reset = (index: number = level) => {
    setLevel(index);
    setState(createSokobanLevel(index));
    setMoveCount(0);
    setError(null);
    focusBoard();
  };

  const move = (dir: Direction) => {
    if (solved) return; // 종료 후 입력 차단.
    // 불법 수는 조용히 무시하지 않고 사유를 표시한다(보드 불변).
    const reason = sokobanMoveErrorReason(state, dir);
    if (reason) {
      setError(reason);
      return;
    }
    setError(null);
    const next = applySokobanMove(state, dir);
    setState(next);
    setMoveCount((n) => n + 1);
    // 단일 플레이 퍼즐: 클리어=승(a). 다른 1인 게임(하노이/슬라이드/지뢰찾기)과 동일 패턴.
    if (isSokobanSolved(next)) {
      recordGame("sokoban", SELF_PLAYER, "시스템", "a");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = arrowKeyToDirection(e.key);
    if (!dir) return;
    // 화살표 키 기본 스크롤을 막는다.
    e.preventDefault();
    move(dir);
  };

  return (
    <section className="game">
      <h2>소코반</h2>
      <p className="hint">
        플레이어(@)를 상하좌우로 움직여 모든 상자(□)를 목표 칸(◎)으로 밀어 넣으면 클리어입니다.
        상자는 밀 수만 있고 당길 수 없으며, 한 번에 상자 하나만 밀 수 있습니다. 방향 버튼이나
        화살표 키로 움직이세요.
      </p>

      <div className="controls">
        <label>
          레벨
          <select
            value={level}
            onChange={(e) => reset(Number(e.target.value))}
            aria-label="레벨 선택"
          >
            {LEVEL_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <span className="hint">
          이동 <strong>{moveCount}</strong>회 · 남은 목표 <strong>{remaining}</strong>
        </span>
        <button type="button" className="primary" onClick={() => reset()}>
          다시 시작
        </button>
      </div>

      {solved ? (
        <p className="outcome">{status}</p>
      ) : (
        <p className="hint">{status}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div
        ref={boardRef}
        className="board sokoban"
        role="grid"
        aria-label="소코반 보드 — 화살표 키로 플레이어를 움직이세요"
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={boardGridStyle(state.width)}
      >
        {cells.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r},${c}`}
              role="gridcell"
              className={`cell sokoban-cell sokoban-${cell.kind}`}
              aria-label={cell.ariaLabel}
            >
              {cell.symbol}
            </div>
          )),
        )}
      </div>

      <div className="controls dpad" role="group" aria-label="방향 조작">
        {SOKOBAN_MOVE_CONTROLS.map((b) => (
          <button
            key={b.dir}
            type="button"
            onClick={() => move(b.dir)}
            disabled={solved}
            aria-label={b.label}
          >
            {b.symbol}
          </button>
        ))}
      </div>

      {solved && (
        <div className="result">
          <p className="outcome">{status}</p>
          <p className="hint">
            {moveCount}회 만에 클리어했습니다. 전적에 기록했습니다. 다시 시작하거나 다른 레벨을
            골라보세요.
          </p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

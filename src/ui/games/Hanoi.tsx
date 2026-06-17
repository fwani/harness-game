import { useState, useSyncExternalStore } from "react";
import {
  applyHanoiMove,
  createHanoi,
  isHanoiSolved,
  minHanoiMoves,
  type HanoiState,
} from "../../domain/hanoi";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  describeHanoiStatus,
  hanoiMoveCountLabel,
  hanoiMoveErrorReason,
  hanoiSelectionPrompt,
  pegAriaLabel,
  pegDiskViews,
  HANOI_DEFAULT_DISKS,
  HANOI_DISK_OPTIONS,
} from "./hanoiView";

// 하노이는 무작위성이 없는 결정적 단일 플레이 퍼즐이므로 UI(presentation)가 도메인을 직접
// 호출한다(별도 application 헬퍼·난수 주입 불필요). 합법성/승리 판정은 domain(hanoi)에 위임한다.
export function Hanoi() {
  const [diskCount, setDiskCount] = useState<number>(HANOI_DEFAULT_DISKS);
  const [state, setState] = useState<HanoiState>(() => createHanoi(HANOI_DEFAULT_DISKS));
  // 두 단계 선택: 출발 기둥을 먼저 고르고(=selected), 다음에 도착 기둥을 누른다.
  const [selected, setSelected] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "hanoi");

  const solved = isHanoiSolved(state);
  const minMoves = minHanoiMoves(diskCount);
  const status = describeHanoiStatus(solved);

  const newGame = (disks: number = diskCount) => {
    setDiskCount(disks);
    setState(createHanoi(disks));
    setSelected(null);
    setMoveCount(0);
    setError(null);
  };

  const onPegClick = (peg: number) => {
    if (solved) return; // 종료 후 입력 차단.
    setError(null);

    if (selected === null) {
      // 1단계: 출발 기둥 선택. 빈 기둥은 옮길 디스크가 없으므로 조용히 무시하지 않고 사유 안내.
      if (state.pegs[peg]!.length === 0) {
        setError(`기둥 ${peg + 1}이(가) 비어 있어 옮길 디스크가 없습니다.`);
        return;
      }
      setSelected(peg);
      return;
    }

    // 2단계: 같은 기둥을 다시 누르면 선택 해제(회복 경로).
    if (peg === selected) {
      setSelected(null);
      return;
    }

    // 도착 기둥. 불법 수는 사유를 표시하고(선택 유지) 상태를 바꾸지 않는다.
    const reason = hanoiMoveErrorReason(state, selected, peg);
    if (reason) {
      setError(reason);
      return;
    }

    const next = applyHanoiMove(state, { from: selected, to: peg });
    setState(next);
    setMoveCount((n) => n + 1);
    setSelected(null);
    // 단일 플레이 퍼즐: 클리어=승(a). 다른 1인 게임(지뢰찾기/메모리/2048)과 동일 패턴.
    if (isHanoiSolved(next)) {
      recordGame("hanoi", SELF_PLAYER, "시스템", "a");
    }
  };

  return (
    <section className="game">
      <h2>하노이탑</h2>
      <p className="hint">
        모든 디스크를 맨 오른쪽 기둥으로 옮기면 클리어입니다. 한 번에 맨 위 디스크 하나만 옮길 수
        있고, 더 작은 디스크 위에 더 큰 디스크를 올릴 수 없습니다. 출발 기둥을 누른 뒤 도착 기둥을
        누르세요.
      </p>

      <div className="controls">
        <label>
          디스크 수
          <select
            value={diskCount}
            onChange={(e) => newGame(Number(e.target.value))}
            aria-label="디스크 수 선택"
          >
            {HANOI_DISK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개
              </option>
            ))}
          </select>
        </label>
        <span className="hint">{hanoiMoveCountLabel(moveCount, minMoves)}</span>
        <button type="button" className="primary" onClick={() => newGame()}>
          새 게임
        </button>
      </div>

      {solved ? (
        <p className="outcome">{status.message}</p>
      ) : (
        <p className="hint">{hanoiSelectionPrompt(selected, solved)}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="hanoi" role="group" aria-label="하노이탑 기둥">
        {state.pegs.map((disks, peg) => {
          const isSelected = peg === selected;
          const isTarget = peg === state.pegs.length - 1;
          return (
            <button
              key={peg}
              type="button"
              className={`hanoi-peg${isSelected ? " selected" : ""}${isTarget ? " target" : ""}`}
              onClick={() => onPegClick(peg)}
              disabled={solved}
              aria-pressed={isSelected}
              aria-label={pegAriaLabel(peg, disks, isSelected)}
            >
              <span className="hanoi-disks">
                {pegDiskViews(disks, diskCount).map((d) => (
                  <span
                    key={d.size}
                    className={`hanoi-disk${d.isTop ? " top" : ""}`}
                    style={{ width: `${d.widthPercent}%` }}
                  >
                    {d.label}
                  </span>
                ))}
              </span>
              <span className="hanoi-peg-label">
                기둥 {peg + 1}
                {isTarget ? " (목표)" : ""}
              </span>
            </button>
          );
        })}
      </div>

      {solved && (
        <div className="result">
          <p className="outcome">{status.message}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

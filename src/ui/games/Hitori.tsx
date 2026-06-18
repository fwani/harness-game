import { useState, useSyncExternalStore } from "react";
import {
  hitoriViolations,
  isHitoriSolved,
  type HitoriPos,
  type HitoriState,
} from "../../domain/hitori";
import {
  playHitoriToggle,
  startHitoriGame,
  type HitoriStatus,
} from "../../application/playHitori";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  hitoriCellViews,
  hitoriProgressLabel,
  hitoriRecordWinSide,
  hitoriStatusMessage,
  hitoriViolationLabels,
} from "./hitoriView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function Hitori() {
  // 시작 상태는 application 헬퍼로 무작위 내장 퍼즐을 만든다(규칙/난수 재구현 금지).
  const [state, setState] = useState<HitoriState>(() => startHitoriGame(rng));
  // 불법/불가 입력 사유 — 조용히 무시하지 않고 표시한다.
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "hitori");

  // 위반/클리어 판정은 도메인에 위임한다(규칙 재구현 금지).
  const violations = hitoriViolations(state);
  const solved = isHitoriSolved(state);
  const status: HitoriStatus = solved ? "solved" : "playing";
  const cells = hitoriCellViews(state, violations);
  const violationLabels = hitoriViolationLabels(violations);
  const size = state.numbers.length;

  // 한 칸의 칠 상태를 white↔black으로 토글한다. 진행/클리어 판정은 playHitoriToggle에 위임.
  const toggleAt = (pos: HitoriPos) => {
    if (solved) return; // 클리어 후 입력 차단.
    try {
      const result = playHitoriToggle(state, pos);
      setState(result.state);
      setError(null);
      if (hitoriRecordWinSide(result.status)) {
        // 단일 플레이: 상대 라벨은 "시스템" 고정. 클리어=승(a)만 기록한다.
        recordGame("hitori", SELF_PLAYER, "시스템", "a");
      }
    } catch (e) {
      // 도메인 throw 사유를 그대로 노출(범위 밖 좌표 등).
      setError(e instanceof Error ? e.message : "이 칸은 칠할 수 없습니다.");
    }
  };

  const newGame = () => {
    setState(startHitoriGame(rng));
    setError(null);
  };

  return (
    <section className="game">
      <h2>히토리</h2>
      <p className="hint">
        칸을 클릭(또는 포커스 후 Enter·Space)해 칠하기(■)와 되돌리기를 번갈아 합니다. 칠하지 않은
        칸끼리 같은 행·열에 같은 숫자가 없고, 칠한 칸끼리 상하좌우로 붙지 않으며, 칠하지 않은 칸이
        모두 하나로 이어지면 클리어입니다.
      </p>

      <div className="controls" role="group" aria-label="게임 제어">
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className="hint" aria-live="polite">
        {hitoriProgressLabel(state, violations.length)}
      </p>

      {solved ? (
        <p className="outcome">{hitoriStatusMessage(status)}</p>
      ) : (
        <p className="hint">{hitoriStatusMessage(status)}</p>
      )}

      <div
        className="board hitori"
        role="grid"
        aria-label={`히토리 ${size}×${size} 보드`}
        style={boardGridStyle(size, 44)}
      >
        {cells.map((rowCells, row) =>
          rowCells.map((cell, col) => {
            const pos: HitoriPos = { row, col };
            const className = [
              "cell",
              "hitori-cell",
              cell.marked ? "marked" : "",
              cell.violated ? "conflict" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                role="gridcell"
                className={className}
                aria-label={cell.label}
                aria-pressed={cell.marked}
                disabled={solved}
                onClick={() => toggleAt(pos)}
              >
                <span className="hitori-number">{cell.symbol}</span>
                {cell.marked && (
                  <span className="hitori-mark" aria-hidden="true">
                    ■
                  </span>
                )}
                {cell.violated && (
                  <span className="hitori-violation-mark" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {!solved && violationLabels.length > 0 && (
        <ul className="hint" aria-label="현재 위반 목록">
          {violationLabels.map((label, i) => (
            <li key={i}>{label}</li>
          ))}
        </ul>
      )}

      {error && !solved && <p className="error">{error}</p>}

      {solved && (
        <div className="result">
          <p className="outcome">{hitoriStatusMessage(status)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

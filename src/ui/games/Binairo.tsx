import { useState, useSyncExternalStore } from "react";
import {
  binairoViolations,
  isBinairoGiven,
  isBinairoSolved,
  type BinairoPos,
  type BinairoState,
  type BinairoValue,
} from "../../domain/binairo";
import {
  playBinairoPlacement,
  startBinairoGame,
  type BinairoStatus,
} from "../../application/playBinairo";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  binairoCellViews,
  binairoProgressLabel,
  binairoStatusMessage,
  nextBinairoValue,
} from "./binairoView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function Binairo() {
  // 시작 상태는 application 헬퍼로 무작위 내장 퍼즐을 만든다(규칙/난수 재구현 금지).
  const [state, setState] = useState<BinairoState>(() => startBinairoGame(rng));
  // 불법/불가 입력 사유 — 조용히 무시하지 않고 표시한다.
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "binairo");

  // 위반/클리어 판정은 도메인에 위임한다(규칙 재구현 금지).
  const violations = binairoViolations(state);
  const solved = isBinairoSolved(state);
  const status: BinairoStatus = solved ? "solved" : "playing";
  const cells = binairoCellViews(state, violations);
  const size = state.grid.length;

  // 한 칸에 값(0/1 또는 null=지우기)을 둔다. 진행/클리어 판정은 playBinairoPlacement에 위임.
  const placeAt = (pos: BinairoPos, value: BinairoValue) => {
    if (solved) return; // 클리어 후 입력 차단.
    try {
      const result = playBinairoPlacement(state, pos, value);
      setState(result.state);
      setError(null);
      if (result.status === "solved") {
        // 단일 플레이: 상대 라벨은 "시스템" 고정. 클리어=승(a)만 기록한다.
        recordGame("binairo", SELF_PLAYER, "시스템", "a");
      }
    } catch (e) {
      // 도메인 throw 사유를 그대로 노출(고정 단서 편집·범위 밖 등).
      setError(e instanceof Error ? e.message : "이 칸에는 입력할 수 없습니다.");
    }
  };

  // 칸 클릭: 빈 칸 → 0 → 1 → 빈 칸 순환.
  const cycleCell = (pos: BinairoPos) => {
    if (isBinairoGiven(state, pos) || solved) return; // 고정 단서/종료 후 편집 불가.
    const current = state.grid[pos.row]?.[pos.col] ?? null;
    placeAt(pos, nextBinairoValue(current));
  };

  // 셀에 포커스한 채 0/1/지우기 키로 바로 입력(키보드 조작).
  const onCellKeyDown = (pos: BinairoPos, e: React.KeyboardEvent) => {
    if (isBinairoGiven(state, pos) || solved) return;
    if (e.key === "0") {
      e.preventDefault();
      placeAt(pos, 0);
    } else if (e.key === "1") {
      e.preventDefault();
      placeAt(pos, 1);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      placeAt(pos, null);
    }
  };

  const newGame = () => {
    setState(startBinairoGame(rng));
    setError(null);
  };

  return (
    <section className="game">
      <h2>비나이로</h2>
      <p className="hint">
        칸을 클릭(또는 0/1 키)해 빈 칸 → 0 → 1 → 빈 칸으로 바꿉니다. 가로·세로 같은 값 3연속
        금지, 각 행·열에 0과 1을 같은 개수, 모든 행끼리·열끼리 서로 다르게 채우면 클리어입니다.
        고정 단서는 편집할 수 없습니다.
      </p>

      <div className="controls" role="group" aria-label="게임 제어">
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className="hint" aria-live="polite">
        {binairoProgressLabel(state, violations.length)}
      </p>

      {solved ? (
        <p className="outcome">{binairoStatusMessage(status)}</p>
      ) : (
        <p className="hint">{binairoStatusMessage(status)}</p>
      )}

      <div
        className="board binairo"
        role="grid"
        aria-label={`비나이로 ${size}×${size} 보드`}
        style={boardGridStyle(size, 40)}
      >
        {cells.map((rowCells, row) =>
          rowCells.map((cell, col) => {
            const pos: BinairoPos = { row, col };
            const className = [
              "cell",
              "binairo-cell",
              cell.given ? "given" : "",
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
                disabled={cell.given || solved}
                onClick={() => cycleCell(pos)}
                onKeyDown={(e) => onCellKeyDown(pos, e)}
              >
                {cell.symbol}
                {cell.violated && (
                  <span className="binairo-violation-mark" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {error && !solved && <p className="error">{error}</p>}

      {solved && (
        <div className="result">
          <p className="outcome">{binairoStatusMessage(status)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

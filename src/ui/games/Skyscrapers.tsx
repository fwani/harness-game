import { useState, useSyncExternalStore } from "react";
import {
  isSkyscraperGiven,
  isSkyscraperSolved,
  skyscraperViolations,
  type SkyscraperPos,
  type SkyscraperState,
  type SkyscraperValue,
} from "../../domain/skyscrapers";
import {
  playSkyscraperPlacement,
  startSkyscrapersGame,
  type SkyscraperStatus,
} from "../../application/playSkyscrapers";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  skyscraperBoardView,
  skyscraperGridStyle,
  skyscraperProgressLabel,
  skyscraperStatusMessage,
} from "./skyscrapersView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function Skyscrapers() {
  // 시작 상태는 application 헬퍼로 무작위 내장 퍼즐을 만든다(규칙/난수 재구현 금지).
  const [state, setState] = useState<SkyscraperState>(() =>
    startSkyscrapersGame(rng),
  );
  // 현재 선택된(편집 대상) 빈/입력 칸. 고정 단서 칸은 선택 불가.
  const [selected, setSelected] = useState<SkyscraperPos | null>(null);
  // 불법/불가 입력 사유 — 조용히 무시하지 않고 표시한다.
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "skyscrapers");

  // 위반/클리어 판정은 도메인에 위임한다(규칙 재구현 금지).
  const violations = skyscraperViolations(state);
  const solved = isSkyscraperSolved(state);
  const status: SkyscraperStatus = solved ? "solved" : "playing";
  const size = state.size;
  const board = skyscraperBoardView(state, violations);
  const digits = Array.from({ length: size }, (_, i) => i + 1);

  // 한 칸에 값(1..N 또는 null=지우기)을 둔다. 진행/클리어 판정은 playSkyscraperPlacement에 위임.
  const placeAt = (pos: SkyscraperPos, value: SkyscraperValue) => {
    if (solved) return; // 클리어 후 입력 차단.
    try {
      const result = playSkyscraperPlacement(state, pos, value);
      setState(result.state);
      setError(null);
      if (result.status === "solved") {
        // 단일 플레이: 상대 라벨은 "시스템" 고정. 클리어=승(a)만 기록한다.
        recordGame("skyscrapers", SELF_PLAYER, "시스템", "a");
      }
    } catch (e) {
      // 도메인 throw 사유를 그대로 노출(고정 단서 편집·범위 밖·잘못된 값 등).
      setError(e instanceof Error ? e.message : "이 칸에는 입력할 수 없습니다.");
    }
  };

  const selectCell = (pos: SkyscraperPos) => {
    if (isSkyscraperGiven(state, pos) || solved) return; // 고정 단서/종료 후 선택 불가.
    setSelected(pos);
    setError(null);
  };

  // 숫자 패드 입력: 선택된 칸에 값을 둔다.
  const inputValue = (value: SkyscraperValue) => {
    if (!selected) {
      setError("먼저 빈 칸을 선택한 뒤 숫자를 입력하세요.");
      return;
    }
    placeAt(selected, value);
  };

  // 셀에 포커스한 채 숫자/지우기 키로 바로 입력(키보드 조작).
  const onCellKeyDown = (pos: SkyscraperPos, e: React.KeyboardEvent) => {
    if (isSkyscraperGiven(state, pos) || solved) return;
    if (e.key >= "1" && e.key <= String(size)) {
      e.preventDefault();
      setSelected(pos);
      placeAt(pos, Number(e.key));
    } else if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      setSelected(pos);
      placeAt(pos, null);
    }
  };

  const newGame = () => {
    setState(startSkyscrapersGame(rng));
    setSelected(null);
    setError(null);
  };

  return (
    <section className="game">
      <h2>마천루</h2>
      <p className="hint">
        빈 칸을 선택하고 1~{size}을(를) 입력해, 각 행·열에 1~{size}이(가) 한 번씩 들어가고 격자 네 변의
        단서를 모두 만족하게 채우면 클리어입니다. 변 단서는 그 방향에서 바라볼 때 더 낮은 빌딩에
        가리지 않고 보이는 빌딩의 개수입니다. 고정 단서는 편집할 수 없습니다.
      </p>

      <div className="controls" role="group" aria-label="게임 제어">
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className="hint" aria-live="polite">
        {skyscraperProgressLabel(state, violations.length)}
      </p>

      {solved ? (
        <p className="outcome">{skyscraperStatusMessage(status)}</p>
      ) : (
        <p className="hint">{skyscraperStatusMessage(status)}</p>
      )}

      <div
        className="board skyscrapers"
        role="grid"
        aria-label={`마천루 ${size}×${size} 보드`}
        style={skyscraperGridStyle(size)}
      >
        {board.map((slots, dr) =>
          slots.map((slot, dc) => {
            const slotKey = `${dr}-${dc}`;
            if (slot.kind === "corner") {
              return (
                <span
                  key={slotKey}
                  className="skyscraper-corner"
                  aria-hidden="true"
                />
              );
            }
            if (slot.kind === "clue") {
              const { clue } = slot;
              if (clue.value === null) {
                return (
                  <span
                    key={slotKey}
                    className="skyscraper-clue skyscraper-clue-empty"
                    aria-hidden="true"
                  />
                );
              }
              const headerRole =
                clue.side === "left" || clue.side === "right"
                  ? "rowheader"
                  : "columnheader";
              return (
                <span
                  key={slotKey}
                  className={`skyscraper-clue skyscraper-clue-${clue.side}`}
                  role={headerRole}
                  aria-label={clue.label}
                >
                  {clue.symbol}
                </span>
              );
            }
            const { cell } = slot;
            const pos: SkyscraperPos = { row: cell.row, col: cell.col };
            const isSelected =
              selected !== null &&
              selected.row === cell.row &&
              selected.col === cell.col;
            const className = [
              "skyscraper-cell",
              cell.given ? "given" : "",
              cell.violated ? "conflict" : "",
              isSelected ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={slotKey}
                type="button"
                role="gridcell"
                className={className}
                aria-label={cell.label}
                aria-pressed={isSelected}
                disabled={cell.given || solved}
                onClick={() => selectCell(pos)}
                onKeyDown={(e) => onCellKeyDown(pos, e)}
              >
                {cell.symbol}
                {cell.violated && (
                  <span className="skyscraper-violation-mark" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      <div className="controls num-pad" role="group" aria-label="숫자 입력">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => inputValue(d)}
            disabled={solved || selected === null}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => inputValue(null)}
          disabled={solved || selected === null}
        >
          지우기
        </button>
      </div>

      {error && !solved && <p className="error">{error}</p>}

      {solved && (
        <div className="result">
          <p className="outcome">{skyscraperStatusMessage(status)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

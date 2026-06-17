import { useState, useSyncExternalStore } from "react";
import {
  applyFloodMove,
  currentRegion,
  isFloodItSolved,
  legalFloodMoves,
  topLeftColor,
  type Color,
  type FloodItState,
} from "../../domain/floodIt";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { boardGridStyle } from "./boardView";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  colorHex,
  colorLabel,
  floodItMoveLimit,
  floodItStatus,
  startScrambledFloodIt,
} from "./floodItView";

// 무작위 시작 보드는 application(createScrambledFloodIt) + RandomSource 어댑터에 위임한다.
// 칠하기·클리어 판정 규칙은 domain(floodIt)을 직접 호출한다(UI에서 재구현 금지).
const rng = new MathRandomSource();

// 색은 5색 고정(팔레트 A~E). 보드 크기만 선택할 수 있다.
const COLOR_COUNT = 5;
const SIZE_OPTIONS = [5, 6, 8] as const;
const DEFAULT_SIZE = 6;

function newBoard(size: number): FloodItState {
  return startScrambledFloodIt(rng, { size, colorCount: COLOR_COUNT });
}

export function FloodIt() {
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [state, setState] = useState<FloodItState>(() => newBoard(DEFAULT_SIZE));
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "floodit");

  const moveLimit = floodItMoveLimit(state.size, state.colorCount);
  const status = floodItStatus(state, turnsUsed, moveLimit);
  const finished = status.solved || status.failed;
  const region = currentRegion(state);
  const totalCells = state.size * state.size;
  const legal = new Set(legalFloodMoves(state));
  const topColor = topLeftColor(state);

  const startGame = (nextSize: number) => {
    setSize(nextSize);
    setState(newBoard(nextSize));
    setTurnsUsed(0);
    setError(null);
  };

  const pickColor = (color: Color) => {
    if (finished) return; // 종료 후 입력 차단.
    setError(null);
    let next: FloodItState;
    try {
      // 같은 색(보드 불변)·범위 밖 색 등 불법 수는 도메인 throw를 잡아 사유를 표시한다.
      next = applyFloodMove(state, color);
    } catch (e) {
      setError(e instanceof Error ? e.message : "그 색은 지금 둘 수 없습니다.");
      return;
    }
    const usedNow = turnsUsed + 1;
    setState(next);
    setTurnsUsed(usedNow);
    // 종료 시 전적 저장(단일 플레이: 상대 라벨 "시스템" 고정). 클리어=승(a)/턴 소진 실패=패(b).
    if (isFloodItSolved(next)) {
      recordGame("floodit", SELF_PLAYER, "시스템", "a");
    } else if (usedNow >= moveLimit) {
      recordGame("floodit", SELF_PLAYER, "시스템", "b");
    }
  };

  return (
    <section className="game">
      <h2>플러드 잇</h2>
      <p className="hint">
        아래 색을 골라 좌상단(A1)과 이어진 같은 색 영역을 그 색으로 칠합니다. 영역이 점점 넓어져
        제한 수 안에 보드 전체를 한 색으로 만들면 클리어입니다. 칸은 색뿐 아니라 문자(A~E)로도
        구분됩니다.
      </p>

      <div className="controls">
        <span className="hint">보드 크기</span>
        {SIZE_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={opt === size ? "primary" : ""}
            onClick={() => startGame(opt)}
            aria-pressed={opt === size}
          >
            {opt}×{opt}
          </button>
        ))}
        <button type="button" className="primary" onClick={() => startGame(size)}>
          새 게임
        </button>
      </div>

      <p className="hint">
        사용한 턴 {turnsUsed} / {moveLimit}수 · 현재 영역 {region.length} / {totalCells}칸
      </p>

      {finished ? (
        <p className="outcome">{status.message}</p>
      ) : (
        <p className="hint">{status.message}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div
        className="board floodit"
        role="grid"
        aria-label="플러드 잇 보드"
        style={boardGridStyle(state.size, 40)}
      >
        {state.board.map((cells, row) =>
          cells.map((color, col) => {
            const label = colorLabel(color);
            return (
              <div
                key={`${row},${col}`}
                role="gridcell"
                className="cell floodit-cell"
                style={{ background: colorHex(color) }}
                aria-label={`행 ${row + 1}, 열 ${col + 1}, 색 ${label.text}`}
              >
                <span aria-hidden="true">{label.text}</span>
              </div>
            );
          }),
        )}
      </div>

      <div className="controls palette" role="group" aria-label="색 선택">
        {Array.from({ length: state.colorCount }, (_, color) => {
          const label = colorLabel(color);
          const isCurrent = color === topColor;
          const disabled = finished || !legal.has(color);
          return (
            <button
              key={color}
              type="button"
              className="flood-swatch"
              style={{ background: colorHex(color) }}
              onClick={() => pickColor(color)}
              disabled={disabled}
              aria-label={
                isCurrent
                  ? `색 ${label.text} (현재 좌상단 색, 선택 불가)`
                  : `색 ${label.text} 선택`
              }
              title={isCurrent ? "현재 좌상단 색입니다" : `색 ${label.text}`}
            >
              <span aria-hidden="true">
                {label.symbol} {label.text}
              </span>
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="result">
          <p className="outcome">{status.message}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

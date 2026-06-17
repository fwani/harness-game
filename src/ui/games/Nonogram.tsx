import { useMemo, useState, useSyncExternalStore } from "react";
import {
  createNonogram,
  isNonogramSolved,
  type NonogramPos,
  type NonogramState,
} from "../../domain/nonogram";
import { recordGame, subscribe, listRecords } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  NONOGRAM_PUZZLES,
  applyNonogramInput,
  columnClueLabels,
  describeNonogramStatus,
  nonogramCellViews,
  nonogramFilledLabel,
  rowClueLabels,
  type NonogramInputMode,
} from "./nonogramView";

// 네모로직은 난수 없는 결정적 고정 퍼즐이라 UI(presentation)가 도메인을 직접 호출한다
// (별도 application 헬퍼 불필요). 단서/표시 변경/클리어 판정은 domain(nonogram)에 위임한다.
export function Nonogram() {
  const [puzzleId, setPuzzleId] = useState<string>(NONOGRAM_PUZZLES[0]!.id);
  const puzzle = useMemo(
    () => NONOGRAM_PUZZLES.find((p) => p.id === puzzleId) ?? NONOGRAM_PUZZLES[0]!,
    [puzzleId],
  );
  const [state, setState] = useState<NonogramState>(() => createNonogram(puzzle.solution));
  const [mode, setMode] = useState<NonogramInputMode>("fill");
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "nonogram");

  const status = describeNonogramStatus(state);
  const cells = nonogramCellViews(state);
  const rowClues = rowClueLabels(puzzle.solution);
  const colClues = columnClueLabels(puzzle.solution);
  const cols = puzzle.solution[0]!.length;

  const startPuzzle = (id: string) => {
    const next = NONOGRAM_PUZZLES.find((p) => p.id === id) ?? NONOGRAM_PUZZLES[0]!;
    setPuzzleId(next.id);
    setState(createNonogram(next.solution));
    setError(null);
  };

  const newGame = () => startPuzzle(puzzleId);

  const applyInput = (pos: NonogramPos, inputMode: NonogramInputMode) => {
    if (status.solved) return; // 클리어 후 입력 차단.
    setError(null);
    try {
      const next = applyNonogramInput(state, pos, inputMode);
      setState(next);
      // 클리어 시 전적 저장(단일 플레이: 상대 라벨 "시스템" 고정). 클리어=승(a).
      if (isNonogramSolved(next)) {
        recordGame("nonogram", SELF_PLAYER, "시스템", "a");
      }
    } catch (e) {
      // 불법 입력(경계 밖 등)은 조용히 무시하지 않고 도메인 사유를 노출한다.
      setError(e instanceof Error ? e.message : "잘못된 입력입니다.");
    }
  };

  // 좌클릭/키보드 활성화: 현재 입력 모드 토글. 우클릭(보조): X 표시 토글.
  const onCellClick = (pos: NonogramPos) => applyInput(pos, mode);
  const onCellSecondary = (pos: NonogramPos) => applyInput(pos, "cross");

  // 행 클루 너비를 고려한 격자: 맨 앞 열(행 단서) + 보드 열들.
  const gridStyle = {
    display: "grid" as const,
    gridTemplateColumns: `minmax(2.5rem, auto) repeat(${cols}, minmax(0, 1fr))`,
    maxWidth: `calc(2.5rem + ${cols * 40}px)`,
  };

  return (
    <section className="game">
      <h2>네모로직</h2>
      <p className="hint">
        행/열 단서는 그 줄의 연속으로 칠해진 칸 묶음의 길이입니다. 칸을 눌러 그림을 완성하세요.
        입력 모드를 "칠하기"로 두면 빈↔칠, "X 표시"로 두면 빈↔X가 토글됩니다(칸 우클릭은 X 표시).
        칠한 칸이 단서와 정확히 일치하면 클리어입니다.
      </p>

      <div className="controls">
        <label>
          퍼즐{" "}
          <select
            value={puzzleId}
            onChange={(e) => startPuzzle(e.target.value)}
          >
            {NONOGRAM_PUZZLES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.solution.length}×{p.solution[0]!.length})
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      <div className="controls" role="group" aria-label="입력 모드">
        <span className="hint">입력 모드:</span>
        <button
          type="button"
          className={mode === "fill" ? "tab active" : "tab"}
          aria-pressed={mode === "fill"}
          onClick={() => setMode("fill")}
        >
          칠하기 ■
        </button>
        <button
          type="button"
          className={mode === "cross" ? "tab active" : "tab"}
          aria-pressed={mode === "cross"}
          onClick={() => setMode("cross")}
        >
          X 표시 ✕
        </button>
      </div>

      <p className="hint">{nonogramFilledLabel(state)}</p>

      {status.solved ? (
        <p className="outcome">{status.text}</p>
      ) : (
        <p className="hint">{status.text}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="nonogram-scroll">
        <div className="nonogram-grid" style={gridStyle} role="grid" aria-label="네모로직 보드">
          {/* 1행: 좌상단 빈 코너 + 열 단서 헤더 */}
          <div className="nonogram-corner" role="presentation" aria-hidden="true" />
          {colClues.map((clue, col) => (
            <div
              key={`col-${col}`}
              className="nonogram-clue nonogram-col-clue"
              role="columnheader"
              aria-label={`${col + 1}열 단서 ${clue}`}
            >
              {clue.split(" ").map((n, i) => (
                <span key={i}>{n}</span>
              ))}
            </div>
          ))}

          {/* 이후 행: 행 단서 + 셀들(격자에 평탄하게 배치해 열 정렬 유지) */}
          {cells.map((rowCells, row) => [
            <div
              key={`rowclue-${row}`}
              className="nonogram-clue nonogram-row-clue"
              role="rowheader"
              aria-label={`${row + 1}행 단서 ${rowClues[row]}`}
            >
              {rowClues[row]}
            </div>,
            ...rowCells.map((cell) => {
              const cellKey = `${cell.pos.row},${cell.pos.col}`;
              const classes = [
                "cell",
                "nonogram-cell",
                cell.mark === "filled" ? "nono-filled" : "",
                cell.mark === "crossed" ? "nono-crossed" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={cellKey}
                  type="button"
                  role="gridcell"
                  className={classes}
                  onClick={() => onCellClick(cell.pos)}
                  onContextMenu={(e) => {
                    // 마우스 우클릭은 X 표시 편의 입력(키보드 사용자는 입력 모드 토글 사용).
                    e.preventDefault();
                    onCellSecondary(cell.pos);
                  }}
                  disabled={status.solved}
                  aria-label={cell.ariaLabel}
                >
                  <span aria-hidden="true">{cell.symbol}</span>
                </button>
              );
            }),
          ])}
        </div>
      </div>

      {status.solved && (
        <div className="result">
          <p className="outcome">{status.text}</p>
          <p className="hint">전적에 기록했습니다. 다른 퍼즐이나 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

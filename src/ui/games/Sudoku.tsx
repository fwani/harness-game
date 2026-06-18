import { useState, useSyncExternalStore } from "react";
import {
  isSudokuGiven,
  isSudokuSolved,
  sudokuConflicts,
  type SudokuPos,
  type SudokuState,
  type SudokuValue,
} from "../../domain/sudoku";
import {
  playSudokuPlacement,
  startSudokuGame,
  type SudokuDifficulty,
  type SudokuStatus,
} from "../../application/playSudoku";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  cellKey,
  conflictKeySet,
  sudokuCellLabel,
  sudokuProgressLabel,
  sudokuStatusMessage,
} from "./sudokuView";
import {
  DEFAULT_SUDOKU_DIFFICULTY,
  SUDOKU_DIFFICULTY_OPTIONS,
  sudokuDifficultyLabel,
} from "./sudokuStartOptionsView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

// 숫자 패드 입력값(1~9).
const DIGITS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Sudoku() {
  // 시작 화면에서 고른 난이도(초급/중급/고급). 기본 중급. "새 게임"도 이 난이도를 유지한다.
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>(
    DEFAULT_SUDOKU_DIFFICULTY,
  );
  // 시작 상태는 application 헬퍼로 선택 난이도의 풀이 가능 퍼즐을 만든다(규칙/난수 재구현 금지).
  const [state, setState] = useState<SudokuState>(() =>
    startSudokuGame(rng, DEFAULT_SUDOKU_DIFFICULTY),
  );
  // 현재 선택된(편집 대상) 빈/입력 칸. 고정 단서 칸은 선택 불가.
  const [selected, setSelected] = useState<SudokuPos | null>(null);
  // 불법/불가 입력 사유 — 조용히 무시하지 않고 표시한다.
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "sudoku");

  // 충돌/클리어 판정은 도메인에 위임한다(규칙 재구현 금지).
  const conflicts = sudokuConflicts(state);
  const conflictKeys = conflictKeySet(conflicts);
  const solved = isSudokuSolved(state);
  const status: SudokuStatus = solved ? "solved" : "playing";

  // 한 칸에 값(1~9 또는 null=지우기)을 둔다. 진행/클리어 판정은 playSudokuPlacement에 위임.
  const placeAt = (pos: SudokuPos, value: SudokuValue) => {
    if (solved) return; // 클리어 후 입력 차단.
    try {
      const result = playSudokuPlacement(state, pos, value);
      setState(result.state);
      setError(null);
      if (result.status === "solved") {
        // 단일 플레이: 상대 라벨은 "시스템" 고정. 클리어=승(a)만 기록한다.
        recordGame("sudoku", SELF_PLAYER, "시스템", "a");
      }
    } catch (e) {
      // 도메인 throw 사유를 그대로 노출(고정 단서 편집·범위 밖 등).
      setError(e instanceof Error ? e.message : "이 칸에는 입력할 수 없습니다.");
    }
  };

  const selectCell = (pos: SudokuPos) => {
    if (isSudokuGiven(state, pos) || solved) return; // 고정 단서/종료 후 선택 불가.
    setSelected(pos);
    setError(null);
  };

  // 숫자 패드 입력: 선택된 칸에 값을 둔다.
  const inputValue = (value: SudokuValue) => {
    if (!selected) {
      setError("먼저 빈 칸을 선택한 뒤 숫자를 입력하세요.");
      return;
    }
    placeAt(selected, value);
  };

  // 셀에 포커스한 채 숫자/지우기 키로 바로 입력(키보드 조작).
  const onCellKeyDown = (pos: SudokuPos, e: React.KeyboardEvent) => {
    if (isSudokuGiven(state, pos) || solved) return;
    if (e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      setSelected(pos);
      placeAt(pos, Number(e.key));
    } else if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      setSelected(pos);
      placeAt(pos, null);
    }
  };

  // 주어진 난이도로 새 판을 시작한다(선택 칸/오류 초기화). 난이도 상태도 함께 맞춘다.
  const resetWith = (next: SudokuDifficulty) => {
    setDifficulty(next);
    setState(startSudokuGame(rng, next));
    setSelected(null);
    setError(null);
  };

  // "새 게임": 현재 선택된 난이도를 유지한 채 다시 시작.
  const newGame = () => resetWith(difficulty);

  // 난이도 버튼: 고른 난이도로 즉시 새 게임을 시작한다(진행 중 보드는 리셋).
  const selectDifficulty = (next: SudokuDifficulty) => resetWith(next);

  return (
    <section className="game">
      <h2>스도쿠</h2>
      <p className="hint">
        빈 칸을 선택하고 1~9를 입력해 모든 행·열·3×3 박스에 1~9가 충돌 없이 한 번씩 들어가게
        채우면 클리어입니다. 고정 단서(굵은 숫자)는 편집할 수 없습니다. 아래에서 난이도를
        고르면 그 난이도의 퍼즐로 새 게임이 시작됩니다(단서가 적을수록 어렵습니다).
      </p>

      <div className="controls" role="group" aria-label="난이도 선택">
        <span className="hint">난이도:</span>
        {SUDOKU_DIFFICULTY_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={difficulty === o.id ? "primary" : ""}
            onClick={() => selectDifficulty(o.id)}
            aria-pressed={difficulty === o.id}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="hint" aria-live="polite">
        현재 난이도: <strong>{sudokuDifficultyLabel(difficulty)}</strong>
      </p>

      <div className="controls" role="group" aria-label="게임 제어">
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className="hint" aria-live="polite">
        {sudokuProgressLabel(state, conflicts.length)}
      </p>

      {solved ? (
        <p className="outcome">{sudokuStatusMessage(status)}</p>
      ) : (
        <p className="hint">{sudokuStatusMessage(status)}</p>
      )}

      <div
        className="board sudoku"
        role="grid"
        aria-label="스도쿠 9×9 보드"
        style={boardGridStyle(9, 40)}
      >
        {state.cells.map((rowCells, row) =>
          rowCells.map((value, col) => {
            const pos: SudokuPos = { row, col };
            const given = isSudokuGiven(state, pos);
            const conflicted = conflictKeys.has(cellKey(pos));
            const isSelected =
              selected !== null && selected.row === row && selected.col === col;
            const className = [
              "cell",
              "sudoku-cell",
              given ? "given" : "",
              conflicted ? "conflict" : "",
              isSelected ? "selected" : "",
              col % 3 === 2 && col !== 8 ? "box-right" : "",
              row % 3 === 2 && row !== 8 ? "box-bottom" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                role="gridcell"
                className={className}
                aria-label={sudokuCellLabel(state, pos, conflicted)}
                aria-pressed={isSelected}
                disabled={given || solved}
                onClick={() => selectCell(pos)}
                onKeyDown={(e) => onCellKeyDown(pos, e)}
              >
                {value !== null ? value : ""}
                {conflicted && (
                  <span className="sudoku-conflict-mark" aria-hidden="true">
                    !
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      <div className="controls num-pad" role="group" aria-label="숫자 입력">
        {DIGITS.map((d) => (
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
          <p className="outcome">{sudokuStatusMessage(status)}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

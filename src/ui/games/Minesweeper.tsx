import { useState, useSyncExternalStore } from "react";
import {
  startMinesweeperGame,
  playMinesweeperTurn,
  type MinesweeperTurnResult,
} from "../../application/playMinesweeper";
import type { Board } from "../../domain/minesweeper";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  cellView,
  countSafeHidden,
  describeMinesweeperStatus,
  type MineReveal,
  type MinesweeperStatusKind,
} from "./minesweeperView";

// 기본 보드: 9×9, 지뢰 10개(초급 난이도). 상수로 정의해 한 곳에서 바꾼다.
const ROWS = 9;
const COLS = 9;
const MINES = 10;

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

/** 마운트/새 게임 시의 빈(지뢰 없는) 보드 — 첫 클릭 전까지 표시용. 첫 클릭에 지뢰를 안전하게 배치한다. */
function emptyBoard(): Board {
  return startMinesweeperGame(ROWS, COLS, 0, rng);
}

export function Minesweeper() {
  // 첫 클릭이 안전하도록 지뢰 배치는 첫 클릭 때까지 미룬다(started=false면 placeholder 보드).
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<MinesweeperStatusKind>("playing");

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "minesweeper");

  const finished = status === "win" || status === "loss";
  // 종료 시 지뢰 노출: 패배=💣(전부 공개), 승리=🚩(안전하게 피한 지뢰 표시).
  // 승/패 마무리 피드백을 대칭으로 맞춘다.
  const mineReveal: MineReveal = status === "loss" ? "exploded" : status === "win" ? "flagged" : "none";
  const info = describeMinesweeperStatus(status);

  const finish = (result: MinesweeperTurnResult) => {
    setBoard(result.board);
    setStatus(result.status);
    if (result.status === "win" || result.status === "loss") {
      // 1인 게임: 상대 라벨은 "시스템" 고정. 클리어=승(a), 지뢰=패(b).
      recordGame("minesweeper", SELF_PLAYER, "시스템", result.status === "win" ? "a" : "b");
    }
  };

  const open = (row: number, col: number) => {
    if (finished) return;
    if (!started) {
      // 첫 클릭: 그 자리를 exclude로 넘겨 지뢰가 없는 안전한 보드를 만든 뒤 연다.
      const fresh = startMinesweeperGame(ROWS, COLS, MINES, rng, [row, col]);
      setStarted(true);
      finish(playMinesweeperTurn(fresh, row, col));
      return;
    }
    if (board[row]![col]!.revealed) return; // 이미 공개된 칸은 무시.
    finish(playMinesweeperTurn(board, row, col));
  };

  const newGame = () => {
    setBoard(emptyBoard());
    setStarted(false);
    setStatus("playing");
  };

  // "남은 칸"은 아직 열지 않은 "안전한"(지뢰 아닌) 칸 수다. 모두 열면 0이 되어 승리와 일치한다
  // (미공개 지뢰를 포함하던 기존 countHidden은 승리 시 항상 지뢰 수만큼 남아 메시지와 모순됐다).
  const safeHidden = countSafeHidden(board);

  return (
    <section className="game">
      <h2>지뢰찾기</h2>
      <p className="hint">
        칸을 클릭(또는 Enter/Space)해 엽니다. 숫자는 인접한 8칸의 지뢰 수입니다. 지뢰를 밟지 않고
        모든 안전한 칸을 열면 승리입니다. 첫 클릭은 항상 안전합니다.
      </p>

      <div className="controls">
        <span className="hint">
          지뢰 <strong>{MINES}</strong>개 · 남은 안전 칸 <strong>{safeHidden}</strong>
        </span>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {finished ? (
        <p className="outcome">{info.message}</p>
      ) : (
        <p className="hint">{info.message}</p>
      )}

      <div
        className="board minesweeper"
        role="grid"
        aria-label="지뢰찾기 보드"
        style={boardGridStyle(COLS)}
      >
        {board.map((rowCells, r) =>
          rowCells.map((cell, c) => {
            const view = cellView(cell, mineReveal, r, c);
            return (
              <button
                key={`${r},${c}`}
                type="button"
                role="gridcell"
                className={`cell ms-cell ms-${view.kind}`}
                onClick={() => open(r, c)}
                disabled={finished || view.revealed}
                aria-label={view.ariaLabel}
              >
                {view.content}
              </button>
            );
          }),
        )}
      </div>

      {finished && (
        <div className="result">
          <p className="outcome">{info.message}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

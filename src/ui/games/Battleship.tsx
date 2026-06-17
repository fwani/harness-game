import { useState, useSyncExternalStore } from "react";
import {
  STANDARD_FLEET,
  createBattleshipBoard,
  type BattleshipBoard,
} from "../../domain/battleship";
import { placeFleetRandomly } from "../../application/playBattleship";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe, type WinSide } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import { boardGridStyle } from "./boardView";
import {
  battleshipStatusLabel,
  cellView,
  isCellSunk,
  playBattleshipCpuRound,
  remainingShips,
  shotSummary,
} from "./battleshipView";

// 표준 10×10 격자에 표준 함대(5·4·3·3·2)를 무작위 배치한다(한 곳에서 바꾼다).
const BOARD_SIZE = 10;

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

/** 양측 함대를 무작위 배치한 새 보드 한 쌍을 만든다. */
function freshBoards(): { humanBoard: BattleshipBoard; cpuBoard: BattleshipBoard } {
  const humanShips = placeFleetRandomly(BOARD_SIZE, STANDARD_FLEET, rng);
  const cpuShips = placeFleetRandomly(BOARD_SIZE, STANDARD_FLEET, rng);
  return {
    humanBoard: createBattleshipBoard(BOARD_SIZE, humanShips),
    cpuBoard: createBattleshipBoard(BOARD_SIZE, cpuShips),
  };
}

interface ViewState {
  humanBoard: BattleshipBoard;
  cpuBoard: BattleshipBoard;
  outcome: WinSide | null;
  /** 직전 라운드의 사격 요약(사람→CPU). 종료 후에도 남겨 마무리 피드백을 제공한다. */
  messages: string[];
}

function initialState(): ViewState {
  const { humanBoard, cpuBoard } = freshBoards();
  return { humanBoard, cpuBoard, outcome: null, messages: [] };
}

/** 한 보드를 그린다. revealShips=true면 자기 함선(안 맞은 칸)을 ■로 노출한다. */
function BoardGrid({
  board,
  title,
  revealShips,
  onFire,
  finished,
}: {
  board: BattleshipBoard;
  title: string;
  revealShips: boolean;
  onFire?: (row: number, col: number) => void;
  finished: boolean;
}) {
  const interactive = onFire !== undefined;
  return (
    <div className="bs-board-wrap">
      <h3>{title}</h3>
      <div
        className="board battleship"
        role="grid"
        aria-label={title}
        style={boardGridStyle(BOARD_SIZE)}
      >
        {board.map((rowCells, r) =>
          rowCells.map((cell, c) => {
            const view = cellView(cell, r, c, {
              revealShips,
              sunk: isCellSunk(board, cell),
            });
            if (interactive) {
              return (
                <button
                  key={`${r},${c}`}
                  type="button"
                  role="gridcell"
                  className={`cell bs-cell bs-${view.state}`}
                  onClick={() => onFire?.(r, c)}
                  disabled={finished || view.fired}
                  aria-label={view.label}
                >
                  {view.glyph}
                </button>
              );
            }
            return (
              <div
                key={`${r},${c}`}
                role="gridcell"
                className={`cell bs-cell bs-${view.state}`}
                aria-label={view.label}
              >
                {view.glyph}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function Battleship() {
  const [state, setState] = useState<ViewState>(initialState);
  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "battleship");

  const finished = state.outcome !== null;

  const fire = (row: number, col: number) => {
    if (finished) return; // 종료 후 입력 차단.
    if (state.cpuBoard[row]![col]!.hit) return; // 이미 쏜 칸(버튼은 비활성이나 방어적).

    const round = playBattleshipCpuRound(
      state.humanBoard,
      state.cpuBoard,
      { row, col },
      rng,
    );

    const messages = [shotSummary("사람", round.humanShot, round.cpuBoard)];
    if (round.cpuShot) {
      messages.push(
        shotSummary("CPU", round.cpuShot.result, round.humanBoard),
      );
    }

    setState({
      humanBoard: round.humanBoard,
      cpuBoard: round.cpuBoard,
      outcome: round.outcome,
      messages,
    });

    // 종료로 막 전환됐을 때 1회 전적을 기록한다(사람=a/CPU=b, 무승부 없음).
    if (round.outcome !== null) {
      recordGame("battleship", SELF_PLAYER, "CPU", round.outcome);
    }
  };

  const newGame = () => setState(initialState());

  return (
    <section className="game">
      <h2>배틀십 (vs CPU)</h2>
      <p className="hint">
        10×10 격자에 함대(항공모함5·전함4·순양함3·잠수함3·구축함2)를 무작위 배치했습니다.{" "}
        <strong>적 함대(CPU)</strong> 보드의 칸을 클릭(또는 Enter/Space)해 사격하세요. 명중(✕)·빗나감(○)·격침(💥)을
        기호로 표시합니다. 한 발씩 번갈아 쏘며(명중해도 한 발), 상대 함대를 먼저 전멸시키면 승리입니다.
      </p>

      <div className="controls">
        <span className="hint">
          남은 적 함선 <strong>{remainingShips(state.cpuBoard)}</strong> · 남은 내 함선{" "}
          <strong>{remainingShips(state.humanBoard)}</strong>
        </span>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className={finished ? "outcome" : "hint"}>{battleshipStatusLabel(state.outcome)}</p>

      {state.messages.length > 0 && (
        <ul className="bs-log" aria-label="직전 라운드 결과">
          {state.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}

      <div className="bs-boards">
        <BoardGrid
          board={state.cpuBoard}
          title="적 함대 (CPU) — 클릭해 사격"
          revealShips={finished}
          onFire={fire}
          finished={finished}
        />
        <BoardGrid
          board={state.humanBoard}
          title="내 함대"
          revealShips
          finished={finished}
        />
      </div>

      {finished && (
        <div className="result">
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 시작하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

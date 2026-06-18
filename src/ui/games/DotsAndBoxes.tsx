import { useState, useSyncExternalStore } from "react";
import {
  createDotsAndBoxesBoard,
  type DotsBoard,
  type DotsEdge,
  type DotsPlayer,
} from "../../domain/dotsAndBoxes";
import { chooseRandomDotsEdge, playDotsAndBoxesTurn } from "../../application/playDotsAndBoxes";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe, type WinSide } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  dotsGridCells,
  dotsGridTemplate,
  dotsOutcomeLabel,
  dotsScoreLabel,
  dotsTurnLabel,
  type DotsLabeler,
} from "./dotsAndBoxesView";

// 작은 표준 격자(3×3 박스). 변 24개로 한 판이 짧게 끝난다.
const ROWS = 3;
const COLS = 3;

/** vs CPU 모드의 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

type Mode = "local" | "cpu";

// vs CPU 모드: 사람은 1(선), CPU는 2(후).
const HUMAN: DotsPlayer = 1;
const CPU: DotsPlayer = 2;

/** 화면 상태: 보드 + 현재 차례 + 직전 수의 보너스 턴 여부 + 승부 판정(application 결과 보관). */
interface UiState {
  board: DotsBoard;
  current: DotsPlayer;
  /** 직전 수로 박스를 완성해 같은 플레이어가 한 번 더 두는 중이면 true(안내용). */
  again: boolean;
  winner: DotsPlayer | null;
  over: boolean;
}

function freshState(): UiState {
  return {
    board: createDotsAndBoxesBoard(ROWS, COLS),
    current: 1,
    again: false,
    winner: null,
    over: false,
  };
}

/** 한 수(변 긋기)를 진행한 다음 상태를 만든다(application playDotsAndBoxesTurn에 위임). */
function applyTurn(state: UiState, edge: DotsEdge): UiState {
  const result = playDotsAndBoxesTurn(state.board, edge, state.current);
  return {
    board: result.board,
    current: result.nextPlayer,
    again: result.again,
    // winner: 진행 중이면 undefined → 화면 상태에는 null로 보관(over로 종료 판정).
    winner: result.winner ?? null,
    over: result.over,
  };
}

export function DotsAndBoxes() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<UiState>(freshState);

  // vs CPU 모드의 통산 전적·연승 표시(저장소 변경에 맞춰 갱신).
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "dotsandboxes");

  // 모드별 플레이어 라벨. vs CPU에서는 사람(1)="나"(SELF_PLAYER)·CPU(2)="CPU".
  const label: DotsLabeler = (p) =>
    mode === "cpu" ? (p === HUMAN ? SELF_PLAYER : "CPU") : `P${p}`;

  // 종료로 막 전환됐을 때 1회 전적을 기록한다(승자 1=a/2=b, 동수 무승부=draw).
  const recordIfFinished = (prev: UiState, next: UiState) => {
    if (!next.over || prev.over) {
      return;
    }
    const win: WinSide = next.winner === null ? "draw" : next.winner === 1 ? "a" : "b";
    recordGame("dotsandboxes", label(1), label(2), win);
  };

  // CPU 차례가 이어지는 동안(보너스 턴 포함) 무작위로 변을 그어 자동 진행한다.
  const runCpuTurns = (start: UiState): UiState => {
    let cur = start;
    while (!cur.over && cur.current === CPU) {
      const edge = chooseRandomDotsEdge(cur.board, rng);
      if (edge === null) {
        break; // 둘 곳이 없으면 중단(방어적 — over면 루프가 이미 끝났을 것).
      }
      cur = applyTurn(cur, edge);
    }
    return cur;
  };

  const draw = (edge: DotsEdge) => {
    if (state.over) {
      return;
    }
    // vs CPU: 사람(1) 차례에만 입력을 받는다(CPU 차례 입력 차단).
    if (mode === "cpu" && state.current !== HUMAN) {
      return;
    }

    let next = applyTurn(state, edge);
    // vs CPU: 사람 수로 턴이 CPU에게 넘어갔다면 CPU가 곧바로 (보너스 턴 포함) 자동으로 둔다.
    if (mode === "cpu") {
      next = runCpuTurns(next);
    }

    setState(next);
    recordIfFinished(state, next);
  };

  const switchMode = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    setState(freshState());
  };

  const reset = () => setState(freshState());

  const over = state.over;
  const outcome = over ? dotsOutcomeLabel(state.winner, label) : null;
  const cells = dotsGridCells(state.board);

  return (
    <section className="game">
      <h2>도트 앤 박스 ({mode === "cpu" ? "vs CPU" : "2인"})</h2>
      <p className="hint">
        점 사이의 변을 그어 박스(□)를 완성하면 그 박스를 차지하고 <strong>한 번 더</strong> 둡니다.
        모든 변을 다 그으면 박스가 많은 쪽이 승리합니다.
      </p>

      <div className="controls" role="group" aria-label="모드 선택">
        <button
          type="button"
          className={mode === "local" ? "primary" : ""}
          onClick={() => switchMode("local")}
          aria-pressed={mode === "local"}
        >
          2인 로컬
        </button>
        <button
          type="button"
          className={mode === "cpu" ? "primary" : ""}
          onClick={() => switchMode("cpu")}
          aria-pressed={mode === "cpu"}
        >
          vs CPU
        </button>
      </div>

      <p className="hint" aria-live="polite">
        점수 · <strong>{dotsScoreLabel(state.board, label)}</strong>
      </p>

      {over ? (
        <p className="outcome">
          종료 · <strong>{outcome}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {dotsTurnLabel(state.current, state.again, label)}
          {mode === "cpu" ? " · 후공(CPU)은 자동으로 둡니다" : ""}
        </p>
      )}

      <div
        className="board dotsandboxes"
        role="group"
        aria-label="도트 앤 박스 격자"
        style={{
          gridTemplateColumns: dotsGridTemplate(state.board.cols),
          gridTemplateRows: dotsGridTemplate(state.board.rows),
        }}
      >
        {cells.map((cell) => {
          const key = `${cell.gridRow},${cell.gridCol}`;
          if (cell.kind === "dot") {
            return <span key={key} className="dots-dot" aria-hidden="true" />;
          }
          if (cell.kind === "box") {
            return (
              <span
                key={key}
                className={`dots-box${cell.owner ? ` owner-p${cell.owner}` : ""}`}
                aria-label={
                  cell.owner ? `${label(cell.owner)} 박스` : "빈 박스"
                }
              >
                {cell.owner ? label(cell.owner) : ""}
              </span>
            );
          }
          // 변(수평/수직): 안 그어졌으면 버튼, 그어졌으면 채워진 선.
          const edge = cell.edge!;
          const orient = cell.kind === "hedge" ? "수평" : "수직";
          const blocked = over || (mode === "cpu" && state.current !== HUMAN);
          if (cell.drawn) {
            return <span key={key} className={`dots-edge ${cell.kind} drawn`} aria-hidden="true" />;
          }
          return (
            <button
              key={key}
              type="button"
              className={`dots-edge ${cell.kind}`}
              onClick={() => draw(edge)}
              disabled={blocked}
              aria-label={`${orient} 변 ${edge.row + 1}-${edge.col + 1} 긋기`}
            />
          );
        })}
      </div>

      <div className="controls">
        <button type="button" className="primary" onClick={reset}>
          새 게임
        </button>
      </div>

      {mode === "cpu" && <StreakPanel title="내 전적 (나)" summary={streak} />}
    </section>
  );
}

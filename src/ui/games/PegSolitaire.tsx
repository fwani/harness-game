import { useState, useSyncExternalStore } from "react";
import {
  applyPegMove,
  createPegSolitaire,
  isPegSolitaireFinished,
  isPegSolitaireSolved,
  type PegSolitaireState,
  type Position,
} from "../../domain/pegSolitaire";
import { listRecords, recordGame, subscribe } from "../records";
import { boardGridStyle } from "./boardView";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  describePegSolitaireStatus,
  pegMoveErrorReason,
  pegRemainingLabel,
  pegSelectionPrompt,
  pegSolitaireCells,
  samePosition,
} from "./pegSolitaireView";

// 페그 솔리테어는 난수 없는 결정적 단일 시작 퍼즐이라 UI(presentation)가 도메인을 직접 호출한다
// (셔플조차 없어 별도 application 헬퍼 불필요). 합법성/종료/클리어 판정은 domain(pegSolitaire)에 위임한다.
export function PegSolitaire() {
  const [state, setState] = useState<PegSolitaireState>(() => createPegSolitaire());
  // 두 단계 선택: 출발(못) 칸을 먼저 고르고, 다음에 합법 착지(빈) 칸을 누른다.
  const [selected, setSelected] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "pegsolitaire");

  const status = describePegSolitaireStatus(state);
  const cells = pegSolitaireCells(state, selected);

  const newGame = () => {
    setState(createPegSolitaire());
    setSelected(null);
    setError(null);
  };

  const onCellClick = (pos: Position) => {
    if (status.finished) return; // 종료 후 입력 차단.
    setError(null);

    const hasPeg = state.pegs.has(`${pos.row},${pos.col}`);

    if (selected === null) {
      // 1단계: 출발 칸 선택. 못이 없는 칸은 조용히 무시하지 않고 사유를 안내한다.
      if (!hasPeg) {
        setError("그 칸에는 못이 없습니다 — 뛸 못이 있는 칸을 먼저 고르세요.");
        return;
      }
      setSelected(pos);
      return;
    }

    // 같은 칸 재클릭 = 선택 해제(회복 경로).
    if (samePosition(pos, selected)) {
      setSelected(null);
      return;
    }

    // 다른 못을 누르면 출발 칸을 바꾼다(재선택).
    if (hasPeg) {
      setSelected(pos);
      return;
    }

    // 빈 칸을 착지 칸으로 시도. 불법이면 사유를 표시하고(선택 유지) 상태를 바꾸지 않는다.
    const reason = pegMoveErrorReason(state, selected, pos);
    if (reason) {
      setError(reason);
      return;
    }

    const over: Position = {
      row: (selected.row + pos.row) / 2,
      col: (selected.col + pos.col) / 2,
    };
    const next = applyPegMove(state, { from: selected, over, to: pos });
    setState(next);
    setSelected(null);
    // 종료 시 전적 저장(단일 플레이: 상대 라벨 "시스템" 고정). 클리어=승(a)/실패=패(b).
    if (isPegSolitaireFinished(next)) {
      recordGame("pegsolitaire", SELF_PLAYER, "시스템", isPegSolitaireSolved(next) ? "a" : "b");
    }
  };

  return (
    <section className="game">
      <h2>페그 솔리테어</h2>
      <p className="hint">
        표준 33칸 십자 보드에서 못을 인접한 못 위로 한 칸 건너(직선 2칸) 빈 구멍에 뛰어넘으면
        가운데 못이 제거됩니다. 출발 칸(못)을 누른 뒤 착지할 빈 구멍을 누르세요(같은 칸 재클릭=선택
        해제). 더 둘 수 없을 때 못이 1개 남으면 클리어, 그 1개가 중앙이면 완벽 클리어입니다.
      </p>

      <div className="controls">
        <span className="hint">{pegRemainingLabel(state)}</span>
        <button type="button" className="primary" onClick={newGame}>
          새 게임
        </button>
      </div>

      {status.finished ? (
        <p className="outcome">{status.text}</p>
      ) : (
        <p className="hint">{pegSelectionPrompt(selected, status.finished)}</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div
        className="board pegsolitaire"
        role="grid"
        aria-label="페그 솔리테어 보드"
        style={boardGridStyle(state.size, 44)}
      >
        {cells.map((cell) => {
          const cellKey = `${cell.pos.row},${cell.pos.col}`;
          if (!cell.inBoard) {
            // 코너(보드 밖) 자리: 격자 정렬용 비활성 빈 칸.
            return (
              <div key={cellKey} role="presentation" className="cell peg-void" aria-hidden="true" />
            );
          }
          const classes = [
            "cell",
            "peg-cell",
            cell.hasPeg ? "peg-stone" : "peg-hole",
            cell.selected ? "selected" : "",
            cell.selectable ? "selectable" : "",
            cell.movableTarget ? "peg-target" : "",
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
              disabled={status.finished}
              aria-pressed={cell.selected}
              aria-label={cell.ariaLabel}
            >
              <span aria-hidden="true">{cell.hasPeg ? "●" : cell.movableTarget ? "◆" : ""}</span>
            </button>
          );
        })}
      </div>

      {status.finished && (
        <div className="result">
          <p className="outcome">{status.text}</p>
          <p className="hint">전적에 기록했습니다. 새 게임으로 다시 도전하세요.</p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

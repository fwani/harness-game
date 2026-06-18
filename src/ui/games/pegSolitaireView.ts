// Presentation helpers for the 페그 솔리테어(Peg Solitaire) screen. Pure functions only — 보드 셀
// 표시 모델(못/빈 구멍/선택/착지 가능)·상태 문구·불법 수 사유를 React/DOM에서 분리해 단위
// 테스트 가능하게 한다. 합법 수 열거·적용·종료/클리어 판정 규칙 자체는 domain(pegSolitaire)을
// 호출해 수행하며 여기서 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import {
  isLegalPegMove,
  isPegSolitaireFinished,
  isPegSolitaireSolved,
  legalPegMoves,
  pegCount,
  type PegSolitaireState,
  type Position,
} from "../../domain/pegSolitaire";

/** 좌표를 집합 키로 변환한다(도메인과 동일 규약 "row,col"). */
function key(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

/** 두 좌표가 같은 칸인지. */
export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/** 한 칸의 표시 모델(색 비의존: 기호·라벨로 구분). */
export interface PegSolitaireCellView {
  pos: Position;
  /** 십자 보드 안 칸인지(코너 2×2는 false → 비활성 빈 자리). */
  inBoard: boolean;
  /** 못이 있는 칸인지. */
  hasPeg: boolean;
  /** 현재 선택된 출발 칸인지. */
  selected: boolean;
  /** (선택 없음일 때) 이 못에서 뛸 수 있는 합법 수가 있어 출발로 고를 수 있는지. */
  selectable: boolean;
  /** (출발 선택됨일 때) 그 칸에서 뛰어 안착할 수 있는 빈 착지 칸인지. */
  movableTarget: boolean;
  /** 스크린리더용 라벨(색 비의존). */
  ariaLabel: string;
}

function cellAriaLabel(args: {
  row: number;
  col: number;
  inBoard: boolean;
  hasPeg: boolean;
  selected: boolean;
  selectable: boolean;
  movableTarget: boolean;
}): string {
  const where = `행 ${args.row + 1}, 열 ${args.col + 1}`;
  if (!args.inBoard) {
    return `${where}, 보드 밖`;
  }
  const base = args.hasPeg ? `${where}, 못 있음` : `${where}, 빈 구멍`;
  if (args.selected) {
    return `${base} (선택됨, 착지할 빈 구멍을 고르세요)`;
  }
  if (args.selectable) {
    return `${base} (선택 가능, 뛸 수 있는 못)`;
  }
  if (args.movableTarget) {
    return `${base} (여기로 착지 가능)`;
  }
  return base;
}

/**
 * 7×7 격자를 셀 표시 모델 배열로 변환한다(행→열 순, 순수·결정적, 입력 불변).
 * - `selectable`/`movableTarget`은 도메인 `legalPegMoves`가 돌려준 수만으로 강조한다(규칙 재구현 금지).
 *   - 선택 없음(selected=null): 합법 수의 `from` 칸을 `selectable`로 강조한다.
 *   - 출발 선택됨: 그 칸이 `from`인 합법 수의 `to` 칸을 `movableTarget`로 강조한다.
 * - 종료 상태(`isPegSolitaireFinished`)에서는 어떤 칸도 `selectable`/`movableTarget`/`selected`로
 *   강조하지 않아 표시와 종료(입력 차단) 상태를 일치시킨다.
 */
export function pegSolitaireCells(
  state: PegSolitaireState,
  selected: Position | null,
): PegSolitaireCellView[] {
  const finished = isPegSolitaireFinished(state);
  const moves = finished ? [] : legalPegMoves(state);
  const sources = new Set(moves.map((m) => key(m.from)));
  const selectedKey = !finished && selected !== null ? key(selected) : null;
  const targets = new Set(
    selectedKey === null
      ? []
      : moves.filter((m) => key(m.from) === selectedKey).map((m) => key(m.to)),
  );

  const cells: PegSolitaireCellView[] = [];
  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      const k = key({ row, col });
      const inBoard = state.valid.has(k);
      const hasPeg = state.pegs.has(k);
      const isSelected = selectedKey === k;
      const selectable = !finished && selected === null && sources.has(k);
      const movableTarget = !finished && selected !== null && targets.has(k);
      cells.push({
        pos: { row, col },
        inBoard,
        hasPeg,
        selected: isSelected,
        selectable,
        movableTarget,
        ariaLabel: cellAriaLabel({
          row,
          col,
          inBoard,
          hasPeg,
          selected: isSelected,
          selectable,
          movableTarget,
        }),
      });
    }
  }
  return cells;
}

/**
 * 출발(from)→착지(to) 클릭의 불법 사유를 사람이 읽는 한국어로 돌려준다(합법이면 빈 문자열).
 * 합법성 판정은 domain(isLegalPegMove)에 위임하고 여기서는 사유 문구만 분기한다
 * (불법 수를 조용히 무시하지 않고 `.error`로 안내하기 위함). over는 from·to의 중점으로 본다.
 */
export function pegMoveErrorReason(
  state: PegSolitaireState,
  from: Position,
  to: Position,
): string {
  const over: Position = {
    row: (from.row + to.row) / 2,
    col: (from.col + to.col) / 2,
  };
  if (isLegalPegMove(state, { from, over, to })) {
    return "";
  }
  if (samePosition(from, to)) {
    return "같은 칸으로는 이동할 수 없습니다 — 다른 빈 구멍을 고르세요.";
  }
  if (!state.valid.has(key(to))) {
    return "보드 밖(코너)으로는 이동할 수 없습니다 — 십자 보드 안 빈 구멍으로만 이동하세요.";
  }
  if (!state.pegs.has(key(from))) {
    return "출발 칸에 못이 없습니다 — 못이 있는 칸을 먼저 고르세요.";
  }
  if (state.pegs.has(key(to))) {
    return "도착 칸이 비어 있지 않습니다 — 못이 없는 빈 구멍으로만 이동할 수 있습니다.";
  }
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const straightTwo =
    (rowDelta === 0 && Math.abs(colDelta) === 2) ||
    (colDelta === 0 && Math.abs(rowDelta) === 2);
  if (!straightTwo) {
    return "그 칸으로는 뛰어넘을 수 없습니다 — 상하좌우로 정확히 한 칸 건너(2칸) 직선으로만 뛸 수 있습니다.";
  }
  return "건너뛸 이웃 칸에 못이 없습니다 — 인접한 못을 한 칸 건너 빈 구멍으로만 이동할 수 있습니다.";
}

/** 종료/클리어/완벽 클리어 구분과 `.outcome`/`.hint` 문구. */
export interface PegSolitaireStatus {
  /** 더 둘 수 없는 종국 여부. */
  finished: boolean;
  /** 남은 못이 정확히 1개(클리어). */
  cleared: boolean;
  /** 남은 1개가 중앙(완벽 클리어). */
  perfect: boolean;
  /** 플레이어용 한국어 상태 문구. */
  text: string;
}

/**
 * 현재 상태의 진행/종료 결과를 사람이 읽는 문구로 만든다(순수·결정적).
 * 종료·클리어·완벽 클리어 판정은 domain(isPegSolitaireFinished/isPegSolitaireSolved)에 위임한다.
 */
export function describePegSolitaireStatus(state: PegSolitaireState): PegSolitaireStatus {
  const finished = isPegSolitaireFinished(state);
  const cleared = isPegSolitaireSolved(state, false);
  const perfect = isPegSolitaireSolved(state, true);
  const remaining = pegCount(state);
  let text: string;
  if (!finished) {
    text = `게임 진행 중 — 남은 못 ${remaining}개. 못을 한 칸 건너 빈 구멍으로 뛰어넘어 제거하세요.`;
  } else if (perfect) {
    text = "🎉 완벽 클리어! 마지막 못 1개가 중앙에 남았습니다.";
  } else if (cleared) {
    text = "🎉 클리어! 못이 1개 남았습니다 (중앙은 아닙니다).";
  } else {
    text = `더 둘 수 없습니다 — 못이 ${remaining}개 남아 실패했습니다.`;
  }
  return { finished, cleared, perfect, text };
}

/** 남은 못 수 라벨(`.hint`용, 순수·결정적). */
export function pegRemainingLabel(state: PegSolitaireState): string {
  return `남은 못 ${pegCount(state)}개`;
}

/**
 * 두 단계 선택(출발 칸 → 착지 칸) 안내 메시지를 만든다(순수·결정적).
 * - finished면 종료 안내.
 * - 출발 미선택이면 출발 칸을 고르라고 안내.
 * - 출발 선택됨이면 착지 칸을 고르라고 안내(같은 칸 재클릭=선택 해제).
 */
export function pegSelectionPrompt(selected: Position | null, finished: boolean): string {
  if (finished) {
    return "게임이 끝났습니다. 새 게임으로 다시 시작하세요.";
  }
  if (selected === null) {
    return "뛸 못이 있는 출발 칸을 선택하세요.";
  }
  return `(행 ${selected.row + 1}, 열 ${
    selected.col + 1
  }) 선택됨 — 착지할 빈 구멍을 누르세요(같은 칸을 누르면 선택 해제).`;
}

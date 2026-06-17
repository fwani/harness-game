// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

/**
 * 사다리타기(Ghost Leg)의 가로줄(rung).
 * - row: 위에서 아래로의 높이(0 이상 정수). 작을수록 위쪽.
 * - left: 이 가로줄이 잇는 두 열 중 왼쪽 열(0..columnCount-2). 열 left와 left+1을 잇는다.
 */
export interface LadderRung {
  row: number;
  left: number;
}

/**
 * 가로줄 배치(rungs)와 열 개수를 검증한다. 잘못된 입력은 throw.
 * - columnCount가 2 미만이거나 정수가 아니면 throw.
 * - rung의 left가 0..columnCount-2 범위를 벗어나거나 정수가 아니면 throw.
 * - rung의 row가 음의 정수/비정수면 throw.
 * - 같은 row에서 한 노드를 공유하는(인접하거나 중복된) 가로줄이 있으면 throw — 모호한 교차 배제.
 * 입력을 변형하지 않는다.
 */
function validateLadder(columnCount: number, rungs: LadderRung[]): void {
  if (!Number.isInteger(columnCount) || columnCount < 2) {
    throw new Error("resolveLadder requires integer columnCount >= 2");
  }
  if (!Array.isArray(rungs)) {
    throw new Error("resolveLadder requires rungs array");
  }
  // row -> 이미 등장한 left 집합. 인접/중복 노드 공유 검사용.
  const leftsByRow = new Map<number, Set<number>>();
  for (const rung of rungs) {
    if (!Number.isInteger(rung.row) || rung.row < 0) {
      throw new Error("LadderRung.row must be a non-negative integer");
    }
    if (!Number.isInteger(rung.left) || rung.left < 0 || rung.left > columnCount - 2) {
      throw new Error("LadderRung.left must be an integer in 0..columnCount-2");
    }
    let lefts = leftsByRow.get(rung.row);
    if (!lefts) {
      lefts = new Set<number>();
      leftsByRow.set(rung.row, lefts);
    }
    // 같은 row에서 left, left-1, left+1 중 하나라도 이미 있으면 노드를 공유 → 모호한 교차.
    if (lefts.has(rung.left) || lefts.has(rung.left - 1) || lefts.has(rung.left + 1)) {
      throw new Error("overlapping rungs sharing a node are not allowed in the same row");
    }
    lefts.add(rung.left);
  }
}

/**
 * startColumn에서 출발해 위(row 0)→아래로 내려가며 도착 열(0-based)을 반환한다.
 * - 각 row에서 현재 열에 닿는 가로줄이 있으면 옆 열로 건너간 뒤 다음 row로 진행.
 * - columnCount/rungs 검증은 validateLadder를 따른다.
 * - startColumn이 0..columnCount-1 범위를 벗어나거나 정수가 아니면 throw.
 * 입력 배열/객체를 변형하지 않는다.
 */
export function resolveLadder(
  columnCount: number,
  rungs: LadderRung[],
  startColumn: number,
): number {
  validateLadder(columnCount, rungs);
  if (!Number.isInteger(startColumn) || startColumn < 0 || startColumn > columnCount - 1) {
    throw new Error("resolveLadder requires integer startColumn in 0..columnCount-1");
  }

  // row 오름차순으로, 각 row에 존재하는 left 집합을 만든다.
  const leftsByRow = new Map<number, Set<number>>();
  for (const rung of rungs) {
    let lefts = leftsByRow.get(rung.row);
    if (!lefts) {
      lefts = new Set<number>();
      leftsByRow.set(rung.row, lefts);
    }
    lefts.add(rung.left);
  }
  const rows = Array.from(leftsByRow.keys()).sort((a, b) => a - b);

  let column = startColumn;
  for (const row of rows) {
    const lefts = leftsByRow.get(row)!;
    if (lefts.has(column)) {
      // 현재 열이 가로줄의 왼쪽 → 오른쪽 열로 이동.
      column += 1;
    } else if (lefts.has(column - 1)) {
      // 현재 열이 가로줄의 오른쪽 → 왼쪽 열로 이동.
      column -= 1;
    }
  }
  return column;
}

/**
 * 모든 출발 열의 도착 열을 담은 길이 columnCount 배열을 반환한다.
 * 비겹침 규칙 덕분에 결과는 항상 0..columnCount-1의 순열(1:1 배정)이다.
 * 입력을 변형하지 않는다.
 */
export function resolveLadderAll(columnCount: number, rungs: LadderRung[]): number[] {
  validateLadder(columnCount, rungs);
  const result: number[] = [];
  for (let start = 0; start < columnCount; start += 1) {
    result.push(resolveLadder(columnCount, rungs, start));
  }
  return result;
}

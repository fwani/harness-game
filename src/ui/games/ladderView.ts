// Presentation helpers for the 사다리타기 (Ladder / Ghost Leg) screen. Pure functions only —
// 화면용 입력 검증·경로 추적을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 사다리 규칙·도착 판정은 domain(resolveLadder)·application(playLadder)을 호출해 수행하며
// 여기서 규칙을 재구현하지 않는다(경로 추적의 끝 값은 resolveLadder와 일치함을 테스트로 강제).
import { resolveLadder, type LadderRung } from "../../domain/ladder";

/**
 * 사다리 입력(참가자/결과)을 검증해 잘못된 경우 플레이어용 한국어 사유를 돌려준다(불변, 결정적).
 * 정상이면 null.
 * - 개수 불일치: 참가자 수와 결과 수가 다르면 사유.
 * - 2 미만: 1:1 배정이 의미를 가지려면 각각 2개 이상이어야 한다.
 * - 빈 값: 참가자/결과 칸이 비어 있으면(공백만 포함 포함) 사유.
 * 입력 배열을 변형하지 않는다.
 */
export function validateLadderInput(players: string[], outcomes: string[]): string | null {
  if (players.length !== outcomes.length) {
    return `참가자(${players.length}명)와 결과(${outcomes.length}개)의 개수가 같아야 합니다.`;
  }
  if (players.length < 2) {
    return "참가자와 결과를 각각 2개 이상 입력해 주세요.";
  }
  if (players.some((p) => p.trim() === "")) {
    return "참가자 이름을 모두 입력해 주세요.";
  }
  if (outcomes.some((o) => o.trim() === "")) {
    return "결과 항목을 모두 입력해 주세요.";
  }
  return null;
}

/**
 * rungs에 등장하는 row들을 오름차순·유니크로 돌려준다(불변).
 * resolveLadder가 row 오름차순으로 내려가므로, 경로 추적/렌더의 단계(level) 순서와 일치한다.
 */
export function ladderRows(rungs: LadderRung[]): number[] {
  const rows = new Set<number>();
  for (const rung of rungs) {
    rows.add(rung.row);
  }
  return Array.from(rows).sort((a, b) => a - b);
}

/**
 * start 열에서 출발해 각 단계(row 오름차순)를 지난 뒤의 열을 차례로 담은 배열을 돌려준다(불변).
 * - 결과[0] === start, 결과의 마지막 === resolveLadder(columnCount, rungs, start).
 * - 결과 길이는 ladderRows(rungs).length + 1.
 * - columnCount/rungs/start 검증은 domain resolveLadder에 위임한다(잘못된 입력은 throw 전파).
 * 화면의 경로 강조·접근성 설명에 사용한다. 끝 값이 resolveLadder와 일치함을 테스트로 강제한다.
 */
export function tracePathColumns(
  columnCount: number,
  rungs: LadderRung[],
  start: number,
): number[] {
  // 입력 검증과 도착 열 산출은 domain에 위임한다(잘못된 columnCount/start는 여기서 throw).
  const arrival = resolveLadder(columnCount, rungs, start);

  const leftsByRow = new Map<number, Set<number>>();
  for (const rung of rungs) {
    let lefts = leftsByRow.get(rung.row);
    if (!lefts) {
      lefts = new Set<number>();
      leftsByRow.set(rung.row, lefts);
    }
    lefts.add(rung.left);
  }

  const path = [start];
  let column = start;
  for (const row of ladderRows(rungs)) {
    const lefts = leftsByRow.get(row)!;
    if (lefts.has(column)) {
      column += 1;
    } else if (lefts.has(column - 1)) {
      column -= 1;
    }
    path.push(column);
  }
  // 끝 값은 domain 결과와 항상 일치해야 한다(재구현 표류 방지용 방어).
  if (path[path.length - 1] !== arrival) {
    throw new Error("tracePathColumns diverged from resolveLadder");
  }
  return path;
}

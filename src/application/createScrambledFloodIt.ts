// Application layer: 플러드 잇 무작위 시작 보드 생성. domain(floodIt)과 RandomSource 포트에만 의존한다.
// 도메인(floodIt)은 결정적 순수 규칙만 다루므로(무작위성 배제), 무작위·시작부터 단색이 아닌(풀 거리가
// 있는) 시작 보드 생성은 무작위성이 들어가는 이 레이어의 책임이다(다른 게임의 RandomSource 주입 패턴 준수).
// 보드 구조·색 범위 검증과 클리어 판정은 domain(createFloodIt/isFloodItSolved)을 재사용하고 재구현하지 않는다.
import {
  createFloodIt,
  isFloodItSolved,
  type FloodItState,
} from "../domain/floodIt";
import type { RandomSource } from "./dealCards";

/**
 * size×size 정사각 격자의 각 칸을 random.nextInt(colorCount)(0..colorCount-1)로 뽑아 채운 뒤
 * domain의 createFloodIt로 상태를 만든다. 플러드 잇은 임의의 색 격자가 항상 풀이 가능하므로
 * (언젠가 전부 한 색으로 만들 수 있음) solvability 보정은 불필요하다 — 보장해야 할 불변식은
 * **"시작부터 단색(이미 클리어)이 아님"** 뿐이다.
 *
 * - colorCount는 색 추첨(random.nextInt(colorCount))에 바로 쓰이므로 최소한의 사전 가드만 둔다.
 *   그 외(보드 구조·각 칸 색 범위·size 하한)는 domain createFloodIt가 검증하도록 위임한다(검증 중복 회피).
 * - random.nextInt가 범위 밖(< 0 또는 >= colorCount) 값을 주면 명확한 에러로 throw한다.
 * - **단색 방지**: 생성 결과가 isFloodItSolved(모든 칸 동일 색)이고 단색을 피할 수 있는 경우
 *   (size >= 2 이고 colorCount >= 2)에는 한 칸(우하단)을 다른 색으로 바꿔 단색이 아니게 만든다.
 *   size === 1(칸이 하나뿐) 또는 colorCount === 1(색이 하나뿐)이면 단색을 피할 수 없으므로 단색을 허용한다.
 * - **결정성**: 같은 RandomSource 시퀀스·같은 입력이면 항상 동일한 결과를 반환한다(단색 보정도 결정적·rng 비소비).
 *
 * @throws colorCount가 1 이상의 정수가 아니면 throw.
 * @throws random.nextInt가 0..colorCount-1 밖 인덱스를 주면 throw.
 * @throws size가 1 이상의 정수가 아니면(빈 보드가 되어) domain createFloodIt가 throw.
 */
export function createScrambledFloodIt(
  size: number,
  colorCount: number,
  random: RandomSource,
): FloodItState {
  if (!Number.isInteger(colorCount) || colorCount < 1) {
    throw new Error(
      `createScrambledFloodIt: colorCount는 1 이상의 정수여야 함(받은 값: ${colorCount})`,
    );
  }

  // size가 양의 정수가 아니면 빈 보드가 되어 domain createFloodIt가 명확히 throw한다(size 검증 위임).
  const rows = Number.isInteger(size) && size >= 1 ? size : 0;
  const board: number[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const cells: number[] = [];
    for (let col = 0; col < rows; col += 1) {
      const color = random.nextInt(colorCount);
      if (color < 0 || color >= colorCount) {
        throw new Error(`RandomSource returned out-of-range color index: ${color}`);
      }
      cells.push(color);
    }
    board.push(cells);
  }

  const state = createFloodIt(board, colorCount);

  // 단색을 피할 수 있는데 시작부터 단색이면 우하단 한 칸을 다른 색으로 바꿔 풀 거리를 보장한다.
  if (state.size >= 2 && state.colorCount >= 2 && isFloodItSolved(state)) {
    const broken = state.board.map((cells) => cells.slice());
    const here = broken[state.size - 1]![state.size - 1]!;
    broken[state.size - 1]![state.size - 1] = (here + 1) % state.colorCount;
    return createFloodIt(broken, state.colorCount);
  }

  return state;
}

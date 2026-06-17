// Application layer: 슬라이드 퍼즐 무작위 시작 상태 생성. domain(slidePuzzle)과 RandomSource 포트에만 의존한다.
// 도메인의 createSlidePuzzle은 완성(solved) 상태만 반환하므로, 플레이 가능한 화면을 위한
// "무작위로 섞였지만 항상 풀 수 있고(solvable), 시작부터 완성돼 있지는 않은" 시작 상태 생성은
// 무작위성이 들어가는 이 레이어의 책임이다(다른 게임의 RandomSource 주입 패턴 준수).
// 합법 수 열거/적용/풀이가능·완성 판정은 domain을 재사용하고 재구현하지 않는다.
import {
  applySlidePuzzleMove,
  createSlidePuzzle,
  isSlidePuzzleSolved,
  legalSlidePuzzleMoves,
  type SlidePuzzleState,
} from "../domain/slidePuzzle";
import type { RandomSource } from "./dealCards";

/**
 * 완성 상태에서 시작해 합법 수 중 무작위 수를 여러 번 적용하는 "역방향 셔플"로
 * 무작위 시작 상태를 만든다. 합법 수만 적용하므로 결과는 항상 풀이 가능(solvable)하다.
 *
 * - `size < 2` 등 잘못된 입력은 domain의 createSlidePuzzle 검증/에러를 그대로 전파한다.
 * - shuffleMoves 미지정 시 기본 size*size*20회를 적용한다(충분히 섞이도록).
 * - 셔플 후 우연히 완성 상태면 합법 수를 한 번 더 적용해 시작부터 완성돼 있지 않게 한다
 *   (size>=2이면 완성 상태에도 합법 수가 항상 존재한다).
 * - 같은 RandomSource 시퀀스·같은 입력이면 결정적으로 동일한 결과를 반환한다.
 *
 * 반환 상태는 풀이 가능(solvable)하며 완성(solved)되어 있지 않다.
 */
export function createShuffledSlidePuzzle(
  size: number,
  random: RandomSource,
  shuffleMoves?: number,
): SlidePuzzleState {
  // 잘못된 size는 domain이 throw하도록 그대로 위임한다(검증 중복 금지).
  let state = createSlidePuzzle(size);

  const moves =
    shuffleMoves === undefined ? size * size * 20 : shuffleMoves;

  for (let i = 0; i < moves; i += 1) {
    state = applyRandomLegalMove(state, random);
  }

  // 시작부터 완성돼 있으면 한 수 더 섞어 풀어야 할 거리를 보장한다.
  if (isSlidePuzzleSolved(state)) {
    state = applyRandomLegalMove(state, random);
  }

  return state;
}

/** 합법 수 중 하나를 rng.nextInt로 균등 선택해 적용한 새 상태를 반환한다. */
function applyRandomLegalMove(
  state: SlidePuzzleState,
  random: RandomSource,
): SlidePuzzleState {
  const legal = legalSlidePuzzleMoves(state);
  if (legal.length === 0) {
    // size>=2에서는 빈 칸에 항상 이웃이 있어 도달하지 않지만 방어한다.
    return state;
  }
  const index = random.nextInt(legal.length);
  if (index < 0 || index >= legal.length) {
    throw new Error(`RandomSource returned out-of-range move index: ${index}`);
  }
  return applySlidePuzzleMove(state, legal[index]!);
}

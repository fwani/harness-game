// Application layer: 라이트 아웃 무작위 시작 보드 생성. domain(lightsOut)과 RandomSource 포트에만 의존한다.
// 도메인의 createLightsOutBoard는 항상 모두 꺼진(이미 클리어된) 보드만 반환하므로, 플레이 가능한
// 화면을 위한 "무작위로 켜졌지만 항상 풀 수 있고(solvable), 시작부터 완성돼 있지는 않은" 시작 보드
// 생성은 무작위성이 들어가는 이 레이어의 책임이다(다른 게임의 RandomSource 주입 패턴 준수).
// 토글/클리어 판정은 domain(pressLight/isLightsOutSolved)을 재사용하고 재구현하지 않는다.
import {
  createLightsOutBoard,
  isLightsOutSolved,
  pressLight,
  type LightsOutBoard,
} from "../domain/lightsOut";
import type { RandomSource } from "./dealCards";

/**
 * 모두 꺼진 보드에서 시작해 무작위 칸을 scrambleCount번 누르는 "역방향 셔플"로
 * 무작위 시작 보드를 만든다. pressLight만 적용하므로 결과는 항상 풀이 가능(solvable)하다
 * (누른 칸들을 같은 순서로 다시 누르면 토글이 짝수번 되어 원래의 꺼진 보드로 돌아온다).
 *
 * - size는 domain의 createLightsOutBoard 검증/기본값·에러를 그대로 전파한다(검증 중복 금지).
 *   size가 undefined면 domain 기본 크기를 사용한다.
 * - scrambleCount 미지정 시 기본 size*size회를 적용한다(충분히 섞이도록).
 * - 셔플 후 우연히 모두 꺼진(클리어) 상태면 한 번 더 눌러 시작부터 완성돼 있지 않게 한다.
 * - 같은 RandomSource 시퀀스·같은 입력이면 결정적으로 동일한 결과를 반환한다.
 *
 * 반환 보드는 풀이 가능(solvable)하며 시작부터 클리어돼 있지 않다(입력 불변).
 */
export function createScrambledLightsOut(
  size: number | undefined,
  random: RandomSource,
  scrambleCount?: number,
): LightsOutBoard {
  // 잘못된 size·기본값 처리는 domain이 throw/결정하도록 그대로 위임한다(검증 중복 금지).
  let board = createLightsOutBoard(size);
  const resolvedSize = board.length;

  const count = scrambleCount === undefined ? resolvedSize * resolvedSize : scrambleCount;

  for (let i = 0; i < count; i += 1) {
    board = pressRandomLight(board, resolvedSize, random);
  }

  // 시작부터 클리어돼 있으면 한 번 더 눌러 풀어야 할 거리를 보장한다
  // (size>=1이면 항상 누를 칸이 존재한다).
  if (isLightsOutSolved(board)) {
    board = pressRandomLight(board, resolvedSize, random);
  }

  return board;
}

/** row, col을 각각 random.nextInt(size)로 뽑아 그 칸을 누른 새 보드를 반환한다. */
function pressRandomLight(
  board: LightsOutBoard,
  size: number,
  random: RandomSource,
): LightsOutBoard {
  const row = random.nextInt(size);
  if (row < 0 || row >= size) {
    throw new Error(`RandomSource returned out-of-range row index: ${row}`);
  }
  const col = random.nextInt(size);
  if (col < 0 || col >= size) {
    throw new Error(`RandomSource returned out-of-range col index: ${col}`);
  }
  return pressLight(board, { row, col });
}

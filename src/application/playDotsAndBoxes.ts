// Application layer: 도트 앤 박스(Dots and Boxes) 한 판 진행 헬퍼.
// 도메인 규칙(dotsAndBoxes)과 RandomSource 포트에만 의존한다. infrastructure/ui import 금지(난수는 주입).
// playConnectFour.ts / reversiAi.ts / gomokuAi.ts와 동일한 패턴:
// 도메인의 변 열거·긋기·승자 판정을 재사용하고 난수는 주입받는다.
import type { DotsBoard, DotsEdge, DotsPlayer } from "../domain/dotsAndBoxes";
import {
  availableEdges,
  drawEdge,
  findDotsWinner,
  isDotsGameOver,
} from "../domain/dotsAndBoxes";
import type { RandomSource } from "./dealCards";

/**
 * 아직 안 그어진 변(availableEdges) 중 하나를 RandomSource로 균등 선택해 반환한다.
 * - 후보는 availableEdges(board)로 구한다(재구현 금지). 반환 순서는 도메인 함수 순서.
 * - idx = rng.nextInt(edges.length)로 선택한다.
 * - 그을 변이 하나도 없으면(게임 종료) null을 반환한다.
 * - rng.nextInt가 범위를 벗어난 인덱스를 주면 throw 한다.
 * - 입력 board를 변형하지 않는다(불변, 난수 외 결정적).
 */
export function chooseRandomDotsEdge(board: DotsBoard, rng: RandomSource): DotsEdge | null {
  const edges = availableEdges(board);
  if (edges.length === 0) {
    return null;
  }
  const idx = rng.nextInt(edges.length);
  if (!Number.isInteger(idx) || idx < 0 || idx >= edges.length) {
    throw new Error(`RandomSource returned out-of-range index: ${idx}`);
  }
  return edges[idx]!;
}

/** 한 수 진행 결과: 착수 후 보드 + 완성 박스·보너스 턴·승부 판정. */
export interface DotsTurnResult {
  /** 착수 후 보드(입력 불변 — 도메인 drawEdge가 새 보드 반환). */
  board: DotsBoard;
  /** 이 수로 완성된 박스 좌표 목록(0개면 상대 턴). */
  completed: { row: number; col: number }[];
  /** 박스를 1개 이상 완성해 같은 플레이어가 한 번 더 둬야 하면 true(게임이 끝나지 않은 경우에 한함). */
  again: boolean;
  /** 다음에 둘 플레이어. again이면 같은 player, 아니면 상대. 게임 종료 시 의미 없음(현재 player 유지). */
  nextPlayer: DotsPlayer;
  /** findDotsWinner 결과: 진행 중 undefined, 무승부 null, 승자 1|2. */
  winner: DotsPlayer | null | undefined;
  /** 게임 종료 여부(isDotsGameOver). */
  over: boolean;
}

/**
 * player가 edge를 긋는 한 수를 진행하고 보너스 턴·점수·승부를 계산한다.
 * - drawEdge(board, edge, player)로 새 보드와 completed를 얻는다. 도메인은 이미 그은 변/범위 밖/
 *   잘못된 player를 throw 없이 거부하며 입력 board를 그대로 돌려준다 → 불법 수로 보고 throw 한다
 *   (`playConnectFourMove`의 illegal move throw와 동일 정책).
 * - over = isDotsGameOver(next). again = !over && completed.length > 0.
 * - nextPlayer = again ? player : (상대). winner = findDotsWinner(next).
 * - 입력 board를 변형하지 않는다(도메인 drawEdge가 새 보드를 반환).
 */
export function playDotsAndBoxesTurn(
  board: DotsBoard,
  edge: DotsEdge,
  player: DotsPlayer,
): DotsTurnResult {
  const { board: next, completed } = drawEdge(board, edge, player);
  // 도메인 drawEdge는 거부 시 입력 board를 그대로(동일 참조) 돌려준다. 합법 수면 새 보드를 반환한다.
  if (next === board) {
    throw new Error(
      `playDotsAndBoxesTurn: illegal move (orientation=${edge.orientation}, row=${edge.row}, col=${edge.col}, player=${player})`,
    );
  }

  const over = isDotsGameOver(next);
  const again = !over && completed.length > 0;
  const opponent: DotsPlayer = player === 1 ? 2 : 1;
  return {
    board: next,
    completed,
    again,
    // again이면 같은 player. 게임이 끝났으면 의미 없으므로 현재 player를 유지한다. 그 외엔 상대 턴.
    nextPlayer: again || over ? player : opponent,
    winner: findDotsWinner(next),
    over,
  };
}

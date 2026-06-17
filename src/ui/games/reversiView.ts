// Presentation helpers for the Reversi (오델로) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the view logic without a DOM. 규칙(합법 수/계가/승자)은
// domain/application을 재사용하며 여기서 재구현하지 않는다.
import type { Board, Stone } from "../../domain/reversi";
import { legalReversiMoves } from "../../domain/reversiMoves";
import type { WinSide } from "../records";

/** 보드 좌표 "x,y" 키(클릭 가능 칸 판정·렌더 key 용). */
export function moveKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * 현재 차례(stone)의 합법 수 좌표를 키 집합으로 만든다. UI는 이 집합으로 칸 활성화/하이라이트를
 * 결정한다(불법 수는 애초에 비활성). 합법 수 열거는 domain legalReversiMoves에 위임한다.
 */
export function legalMoveKeySet(board: Board, stone: Stone): Set<string> {
  return new Set(legalReversiMoves(board, stone).map((m) => moveKey(m.x, m.y)));
}

/** 오델로 결과를 전적 저장용 승자 측으로 매핑한다: 흑=a, 백=b, 무승부=draw. */
export function reversiWinSide(result: Stone | "draw"): WinSide {
  if (result === "draw") {
    return "draw";
  }
  return result === "black" ? "a" : "b";
}

// Presentation helpers for the Checkers (체커 / 서양 장기) screen. Pure functions only — keeps the
// React component thin and lets us unit-test the view logic without a DOM. 규칙(합법 수/점프 강제/
// king 승급/승부)은 domain(checkers)·application(playCheckers)을 재사용하며 여기서 재구현하지 않는다.
// reversiView/dotsAndBoxesView/janggiView와 동일한 패턴.
import type {
  CheckersBoard,
  CheckersCell,
  CheckersColor,
  CheckersCoord,
  CheckersMove,
} from "../../domain/checkers";
import { legalCheckersMoves } from "../../domain/checkers";
import type { WinSide } from "../records";

/** 보드 좌표 "row,col" 키(클릭 가능 칸 판정·렌더 key 용). */
export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** 색 기호(색만이 아니라 기호로 구분): 흑=●, 백=○. */
const COLOR_GLYPH: Record<CheckersColor, string> = { dark: "●", light: "○" };
/** 색 한국어 라벨. */
const COLOR_LABEL: Record<CheckersColor, string> = { dark: "흑", light: "백" };

/**
 * 한 셀의 표시 모델(색 비의존). 빈 칸은 glyph "" + 레이블 "빈 칸".
 * - 일반 기물: dark=● / light=○.
 * - king: dark=♚ / light=♔ (채움/윤곽으로 색까지 구분, ●/○ 대응) + "왕" aria-label.
 */
export function checkersCellView(cell: CheckersCell): { glyph: string; label: string } {
  if (cell === null) {
    return { glyph: "", label: "빈 칸" };
  }
  if (cell.king) {
    const glyph = cell.color === "dark" ? "♚" : "♔";
    return { glyph, label: `${COLOR_LABEL[cell.color]} 왕` };
  }
  return { glyph: COLOR_GLYPH[cell.color], label: COLOR_LABEL[cell.color] };
}

/**
 * 현재 차례/모드/연속 점프 상태를 한국어 안내 문자열로 만든다.
 * - humanColor가 주어지면(vs CPU) 그 색을 "내 차례", 반대 색을 "CPU 차례"로 표기한다
 *   (사람이 흑/백 어느 쪽을 골라도 올바르게 가리킨다).
 * - humanColor가 null이면(2인 로컬) "흑/백 차례"로 표기한다.
 * - continues면 같은 기물로 이어서 점프해야 함을 덧붙인다.
 */
export function checkersTurnLabel(
  color: CheckersColor,
  humanColor: CheckersColor | null,
  continues: boolean,
): string {
  const who =
    humanColor === null
      ? `${COLOR_LABEL[color]} 차례`
      : color === humanColor
        ? "내 차례"
        : "CPU 차례";
  const base = `${COLOR_GLYPH[color]} ${who}`;
  return continues ? `${base} · 연속 점프! 같은 기물로 한 번 더 따냅니다` : base;
}

/**
 * 승자를 .outcome 문구로. winner가 null이면 진행 중이라 빈 문자열을 반환한다.
 * (체커는 무승부가 없다 — 한쪽이 전멸하거나 둘 곳이 없으면 상대 승리.)
 */
export function checkersOutcomeLabel(winner: CheckersColor | null): string {
  if (winner === null) {
    return "";
  }
  return `${COLOR_GLYPH[winner]} ${COLOR_LABEL[winner]} 승리! 🎉`;
}

/**
 * 선택된 기물(from)에서 둘 수 있는 합법 수만 추린다(legalCheckersMoves 위임).
 * - 점프 강제는 도메인 legalCheckersMoves가 이미 반영하므로, 점프 가능 상황에서 from이
 *   점프할 수 없으면 빈 배열을 돌려준다(그 기물은 둘 수 없음).
 * - 멀티 점프 연속 중에는 이 함수로 같은 기물의 다음 점프만 노출해 같은 기물 제한을 지킨다.
 */
export function legalDestinations(
  board: CheckersBoard,
  from: CheckersCoord,
  color: CheckersColor,
): CheckersMove[] {
  return legalCheckersMoves(board, color).filter(
    (m) => m.from.row === from.row && m.from.col === from.col,
  );
}

/** color가 지금 점프(따냄)를 강제당하는 상태인지(합법 수에 점프가 하나라도 있으면 true). */
export function hasForcedJump(board: CheckersBoard, color: CheckersColor): boolean {
  return legalCheckersMoves(board, color).some((m) => m.captured !== undefined);
}

/** color의 합법 수가 시작되는(움직일 수 있는) 기물 좌표 키 집합. */
export function movablePieceKeys(board: CheckersBoard, color: CheckersColor): Set<string> {
  return new Set(legalCheckersMoves(board, color).map((m) => cellKey(m.from.row, m.from.col)));
}

/** 체커 결과를 전적 저장용 승자 측으로 매핑한다: dark=a, light=b(무승부 없음). */
export function checkersWinSide(winner: CheckersColor): WinSide {
  return winner === "dark" ? "a" : "b";
}

// Presentation helpers for the 장기 (Janggi) screen. Pure functions only —
// 양 진영(초/한)을 '색'만으로 구분하던 접근성 갭(#209)을 해소하기 위해,
// 색 외 단서(진영별 다른 자형 + 도형 표식 + 텍스트 레이블)를 한 곳에 모은다.
// 게임 규칙 자체는 domain/application이 담당하며 여기서 재구현하지 않는다.

import {
  createInitialBoard,
  type Board,
  type PieceType,
  type Side,
} from "../../domain/janggi";

// [cho 쪽 한자, han 쪽 한자].
// 전통 장기처럼 초(楚) 진영은 사람(亻)·돌(石) 등 변이 붙은 이체자를 써서,
// 색이 같거나 보이지 않아도 글자 모양만으로 양 진영을 구분할 수 있게 한다.
// (이전에는 5/7 기물이 양 진영 동일 한자라 색에만 의존했다.)
const GLYPH: Record<PieceType, [string, string]> = {
  general: ["楚", "漢"],
  guard: ["仕", "士"],
  elephant: ["像", "象"],
  horse: ["傌", "馬"],
  chariot: ["俥", "車"],
  cannon: ["砲", "包"],
  soldier: ["卒", "兵"],
};

const SIDE_NAME: Record<Side, string> = { cho: "초", han: "한" };

// 색에 의존하지 않는 진영 도형 표식. 초=원형(●), 한=각형(■)으로 모양이 다르다.
const SIDE_MARK: Record<Side, string> = { cho: "●", han: "■" };

// [cho 이름, han 이름]. 졸/병처럼 진영별 이름이 다른 기물을 위해 쌍으로 둔다.
const PIECE_NAME: Record<PieceType, [string, string]> = {
  general: ["장", "장"],
  guard: ["사", "사"],
  elephant: ["상", "상"],
  horse: ["마", "마"],
  chariot: ["차", "차"],
  cannon: ["포", "포"],
  soldier: ["졸", "병"],
};

const sideIndex = (side: Side): 0 | 1 => (side === "cho" ? 0 : 1);

/** 기물 한자(진영별 자형이 다르다). */
export function pieceGlyph(type: PieceType, side: Side): string {
  return GLYPH[type][sideIndex(side)];
}

/** 진영 짧은 이름("초"/"한"). */
export function sideName(side: Side): string {
  return SIDE_NAME[side];
}

/** 색에 의존하지 않는 진영 도형 표식("●"/"■"). */
export function sideMark(side: Side): string {
  return SIDE_MARK[side];
}

/** 기물 한국어 이름(졸/병 등 진영별 차이 반영). */
export function pieceName(type: PieceType, side: Side): string {
  return PIECE_NAME[type][sideIndex(side)];
}

/** 스크린리더·툴팁용 접근성 라벨(색이 아닌 텍스트로 진영+기물 식별). */
export function pieceAriaLabel(type: PieceType, side: Side): string {
  return `${sideName(side)} ${pieceName(type, side)}`;
}

/** 따낸 기물 한 종류의 집계(개수>0). */
export interface CapturedCount {
  type: PieceType;
  count: number;
}

// 따냄 트레이 표시 순서(가치가 큰 기물부터). 장(general)은 잡히면 게임이 끝나
// 트레이에 거의 안 나오지만 일관성·완전성을 위해 포함한다.
const CAPTURE_ORDER: readonly PieceType[] = [
  "chariot",
  "cannon",
  "horse",
  "elephant",
  "guard",
  "soldier",
  "general",
];

/** 보드 위 `side` 진영 기물을 종류별로 센다. */
function countBySide(board: Board, side: Side): Record<PieceType, number> {
  const counts: Record<PieceType, number> = {
    general: 0,
    guard: 0,
    elephant: 0,
    horse: 0,
    chariot: 0,
    cannon: 0,
    soldier: 0,
  };
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null && cell.side === side) {
        counts[cell.type] += 1;
      }
    }
  }
  return counts;
}

/**
 * 각 진영이 따낸(=상대가 잃은) 기물 목록을 표준 초기 배치 대비로 계산한다.
 * - 반환 키 = 따낸(capturing) 진영, 값 = 그 진영이 잡은 상대 기물 집계(개수>0만, 표시 순서대로).
 * - 도메인은 따냄 카운트를 따로 보관하지 않으므로, 초기 배치 대비 줄어든 수로
 *   보드만으로 도출한다(순수 함수). 잡힌 기물은 곧 상대 진영에서 사라진 기물이다.
 */
export function capturedPieces(board: Board): Record<Side, CapturedCount[]> {
  const initial = createInitialBoard();
  const result: Record<Side, CapturedCount[]> = { cho: [], han: [] };
  for (const lostSide of ["cho", "han"] as const) {
    const before = countBySide(initial, lostSide);
    const now = countBySide(board, lostSide);
    // 잃은 기물의 소유 진영(lostSide)을 잡은 쪽은 그 반대 진영이다.
    const capturer: Side = lostSide === "cho" ? "han" : "cho";
    for (const type of CAPTURE_ORDER) {
      const lost = before[type] - now[type];
      if (lost > 0) {
        result[capturer].push({ type, count: lost });
      }
    }
  }
  return result;
}

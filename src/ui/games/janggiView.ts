// Presentation helpers for the 장기 (Janggi) screen. Pure functions only —
// 양 진영(초/한)을 '색'만으로 구분하던 접근성 갭(#209)을 해소하기 위해,
// 색 외 단서(진영별 다른 자형 + 도형 표식 + 텍스트 레이블)를 한 곳에 모은다.
// 게임 규칙 자체는 domain/application이 담당하며 여기서 재구현하지 않는다.

import type { PieceType, Side } from "../../domain/janggi";

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

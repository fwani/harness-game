// Presentation helpers for the 네모로직(Nonogram·Picross) screen. Pure functions only — 내장 퍼즐
// 세트·셀 표시 모델(빈/칠/X를 색 비의존 기호·라벨로 구분)·행/열 단서 라벨·상태 문구·표시 토글
// 매핑을 React/DOM에서 분리해 단위 테스트 가능하게 한다. 단서 계산·표시 변경·클리어 판정 규칙
// 자체는 domain(nonogram)을 호출해 수행하며 여기서 재구현하지 않는다(부수효과·난수·시간 없는
// 표시용 변환, 입력 불변). 난수가 없는 결정적 고정 퍼즐이라 별도 application 헬퍼는 불필요하다.
import {
  isNonogramSolved,
  markNonogramCell,
  nonogramColumnClues,
  nonogramRowClues,
  type NonogramMark,
  type NonogramPos,
  type NonogramSolution,
  type NonogramState,
} from "../../domain/nonogram";

/** 내장(고정 해답) 퍼즐 한 개. 난수 없는 결정적 세트라 선택만으로 시작·리셋한다. */
export interface NonogramPuzzle {
  /** 안정적 식별자(선택 상태 키). */
  id: string;
  /** 사람이 읽는 한국어 라벨(드롭다운/버튼 표기). */
  label: string;
  /** 정답 격자(true=칠해진 칸). */
  solution: NonogramSolution;
}

/** '#'=칠함, 그 외=빈 칸으로 문자열 행들을 해답 격자로 변환한다(퍼즐 정의 가독성용). */
function rows(...lines: string[]): NonogramSolution {
  return lines.map((line) => Array.from(line).map((ch) => ch === "#"));
}

/**
 * 내장 네모로직 퍼즐(5×5 작은 그림) 모음. 모두 고정 해답이라 난수가 필요 없다.
 * 각 퍼즐은 도메인 createNonogram이 받아들이는 직사각·1칸 이상·채운 칸 있음 형식이며,
 * 정확히 해답 칸만 칠하면 클리어된다(nonogramView.test가 형식·풀이 가능성을 고정).
 */
export const NONOGRAM_PUZZLES: readonly NonogramPuzzle[] = [
  {
    id: "heart",
    label: "하트",
    solution: rows(
      ".#.#.",
      "#####",
      "#####",
      ".###.",
      "..#..",
    ),
  },
  {
    id: "diamond",
    label: "다이아몬드",
    solution: rows(
      "..#..",
      ".###.",
      "#####",
      ".###.",
      "..#..",
    ),
  },
  {
    id: "cross",
    label: "플러스",
    solution: rows(
      "..#..",
      "..#..",
      "#####",
      "..#..",
      "..#..",
    ),
  },
  {
    id: "checker",
    label: "체크무늬",
    solution: rows(
      "#.#.#",
      ".#.#.",
      "#.#.#",
      ".#.#.",
      "#.#.#",
    ),
  },
];

/** 한 칸의 표시 모델(색 비의존: 기호·라벨로 구분). */
export interface NonogramCellView {
  pos: NonogramPos;
  /** 플레이어 표시 상태(empty/filled/crossed). */
  mark: NonogramMark;
  /** 색 비의존 기호: 칠=■, X=✕, 빈=빈 문자열. */
  symbol: string;
  /** 스크린리더용 라벨(좌표 + 표시 상태, 색 비의존). */
  ariaLabel: string;
}

/** 표시 상태 → 색 비의존 기호. */
function markSymbol(mark: NonogramMark): string {
  if (mark === "filled") return "■";
  if (mark === "crossed") return "✕";
  return "";
}

/** 표시 상태 → 사람이 읽는 한국어 상태어. */
function markText(mark: NonogramMark): string {
  if (mark === "filled") return "칠해짐";
  if (mark === "crossed") return "X 표시";
  return "빈 칸";
}

/**
 * 현재 상태를 행→열 순의 셀 표시 모델 격자로 변환한다(순수·결정적, 입력 불변).
 * 색에 의존하지 않도록 칸마다 기호(■/✕/빈)와 좌표·상태가 담긴 aria-label을 만든다.
 * 클리어 여부와 무관하게 표시 상태만 기술하므로(조작 강조 문구 없음) 종료 상태와 표시가 일치한다.
 */
export function nonogramCellViews(state: NonogramState): NonogramCellView[][] {
  return state.marks.map((rowCells, row) =>
    rowCells.map((mark, col) => ({
      pos: { row, col },
      mark,
      symbol: markSymbol(mark),
      ariaLabel: `행 ${row + 1}, 열 ${col + 1}, ${markText(mark)}`,
    })),
  );
}

/** 단서 묶음 배열을 라벨 문자열로 — 빈 줄(묶음 없음)은 "0"으로 명시. */
function clueLabel(clues: number[]): string {
  return clues.length === 0 ? "0" : clues.join(" ");
}

/**
 * 각 행의 단서 라벨(좌→우). 빈 행은 "0".
 * 단서 계산은 domain(nonogramRowClues)에 위임한다(재구현 금지).
 */
export function rowClueLabels(solution: NonogramSolution): string[] {
  return nonogramRowClues(solution).map(clueLabel);
}

/**
 * 각 열의 단서 라벨(상→하). 빈 열은 "0".
 * 단서 계산은 domain(nonogramColumnClues)에 위임한다(재구현 금지).
 */
export function columnClueLabels(solution: NonogramSolution): string[] {
  return nonogramColumnClues(solution).map(clueLabel);
}

/** 진행/클리어 구분과 `.outcome`/`.hint` 문구. */
export interface NonogramStatus {
  /** 칠한 칸 집합이 해답과 일치(클리어)하는지. */
  solved: boolean;
  /** 플레이어용 한국어 상태 문구. */
  text: string;
}

/**
 * 현재 상태의 진행/클리어 결과를 사람이 읽는 문구로 만든다(순수·결정적).
 * 클리어 판정은 domain(isNonogramSolved)에 위임한다.
 */
export function describeNonogramStatus(state: NonogramState): NonogramStatus {
  const solved = isNonogramSolved(state);
  return {
    solved,
    text: solved
      ? "🎉 클리어! 단서대로 그림을 완성했습니다."
      : "진행 중 — 행/열 단서를 보고 칸을 칠하세요.",
  };
}

/** 현재 칠한(filled) 칸 수 라벨(`.hint`용, 순수·결정적). */
export function nonogramFilledLabel(state: NonogramState): string {
  let filled = 0;
  for (const rowCells of state.marks) {
    for (const mark of rowCells) {
      if (mark === "filled") filled += 1;
    }
  }
  return `칠한 칸 ${filled}개`;
}

/** 입력 모드: 칠하기(빈↔칠) / X 표시(빈↔X). */
export type NonogramInputMode = "fill" | "cross";

/**
 * (row,col)을 빈↔칠 토글한 새 상태(입력 불변). 현재 칠해진 칸이면 비우고, 아니면 칠한다.
 * 적용은 domain(markNonogramCell)에 위임하므로 경계 밖/잘못된 좌표면 도메인 에러를 그대로 던진다
 * (조용한 무시 금지 — 호출부가 `.error`로 노출).
 */
export function toggleNonogramFill(state: NonogramState, pos: NonogramPos): NonogramState {
  const current = state.marks[pos.row]?.[pos.col];
  const next: NonogramMark = current === "filled" ? "empty" : "filled";
  return markNonogramCell(state, pos, next);
}

/**
 * (row,col)을 빈↔X 토글한 새 상태(입력 불변). 현재 X 표시면 비우고, 아니면 X로 표시한다.
 * 적용은 domain(markNonogramCell)에 위임한다(경계 밖/잘못된 좌표면 도메인 에러 전파).
 */
export function toggleNonogramCross(state: NonogramState, pos: NonogramPos): NonogramState {
  const current = state.marks[pos.row]?.[pos.col];
  const next: NonogramMark = current === "crossed" ? "empty" : "crossed";
  return markNonogramCell(state, pos, next);
}

/** 현재 입력 모드에 맞춰 칸 표시를 토글한 새 상태(domain markNonogramCell 위임). */
export function applyNonogramInput(
  state: NonogramState,
  pos: NonogramPos,
  mode: NonogramInputMode,
): NonogramState {
  return mode === "fill"
    ? toggleNonogramFill(state, pos)
    : toggleNonogramCross(state, pos);
}

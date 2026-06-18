// Presentation helpers for the 지뢰찾기(Minesweeper) screen. Pure functions only — 한 칸의
// 표시(기호/숫자/접근성 라벨)·남은 미공개 칸 수·남은 지뢰 수·상태 메시지를 React/DOM에서 분리해 단위
// 테스트할 수 있게 한다. 보드 생성·칸 열기·깃발 토글·승패 판정 규칙은 domain(minesweeper)/
// application(playMinesweeper)을 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import { countFlags, type Board, type Cell } from "../../domain/minesweeper";

/** 한 칸을 화면에 어떻게 그릴지(색 비의존: 기호/숫자 + 접근성 라벨). */
export type CellKind = "hidden" | "flag" | "mine" | "empty" | "number";

export interface CellView {
  /** 화면에 보일 텍스트(기호 또는 인접 지뢰 수). 빈 칸/미공개는 "". */
  content: string;
  /** 스크린리더용 라벨. */
  ariaLabel: string;
  /** 색이 아니라 종류로 구분하기 위한 분류(스타일 클래스/판정용). */
  kind: CellKind;
  /** 공개된 칸인지(클릭 불가·비활성 판단용). 종료 시 지뢰 노출에는 영향받지 않는다. */
  revealed: boolean;
}

/**
 * 종료 시 미공개 지뢰를 어떻게 노출할지.
 * - "none": 진행 중 — 미공개 지뢰를 노출하지 않는다.
 * - "exploded": 패배 — 모든 지뢰를 💣로 노출(밟은 지뢰 + 나머지).
 * - "flagged": 승리 — 안전하게 피한 지뢰를 🚩로 노출해 마무리 피드백을 준다.
 *   (승/패 마무리 표현을 대칭으로 맞춘다.)
 */
export type MineReveal = "none" | "exploded" | "flagged";

/**
 * 한 칸의 표시 정보를 만든다(순수·결정적, 입력 불변).
 * - reveal이 "none"이 아니면 미공개 지뢰도 노출한다(패배=💣, 승리=🚩).
 * - 깃발이 꽂힌 미공개 칸: 🚩(지뢰 의심 표시). 지뢰 여부는 노출하지 않는다.
 * - 미공개 칸: 내용 없음("미공개 칸").
 * - 공개 지뢰: 💣. 인접 0: 빈 칸. 인접>0: 숫자.
 * 색만이 아니라 기호(💣/🚩)·숫자·라벨로 구분한다.
 */
export function cellView(cell: Cell, reveal: MineReveal, row: number, col: number): CellView {
  const where = `${row + 1}행 ${col + 1}열`;
  if (reveal !== "none" && cell.mine && !cell.revealed) {
    // 미공개 지뢰: 승리 시엔 안전하게 피한 표시(🚩), 패배 시엔 노출(💣).
    return reveal === "flagged"
      ? { content: "🚩", ariaLabel: `${where} 지뢰(안전하게 피함)`, kind: "mine", revealed: false }
      : { content: "💣", ariaLabel: `${where} 지뢰`, kind: "mine", revealed: false };
  }
  if (!cell.revealed && cell.flagged) {
    // 깃발 칸: 지뢰 여부를 노출하지 않고 의심 표시만 보여준다(좌클릭 열기 보호 대상).
    return { content: "🚩", ariaLabel: `${where} 깃발(지뢰 의심)`, kind: "flag", revealed: false };
  }
  if (!cell.revealed) {
    return { content: "", ariaLabel: `${where} 미공개 칸`, kind: "hidden", revealed: false };
  }
  if (cell.mine) {
    return { content: "💣", ariaLabel: `${where} 지뢰`, kind: "mine", revealed: true };
  }
  if (cell.adjacent === 0) {
    return { content: "", ariaLabel: `${where} 빈 칸`, kind: "empty", revealed: true };
  }
  return {
    content: String(cell.adjacent),
    ariaLabel: `${where} 인접 지뢰 ${cell.adjacent}`,
    kind: "number",
    revealed: true,
  };
}

/** 아직 열지 않은(미공개) 칸의 수를 센다(순수·결정적, 입력 불변). */
export function countHidden(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell.revealed) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 아직 열지 않은 "안전한"(지뢰 아닌) 칸의 수를 센다(순수·결정적, 입력 불변).
 * 모든 안전한 칸을 열면 0이 되어 승리 상태와 일치한다(미공개 지뢰는 세지 않음).
 * 카운터 표시에 사용해 "승리했는데 남은 칸 10" 같은 모순을 없앤다.
 */
export function countSafeHidden(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell.revealed && !cell.mine) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 남은 지뢰 수 = 지뢰 총수 − 깃발 수(도메인 countFlags 위임, 순수·결정적).
 * 표준 지뢰찾기 카운터: 깃발을 다 꽂으면 0이 된다. 깃발을 지뢰보다 많이 꽂으면 음수가 될 수 있으며,
 * 음수 방지 없이 표준대로 그대로 반환한다(표시 라벨로 의미를 명확히 한다).
 */
export function remainingMines(board: Board, totalMines: number): number {
  return totalMines - countFlags(board);
}

/** 진행 상태 구분(승리·패배·진행 중). */
export type MinesweeperStatusKind = "win" | "loss" | "playing";

export interface MinesweeperStatus {
  kind: MinesweeperStatusKind;
  message: string;
}

/**
 * 승(클리어)·패(지뢰)·진행 중을 명확히 구분해 플레이어용 한국어 상태 메시지를 만든다
 * (순수·결정적).
 */
export function describeMinesweeperStatus(status: MinesweeperStatusKind): MinesweeperStatus {
  switch (status) {
    case "win":
      return { kind: "win", message: "🎉 모든 안전한 칸을 열었습니다! 승리!" };
    case "loss":
      return { kind: "loss", message: "💥 지뢰를 밟았습니다. 게임 오버." };
    default:
      return { kind: "playing", message: "칸을 클릭해 여세요. 지뢰를 피하세요!" };
  }
}

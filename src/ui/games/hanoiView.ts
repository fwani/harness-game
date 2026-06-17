// Presentation helpers for the 하노이탑(Tower of Hanoi) screen. Pure functions only — 디스크
// 표시(폭/숫자 라벨/집을 수 있는지)·기둥 접근성 라벨·진행 상태/안내 메시지·불법 수 사유를
// React/DOM에서 분리해 단위 테스트할 수 있게 한다. 합법성/승리 판정 규칙은 domain(hanoi)을
// 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import { isLegalHanoiMove, type HanoiState } from "../../domain/hanoi";

/** 선택 가능한 디스크 수(작을수록 쉬움). 기본 3. */
export const HANOI_DISK_OPTIONS = [3, 4, 5, 6] as const;
export const HANOI_DEFAULT_DISKS = 3;

/** 한 디스크의 화면 표시 정보(색 비의존: 폭 + 숫자 라벨). */
export interface HanoiDiskView {
  /** 디스크 크기(1..diskCount). 클수록 큰 디스크. */
  size: number;
  /** 화면/스크린리더에 보일 숫자 라벨. */
  label: string;
  /** 막대 폭 백분율(크기에 비례, 가장 큰 디스크가 100%). 색이 아니라 폭으로 크기를 구분. */
  widthPercent: number;
  /** 이 디스크가 기둥의 맨 위(=집을 수 있는 디스크)인지. 시각/aria 강조용. */
  isTop: boolean;
}

/**
 * 한 기둥의 디스크들을 "위에서 아래" 렌더 순서(맨 위 디스크가 배열 첫 원소)로 변환한다.
 * - 도메인 pegs[p]는 바닥→위 순서이므로 화면 표시를 위해 뒤집는다(입력 불변, 복사본 반환).
 * - widthPercent는 size/diskCount 비율로 색에 의존하지 않고 폭만으로 크기를 구분하게 한다.
 * - 맨 위 디스크(원래 배열의 마지막)는 isTop=true.
 */
export function pegDiskViews(disks: number[], diskCount: number): HanoiDiskView[] {
  if (!Number.isInteger(diskCount) || diskCount < 1) {
    throw new Error(`pegDiskViews: diskCount는 1 이상의 정수여야 함(받은 값: ${diskCount})`);
  }
  const lastIndex = disks.length - 1;
  // 위→아래 순서로 보이도록 역순으로 매핑한다.
  return disks
    .map((size, index) => ({
      size,
      label: String(size),
      widthPercent: Math.round((size / diskCount) * 100),
      isTop: index === lastIndex,
    }))
    .reverse();
}

/** 한 기둥의 맨 위 디스크 크기(비었으면 null). 집을 수 있는 디스크 판단용. */
export function topDiskSize(disks: number[]): number | null {
  return disks.length > 0 ? disks[disks.length - 1]! : null;
}

/**
 * 기둥의 스크린리더용 라벨을 만든다(순수·결정적).
 * - 비어 있으면 "기둥 N, 비어 있음".
 * - 디스크가 있으면 위에서부터 크기를 나열한다(맨 위가 집을 수 있는 디스크).
 * - selected=true면 "(선택됨, 옮길 기둥)" 안내를 덧붙인다.
 */
export function pegAriaLabel(pegIndex: number, disks: number[], selected = false): string {
  const where = `기둥 ${pegIndex + 1}`;
  const state = selected ? " (선택됨, 옮길 기둥을 고르세요)" : "";
  if (disks.length === 0) {
    return `${where}, 비어 있음${state}`;
  }
  // 위(맨 위 디스크)부터 아래로 크기를 나열한다.
  const topToBottom = [...disks].reverse().join(", ");
  return `${where}, 디스크 ${disks.length}개, 위에서부터 ${topToBottom}${state}`;
}

/** 진행 상태 구분(승리=클리어 / 진행 중). */
export type HanoiStatusKind = "won" | "playing";

export interface HanoiStatus {
  kind: HanoiStatusKind;
  message: string;
}

/**
 * 클리어/진행 중을 명확히 구분해 플레이어용 한국어 상태 메시지를 만든다(순수·결정적).
 * solved 여부는 domain(isHanoiSolved)으로 판정한 결과를 받는다(여기서 재판정하지 않음).
 */
export function describeHanoiStatus(solved: boolean): HanoiStatus {
  return solved
    ? { kind: "won", message: "🎉 모든 디스크를 목표 기둥으로 옮겼습니다! 클리어!" }
    : { kind: "playing", message: "디스크를 옮겨 목표 기둥(맨 오른쪽)으로 모두 모으세요." };
}

/** 이동 횟수 + 최소 수 안내 라벨(`.hint`용). */
export function hanoiMoveCountLabel(moveCount: number, minMoves: number): string {
  return `이동 ${moveCount}회 · 최소 ${minMoves}회`;
}

/**
 * 두 단계 선택(출발 기둥 → 도착 기둥) 안내 메시지를 만든다(순수·결정적).
 * - solved면 클리어 안내.
 * - 출발 기둥 미선택이면 출발 기둥을 고르라고 안내.
 * - 출발 기둥 선택됨이면 도착 기둥을 고르라고 안내(다시 같은 기둥을 누르면 선택 해제됨도 안내).
 */
export function hanoiSelectionPrompt(selectedPeg: number | null, solved: boolean): string {
  if (solved) {
    return "클리어했습니다. 새 게임으로 다시 시작하세요.";
  }
  if (selectedPeg === null) {
    return "옮길 디스크가 있는 출발 기둥을 선택하세요.";
  }
  return `기둥 ${selectedPeg + 1} 선택됨 — 도착 기둥을 누르세요(같은 기둥을 누르면 선택 해제).`;
}

/**
 * 한 수의 불법 사유를 사람이 읽는 한국어로 돌려준다(합법이면 null).
 * 합법성 판정은 domain(isLegalHanoiMove)에 위임하고, 여기서는 사유 문구만 분기한다
 * (불법 수를 조용히 무시하지 않고 `.error`로 안내하기 위함).
 */
export function hanoiMoveErrorReason(state: HanoiState, from: number, to: number): string | null {
  if (isLegalHanoiMove(state, { from, to })) {
    return null;
  }
  if (from === to) {
    return "같은 기둥으로는 옮길 수 없습니다.";
  }
  const fromPeg = state.pegs[from];
  if (!fromPeg || fromPeg.length === 0) {
    return `기둥 ${from + 1}이(가) 비어 있어 옮길 디스크가 없습니다.`;
  }
  return "더 작은 디스크 위에 더 큰 디스크를 올릴 수 없습니다.";
}

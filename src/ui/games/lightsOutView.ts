// Presentation helpers for the Lights Out (라이트 아웃) screen. Pure functions only — 셀 표시
// 모델(켜짐/꺼짐 기호·라벨·좌표)·상태 문구·진행 라벨을 React/DOM에서 분리해 단위 테스트 가능하게 한다.
// 토글 규칙·클리어 판정·켜진 칸 수 계산은 domain(lightsOut)을 호출해 수행하며 여기서 재구현하지
// 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import type { LightsOutBoard } from "../../domain/lightsOut";
import { countLitCells, isLightsOutSolved } from "../../domain/lightsOut";

/** 화면에 제공할 크기 선택지(N×N). 기본은 5(고전 라이트 아웃). */
export const LIGHTS_OUT_SIZES = [3, 5, 7] as const;
export type LightsOutSize = (typeof LIGHTS_OUT_SIZES)[number];
export const DEFAULT_LIGHTS_OUT_SIZE: LightsOutSize = 5;

/** 켜진/꺼진 칸을 색이 아니라 기호로도 구분한다(색 비의존). */
export const LIT_SYMBOL = "●";
export const UNLIT_SYMBOL = "○";

/** 크기를 "N×N" 텍스트로 표시(순수·결정적). */
export function sizeLabel(size: number): string {
  return `${size}×${size}`;
}

/** 한 칸의 표시 모델(색 비의존: 기호·라벨·aria로 구분). */
export interface LightsOutCellView {
  row: number;
  col: number;
  /** 켜짐 여부. */
  lit: boolean;
  /** 화면 표시 기호(켜짐 ●, 꺼짐 ○). */
  symbol: string;
  /** 짧은 상태 라벨(켜짐/꺼짐). */
  label: string;
  /** 스크린리더용 라벨(좌표 + 상태). */
  ariaLabel: string;
}

/**
 * 보드를 셀 표시 모델 2차원 배열로 변환한다(순수·결정적, 입력 불변).
 * - 켜짐/꺼짐을 색뿐 아니라 기호(●/○)·라벨·aria-label로 구분한다.
 * - 좌표는 기존 보드 렌더와 동일하게 board[row][col]을 따른다.
 */
export function lightsOutCellViews(board: LightsOutBoard): LightsOutCellView[][] {
  return board.map((rowCells, row) =>
    rowCells.map((lit, col) => ({
      row,
      col,
      lit,
      symbol: lit ? LIT_SYMBOL : UNLIT_SYMBOL,
      label: lit ? "켜짐" : "꺼짐",
      ariaLabel: `행 ${row + 1}, 열 ${col + 1} — ${lit ? "켜짐" : "꺼짐"}`,
    })),
  );
}

/** 누른 횟수 라벨(순수·결정적). */
export function moveCountLabel(moves: number): string {
  return `누른 횟수 ${moves}`;
}

/** 남은 켜진 칸 수 라벨(진행도, 도메인 countLitCells 위임). */
export function litCountLabel(board: LightsOutBoard): string {
  return `남은 켜진 칸 ${countLitCells(board)}`;
}

/**
 * 진행/클리어 상태를 플레이어용 한국어 문구로 만든다(순수·결정적).
 * 클리어 판정은 domain `isLightsOutSolved`에 위임한다(규칙 재구현 금지).
 * - 클리어: 누른 횟수를 포함한 축하 문구.
 * - 진행 중: 남은 켜진 칸 수를 포함한 안내 문구.
 */
export function describeLightsOutStatus(board: LightsOutBoard, moves: number): string {
  if (isLightsOutSolved(board)) {
    return `🎉 모든 불을 껐습니다! ${moves}번 만에 클리어!`;
  }
  return `불을 모두 끄세요. 남은 켜진 칸 ${countLitCells(board)}개.`;
}

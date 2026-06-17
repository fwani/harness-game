// Presentation helpers for the 만칼라(Mancala / Kalah, 6·4) screen. Pure functions only —
// 보드의 화면 배치(구덩이·곳간)와 상태 문구(차례·한 번 더·포획·곳간 점수·승자/무승부)를
// React/DOM에서 분리해 단위 테스트할 수 있게 한다. 씨 뿌리기·한 번 더·포획·종료/승자 규칙은
// domain(mancala)/application(playMancala)을 호출해 수행하며 여기서 재구현하지 않는다(표시용 변환, 입력 불변).
import type { MancalaBoard, MancalaPlayer } from "../../domain/mancala";

/** 플레이어 라벨을 만드는 함수(모드별로 "P1"/"P2" 또는 "나"/"CPU" 등). */
export type MancalaLabeler = (player: MancalaPlayer) => string;

/** 양측 곳간(store) 점수를 사람이 읽는 문구로 만든다(색 비의존, 도메인 보드 상태만 읽음). */
export function mancalaScoreLabel(board: MancalaBoard, label: MancalaLabeler): string {
  return `${label(1)} 곳간 ${board.stores[1]} · ${label(2)} 곳간 ${board.stores[2]}`;
}

/**
 * 진행 중 차례 안내 문구. 직전 수의 마지막 씨앗이 자기 곳간에 떨어져 같은 플레이어가
 * 한 번 더 둬야 하면(again) 보너스 턴임을 명시한다.
 */
export function mancalaTurnLabel(
  player: MancalaPlayer,
  again: boolean,
  label: MancalaLabeler,
): string {
  return again
    ? `${label(player)} 차례 · 곳간에 안착했습니다 — 한 번 더 두세요!`
    : `${label(player)} 차례 · 씨앗이 있는 자기 구덩이를 골라 뿌리세요`;
}

/**
 * 직전 수의 포획 피드백. captured>0이면 "{누가} N개 포획!" 문구, 아니면 null(표시 없음).
 * 포획 수 계산은 도메인 applyMancalaMove가 수행하며 여기서는 그 결과를 문구로만 바꾼다.
 */
export function mancalaCaptureLabel(
  capturedBy: MancalaPlayer,
  captured: number,
  label: MancalaLabeler,
): string | null {
  if (!Number.isFinite(captured) || captured <= 0) {
    return null;
  }
  return `${label(capturedBy)}이(가) ${captured}개 포획! 🌱`;
}

/** 종료 시 승자/무승부 문구. winner=null이면 무승부. */
export function mancalaOutcomeLabel(
  winner: MancalaPlayer | null,
  label: MancalaLabeler,
): string {
  return winner === null ? "무승부! 🤝" : `${label(winner)} 승리! 🎉`;
}

/** 구덩이 한 칸의 접근성 라벨(좌표·씨앗 수·소유자, 색 비의존). */
export function mancalaPitAriaLabel(
  player: MancalaPlayer,
  index: number,
  seeds: number,
  label: MancalaLabeler,
): string {
  return `${label(player)} 구덩이 ${index + 1} · 씨앗 ${seeds}개`;
}

/** 곳간 한 칸의 접근성 라벨(소유자·씨앗 수). */
export function mancalaStoreAriaLabel(
  player: MancalaPlayer,
  seeds: number,
  label: MancalaLabeler,
): string {
  return `${label(player)} 곳간 · 씨앗 ${seeds}개`;
}

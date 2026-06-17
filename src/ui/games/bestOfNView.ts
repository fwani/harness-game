// Presentation helpers for the 다전제(best-of-N) screen. Pure functions only — keeps the
// React component thin and lets us unit-test the display logic without a DOM.
// 매치 판정은 domain(playMatch)을 재사용하며 여기서 재구현하지 않는다(라벨 변환만 담당, 입력 불변).
import type { RpsResult } from "../../domain/rps";
import type { RoundOutcome, MatchStatus } from "../../domain/match";

/** 선택 가능한 목표 승수(선승 수). 2선승=3판제, 3선승=5판제, 4선승=7판제. */
export const TARGET_OPTIONS = [2, 3, 4] as const;

/** 가위바위보 한 판 결과(RpsResult)를 매치 라운드 결과(RoundOutcome)로 매핑한다. */
export function rpsResultToOutcome(result: RpsResult): RoundOutcome {
  if (result === "a-win") return "a";
  if (result === "b-win") return "b";
  return "draw";
}

/** 방금 끝난 한 판의 결과를 화면용 한국어 라벨로 만든다(나=a 기준). */
export function roundOutcomeLabel(outcome: RoundOutcome): string {
  if (outcome === "a") return "🎉 이번 판 승리";
  if (outcome === "b") return "😢 이번 판 패배";
  return "🤝 이번 판 무승부";
}

/** 목표 승수 버튼 라벨: "2선승 (3판제)" 형태. */
export function targetLabel(targetWins: number): string {
  return `${targetWins}선승 (${targetWins * 2 - 1}판제)`;
}

/** 시리즈 점수 라벨: "나 2 : 1 CPU" (무승부 판이 있으면 "· 무 N" 병기). */
export function seriesScoreLabel(status: MatchStatus): string {
  const base = `나 ${status.winsA} : ${status.winsB} CPU`;
  return status.draws > 0 ? `${base} · 무 ${status.draws}` : base;
}

/**
 * 매치 진행/종료 상태 라벨(승자 명확 표시 — 색이 아닌 텍스트로 구분).
 * - decided면 매치 승자(나/CPU)를 분명히 표기한다.
 * - 미결정이면 몇 선승제가 진행 중인지 안내한다.
 */
export function matchStatusLabel(status: MatchStatus, targetWins: number): string {
  if (status.decided) {
    return status.winner === "a"
      ? `🏆 매치 승리! ${targetWins}선승 달성`
      : `🏳️ 매치 패배 — CPU가 ${targetWins}선승 달성`;
  }
  return `${targetWins}선승제 진행 중`;
}

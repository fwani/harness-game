// Presentation helper for in-screen streak/total display (Rps·OddEven 등). Pure function only —
// React/DOM 의존 없음. 연속 계산은 domain/playerStreak, 누적 집계는 domain/summarize를 재사용하며
// 여기서 규칙을 재구현하지 않는다(부수효과·난수·시간 없는 표시용 변환, 입력 불변).
import type { GameRecord } from "../../domain/gameRecord";
import { playerStreak } from "../../domain/streak";
import { summarize } from "../../domain/gameRecord";

export interface StreakSummary {
  /** "3승 연속" / "2패 연속" / "1무 연속" / "아직 전적이 없습니다" 등 현재 연속 라벨. */
  currentLabel: string;
  /** 통산 "N승 M패 K무" 라벨. */
  totalLabel: string;
  /** 역대 최장 연승/최장 연패 라벨 (예: "최장 연승 5 · 최장 연패 2"). */
  bestLabel: string;
}

/**
 * 특정 game·player에 한정해 records를 필터링한 뒤 playerStreak(현재 연속/최장)와
 * summarize(누적 승/패/무)를 사람이 읽는 한국어 라벨로 변환한다(불변·결정적).
 * - 다른 게임 기록과 player가 참가하지 않은 기록은 집계에서 제외한다.
 * - 참가 기록이 없으면 안전한 빈 상태 라벨을 반환한다.
 */
export function summarizeStreakForGame(
  records: GameRecord[],
  game: GameRecord["game"],
  player: string,
): StreakSummary {
  // 해당 게임이면서 player가 실제 참가한 판만 본다(다른 게임·미참가 기록 제외).
  const mine = records.filter(
    (r) => r.game === game && r.outcomes.some((o) => o.player === player),
  );

  if (mine.length === 0) {
    return {
      currentLabel: "아직 전적이 없습니다",
      totalLabel: "0승 0패 0무",
      bestLabel: "최장 연승 0 · 최장 연패 0",
    };
  }

  const streak = playerStreak(mine, player);
  const stats = summarize(mine).find((s) => s.player === player);
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const draws = stats?.draws ?? 0;

  return {
    currentLabel: currentStreakLabel(streak.currentType, streak.currentLength),
    totalLabel: `${wins}승 ${losses}패 ${draws}무`,
    bestLabel: `최장 연승 ${streak.longestWin} · 최장 연패 ${streak.longestLoss}`,
  };
}

/**
 * 단판 vs CPU 화면이 사람 결과를 기록할 때 쓰는 고정 player 라벨.
 * 표시(selfStreakSummary)와 기록(recordGame)이 동일한 라벨을 쓰도록 한곳에 둔다
 * — 라벨이 어긋나면 패널이 조용히 0으로 보이는 버그가 난다.
 */
export const SELF_PLAYER = "나";

/**
 * 특정 게임의 "나"(SELF_PLAYER) 통산 전적·연속을 요약한다.
 * summarizeStreakForGame을 SELF_PLAYER로 고정 호출하는 얇은 래퍼(불변·결정적).
 */
export function selfStreakSummary(
  records: GameRecord[],
  game: GameRecord["game"],
): StreakSummary {
  return summarizeStreakForGame(records, game, SELF_PLAYER);
}

function currentStreakLabel(
  type: "win" | "loss" | "draw" | "none",
  length: number,
): string {
  switch (type) {
    case "win":
      return `${length}승 연속`;
    case "loss":
      return `${length}패 연속`;
    case "draw":
      return `${length}무 연속`;
    default:
      return "아직 전적이 없습니다";
  }
}

// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 게임 종류에 독립적인 다전제(best-of-N) 매치 결과 판정.
// 라운드 결과 시퀀스를 누적해 매치 진행 상태와 최종 승자를 결정한다.
// 도메인은 입력만으로 결정적이다(시간·난수·식별자 생성 없음).

/** 매치의 두 진영. */
export type MatchSide = "a" | "b";

/** 한 라운드의 결과: a 승 / b 승 / 무승부. */
export type RoundOutcome = MatchSide | "draw";

export interface MatchStatus {
  /** a가 이긴 라운드 수 */
  winsA: number;
  /** b가 이긴 라운드 수 */
  winsB: number;
  /** 무승부 라운드 수 */
  draws: number;
  /** 한쪽이 먼저 targetWins에 도달했는가. */
  decided: boolean;
  /** 매치 승자. decided가 false면 null. */
  winner: MatchSide | null;
}

/**
 * best-of-N 매치 상태를 라운드 결과 시퀀스로부터 결정한다(불변, 결정적).
 * - 먼저 targetWins 라운드를 이기는 쪽이 매치 승자다.
 * - targetWins는 1 이상의 정수여야 한다(아니면 throw).
 * - 무승부("draw") 라운드는 어느 쪽 승수에도 포함되지 않고 draws만 증가시킨다.
 * - 매치가 이미 결정된(decided) 뒤의 라운드는 집계하지 않고 무시한다(승자·승수 불변).
 * - 입력 배열을 변형하지 않는다.
 */
export function playMatch(rounds: RoundOutcome[], targetWins: number): MatchStatus {
  if (!Number.isInteger(targetWins) || targetWins < 1) {
    throw new Error("playMatch requires targetWins to be an integer >= 1");
  }

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let winner: MatchSide | null = null;

  for (const outcome of rounds) {
    // 이미 결정된 매치 이후의 라운드는 무시한다(승자·승수 불변).
    if (winner !== null) {
      break;
    }
    if (outcome === "a") {
      winsA += 1;
      if (winsA >= targetWins) {
        winner = "a";
      }
    } else if (outcome === "b") {
      winsB += 1;
      if (winsB >= targetWins) {
        winner = "b";
      }
    } else {
      draws += 1;
    }
  }

  return {
    winsA,
    winsB,
    draws,
    decided: winner !== null,
    winner,
  };
}

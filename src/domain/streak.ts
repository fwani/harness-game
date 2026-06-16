// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 누적 기록(GameRecord[])을 입력 순서(과거→최근, 시간 순 가정)대로 훑어 한 플레이어의
// 연속 기록(현재 연승/연패/연무, 역대 최장 연승·최장 연패)을 계산한다.
// 누적 합계(summarize)와 달리 "순서가 있는 연속"을 본다(책임 분리 — 기존 함수와 합치지 않는다).
// 시간·난수·식별자 생성 등 비결정적 요소 없음. 입력만으로 결정적이며 입력을 변형하지 않는다.

import type { GameRecord } from "./gameRecord";

export interface PlayerStreak {
  /** 입력으로 받은 player 라벨 그대로. */
  player: string;
  /** 가장 최근 판 기준 현재 연속 기록의 종류. 참가한 판이 없으면 "none". */
  currentType: "win" | "loss" | "draw" | "none";
  /** 현재 연속 길이(가장 최근 판부터 같은 결과가 연속된 판 수). 참가 판이 없으면 0. */
  currentLength: number;
  /** 역대 최장 연승 길이. */
  longestWin: number;
  /** 역대 최장 연패 길이. */
  longestLoss: number;
}

/**
 * records를 입력 순서(과거→최근, 시간 순으로 가정)대로 훑어 한 플레이어의
 * 현재 연속 기록과 역대 최장 연승/연패를 계산한다(불변·결정적).
 * - player가 참가하지 않은 record는 건너뛴다(연속이 끊기지 않는다).
 * - "현재" 연속은 player가 참가한 "가장 최근" 판의 결과를 기준으로 같은 결과가 이어진 길이.
 * - draw는 연승(longestWin)·연패(longestLoss) 카운트에 포함되지 않는다(연승/연패는 win/loss 연속만).
 *   단 currentType은 가장 최근 판이 draw면 "draw", currentLength는 연속된 draw 수가 된다.
 * @throws player가 공백 문자열이면 throw.
 */
export function playerStreak(records: GameRecord[], player: string): PlayerStreak {
  if (typeof player !== "string" || player.trim() === "") {
    throw new Error("playerStreak requires a non-empty player label");
  }

  let currentType: PlayerStreak["currentType"] = "none";
  let currentLength = 0;
  let longestWin = 0;
  let longestLoss = 0;
  // win/loss 연속만 추적(draw가 끼면 끊긴다).
  let runWin = 0;
  let runLoss = 0;

  for (const record of records) {
    const outcome = record.outcomes.find((o) => o.player === player);
    if (outcome === undefined) {
      // player가 참가하지 않은 판은 연속에 영향 없음(건너뛴다).
      continue;
    }

    const result = outcome.result;

    // 역대 최장 연승/연패 추적: win/loss는 같은 종류가 이어지면 늘리고, 그 외엔 초기화.
    if (result === "win") {
      runWin += 1;
      runLoss = 0;
      if (runWin > longestWin) {
        longestWin = runWin;
      }
    } else if (result === "loss") {
      runLoss += 1;
      runWin = 0;
      if (runLoss > longestLoss) {
        longestLoss = runLoss;
      }
    } else {
      // draw는 연승/연패를 끊는다.
      runWin = 0;
      runLoss = 0;
    }

    // 현재 연속: 가장 최근 판의 결과 기준으로 같은 결과가 이어진 길이.
    if (currentType === result) {
      currentLength += 1;
    } else {
      currentType = result;
      currentLength = 1;
    }
  }

  return {
    player,
    currentType,
    currentLength,
    longestWin,
    longestLoss,
  };
}

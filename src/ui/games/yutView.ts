// Presentation helpers for the Yut (윷놀이) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the turn/label logic without a DOM. 던짐 판정(도개걸윷모)·
// 말 전진은 domain(evaluateYutThrow/advanceYutPiece)·application(playYutTurn)을 재사용하며
// 여기서 규칙을 재구현하지 않는다.
import { playYutTurn, type YutTurnResult } from "../../application/playYutTurn";
import type { RandomSource } from "../../application/dealCards";
import type { YutResult, YutThrow } from "../../domain/yut";
import type { WinSide } from "../records";

/** 외곽 한 바퀴 완주 칸 수(domain/yutMove의 FINISH와 동일한 표시용 상수). */
export const YUT_FINISH = 20;

/** 던짐 결과(do/gae/geol/yut/mo)를 한국어 라벨로 매핑한다. 색에 의존하지 않도록 텍스트로 표기. */
const YUT_RESULT_LABELS: Record<YutResult, string> = {
  do: "도",
  gae: "개",
  geol: "걸",
  yut: "윷",
  mo: "모",
};

export function yutResultLabel(result: YutResult): string {
  return YUT_RESULT_LABELS[result];
}

/** 한 턴의 던짐들을 "윷 · 도"처럼 순서대로 이은 라벨로 만든다(윷·모면 추가 던짐 포함). */
export function throwsLabel(throws: YutThrow[]): string {
  return throws.map((t) => yutResultLabel(t.result)).join(" · ");
}

/** 한 턴(나→CPU)의 결과. 나(=a)가 완주하면 CPU는 던지지 않고 즉시 승리로 종료한다. */
export interface YutRoundResult {
  myTurn: YutTurnResult;
  /** 내가 이미 완주해 게임이 끝난 경우 null. */
  cpuTurn: YutTurnResult | null;
  myTraveled: number;
  cpuTraveled: number;
  /** "a"=나 승, "b"=CPU 승, null=아직 진행 중. */
  winner: WinSide | null;
}

/**
 * 윷놀이 한 턴을 진행한다(나 먼저, 이어서 CPU). 순수·결정적(rng에만 의존).
 * - 내 말을 playYutTurn으로 전진시키고, 완주하면 곧바로 내 승리로 종료한다(CPU 미진행).
 * - 내가 완주하지 못하면 CPU 말도 playYutTurn으로 전진시키고, 완주하면 CPU 승리.
 * - 둘 다 완주하지 못하면 winner=null(진행 중).
 * - 무승부는 이 순차 진행에서는 발생하지 않는다(내가 먼저 굴려 완주하면 즉시 종료).
 */
export function playYutRound(
  myTraveled: number,
  cpuTraveled: number,
  rng: RandomSource,
): YutRoundResult {
  const myTurn = playYutTurn(myTraveled, rng);
  if (myTurn.position.finished) {
    return {
      myTurn,
      cpuTurn: null,
      myTraveled: myTurn.position.traveled,
      cpuTraveled,
      winner: "a",
    };
  }
  const cpuTurn = playYutTurn(cpuTraveled, rng);
  return {
    myTurn,
    cpuTurn,
    myTraveled: myTurn.position.traveled,
    cpuTraveled: cpuTurn.position.traveled,
    winner: cpuTurn.position.finished ? "b" : null,
  };
}

/** 게임 종료 시 승자를 한국어 라벨로(나=a 기준). 색에 의존하지 않도록 텍스트로 표기. */
export function yutOutcomeLabel(winner: WinSide): string {
  if (winner === "a") return "🎉 승리!";
  if (winner === "b") return "😢 패배";
  return "🤝 무승부";
}

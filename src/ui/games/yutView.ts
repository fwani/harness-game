// Presentation helpers for the Yut (윷놀이) screen. Pure functions only — keeps the React
// component thin and lets us unit-test the turn/label logic without a DOM. 던짐 판정(도개걸윷모)·
// 말 전진은 domain(evaluateYutThrow/advanceYutPiece)·application(playYutTurn)을 재사용하며
// 여기서 규칙을 재구현하지 않는다.
import { playYutTurn, type YutTurnResult } from "../../application/playYutTurn";
import { playYutCaptureTurn } from "../../application/playYutCaptureTurn";
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

/** 잡기 모드 한 라운드(나→CPU)의 결과. 잡기로 인한 추가 턴까지 누적해 표시한다. */
export interface YutCaptureRoundResult {
  /** 이번 라운드에 내가 던진 모든 던짐(잡기로 인한 추가 턴 포함). */
  myThrows: YutThrow[];
  /** CPU가 던진 모든 던짐. 내가 이번 라운드에 완주하면 CPU 미진행 → null. */
  cpuThrows: YutThrow[] | null;
  /** 라운드 종료 후 내 말 위치(0..20). */
  myTraveled: number;
  /** 라운드 종료 후 CPU 말 위치(0..20). 잡히면 출발점(0)으로 리셋된 값. */
  cpuTraveled: number;
  /** 이번 라운드에 내가 CPU 말을 잡았는지(한 번 이상). */
  myCaptured: boolean;
  /** 이번 라운드에 CPU가 내 말을 잡았는지(한 번 이상). */
  cpuCaptured: boolean;
  /** "a"=나 승, "b"=CPU 승, null=아직 진행 중. */
  winner: WinSide | null;
}

/** 한 플레이어의 잡기 모드 진행 결과(내부 헬퍼 반환용). */
interface CaptureSequence {
  throws: YutThrow[];
  /** 진행한 플레이어(mover)의 최종 위치. */
  moverTraveled: number;
  /** 상대 말의 최종 위치(잡혔으면 0). */
  opponentTraveled: number;
  /** 이번 진행에서 상대 말을 한 번이라도 잡았는지. */
  captured: boolean;
  /** mover가 완주했는지. */
  finished: boolean;
}

/**
 * 한 플레이어가 잡기 규칙으로 진행하는 한 차례(들)를 실행한다(순수·결정적).
 * - playYutCaptureTurn으로 한 턴 굴리고, 잡았으면(captured) 같은 플레이어가 한 턴 더 진행한다.
 * - 윷/모로 인한 추가 던짐은 이미 playYutCaptureTurn 내부(playYutTurn)에서 누적되므로
 *   여기(라운드 레벨)에서 중복으로 추가 턴을 부여하지 않는다 — 잡기로 인한 추가 턴만 반복한다.
 * - 완주하면 즉시 멈춘다(이후 진행 없음).
 */
function runCaptureSequence(
  moverTraveled: number,
  opponentTraveled: number,
  rng: RandomSource,
): CaptureSequence {
  const throws: YutThrow[] = [];
  let mover = moverTraveled;
  let opponent = opponentTraveled;
  let captured = false;
  let finished = false;

  for (;;) {
    const turn = playYutCaptureTurn(mover, opponent, rng);
    throws.push(...turn.throws);
    mover = turn.moverTraveled;
    opponent = turn.opponentTraveled; // 잡았으면 0으로 리셋된 값
    if (turn.captured) captured = true;
    finished = turn.moverFinished;
    // 완주하면 종료. 잡았으면(완주가 아니면) 같은 플레이어가 한 번 더.
    if (finished || !turn.captured) break;
  }

  return { throws, moverTraveled: mover, opponentTraveled: opponent, captured, finished };
}

/**
 * 잡기 모드 윷놀이 한 라운드를 진행한다(나 먼저, 이어서 CPU). 순수·결정적(rng에만 의존).
 * - 나(mover)를 runCaptureSequence로 진행한다. 잡으면 CPU 말이 출발점(0)으로 리셋되고 한 번 더 던진다.
 * - 내가 완주하면 즉시 나 승리로 종료하고 CPU는 진행하지 않는다(cpuThrows=null).
 * - 내가 완주하지 못하면 CPU도 같은 방식으로 진행한다(이때 내 말이 CPU의 상대).
 * - 둘 다 완주하지 못하면 winner=null(진행 중). 순차 진행이라 무승부는 발생하지 않는다.
 * - 입력값을 변형하지 않는다.
 */
export function playYutCaptureRound(
  myTraveled: number,
  cpuTraveled: number,
  rng: RandomSource,
): YutCaptureRoundResult {
  const mine = runCaptureSequence(myTraveled, cpuTraveled, rng);

  if (mine.finished) {
    return {
      myThrows: mine.throws,
      cpuThrows: null,
      myTraveled: mine.moverTraveled,
      cpuTraveled: mine.opponentTraveled,
      myCaptured: mine.captured,
      cpuCaptured: false,
      winner: "a",
    };
  }

  // CPU 차례: CPU가 mover, 내 말이 상대가 된다.
  const cpu = runCaptureSequence(mine.opponentTraveled, mine.moverTraveled, rng);

  return {
    myThrows: mine.throws,
    cpuThrows: cpu.throws,
    myTraveled: cpu.opponentTraveled, // CPU의 상대였던 내 말 위치(잡혔으면 0)
    cpuTraveled: cpu.moverTraveled,
    myCaptured: mine.captured,
    cpuCaptured: cpu.captured,
    winner: cpu.finished ? "b" : null,
  };
}

/** 게임 종료 시 승자를 한국어 라벨로(나=a 기준). 색에 의존하지 않도록 텍스트로 표기. */
export function yutOutcomeLabel(winner: WinSide): string {
  if (winner === "a") return "🎉 승리!";
  if (winner === "b") return "😢 패배";
  return "🤝 무승부";
}

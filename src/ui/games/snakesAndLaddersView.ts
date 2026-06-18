// Presentation helpers for the 뱀과 사다리(Snakes and Ladders) 화면. 순수 함수 + 얇은 조립만 둔다.
// 이동·사다리/뱀·승패·난수 규칙은 domain(snakesAndLadders)·application(playSnakesAndLadders)을 호출하고
// 여기서 재구현하지 않는다(부수효과·시간 없는 표시용 변환, 입력 불변). 컴포넌트 분기 최소화·단위 테스트 가능.
import type {
  SnakesAndLaddersPlayer,
  SnakesAndLaddersState,
} from "../../domain/snakesAndLadders";
import {
  type SnakesAndLaddersRollResult,
  playSnakesAndLaddersTurn,
} from "../../application/playSnakesAndLadders";
import type { RandomSource } from "../../application/dealCards";
import type { WinSide } from "../records";
import { dieFace } from "./diceView";

// vs CPU: 사람=선공("a")·CPU=후공("b"). 표시와 기록이 같은 매핑을 쓰도록 한곳에 둔다.
export const SNL_HUMAN: SnakesAndLaddersPlayer = "a";
export const SNL_CPU: SnakesAndLaddersPlayer = "b";

/** 플레이어를 화면용 한국어 라벨로 변환한다(색 비의존 텍스트). */
export function snlPlayerLabel(player: SnakesAndLaddersPlayer): string {
  return player === SNL_HUMAN ? "나" : "CPU";
}

/** 현재 차례(또는 종료 시 승자)를 한 줄로 표시한다. */
export function snlTurnLabel(state: SnakesAndLaddersState): string {
  if (state.winner !== null) {
    return `${snlPlayerLabel(state.winner)} 승리`;
  }
  return `${snlPlayerLabel(state.turn)} 차례`;
}

/**
 * 한 플레이어의 현재 진행 위치 라벨(색 비의존 텍스트).
 * 0칸은 아직 보드 밖이므로 "출발 전"으로 안내한다.
 */
export function snlPositionLabel(
  state: SnakesAndLaddersState,
  player: SnakesAndLaddersPlayer,
): string {
  const pos = state.positions[player];
  const where = pos === 0 ? "출발 전" : `${pos} / ${state.size}칸`;
  return `${snlPlayerLabel(player)}: ${where}`;
}

/**
 * 진행도(0..1). 위치를 골(size)로 나눈 값으로, 진행 막대 너비 계산 등에 쓴다.
 * size가 0 이하인 비정상 상태에서도 NaN/Infinity가 새지 않도록 0으로 클램프한다.
 */
export function snlProgressRatio(
  state: SnakesAndLaddersState,
  player: SnakesAndLaddersPlayer,
): number {
  if (!(state.size > 0)) {
    return 0;
  }
  const ratio = state.positions[player] / state.size;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * 주사위 눈을 색이 아니라 점 기호 + 숫자로 함께 표시한다(색 비의존).
 * 예: 3 → "⚂ 3". 1..6 범위를 벗어나면 dieFace가 throw한다(조용한 무시 금지).
 */
export function snlDieLabel(die: number): string {
  return `${dieFace(die)} ${die}`;
}

/** 진행/승패 상황을 플레이어용 한국어 문구로 변환한다(순수·결정적). */
export function describeSnlStatus(state: SnakesAndLaddersState): string {
  if (state.winner !== null) {
    return state.winner === SNL_HUMAN
      ? "🎉 골에 먼저 정확히 도달했습니다. 승리!"
      : "😢 CPU가 먼저 골에 도달했습니다. 패배.";
  }
  return state.turn === SNL_HUMAN
    ? "주사위 굴리기로 전진하세요. 사다리를 타면 오르고 뱀을 만나면 미끄러집니다."
    : "CPU가 진행 중입니다…";
}

/** 종료 상태에서 승자 측 기록 값(a/b)으로 변환한다. 이 게임엔 무승부가 없다. */
export function snlWinSide(winner: SnakesAndLaddersPlayer): WinSide {
  return winner === SNL_HUMAN ? "a" : "b";
}

/**
 * 한 번의 굴림 결과를 한국어 로그 한 줄로 포매팅한다(색 비의존, 순수·결정적).
 * - 초과(overshoot): 골을 넘어 제자리에 머무름.
 * - 사다리/뱀(slid): 중간 칸에서 위/아래로 추가 이동.
 * - 골 도달(winner): 승리 안내.
 * - 그 외: 단순 전진.
 */
export function formatSnlRoll(result: SnakesAndLaddersRollResult): string {
  const who = snlPlayerLabel(result.mover);
  const die = snlDieLabel(result.die);
  const size = result.state.size;
  const tentative = result.from + result.die;

  if (result.overshoot) {
    return `${who}: ${die} — 골(${size}칸)을 초과해 제자리(${result.to}칸)에 머무름`;
  }

  const won = result.state.winner === result.mover;
  if (result.slid) {
    const climbed = result.to > tentative;
    const kind = climbed ? "사다리를 타고 올라" : "뱀에 미끄러져";
    const goal = won ? " — 골 도달! 승리" : "";
    return `${who}: ${die} — ${tentative}칸에서 ${kind} ${result.to}칸으로 이동${goal}`;
  }

  if (won) {
    return `${who}: ${die} — 골(${size}칸)에 정확히 도달! 승리`;
  }

  return `${who}: ${die} — ${result.from}칸에서 ${result.to}칸으로 이동`;
}

/** vs CPU 한 라운드(사람 한 턴 + 미종료 시 CPU 한 턴) 진행 결과. */
export interface SnlRoundResult {
  /** 라운드 종료 후 새 상태(불변). */
  state: SnakesAndLaddersState;
  /** 사람 한 턴 결과. */
  human: SnakesAndLaddersRollResult;
  /** CPU 한 턴 결과(사람이 이번 턴에 이겨 CPU가 굴리지 않았으면 null). */
  cpu: SnakesAndLaddersRollResult | null;
  /** 라운드 진행 로그(사람 → (있으면) CPU 순). */
  log: string[];
}

/**
 * 사람 한 턴을 진행하고, 게임이 끝나지 않았으면 CPU 한 턴을 자동 진행한다(불변·결정적은 rng 의존).
 * - 규칙·난수는 application(playSnakesAndLaddersTurn)에 위임한다(재구현 금지).
 * - 호출 시 state는 사람("a") 차례이며 미종료여야 한다(아니면 도메인 applyDiceMove가 throw 전파).
 * - 한 턴 = 주사위 1회(도메인이 매 턴 차례를 전환하므로 사람 턴 뒤 미종료면 반드시 CPU 차례).
 */
export function playSnlRound(
  state: SnakesAndLaddersState,
  rng: RandomSource,
): SnlRoundResult {
  const human = playSnakesAndLaddersTurn(state, rng);
  const log = [formatSnlRoll(human)];

  if (human.state.winner !== null) {
    return { state: human.state, human, cpu: null, log };
  }

  const cpu = playSnakesAndLaddersTurn(human.state, rng);
  log.push(formatSnlRoll(cpu));
  return { state: cpu.state, human, cpu, log };
}

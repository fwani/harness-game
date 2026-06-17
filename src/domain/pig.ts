// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 피그(Pig): 푸시-유어-럭 주사위 게임(2인 교대).
// - 자기 차례에 주사위(1~6)를 반복해서 굴린다.
// - 1이 아닌 눈이 나오면 이번 턴 누계(turnTotal)에 더하고 계속/멈춤을 선택한다.
// - 1이 나오면 이번 턴 누계를 모두 잃고(0) 차례가 상대로 넘어간다.
// - 멈추면(hold) 이번 턴 누계가 총점에 더해지고 차례가 넘어간다.
// - 누군가의 총점이 목표(기본 100) 이상이면 그 플레이어가 승리한다.
// 난수·CPU 행동 결정·UI 연동은 이 모듈 범위 밖이다(후속 짝 이슈로 분리).
// 모든 함수는 결정적 순수 함수이며 입력 state를 변형하지 않는다(새 객체 반환).

/** 플레이어 식별. 색 비의존 — 후속 UI는 기호/레이블 병행. */
export type PigPlayer = "a" | "b";

export interface PigState {
  /** 확정 누적 총점. */
  scores: { a: number; b: number };
  /** 현재 차례. */
  turn: PigPlayer;
  /** 이번 턴 임시 누계(아직 총점에 반영 전). */
  turnTotal: number;
  /** 목표 점수(기본 100). */
  target: number;
  /** 종료 시 승자(진행 중이면 null). */
  winner: PigPlayer | null;
}

const DEFAULT_TARGET = 100;

/** 차례 상대를 반환한다. */
function opponent(player: PigPlayer): PigPlayer {
  return player === "a" ? "b" : "a";
}

/**
 * 새 피그 게임 상태를 생성한다. target 미지정 시 100.
 * - target은 양의 정수여야 한다(아니면 throw).
 * - 선공은 "a", turnTotal=0, winner=null.
 */
export function createPigGame(target: number = DEFAULT_TARGET): PigState {
  if (!Number.isInteger(target) || target <= 0) {
    throw new Error(`피그 잘못된 목표 점수: 양의 정수여야 함(받은 값: ${target})`);
  }
  return {
    scores: { a: 0, b: 0 },
    turn: "a",
    turnTotal: 0,
    target,
    winner: null,
  };
}

/** 승자가 정해졌으면 종료. */
export function isPigOver(state: PigState): boolean {
  return state.winner !== null;
}

/**
 * 현재 상태 기준 승자를 판정한다.
 * - 이미 winner가 있으면 그 값을 반환한다.
 * - 어느 한쪽 총점이 target 이상이면 그 플레이어를 반환한다.
 * - 둘 다 미달이면 null.
 * (입력 state는 변형하지 않는다.)
 */
export function findPigWinner(state: PigState): PigPlayer | null {
  if (state.winner !== null) {
    return state.winner;
  }
  if (state.scores.a >= state.target) {
    return "a";
  }
  if (state.scores.b >= state.target) {
    return "b";
  }
  return null;
}

/**
 * 주사위 한 번(die: 1..6)을 적용한 새 상태를 반환한다(입력 불변).
 * - die===1 → 이번 턴 누계 소멸(turnTotal=0)·차례 전환.
 * - 그 외 → turnTotal += die (총점에는 아직 반영하지 않음).
 * - die가 1~6 정수가 아니면 throw.
 * - 이미 종료(winner 존재)된 state면 throw.
 */
export function applyPigRoll(state: PigState, die: number): PigState {
  if (state.winner !== null) {
    throw new Error("피그 잘못된 호출: 이미 종료된 게임에 굴림 불가");
  }
  if (!Number.isInteger(die) || die < 1 || die > 6) {
    throw new Error(`피그 잘못된 주사위 눈: 1~6 정수여야 함(받은 값: ${die})`);
  }
  if (die === 1) {
    return {
      scores: { a: state.scores.a, b: state.scores.b },
      turn: opponent(state.turn),
      turnTotal: 0,
      target: state.target,
      winner: null,
    };
  }
  return {
    scores: { a: state.scores.a, b: state.scores.b },
    turn: state.turn,
    turnTotal: state.turnTotal + die,
    target: state.target,
    winner: null,
  };
}

/**
 * 멈춤(hold)을 적용한 새 상태를 반환한다(입력 불변).
 * - 현재 차례의 총점에 turnTotal을 더한다.
 * - 더한 총점이 target 이상이면 그 플레이어를 winner로 설정(차례 유지).
 * - 미달이면 차례를 상대로 전환하고 turnTotal=0.
 * - 이미 종료(winner 존재)된 state면 throw.
 */
export function applyPigHold(state: PigState): PigState {
  if (state.winner !== null) {
    throw new Error("피그 잘못된 호출: 이미 종료된 게임에 멈춤 불가");
  }
  const current = state.turn;
  const newScore = state.scores[current] + state.turnTotal;
  const scores = { a: state.scores.a, b: state.scores.b };
  scores[current] = newScore;

  if (newScore >= state.target) {
    return {
      scores,
      turn: current,
      turnTotal: 0,
      target: state.target,
      winner: current,
    };
  }
  return {
    scores,
    turn: opponent(current),
    turnTotal: 0,
    target: state.target,
    winner: null,
  };
}

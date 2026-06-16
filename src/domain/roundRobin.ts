// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 게임 종류에 독립적인 라운드 로빈(round-robin) 대진표 생성.
// 표준 원형 회전법(circle method)으로 모든 참가자 쌍이 정확히 한 번씩 만나는 라운드별 대진을 만든다.
// 도메인은 입력만으로 결정적이다(시간·난수·식별자 생성 없음).

/** 한 라운드의 한 대국 대진(참가자 식별자 두 명). */
export interface Pairing {
  a: string;
  b: string;
}

/** 한 라운드의 대진 목록. 그 라운드에 쉬는(부전승) 참가자는 어떤 Pairing에도 들어가지 않는다. */
export type Round = Pairing[];

// 홀수 인원을 짝수로 맞추기 위한 내부 가상 자리(부전승). 결과에는 노출되지 않는다.
const BYE = Symbol("round-robin-bye");

/**
 * 라운드 로빈(round-robin) 대진표를 생성한다(불변, 결정적).
 * - 모든 참가자 쌍이 전체 일정에서 정확히 한 번씩 만난다.
 * - 참가자 수 n이 짝수면 라운드 수는 n-1, 홀수면 n(매 라운드 한 명씩 부전승으로 쉼).
 * - 각 라운드 안에서는 한 참가자가 최대 한 번만 등장한다.
 * - players가 0명 또는 1명이면 대국이 성립하지 않으므로 빈 배열([])을 반환한다.
 * - 식별자는 비어 있지 않은 문자열이어야 하고 중복이 없어야 한다(아니면 throw).
 * - 입력 players 배열을 변형하지 않는다.
 */
export function generateRoundRobinSchedule(players: string[]): Round[] {
  for (const player of players) {
    if (typeof player !== "string" || player === "") {
      throw new Error("generateRoundRobinSchedule requires non-empty string identifiers");
    }
  }
  if (new Set(players).size !== players.length) {
    throw new Error("generateRoundRobinSchedule requires unique identifiers");
  }

  if (players.length < 2) {
    return [];
  }

  // 홀수면 가상의 부전승 자리를 추가해 짝수로 맞춘다.
  const slots: (string | typeof BYE)[] = [...players];
  if (slots.length % 2 !== 0) {
    slots.push(BYE);
  }

  let positions: (string | typeof BYE)[] = slots;
  const count = positions.length;
  const roundsTotal = count - 1;
  const half = count / 2;
  const schedule: Round[] = [];

  for (let r = 0; r < roundsTotal; r += 1) {
    const round: Round = [];
    for (let i = 0; i < half; i += 1) {
      const home = positions[i];
      const away = positions[count - 1 - i];
      // 부전승(BYE) 자리와 짝지어진 참가자는 그 라운드에 쉰다(Pairing 없이 처리).
      if (typeof home === "string" && typeof away === "string") {
        round.push({ a: home, b: away });
      }
    }
    schedule.push(round);

    // 원형 회전법: 첫 자리는 고정하고 나머지를 시계 방향으로 한 칸 회전한다.
    const head = positions.slice(0, 1);
    const rest = positions.slice(1);
    const last = rest.pop();
    positions = last === undefined ? [...head, ...rest] : [...head, last, ...rest];
  }

  return schedule;
}

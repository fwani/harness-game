// Domain layer: pure game rules. No outward dependency (no application/infrastructure).
// 게임 종류에 독립적인 싱글 엘리미네이션(녹아웃) 대진표 생성.
// 표준 시드 배치(1 vs N, 2 vs N-1 ...)를 재귀적으로 구성해 1라운드 대진을 만든다.
// 참가자 수가 2의 거듭제곱이 아니면 상위 시드에게 부전승(bye)을 준다.
// 도메인은 입력만으로 결정적이다(시간·난수·식별자 생성 없음).

/** 한 대국 대진. b가 null이면 a의 부전승(bye)이다. */
export interface BracketPairing {
  a: string;
  b: string | null;
}

/**
 * bracketSize(2의 거듭제곱) 크기의 표준 시드 배치 순서를 만든다.
 * 시드 번호(1-based)를 대진 슬롯 순서대로 나열한다.
 * 예) 2 -> [1,2], 4 -> [1,4,2,3], 8 -> [1,8,4,5,2,7,3,6].
 * 인접한 두 슬롯이 한 대진을 이루며, 각 대진의 앞 슬롯이 항상 더 높은(번호가 작은) 시드다.
 */
function standardSeedOrder(bracketSize: number): number[] {
  let order = [1];
  while (order.length < bracketSize) {
    const roundSize = order.length * 2;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed);
      next.push(roundSize + 1 - seed);
    }
    order = next;
  }
  return order;
}

/**
 * 싱글 엘리미네이션 1라운드 대진을 시드 순서대로 생성한다(불변, 결정적).
 * - players는 시드 순(1번 시드가 players[0]).
 * - 대진 크기는 players.length 이상인 최소 2의 거듭제곱(bracketSize)으로 맞춘다.
 * - 표준 시드 배치(1 vs N, 2 vs N-1 ... 를 재귀적으로 구성한 seedOrder)를 사용한다.
 * - bracketSize - players.length 개의 부전승은 상위 시드부터 배정된다(상대 b=null).
 * - 식별자는 비어 있지 않은 문자열, 중복 불가(아니면 throw).
 * - players가 0명/1명이면 대국이 성립하지 않으므로 빈 배열([])을 반환한다.
 * - 입력 players 배열을 변형하지 않는다.
 */
export function generateSingleEliminationFirstRound(players: string[]): BracketPairing[] {
  for (const player of players) {
    if (typeof player !== "string" || player === "") {
      throw new Error(
        "generateSingleEliminationFirstRound requires non-empty string identifiers",
      );
    }
  }
  if (new Set(players).size !== players.length) {
    throw new Error("generateSingleEliminationFirstRound requires unique identifiers");
  }

  if (players.length < 2) {
    return [];
  }

  // players.length 이상인 최소 2의 거듭제곱을 대진 크기로 삼는다.
  let bracketSize = 1;
  while (bracketSize < players.length) {
    bracketSize *= 2;
  }

  const seedOrder = standardSeedOrder(bracketSize);
  const pairings: BracketPairing[] = [];

  // 시드 번호(1-based)를 참가자로 환원한다. 범위를 벗어나면(가상 자리) null.
  const seatOf = (seed: number): string | null =>
    seed <= players.length ? (players[seed - 1] as string) : null;

  // 인접한 두 시드가 한 대진을 이룬다. 앞 슬롯이 항상 더 높은(번호가 작은) 시드이므로
  // 실제 참가자 범위(<= players.length)를 벗어나는 시드는 부전승(b=null)으로 처리한다.
  for (let i = 0; i < seedOrder.length; i += 2) {
    // seedOrder는 짝수 길이(bracketSize)이고 i는 짝수이므로 두 슬롯 모두 존재한다.
    const a = seatOf(seedOrder[i] as number);
    const b = seatOf(seedOrder[i + 1] as number);
    // 앞 슬롯은 항상 더 높은 시드라 실제 참가자다(가상 자리는 뒤 슬롯에만 온다).
    pairings.push({ a: a as string, b });
  }

  return pairings;
}

/**
 * 한 라운드의 대진과 각 대진 승자로 다음 라운드 대진을 생성한다(불변, 결정적).
 * - `winners[i]`는 `round[i]` 대진의 승자다.
 * - bye 대진(`b === null`)이면 `winners[i]`는 `null`이어도 되고(자동으로 `a` 진출),
 *   명시하면 `a`와 일치해야 한다(불일치 시 throw).
 * - 실제 대국(`b !== null`)인데 `winners[i]`가 `null`이거나 그 대진의 `a`/`b` 중
 *   하나가 아니면 throw.
 * - `winners.length !== round.length`면 throw.
 * - 진출자(각 대진 승자)는 라운드 순서를 그대로 유지한 채 인접 두 명씩 묶어 대진을 만든다.
 *   진출자가 홀수면 마지막 한 명은 bye(`{ a, b: null }`).
 * - 진출자가 1명이면 우승 확정으로 보고 빈 배열(`[]`)을 반환한다. `round`가 비어도 `[]`.
 * - 입력 배열(`round`/`winners`)을 변형하지 않는다.
 */
export function advanceSingleEliminationRound(
  round: BracketPairing[],
  winners: ReadonlyArray<string | null>,
): BracketPairing[] {
  if (winners.length !== round.length) {
    throw new Error(
      "advanceSingleEliminationRound requires winners.length to equal round.length",
    );
  }

  // 각 대진의 진출자(승자)를 라운드 순서대로 환원한다.
  const advancers: string[] = [];
  for (let i = 0; i < round.length; i += 1) {
    const pairing = round[i] as BracketPairing;
    const winner = winners[i] as string | null;

    if (pairing.b === null) {
      // bye: 승자를 생략하면 a 자동 진출, 명시하면 a와 일치해야 한다.
      if (winner !== null && winner !== pairing.a) {
        throw new Error(
          "advanceSingleEliminationRound: bye winner must be the auto-advancing seat",
        );
      }
      advancers.push(pairing.a);
    } else {
      // 실제 대국: 승자는 반드시 a 또는 b 중 하나여야 한다.
      if (winner !== pairing.a && winner !== pairing.b) {
        throw new Error(
          "advanceSingleEliminationRound: winner must be one of the pairing's participants",
        );
      }
      advancers.push(winner as string);
    }
  }

  // 진출자가 1명 이하면 다음 라운드가 없다(우승 확정 또는 빈 라운드).
  if (advancers.length < 2) {
    return [];
  }

  // 진출자 순서를 유지한 채 인접 두 명씩 묶는다. 홀수면 마지막은 bye.
  const next: BracketPairing[] = [];
  for (let i = 0; i < advancers.length; i += 2) {
    const a = advancers[i] as string;
    const b = i + 1 < advancers.length ? (advancers[i + 1] as string) : null;
    next.push({ a, b });
  }

  return next;
}

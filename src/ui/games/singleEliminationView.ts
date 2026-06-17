// Presentation helpers for the SingleElimination (녹아웃 토너먼트) screen. Pure functions only —
// keeps the React component thin and lets us unit-test the view logic without a DOM.
// 대진 생성/진행 규칙은 domain(generateSingleEliminationFirstRound/advanceSingleEliminationRound)을
// 재사용하며 여기서 재구현하지 않는다. 이 파일은 화면용 검증·변환·라벨링만 담당한다.
import type { BracketPairing } from "../../domain/singleElimination";

/** 참가자 이름 검증 결과(정상이면 정제된 목록, 아니면 한국어 사유). */
export type BracketPlayersValidation =
  | { ok: true; players: string[] }
  | { ok: false; reason: string };

/**
 * 입력된 원시 이름 목록을 정제·검증한다(불변, 결정적).
 * - 각 이름은 trim 후 빈 문자열이면 제외한다.
 * - 정제 후 2명 미만이면 사유를 반환한다(대국 성립 불가).
 * - 중복 이름(trim 기준)이 있으면 사유를 반환한다.
 */
export function validateBracketPlayers(names: string[]): BracketPlayersValidation {
  const players = names.map((name) => name.trim()).filter((name) => name !== "");

  if (players.length < 2) {
    return { ok: false, reason: "참가자를 2명 이상 입력하세요." };
  }
  if (new Set(players).size !== players.length) {
    return { ok: false, reason: "참가자 이름이 중복되었습니다. 서로 다른 이름을 사용하세요." };
  }
  return { ok: true, players };
}

/**
 * 라운드 인덱스를 사람이 읽는 라벨로 변환한다(불변, 결정적).
 * - 마지막 라운드는 "결승", 그 직전은 "준결승".
 * - 그 외는 라운드 참가자 수로 "8강"/"16강" 등.
 * - 비정상 입력(totalRounds<=0 등)은 "1라운드"로 안전 폴백.
 */
export function roundLabel(roundIndex: number, totalRounds: number): string {
  if (!Number.isInteger(roundIndex) || !Number.isInteger(totalRounds)) {
    return `${roundIndex + 1}라운드`;
  }
  if (totalRounds <= 0 || roundIndex < 0 || roundIndex >= totalRounds) {
    return `${roundIndex + 1}라운드`;
  }
  if (roundIndex === totalRounds - 1) {
    return "결승";
  }
  if (roundIndex === totalRounds - 2) {
    return "준결승";
  }
  // 남은 라운드 수만큼 슬롯이 2배씩 늘어난다: 참가자 수 = 2^(남은 라운드 수).
  const participants = 2 ** (totalRounds - roundIndex);
  return `${participants}강`;
}

/**
 * 한 대진의 안정 키. 한 라운드 안에서 `a`(상위 슬롯)는 항상 실제 참가자이며 유일하므로
 * 라운드 내 승자 보관용 Record의 키로 안전하게 쓸 수 있다.
 */
export function pairingKey(pairing: BracketPairing): string {
  return pairing.a;
}

/**
 * 라운드의 모든 실제 대국(b≠null)에 승자가 정해졌는지 여부(불변, 결정적).
 * - bye 대진(b===null)은 자동 진출이라 결정 불필요.
 * - 빈 라운드([])는 진행할 대국이 없으므로 false(우승 확정 상태는 컴포넌트가 판단).
 */
export function isRoundDecided(
  round: BracketPairing[],
  winners: Record<string, string | null>,
): boolean {
  if (round.length === 0) {
    return false;
  }
  return round.every((pairing) => {
    if (pairing.b === null) {
      return true;
    }
    const picked = winners[pairing.a];
    return picked === pairing.a || picked === pairing.b;
  });
}

/**
 * 라운드 순서를 유지한 채 각 대진의 승자를 advanceSingleEliminationRound용 배열로 환원한다.
 * - bye 대진(b===null)은 a 자동 진출.
 * - 실제 대국은 picks[a]에서 가져온다(미선택이면 null).
 * - 입력을 변형하지 않는다.
 */
export function winnersInOrder(
  round: BracketPairing[],
  picks: Record<string, string | null>,
): (string | null)[] {
  return round.map((pairing) =>
    pairing.b === null ? pairing.a : picks[pairing.a] ?? null,
  );
}

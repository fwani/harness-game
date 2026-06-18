// Infrastructure layer: application IdSource 포트의 어댑터.
// 식별자 발급이라는 부수효과(crypto)는 edge(여기)에만 둔다 — application은 값만 보관한다.
// crypto.randomUUID()가 있으면 사용하고, 없으면 주입된 RandomSource 폴백으로
// 충분히 고유한 식별자(UUID 형태)를 결정적으로 만든다(테스트 가능).
import type { RandomSource } from "../application/dealCards";
import type { IdSource } from "../application/playerIdentity";

/** 16진수 문자. 폴백 식별자 생성에 사용. */
const HEX = "0123456789abcdef";

/** 폴백 식별자의 그룹별 16진수 자릿수(UUID 형태: 8-4-4-4-12). */
const GROUP_LENGTHS: readonly number[] = [8, 4, 4, 4, 12];

export interface CryptoIdSourceOptions {
  /** native crypto.randomUUID 미가용 시 사용할 난수 포트(폴백 경로). */
  fallbackRng?: RandomSource;
  /**
   * crypto.randomUUID 주입(테스트용).
   * - 생략(undefined): globalThis.crypto.randomUUID를 해석해 사용(있으면).
   * - null: native UUID를 강제로 무시(폴백 경로 테스트).
   * - 함수: 그 함수를 사용.
   */
  randomUUID?: (() => string) | null;
}

/**
 * 익명 세션/유저 식별자 발급 어댑터.
 * - native crypto.randomUUID가 있으면 우선 사용.
 * - 없으면 주입된 RandomSource로 UUID 형태 식별자를 만든다(결정적 테스트 가능).
 * - 둘 다 없으면 newId()에서 throw(조용한 약식별자 발급 방지).
 */
export class CryptoIdSource implements IdSource {
  private readonly fallbackRng?: RandomSource;
  private readonly randomUUID: (() => string) | null;

  constructor(options: CryptoIdSourceOptions = {}) {
    this.fallbackRng = options.fallbackRng;
    this.randomUUID =
      options.randomUUID === undefined
        ? resolveNativeRandomUUID()
        : options.randomUUID;
  }

  newId(): string {
    if (this.randomUUID) {
      return this.randomUUID();
    }
    if (this.fallbackRng) {
      return fallbackId(this.fallbackRng);
    }
    throw new Error(
      "CryptoIdSource: crypto.randomUUID도 없고 폴백 RandomSource도 주입되지 않았습니다.",
    );
  }
}

/** globalThis.crypto.randomUUID를 안전하게 해석한다(미가용이면 null). */
function resolveNativeRandomUUID(): (() => string) | null {
  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined;
  if (cryptoLike && typeof cryptoLike.randomUUID === "function") {
    return () => cryptoLike.randomUUID!();
  }
  return null;
}

/** 주입된 RandomSource로 16진수 count자리 문자열을 만든다. */
function hex(rng: RandomSource, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += HEX.charAt(rng.nextInt(HEX.length));
  }
  return out;
}

/** RandomSource 기반 UUID 형태(8-4-4-4-12) 식별자. 같은 rng 시퀀스 → 같은 값(결정적). */
function fallbackId(rng: RandomSource): string {
  return GROUP_LENGTHS.map((len) => hex(rng, len)).join("-");
}

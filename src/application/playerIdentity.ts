// Application layer: 익명 유저 정체성(표시 이름 + 식별자) 순수 헬퍼.
// domain/포트에만 의존한다. infrastructure/ui/Math.random/crypto/Date 직접 사용 금지 —
// 무작위는 RandomSource 포트(playBingo/playSudoku 관례), 식별자 발급은 IdSource 포트로 주입받는다.
// 실제 식별자 발급(crypto 등)·SELF_PLAYER 치환·영속·UI 배선은 후속 짝 이슈 범위.
import type { RandomSource } from "./dealCards";

/** 익명/로그인 없는 사람 플레이어의 정체성 모델. */
export interface PlayerIdentity {
  /** 익명 세션/유저 식별자(실제 발급은 IdSource 어댑터, application은 값만 보관). */
  id: string;
  /** 화면에 보이는 게스트 표시 이름(예: "용감한 너구리 37"). */
  displayName: string;
}

/** 식별자 생성 포트 — 익명 세션/유저 식별자 발급. 실제 구현은 후속 infrastructure 어댑터. */
export interface IdSource {
  /** 새 식별자 1개를 발급한다. */
  newId(): string;
}

/** 게스트 이름 형용사 뱅크(한국어). 무작위 선택은 RandomSource로만 한다. */
const ADJECTIVES: readonly string[] = [
  "용감한",
  "재빠른",
  "조용한",
  "엉뚱한",
  "느긋한",
  "씩씩한",
  "수줍은",
  "영리한",
  "명랑한",
  "차분한",
  "다정한",
  "당당한",
  "기운찬",
  "은근한",
  "꼼꼼한",
  "활발한",
];

/** 게스트 이름 동물 명사 뱅크(한국어). */
const ANIMALS: readonly string[] = [
  "너구리",
  "수달",
  "여우",
  "고슴도치",
  "다람쥐",
  "올빼미",
  "고양이",
  "강아지",
  "토끼",
  "사슴",
  "두더지",
  "햄스터",
  "펭귄",
  "수리",
  "물범",
  "오소리",
];

/** 표시 이름 숫자 접미사 상한(0..MAX_SUFFIX). */
const MAX_SUFFIX = 99;

/** 표시 이름 트림 후 허용 길이(문자 수). */
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 20;

/**
 * 내장 단어 뱅크에서 "형용사 + 동물 + 숫자" 게스트 이름을 만든다(결정적).
 * 같은 rng 시퀀스 → 같은 이름. 무작위는 주입된 RandomSource로만 뽑는다.
 */
export function randomDisplayName(rng: RandomSource): string {
  const adjective = ADJECTIVES[rng.nextInt(ADJECTIVES.length)]!;
  const animal = ANIMALS[rng.nextInt(ANIMALS.length)]!;
  const suffix = rng.nextInt(MAX_SUFFIX + 1);
  return `${adjective} ${animal} ${suffix}`;
}

/**
 * 익명 정체성을 만든다(포트 주입 조합, 불변 — 새 객체 반환).
 * id는 주입된 IdSource.newId()로, displayName은 randomDisplayName(rng)로 만든다.
 */
export function createAnonymousIdentity(
  rng: RandomSource,
  ids: IdSource,
): PlayerIdentity {
  return { id: ids.newId(), displayName: randomDisplayName(rng) };
}

/**
 * 표시 이름 검증. 트림 후 길이가 1~20이면 통과(트림된 값 반환),
 * 빈 문자열/공백뿐/최대 길이 초과는 한국어 사유로 거부한다.
 */
export function validateDisplayName(
  name: string,
): { ok: true; value: string } | { ok: false; reason: string } {
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH) {
    return { ok: false, reason: "표시 이름을 입력해 주세요." };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      reason: `표시 이름은 ${MAX_NAME_LENGTH}자 이하여야 합니다.`,
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * 표시 이름을 바꾼 새 정체성을 반환한다(불변 — 입력 identity는 변형하지 않는다).
 * 검증 통과 시 displayName(트림된 값)만 교체하고, 실패 시 사유 메시지로 throw한다.
 */
export function renameIdentity(
  identity: PlayerIdentity,
  name: string,
): PlayerIdentity {
  const result = validateDisplayName(name);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return { ...identity, displayName: result.value };
}

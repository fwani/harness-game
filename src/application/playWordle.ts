// Application layer: 워들 무작위 정답 선택 + 한 추측 진행(턴 오케스트레이션).
// domain(wordle)과 RandomSource 포트에만 의존한다. infrastructure/ui 의존 금지.
// 채점·추측 적용·승패 판정 등 규칙은 도메인 함수만 호출하고 재구현하지 않는다.
// 무작위는 도메인이 아니라 RandomSource 주입으로 처리한다(다른 게임 헬퍼와 동일 패턴).
import {
  applyWordleGuess,
  createWordleGame,
  isWordleLost,
  isWordleWon,
  scoreWordleGuess,
  type WordleLetterResult,
  type WordleState,
} from "../domain/wordle";
import type { RandomSource } from "./dealCards";

/** 워들 한 판의 진행 상태(승리 우선). */
export type WordleStatus = "playing" | "won" | "lost";

/**
 * 정답 후보 단어 목록(영문 소문자, 모두 표준 워들 5글자). 모두 도메인 createWordleGame
 * 검증(영문자만)을 통과한다. 충분한 다양성을 확보한다.
 */
export const WORDLE_WORDS: readonly string[] = [
  "apple",
  "brave",
  "chair",
  "dance",
  "eagle",
  "flute",
  "grape",
  "house",
  "input",
  "jolly",
  "knife",
  "lemon",
  "mango",
  "noble",
  "ocean",
  "piano",
  "quiet",
  "river",
  "stone",
  "tiger",
  "unity",
  "vivid",
  "whale",
  "yacht",
  "zebra",
];

/**
 * 추측으로 허용하는 추가 영단어 목록(정답 후보 외). 모두 표준 워들 5글자·소문자.
 * 표준 워들처럼 사전에 없는 임의 글자 나열(예: ZXQVW)을 거르되, 흔한 시작 단어·전략 단어가
 * 부당히 거부되지 않도록 충분히 넓게 둔다. 정답 후보(WORDLE_WORDS)는 아래 사전 집합에 합쳐진다.
 */
const WORDLE_EXTRA_GUESSES: readonly string[] = [
  "adieu", "agent", "alert", "alike", "alive", "allow", "alone", "along", "aloud",
  "among", "angle", "ankle", "apart", "arise", "arose", "audio", "avoid", "award",
  "aware", "basic", "beach", "began", "begin", "being", "below", "bench", "birth",
  "black", "blade", "blame", "blank", "blast", "blaze", "blend", "blind", "block",
  "blood", "board", "boost", "booth", "bound", "brain", "brand", "brave", "bread",
  "break", "breed", "brick", "bride", "brief", "bring", "broad", "brown", "build",
  "built", "burst", "cabin", "cable", "candy", "canon", "cargo", "carry", "catch",
  "cause", "chain", "chalk", "chaos", "charm", "chart", "chase", "cheap", "check",
  "chess", "chest", "chief", "child", "chill", "civic", "civil", "claim", "class",
  "clean", "clear", "click", "cliff", "climb", "clock", "close", "cloth", "cloud",
  "coach", "coast", "could", "count", "court", "cover", "craft", "crane", "crash",
  "crate", "crazy", "cream", "crime", "cross", "crowd", "crown", "crude", "curve",
  "cycle", "daily", "dairy", "dealt", "death", "delay", "depth", "doing", "doubt",
  "dozen", "draft", "drama", "drank", "drawn", "dream", "dress", "drill", "drink",
  "drive", "drove", "dying", "eager", "early", "earth", "eight", "elder", "elite",
  "empty", "enemy", "enjoy", "enter", "entry", "equal", "error", "event", "every",
  "exact", "exist", "extra", "faith", "false", "fault", "favor", "fence", "fewer",
  "field", "fifth", "fifty", "fight", "final", "first", "fixed", "flame", "flash",
  "fleet", "flesh", "float", "flood", "floor", "flour", "fluid", "focus", "force",
  "forth", "forty", "forum", "found", "frame", "frank", "fraud", "fresh", "front",
  "frost", "fruit", "fully", "funny", "ghost", "giant", "given", "glass", "globe",
  "glory", "glove", "grace", "grade", "grain", "grand", "grant", "graph", "grass",
  "grave", "great", "greed", "green", "greet", "grief", "gross", "group", "grown",
  "guard", "guess", "guest", "guide", "guilt", "habit", "handy", "happy", "harsh",
  "haste", "haunt", "heart", "heavy", "hello", "hence", "honey", "honor", "horse",
  "hotel", "human", "humor", "hurry", "ideal", "image", "index", "inner", "irony",
  "issue", "ivory", "joint", "judge", "juice", "knife", "knock", "known", "label",
  "labor", "large", "laser", "later", "laugh", "layer", "learn", "lease", "least",
  "leave", "legal", "lemon", "level", "light", "limit", "linen", "liver", "local",
  "logic", "loose", "lower", "loyal", "lucky", "lunar", "lunch", "lying", "magic",
  "major", "maker", "march", "match", "maybe", "mayor", "meant", "medal", "media",
  "mercy", "merit", "metal", "meter", "midst", "might", "minor", "minus", "mixed",
  "model", "money", "month", "moral", "motor", "mount", "mouse", "mouth", "movie",
  "music", "naval", "nerve", "never", "newly", "night", "ninth", "noise", "north",
  "novel", "nurse", "occur", "ocean", "offer", "often", "olive", "onion", "order",
  "organ", "other", "ought", "outer", "owing", "owner", "paint", "panel", "paper",
  "party", "pasta", "patch", "pause", "peace", "pearl", "phase", "phone", "photo",
  "piece", "pilot", "pitch", "pixel", "place", "plain", "plane", "plant", "plate",
  "plaza", "point", "porch", "pound", "power", "press", "price", "pride", "prime",
  "print", "prior", "prize", "probe", "proof", "proud", "prove", "pulse", "pupil",
  "purse", "queen", "query", "quest", "quick", "quite", "radar", "radio", "raise",
  "rally", "range", "rapid", "ratio", "reach", "react", "ready", "realm", "rebel",
  "refer", "relax", "reply", "rider", "ridge", "rifle", "right", "rigid", "rival",
  "roast", "robot", "rough", "round", "route", "royal", "rugby", "rural", "salad",
  "sauce", "scale", "scene", "scope", "score", "scout", "scrap", "sense", "serve",
  "setup", "seven", "shade", "shaft", "shake", "shall", "shame", "shape", "share",
  "shark", "sharp", "sheep", "sheer", "sheet", "shelf", "shell", "shift", "shine",
  "shirt", "shock", "shoot", "shore", "short", "shown", "sight", "since",
  "sixth", "sixty", "skill", "sleep", "slept", "slice", "slide", "small", "smart",
  "smell", "smile", "smoke", "snack", "snake", "solar", "solid", "solve", "sorry",
  "sound", "south", "space", "spare", "spark", "speak", "speed", "spell", "spend",
  "spent", "spice", "spine", "spite", "split", "spoke", "sport", "spray", "squad",
  "staff", "stage", "stair", "stake", "stamp", "stand", "stare", "start", "state",
  "steam", "steel", "steep", "steer", "stick", "stiff", "still", "stock",
  "stole", "stone", "stood", "stool", "store", "storm", "story", "stove", "strap",
  "straw", "strip", "stuck", "study", "stuff", "style", "sugar", "suite", "sunny",
  "super", "surge", "swear", "sweat", "sweep", "sweet", "swept", "swift", "swing",
  "sword", "table", "taken", "taste", "teach", "teeth", "tempo", "tenth", "thank",
  "theft", "their", "theme", "there", "these", "thick", "thief", "thing", "think",
  "third", "those", "three", "threw", "throw", "thumb", "tight", "timer", "tired",
  "title", "toast", "today", "token", "tooth", "topic", "total", "touch", "tough",
  "tower", "toxic", "trace", "track", "trade", "trail", "train", "trait", "treat",
  "trend", "trial", "tribe", "trick", "tried", "tries", "truck", "truly", "trunk",
  "trust", "truth", "twice", "twist", "ultra", "uncle", "under", "undue", "union",
  "unite", "until", "upper", "upset", "urban", "usage", "usual", "valid", "value",
  "vapor", "vault", "venue", "video", "vigor", "viral", "virus", "visit", "vital",
  "vivid", "vocal", "voice", "voter", "wagon", "waist", "waste", "watch", "water",
  "wheat", "wheel", "where", "which", "while", "white", "whole", "whose", "wider",
  "widow", "width", "woman", "women", "world", "worry", "worse", "worst", "worth",
  "would", "wound", "wrist", "write", "wrong", "wrote", "yield", "young", "yours",
  "youth",
];

/**
 * 추측으로 허용하는 영단어 사전(소문자, 모두 5글자). 정답 후보(WORDLE_WORDS)와
 * 추가 단어(WORDLE_EXTRA_GUESSES)의 합집합이라 정답은 항상 유효 추측이다.
 * 표준 워들처럼 사전에 없는 임의 글자 나열을 거르는 데 쓴다(데이터 한 곳에서 관리).
 */
export const WORDLE_VALID_GUESSES: ReadonlySet<string> = new Set<string>([
  ...WORDLE_WORDS,
  ...WORDLE_EXTRA_GUESSES,
]);

/**
 * 추측 단어가 워들 사전에 등재돼 있는지 판정한다(순수·결정적, throw 없음).
 * 대소문자·앞뒤 공백 무관하게 정규화 후 WORDLE_VALID_GUESSES 멤버십을 확인한다.
 */
export function isWordleGuessWord(word: string): boolean {
  if (typeof word !== "string") {
    return false;
  }
  return WORDLE_VALID_GUESSES.has(word.trim().toLowerCase());
}

/**
 * words에서 random으로 단어 하나를 무작위 선택한다(pickRandomWord와 동일 규약).
 * - random.nextInt(words.length)로 인덱스를 고른다. 같은 random 시퀀스면 결정적으로 같은 결과.
 * - words가 비었으면 한국어 사유로 throw.
 * - nextInt가 범위를 벗어난 인덱스를 반환하면 throw.
 */
export function pickRandomWordleAnswer(
  words: readonly string[],
  random: RandomSource,
): string {
  if (words.length === 0) {
    throw new Error("워들 정답 선택 실패: 후보 단어 목록이 비어 있음");
  }
  const index = random.nextInt(words.length);
  if (index < 0 || index >= words.length) {
    throw new Error(`RandomSource returned out-of-range word index: ${index}`);
  }
  return words[index]!;
}

/**
 * 새 워들 한 판을 시작한다.
 * WORDLE_WORDS에서 무작위로 고른 정답으로 createWordleGame(answer, maxAttempts)를 반환한다.
 * maxAttempts 미지정 시 도메인 기본값(6)에 위임한다.
 */
export function startWordleGame(
  random: RandomSource,
  maxAttempts?: number,
): WordleState {
  const answer = pickRandomWordleAnswer(WORDLE_WORDS, random);
  return maxAttempts === undefined
    ? createWordleGame(answer)
    : createWordleGame(answer, maxAttempts);
}

/**
 * 한 추측을 적용해 다음 상태·글자별 결과·진행 상태를 반환한다(입력 state 불변).
 * - 새 상태는 도메인 applyWordleGuess로 만든다(규칙 재구현 금지).
 * - feedback: 도메인 scoreWordleGuess(answer, guess) 결과(글자별 correct/present/absent).
 * - status: 도메인 isWordleWon/isWordleLost로 산출(승리 우선).
 * - 불법 추측(길이 불일치·비영문·종료 후)은 도메인 applyWordleGuess의 throw를 그대로 전파한다.
 */
export function playWordleGuess(
  state: WordleState,
  guess: string,
): { state: WordleState; feedback: WordleLetterResult[]; status: WordleStatus } {
  const next = applyWordleGuess(state, guess);
  const feedback = scoreWordleGuess(state.answer, guess);
  const status: WordleStatus = isWordleWon(next)
    ? "won"
    : isWordleLost(next)
      ? "lost"
      : "playing";
  return { state: next, feedback, status };
}

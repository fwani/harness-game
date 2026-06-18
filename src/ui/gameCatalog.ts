// 게임 탐색용 순수 헬퍼(프레젠테이션 레이어). React/도메인 의존 없음 — 헬퍼만 단위 테스트한다.
// App.tsx의 GAMES는 여기 정의한 메타(GAME_CATALOG)를 재사용해 render만 덧붙인다(중복 정의 금지).

export type GameKey =
  | "rps"
  | "mukjjippa"
  | "best-of-n"
  | "oddeven"
  | "deal"
  | "highcard"
  | "dice"
  | "baccarat"
  | "blackjack"
  | "sutda"
  | "poker"
  | "onecard"
  | "gostop"
  | "gomoku"
  | "go"
  | "reversi"
  | "connectfour"
  | "janggi"
  | "checkers"
  | "chess"
  | "tictactoe"
  | "yut"
  | "numberbaseball"
  | "game2048"
  | "minesweeper"
  | "dotsandboxes"
  | "mancala"
  | "nim"
  | "battleship"
  | "hanoi"
  | "slidepuzzle"
  | "lightsout"
  | "pegsolitaire"
  | "sokoban"
  | "floodit"
  | "memory"
  | "hangman"
  | "pig"
  | "bingo"
  | "snakesandladders"
  | "wordle"
  | "mastermind"
  | "nonogram"
  | "sudoku"
  | "binairo"
  | "futoshiki"
  | "hitori"
  | "kenken"
  | "skyscrapers"
  | "ladder"
  | "selfplay"
  | "tournament"
  | "knockout"
  | "records";

export type GameCategory =
  | "실시간/캐주얼"
  | "카드"
  | "보드/추상"
  | "전통(한국)"
  | "퍼즐(1인)"
  | "도구/기타";

// 그룹 렌더 순서(빈 그룹은 groupGamesByCategory에서 제외된다).
export const CATEGORY_ORDER: GameCategory[] = [
  "실시간/캐주얼",
  "카드",
  "보드/추상",
  "전통(한국)",
  "퍼즐(1인)",
  "도구/기타",
];

/**
 * 게임의 플레이어 구성(우선순위 4: 싱글/멀티 분류).
 * - single: 혼자/난수/vs CPU 만 가능(1인 퍼즐, 난수·CPU 단판).
 * - multi: 사람 둘 이상이 같이 두는 2인 로컬(핫시트) "만" 지원(both 제외).
 * - both: vs CPU와 2인 로컬을 모두 제공하는 "모드 토글" 화면.
 * 멀티 = "현재 화면에서 사람 둘이 같이 두는 2인 로컬(핫시트)"를 뜻한다.
 * 방(room) 기반 원격 멀티는 별도 트랙이며 이 분류 밖이다.
 */
export type GameMode = "single" | "multi" | "both";

// 직렬화 가능한 게임 메타(render 제외). 테스트는 이 메타만으로 헬퍼를 검증한다.
export type GameMeta = {
  key: GameKey;
  label: string;
  category: GameCategory;
  mode: GameMode;
};

// mode 분류 근거(2026-06-18): src/ui/games/*.tsx 실제 구현 + UX_GUIDELINES.md "현재 UI 상태" 매트릭스.
// - both: 화면에 "2인 로컬 / vs CPU 모드 토글"이 있는 보드 게임
//   (gomoku·go·reversi·connectfour·janggi·checkers·chess·dotsandboxes·mancala).
// - single: 그 외 전부 — 1인 퍼즐, 난수/CPU 단판(틱택토·님·배틀십은 vs CPU 전용이라 single),
//   그리고 도구/기타(ladder·selfplay·tournament·knockout·records)는 플레이어 대전이 아니므로 single로 단순화.
// - multi(2인 로컬 전용): 현재 카탈로그에 해당 게임이 없다(2인 로컬 게임은 모두 vs CPU도 제공 → both).
export const GAME_CATALOG: GameMeta[] = [
  { key: "rps", label: "가위바위보", category: "실시간/캐주얼", mode: "single" },
  { key: "mukjjippa", label: "묵찌빠", category: "실시간/캐주얼", mode: "single" },
  { key: "best-of-n", label: "다전제", category: "실시간/캐주얼", mode: "single" },
  { key: "oddeven", label: "홀짝", category: "실시간/캐주얼", mode: "single" },
  { key: "dice", label: "주사위", category: "실시간/캐주얼", mode: "single" },
  { key: "pig", label: "피그", category: "실시간/캐주얼", mode: "single" },
  { key: "bingo", label: "빙고", category: "실시간/캐주얼", mode: "single" },
  { key: "snakesandladders", label: "뱀과 사다리", category: "실시간/캐주얼", mode: "single" },
  { key: "deal", label: "카드 딜", category: "카드", mode: "single" },
  { key: "highcard", label: "하이카드", category: "카드", mode: "single" },
  { key: "baccarat", label: "바카라", category: "카드", mode: "single" },
  { key: "blackjack", label: "블랙잭", category: "카드", mode: "single" },
  { key: "poker", label: "포커", category: "카드", mode: "single" },
  { key: "onecard", label: "원카드", category: "카드", mode: "single" },
  { key: "gomoku", label: "오목", category: "보드/추상", mode: "both" },
  { key: "go", label: "바둑", category: "보드/추상", mode: "both" },
  { key: "reversi", label: "오델로", category: "보드/추상", mode: "both" },
  { key: "connectfour", label: "커넥트포", category: "보드/추상", mode: "both" },
  { key: "checkers", label: "체커", category: "보드/추상", mode: "both" },
  { key: "chess", label: "체스", category: "보드/추상", mode: "both" },
  { key: "tictactoe", label: "틱택토", category: "보드/추상", mode: "single" },
  { key: "dotsandboxes", label: "도트 앤 박스", category: "보드/추상", mode: "both" },
  { key: "mancala", label: "만칼라", category: "보드/추상", mode: "both" },
  { key: "nim", label: "님", category: "보드/추상", mode: "single" },
  { key: "battleship", label: "배틀십", category: "보드/추상", mode: "single" },
  { key: "sutda", label: "섯다", category: "전통(한국)", mode: "single" },
  { key: "gostop", label: "고스톱", category: "전통(한국)", mode: "single" },
  { key: "janggi", label: "장기", category: "전통(한국)", mode: "both" },
  { key: "yut", label: "윷놀이", category: "전통(한국)", mode: "single" },
  { key: "numberbaseball", label: "숫자야구", category: "퍼즐(1인)", mode: "single" },
  { key: "game2048", label: "2048", category: "퍼즐(1인)", mode: "single" },
  { key: "minesweeper", label: "지뢰찾기", category: "퍼즐(1인)", mode: "single" },
  { key: "hanoi", label: "하노이탑", category: "퍼즐(1인)", mode: "single" },
  { key: "slidepuzzle", label: "슬라이드 퍼즐", category: "퍼즐(1인)", mode: "single" },
  { key: "lightsout", label: "라이트 아웃", category: "퍼즐(1인)", mode: "single" },
  { key: "pegsolitaire", label: "페그 솔리테어", category: "퍼즐(1인)", mode: "single" },
  { key: "sokoban", label: "소코반", category: "퍼즐(1인)", mode: "single" },
  { key: "floodit", label: "플러드 잇", category: "퍼즐(1인)", mode: "single" },
  { key: "memory", label: "메모리", category: "퍼즐(1인)", mode: "single" },
  { key: "hangman", label: "행맨", category: "퍼즐(1인)", mode: "single" },
  { key: "wordle", label: "워들", category: "퍼즐(1인)", mode: "single" },
  { key: "mastermind", label: "마스터마인드", category: "퍼즐(1인)", mode: "single" },
  { key: "nonogram", label: "네모로직", category: "퍼즐(1인)", mode: "single" },
  { key: "sudoku", label: "스도쿠", category: "퍼즐(1인)", mode: "single" },
  { key: "binairo", label: "비나이로", category: "퍼즐(1인)", mode: "single" },
  { key: "futoshiki", label: "후토시키", category: "퍼즐(1인)", mode: "single" },
  { key: "hitori", label: "히토리", category: "퍼즐(1인)", mode: "single" },
  { key: "kenken", label: "켄켄", category: "퍼즐(1인)", mode: "single" },
  { key: "skyscrapers", label: "마천루", category: "퍼즐(1인)", mode: "single" },
  { key: "ladder", label: "사다리타기", category: "도구/기타", mode: "single" },
  { key: "selfplay", label: "관전", category: "도구/기타", mode: "single" },
  { key: "tournament", label: "토너먼트", category: "도구/기타", mode: "single" },
  { key: "knockout", label: "녹아웃", category: "도구/기타", mode: "single" },
  { key: "records", label: "전적", category: "도구/기타", mode: "single" },
];

export type GameGroup = { category: GameCategory; games: GameMeta[] };

/**
 * 게임을 카테고리별로 묶어 CATEGORY_ORDER 순서로 반환한다.
 * 그룹 내 게임 순서는 입력 순서를 보존하고, 비어 있는 카테고리는 제외한다.
 */
export function groupGamesByCategory(games: GameMeta[]): GameGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    games: games.filter((g) => g.category === category),
  })).filter((group) => group.games.length > 0);
}

/**
 * label에 query가 포함된 게임만 반환한다(대소문자·앞뒤 공백 무시).
 * 빈 질의(또는 공백만)는 전체를 반환한다. 한글 라벨 부분일치를 지원한다.
 */
export function filterGames(games: GameMeta[], query: string): GameMeta[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return games;
  return games.filter((g) => g.label.toLowerCase().includes(needle));
}

/** 모드 필터 UI의 선택지. "all"은 전체, "single"/"multi"는 해당 모드를 고른다. */
export type ModeFilter = "all" | "single" | "multi";

/**
 * 플레이어 구성(mode)으로 게임을 거른다(입력 순서 보존).
 * - "all"  → 전체 반환.
 * - "single" → 혼자 즐길 수 있는 게임(`single` + `both`).
 * - "multi"  → 사람 둘이 함께할 수 있는 게임(`multi` + `both`).
 * `both`(vs CPU·2인 로컬 모두 제공)는 single·multi 양쪽에 모두 포함된다.
 * filterGames/groupGamesByCategory와 합성 가능하다.
 */
export function filterGamesByMode(
  games: GameMeta[],
  filter: ModeFilter,
): GameMeta[] {
  if (filter === "all") return games;
  if (filter === "single") {
    return games.filter((g) => g.mode === "single" || g.mode === "both");
  }
  return games.filter((g) => g.mode === "multi" || g.mode === "both");
}

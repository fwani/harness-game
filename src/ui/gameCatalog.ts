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

// 직렬화 가능한 게임 메타(render 제외). 테스트는 이 메타만으로 헬퍼를 검증한다.
export type GameMeta = {
  key: GameKey;
  label: string;
  category: GameCategory;
};

export const GAME_CATALOG: GameMeta[] = [
  { key: "rps", label: "가위바위보", category: "실시간/캐주얼" },
  { key: "mukjjippa", label: "묵찌빠", category: "실시간/캐주얼" },
  { key: "best-of-n", label: "다전제", category: "실시간/캐주얼" },
  { key: "oddeven", label: "홀짝", category: "실시간/캐주얼" },
  { key: "dice", label: "주사위", category: "실시간/캐주얼" },
  { key: "pig", label: "피그", category: "실시간/캐주얼" },
  { key: "bingo", label: "빙고", category: "실시간/캐주얼" },
  { key: "snakesandladders", label: "뱀과 사다리", category: "실시간/캐주얼" },
  { key: "deal", label: "카드 딜", category: "카드" },
  { key: "highcard", label: "하이카드", category: "카드" },
  { key: "baccarat", label: "바카라", category: "카드" },
  { key: "blackjack", label: "블랙잭", category: "카드" },
  { key: "poker", label: "포커", category: "카드" },
  { key: "onecard", label: "원카드", category: "카드" },
  { key: "gomoku", label: "오목", category: "보드/추상" },
  { key: "go", label: "바둑", category: "보드/추상" },
  { key: "reversi", label: "오델로", category: "보드/추상" },
  { key: "connectfour", label: "커넥트포", category: "보드/추상" },
  { key: "checkers", label: "체커", category: "보드/추상" },
  { key: "chess", label: "체스", category: "보드/추상" },
  { key: "tictactoe", label: "틱택토", category: "보드/추상" },
  { key: "dotsandboxes", label: "도트 앤 박스", category: "보드/추상" },
  { key: "mancala", label: "만칼라", category: "보드/추상" },
  { key: "nim", label: "님", category: "보드/추상" },
  { key: "battleship", label: "배틀십", category: "보드/추상" },
  { key: "sutda", label: "섯다", category: "전통(한국)" },
  { key: "gostop", label: "고스톱", category: "전통(한국)" },
  { key: "janggi", label: "장기", category: "전통(한국)" },
  { key: "yut", label: "윷놀이", category: "전통(한국)" },
  { key: "numberbaseball", label: "숫자야구", category: "퍼즐(1인)" },
  { key: "game2048", label: "2048", category: "퍼즐(1인)" },
  { key: "minesweeper", label: "지뢰찾기", category: "퍼즐(1인)" },
  { key: "hanoi", label: "하노이탑", category: "퍼즐(1인)" },
  { key: "slidepuzzle", label: "슬라이드 퍼즐", category: "퍼즐(1인)" },
  { key: "lightsout", label: "라이트 아웃", category: "퍼즐(1인)" },
  { key: "pegsolitaire", label: "페그 솔리테어", category: "퍼즐(1인)" },
  { key: "sokoban", label: "소코반", category: "퍼즐(1인)" },
  { key: "floodit", label: "플러드 잇", category: "퍼즐(1인)" },
  { key: "memory", label: "메모리", category: "퍼즐(1인)" },
  { key: "hangman", label: "행맨", category: "퍼즐(1인)" },
  { key: "wordle", label: "워들", category: "퍼즐(1인)" },
  { key: "mastermind", label: "마스터마인드", category: "퍼즐(1인)" },
  { key: "nonogram", label: "네모로직", category: "퍼즐(1인)" },
  { key: "sudoku", label: "스도쿠", category: "퍼즐(1인)" },
  { key: "binairo", label: "비나이로", category: "퍼즐(1인)" },
  { key: "futoshiki", label: "후토시키", category: "퍼즐(1인)" },
  { key: "hitori", label: "히토리", category: "퍼즐(1인)" },
  { key: "kenken", label: "켄켄", category: "퍼즐(1인)" },
  { key: "skyscrapers", label: "마천루", category: "퍼즐(1인)" },
  { key: "ladder", label: "사다리타기", category: "도구/기타" },
  { key: "selfplay", label: "관전", category: "도구/기타" },
  { key: "tournament", label: "토너먼트", category: "도구/기타" },
  { key: "knockout", label: "녹아웃", category: "도구/기타" },
  { key: "records", label: "전적", category: "도구/기타" },
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

// Presentation helper: GameId → 한국어 라벨 매핑(순수·결정적, 부수효과 없음).
// 전적 화면(Records.tsx)과 게임별 전적 표가 동일 라벨을 쓰도록 단일 소스로 둔다.
// Record<GameId, string>이므로 새 GameId가 추가되면 타입체크가 라벨 누락을 잡는다(망각 방지).
import type { GameId } from "../../domain/gameRecord";

export const GAME_LABEL: Record<GameId, string> = {
  rps: "가위바위보",
  mukjjippa: "묵찌빠",
  oddEven: "홀짝",
  gomoku: "오목",
  go: "바둑",
  janggi: "장기",
  connectfour: "커넥트포",
  // 카드 게임은 각자 고유 라벨로 구분한다(같은 키로 합쳐지던 회귀 수정).
  highcard: "하이카드",
  blackjack: "블랙잭",
  baccarat: "바카라",
  sutda: "섯다",
  poker: "포커",
  // 레거시 공유 키로 저장된 과거 기록(여러 카드 게임이 섞여 있음)을 구분해 표시한다.
  card: "카드(이전 기록)",
  reversi: "오델로",
  chess: "체스",
  dice: "주사위",
  yut: "윷놀이",
  gostop: "고스톱",
  numberBaseball: "숫자야구",
  game2048: "2048",
  tictactoe: "틱택토",
  minesweeper: "지뢰찾기",
  dotsandboxes: "도트 앤 박스",
  memory: "메모리",
  mancala: "만칼라",
  checkers: "체커",
  nim: "님",
  battleship: "배틀십",
  hanoi: "하노이탑",
  slidepuzzle: "슬라이드 퍼즐",
  sokoban: "소코반",
  hangman: "행맨",
  pig: "피그",
  bingo: "빙고",
  snakesandladders: "뱀과 사다리",
  wordle: "워들",
  "rps-match": "다전제(가위바위보)",
};

/** GameId의 한국어 표시 라벨을 돌려준다. */
export function gameLabel(game: GameId): string {
  return GAME_LABEL[game];
}

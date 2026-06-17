import { useState } from "react";
import { Rps } from "./games/Rps";
import { Mukjjippa } from "./games/Mukjjippa";
import { BestOfN } from "./games/BestOfN";
import { OddEven } from "./games/OddEven";
import { Deal } from "./games/Deal";
import { HighCard } from "./games/HighCard";
import { Dice } from "./games/Dice";
import { Baccarat } from "./games/Baccarat";
import { Blackjack } from "./games/Blackjack";
import { Sutda } from "./games/Sutda";
import { Poker } from "./games/Poker";
import { GoStop } from "./games/GoStop";
import { Gomoku } from "./games/Gomoku";
import { Go } from "./games/Go";
import { Reversi } from "./games/Reversi";
import { ConnectFour } from "./games/ConnectFour";
import { Janggi } from "./games/Janggi";
import { Checkers } from "./games/Checkers";
import { TicTacToe } from "./games/TicTacToe";
import { Yut } from "./games/Yut";
import { NumberBaseball } from "./games/NumberBaseball";
import { Game2048 } from "./games/Game2048";
import { Minesweeper } from "./games/Minesweeper";
import { DotsAndBoxes } from "./games/DotsAndBoxes";
import { Mancala } from "./games/Mancala";
import { Nim } from "./games/Nim";
import { Battleship } from "./games/Battleship";
import { Hanoi } from "./games/Hanoi";
import { SlidePuzzle } from "./games/SlidePuzzle";
import { MemoryMatch } from "./games/MemoryMatch";
import { Hangman } from "./games/Hangman";
import { Pig } from "./games/Pig";
import { Bingo } from "./games/Bingo";
import { Wordle } from "./games/Wordle";
import { Ladder } from "./games/Ladder";
import { SelfPlay } from "./games/SelfPlay";
import { Tournament } from "./games/Tournament";
import { SingleElimination } from "./games/SingleElimination";
import { Records } from "./games/Records";
import { ErrorBoundary } from "./ErrorBoundary";

type GameKey =
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
  | "gostop"
  | "gomoku"
  | "go"
  | "reversi"
  | "connectfour"
  | "janggi"
  | "checkers"
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
  | "memory"
  | "hangman"
  | "pig"
  | "bingo"
  | "wordle"
  | "ladder"
  | "selfplay"
  | "tournament"
  | "knockout"
  | "records";

const GAMES: { key: GameKey; label: string; render: () => JSX.Element }[] = [
  { key: "rps", label: "가위바위보", render: () => <Rps /> },
  { key: "mukjjippa", label: "묵찌빠", render: () => <Mukjjippa /> },
  { key: "best-of-n", label: "다전제", render: () => <BestOfN /> },
  { key: "oddeven", label: "홀짝", render: () => <OddEven /> },
  { key: "deal", label: "카드 딜", render: () => <Deal /> },
  { key: "highcard", label: "하이카드", render: () => <HighCard /> },
  { key: "dice", label: "주사위", render: () => <Dice /> },
  { key: "baccarat", label: "바카라", render: () => <Baccarat /> },
  { key: "blackjack", label: "블랙잭", render: () => <Blackjack /> },
  { key: "sutda", label: "섯다", render: () => <Sutda /> },
  { key: "poker", label: "포커", render: () => <Poker /> },
  { key: "gostop", label: "고스톱", render: () => <GoStop /> },
  { key: "gomoku", label: "오목", render: () => <Gomoku /> },
  { key: "go", label: "바둑", render: () => <Go /> },
  { key: "reversi", label: "오델로", render: () => <Reversi /> },
  { key: "connectfour", label: "커넥트포", render: () => <ConnectFour /> },
  { key: "janggi", label: "장기", render: () => <Janggi /> },
  { key: "checkers", label: "체커", render: () => <Checkers /> },
  { key: "tictactoe", label: "틱택토", render: () => <TicTacToe /> },
  { key: "yut", label: "윷놀이", render: () => <Yut /> },
  { key: "numberbaseball", label: "숫자야구", render: () => <NumberBaseball /> },
  { key: "game2048", label: "2048", render: () => <Game2048 /> },
  { key: "minesweeper", label: "지뢰찾기", render: () => <Minesweeper /> },
  { key: "dotsandboxes", label: "도트 앤 박스", render: () => <DotsAndBoxes /> },
  { key: "mancala", label: "만칼라", render: () => <Mancala /> },
  { key: "nim", label: "님", render: () => <Nim /> },
  { key: "battleship", label: "배틀십", render: () => <Battleship /> },
  { key: "hanoi", label: "하노이탑", render: () => <Hanoi /> },
  { key: "slidepuzzle", label: "슬라이드 퍼즐", render: () => <SlidePuzzle /> },
  { key: "memory", label: "메모리", render: () => <MemoryMatch /> },
  { key: "hangman", label: "행맨", render: () => <Hangman /> },
  { key: "pig", label: "피그", render: () => <Pig /> },
  { key: "bingo", label: "빙고", render: () => <Bingo /> },
  { key: "wordle", label: "워들", render: () => <Wordle /> },
  { key: "ladder", label: "사다리타기", render: () => <Ladder /> },
  { key: "selfplay", label: "관전", render: () => <SelfPlay /> },
  { key: "tournament", label: "토너먼트", render: () => <Tournament /> },
  { key: "knockout", label: "녹아웃", render: () => <SingleElimination /> },
  { key: "records", label: "전적", render: () => <Records /> },
];

export function App() {
  const [game, setGame] = useState<GameKey>("rps");
  const active = GAMES.find((g) => g.key === game)!;

  return (
    <div className="app">
      <header>
        <h1>harness-game</h1>
        <nav className="tabs">
          {GAMES.map((g) => (
            <button
              key={g.key}
              className={g.key === game ? "tab active" : "tab"}
              onClick={() => setGame(g.key)}
            >
              {g.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {/* 한 게임이 크래시해도 앱 전체가 백스크린되지 않게 분리한다.
            key=game이라 탭을 바꾸면 바운더리가 재마운트되어 에러 상태가 초기화된다. */}
        <ErrorBoundary key={game}>{active.render()}</ErrorBoundary>
      </main>
    </div>
  );
}

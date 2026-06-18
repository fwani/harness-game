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
import { OneCard } from "./games/OneCard";
import { GoStop } from "./games/GoStop";
import { Gomoku } from "./games/Gomoku";
import { Go } from "./games/Go";
import { Reversi } from "./games/Reversi";
import { ConnectFour } from "./games/ConnectFour";
import { Janggi } from "./games/Janggi";
import { Checkers } from "./games/Checkers";
import { Chess } from "./games/Chess";
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
import { PegSolitaire } from "./games/PegSolitaire";
import { Sokoban } from "./games/Sokoban";
import { FloodIt } from "./games/FloodIt";
import { MemoryMatch } from "./games/MemoryMatch";
import { Hangman } from "./games/Hangman";
import { Pig } from "./games/Pig";
import { Bingo } from "./games/Bingo";
import { SnakesAndLadders } from "./games/SnakesAndLadders";
import { Wordle } from "./games/Wordle";
import { Mastermind } from "./games/Mastermind";
import { Nonogram } from "./games/Nonogram";
import { Sudoku } from "./games/Sudoku";
import { Binairo } from "./games/Binairo";
import { Futoshiki } from "./games/Futoshiki";
import { Hitori } from "./games/Hitori";
import { KenKen } from "./games/KenKen";
import { Ladder } from "./games/Ladder";
import { SelfPlay } from "./games/SelfPlay";
import { Tournament } from "./games/Tournament";
import { SingleElimination } from "./games/SingleElimination";
import { Records } from "./games/Records";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  GAME_CATALOG,
  filterGames,
  groupGamesByCategory,
  type GameKey,
} from "./gameCatalog";

// 게임 메타(key/label/category)는 gameCatalog에서 단일 정의하고, 여기서는 render만 덧붙인다.
const RENDERERS: Record<GameKey, () => JSX.Element> = {
  rps: () => <Rps />,
  mukjjippa: () => <Mukjjippa />,
  "best-of-n": () => <BestOfN />,
  oddeven: () => <OddEven />,
  deal: () => <Deal />,
  highcard: () => <HighCard />,
  dice: () => <Dice />,
  baccarat: () => <Baccarat />,
  blackjack: () => <Blackjack />,
  sutda: () => <Sutda />,
  poker: () => <Poker />,
  onecard: () => <OneCard />,
  gostop: () => <GoStop />,
  gomoku: () => <Gomoku />,
  go: () => <Go />,
  reversi: () => <Reversi />,
  connectfour: () => <ConnectFour />,
  janggi: () => <Janggi />,
  checkers: () => <Checkers />,
  chess: () => <Chess />,
  tictactoe: () => <TicTacToe />,
  yut: () => <Yut />,
  numberbaseball: () => <NumberBaseball />,
  game2048: () => <Game2048 />,
  minesweeper: () => <Minesweeper />,
  dotsandboxes: () => <DotsAndBoxes />,
  mancala: () => <Mancala />,
  nim: () => <Nim />,
  battleship: () => <Battleship />,
  hanoi: () => <Hanoi />,
  slidepuzzle: () => <SlidePuzzle />,
  pegsolitaire: () => <PegSolitaire />,
  sokoban: () => <Sokoban />,
  floodit: () => <FloodIt />,
  memory: () => <MemoryMatch />,
  hangman: () => <Hangman />,
  pig: () => <Pig />,
  bingo: () => <Bingo />,
  snakesandladders: () => <SnakesAndLadders />,
  wordle: () => <Wordle />,
  mastermind: () => <Mastermind />,
  nonogram: () => <Nonogram />,
  sudoku: () => <Sudoku />,
  binairo: () => <Binairo />,
  futoshiki: () => <Futoshiki />,
  hitori: () => <Hitori />,
  kenken: () => <KenKen />,
  ladder: () => <Ladder />,
  selfplay: () => <SelfPlay />,
  tournament: () => <Tournament />,
  knockout: () => <SingleElimination />,
  records: () => <Records />,
};

export function App() {
  const [game, setGame] = useState<GameKey>("rps");
  const [query, setQuery] = useState("");

  const visible = filterGames(GAME_CATALOG, query);
  const groups = groupGamesByCategory(visible);

  return (
    <div className="app">
      <header>
        <h1>harness-game</h1>
        <input
          type="search"
          className="game-search"
          aria-label="게임 이름 검색"
          placeholder="게임 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {groups.length === 0 ? (
          <p className="hint">검색 결과 없음</p>
        ) : (
          groups.map((group) => (
            <section key={group.category} className="tab-group">
              <h2 className="tab-group-title">{group.category}</h2>
              <nav className="tabs" aria-label={group.category}>
                {group.games.map((g) => (
                  <button
                    key={g.key}
                    className={g.key === game ? "tab active" : "tab"}
                    onClick={() => setGame(g.key)}
                  >
                    {g.label}
                  </button>
                ))}
              </nav>
            </section>
          ))
        )}
      </header>
      <main>
        {/* 한 게임이 크래시해도 앱 전체가 백스크린되지 않게 분리한다.
            key=game이라 탭을 바꾸면 바운더리가 재마운트되어 에러 상태가 초기화된다.
            검색으로 현재 게임 탭이 숨겨져도 선택 상태/렌더는 그대로 유지된다. */}
        <ErrorBoundary key={game}>{RENDERERS[game]()}</ErrorBoundary>
      </main>
    </div>
  );
}

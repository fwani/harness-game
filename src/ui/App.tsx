import { useState } from "react";
import { Rps } from "./games/Rps";
import { OddEven } from "./games/OddEven";
import { Deal } from "./games/Deal";
import { HighCard } from "./games/HighCard";
import { Dice } from "./games/Dice";
import { Blackjack } from "./games/Blackjack";
import { Gomoku } from "./games/Gomoku";
import { Go } from "./games/Go";
import { Reversi } from "./games/Reversi";
import { Janggi } from "./games/Janggi";
import { Records } from "./games/Records";

type GameKey =
  | "rps"
  | "oddeven"
  | "deal"
  | "highcard"
  | "dice"
  | "blackjack"
  | "gomoku"
  | "go"
  | "reversi"
  | "janggi"
  | "records";

const GAMES: { key: GameKey; label: string; render: () => JSX.Element }[] = [
  { key: "rps", label: "가위바위보", render: () => <Rps /> },
  { key: "oddeven", label: "홀짝", render: () => <OddEven /> },
  { key: "deal", label: "카드 딜", render: () => <Deal /> },
  { key: "highcard", label: "하이카드", render: () => <HighCard /> },
  { key: "dice", label: "주사위", render: () => <Dice /> },
  { key: "blackjack", label: "블랙잭", render: () => <Blackjack /> },
  { key: "gomoku", label: "오목", render: () => <Gomoku /> },
  { key: "go", label: "바둑", render: () => <Go /> },
  { key: "reversi", label: "오델로", render: () => <Reversi /> },
  { key: "janggi", label: "장기", render: () => <Janggi /> },
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
      <main>{active.render()}</main>
    </div>
  );
}

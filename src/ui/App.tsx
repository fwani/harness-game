import { useState } from "react";
import { Rps } from "./games/Rps";
import { OddEven } from "./games/OddEven";

type GameKey = "rps" | "oddeven";

const GAMES: { key: GameKey; label: string }[] = [
  { key: "rps", label: "가위바위보" },
  { key: "oddeven", label: "홀짝" },
];

export function App() {
  const [game, setGame] = useState<GameKey>("rps");

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
        {game === "rps" && <Rps />}
        {game === "oddeven" && <OddEven />}
      </main>
    </div>
  );
}

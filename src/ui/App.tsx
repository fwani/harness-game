import { useState } from "react";
import { Rps } from "./games/Rps";
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
import { Janggi } from "./games/Janggi";
import { Yut } from "./games/Yut";
import { Ladder } from "./games/Ladder";
import { SelfPlay } from "./games/SelfPlay";
import { Tournament } from "./games/Tournament";
import { SingleElimination } from "./games/SingleElimination";
import { Records } from "./games/Records";
import { ErrorBoundary } from "./ErrorBoundary";

type GameKey =
  | "rps"
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
  | "janggi"
  | "yut"
  | "ladder"
  | "selfplay"
  | "tournament"
  | "knockout"
  | "records";

const GAMES: { key: GameKey; label: string; render: () => JSX.Element }[] = [
  { key: "rps", label: "가위바위보", render: () => <Rps /> },
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
  { key: "janggi", label: "장기", render: () => <Janggi /> },
  { key: "yut", label: "윷놀이", render: () => <Yut /> },
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

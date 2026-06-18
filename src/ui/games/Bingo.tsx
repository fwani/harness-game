import { useState, useSyncExternalStore } from "react";
import {
  startBingoGame,
  drawBingoNumber,
  isBingoGameWon,
  type BingoGame,
} from "../../application/playBingo";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { listRecords, recordGame, subscribe } from "../records";
import { SELF_PLAYER, selfStreakSummary } from "./streakView";
import { StreakPanel } from "./StreakPanel";
import {
  BINGO_CELL_PX,
  bingoCellViews,
  bingoGridTemplate,
  bingoLinesLabel,
  describeBingoStatus,
  drawSummaryLabel,
  remainingLabel,
} from "./bingoView";

// 난수는 infrastructure 어댑터로 application에 주입한다(UI에서 Math.random 직접 사용 금지).
const rng = new MathRandomSource();

export function Bingo() {
  // 무작위 카드 한 판으로 시작(규칙/추첨/마킹은 application·domain에 위임).
  const [game, setGame] = useState<BingoGame>(() => startBingoGame(rng));
  // 빙고 달성 시 한 번만 기록하도록 가드(추첨 버튼이 비활성되지만 안전 차원).
  const [recorded, setRecorded] = useState(false);

  // 저장소 변경(한 판 기록)에 맞춰 통산 전적·연승 표시를 갱신한다.
  const records = useSyncExternalStore(subscribe, listRecords);
  const streak = selfStreakSummary(records, "bingo");

  const won = isBingoGameWon(game);
  const exhausted = game.remaining.length === 0;
  const finished = won || exhausted;
  const cells = bingoCellViews(game);
  const size = game.state.card.size;

  const draw = () => {
    if (finished) return; // 빙고 달성·번호 소진 후 입력 차단(버튼도 disabled).
    const next = drawBingoNumber(game, rng);
    setGame(next);
    if (!recorded && isBingoGameWon(next)) {
      // 단일 플레이: 상대 라벨은 "시스템" 고정. 빙고=승(a)만 기록한다.
      recordGame("bingo", SELF_PLAYER, "시스템", "a");
      setRecorded(true);
    }
  };

  const newGame = () => {
    setGame(startBingoGame(rng));
    setRecorded(false);
  };

  const status = describeBingoStatus(game);

  return (
    <section className="game">
      <h2>빙고</h2>
      <p className="hint">
        "번호 추첨"을 눌러 무작위 번호를 하나씩 뽑습니다. 카드에 있는 번호는 자동으로 ✓ 표시되며,
        가로·세로·대각선 중 한 줄을 모두 채우면 빙고입니다.
      </p>

      <div className="controls">
        <span className="hint">{remainingLabel(game)}</span>
        <span className="hint">{bingoLinesLabel(game)}</span>
        <button type="button" className="primary" onClick={draw} disabled={finished}>
          번호 추첨
        </button>
        <button type="button" onClick={newGame}>
          새 게임
        </button>
      </div>

      <p className="hint">{drawSummaryLabel(game)}</p>

      {finished ? (
        <p className="outcome">{status}</p>
      ) : (
        <p className="hint">{status}</p>
      )}

      <div
        className="board bingo"
        role="grid"
        aria-label="빙고 카드"
        style={{ gridTemplateColumns: bingoGridTemplate(size), maxWidth: `${size * BINGO_CELL_PX}px` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.index}
            role="gridcell"
            className={`cell bingo-cell${cell.marked ? " bingo-marked" : ""}`}
            aria-label={cell.ariaLabel}
          >
            <span className="bingo-value">{cell.value}</span>
            {cell.symbol && (
              <span className="bingo-mark" aria-hidden="true">
                {cell.symbol}
              </span>
            )}
          </div>
        ))}
      </div>

      {finished && (
        <div className="result">
          <p className="outcome">{status}</p>
          <p className="hint">
            {won
              ? "전적에 기록했습니다. 새 게임으로 다시 도전하세요."
              : "새 게임으로 다시 시작하세요."}
          </p>
        </div>
      )}

      <StreakPanel title="내 전적 (나)" summary={streak} />
    </section>
  );
}

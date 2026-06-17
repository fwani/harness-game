import { useState } from "react";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { isDarkSquare } from "../../domain/checkers";
import { boardGridStyle } from "./boardView";
import { pieceGlyph, pieceAriaLabel } from "./janggiView";
import {
  dotsGridCells,
  dotsGridTemplate,
  dotsScoreLabel,
  type DotsLabeler,
} from "./dotsAndBoxesView";
import { checkersCellView } from "./checkersView";
import {
  mancalaScoreLabel,
  mancalaPitAriaLabel,
  mancalaStoreAriaLabel,
  type MancalaLabeler,
} from "./mancalaView";
import {
  SELF_PLAY_GAMES,
  runAndDescribeSelfPlay,
  selfPlayCheckersBoard,
  selfPlayDotsBoard,
  selfPlayGlyphBoard,
  selfPlayJanggiBoard,
  selfPlayMancalaBoard,
  type SelfPlayGameKey,
  type SelfPlayRun,
} from "./selfPlayView";

/** 도트 앤 박스 최종 보드 렌더용 진영 라벨(색 비의존: 1P/2P). */
const dotsLabel: DotsLabeler = (p) => (p === 1 ? "1P" : "2P");

/** 만칼라 최종 보드 렌더용 진영 라벨(색 비의존: P1/P2). */
const mancalaLabel: MancalaLabeler = (p) => (p === 1 ? "1P" : "2P");

/** 자동 대국 난수 어댑터(다른 게임 화면과 동일하게 infrastructure 어댑터 주입). */
const rng = new MathRandomSource();

export function SelfPlay() {
  const [game, setGame] = useState<SelfPlayGameKey>("gomoku");
  const [run, setRun] = useState<SelfPlayRun | null>(null);

  const meta = SELF_PLAY_GAMES.find((g) => g.key === game)!;

  const start = () => {
    setRun(runAndDescribeSelfPlay(game, rng));
  };

  const select = (key: SelfPlayGameKey) => {
    setGame(key);
    setRun(null);
  };

  // 최종 보드는 정상 종국일 때만 그린다(무종국이면 result=null).
  // 도트 앤 박스·체커·만칼라는 흑/백 디스크 격자가 아니라 전용 뷰로 렌더한다(글리프 경로 제외).
  const glyphBoard =
    run?.result &&
    game !== "janggi" &&
    game !== "dotsandboxes" &&
    game !== "checkers" &&
    game !== "mancala"
      ? selfPlayGlyphBoard(run.result, game)
      : [];
  const janggiBoard =
    run?.result && game === "janggi" ? selfPlayJanggiBoard(run.result) : [];
  const dotsBoard =
    run?.result && game === "dotsandboxes"
      ? selfPlayDotsBoard(run.result)
      : null;
  const checkersBoard =
    run?.result && game === "checkers"
      ? selfPlayCheckersBoard(run.result)
      : null;
  const mancalaBoard =
    run?.result && game === "mancala"
      ? selfPlayMancalaBoard(run.result)
      : null;

  return (
    <section className="game">
      <h2>관전 (자동 대국)</h2>
      <p className="hint">
        보드 게임을 골라 CPU끼리 한 판을 끝까지 자동으로 두게 하고 결과를 확인합니다.
      </p>
      <div className="controls" role="group" aria-label="게임 선택">
        {SELF_PLAY_GAMES.map((g) => (
          <button
            key={g.key}
            className={g.key === game ? "primary" : ""}
            onClick={() => select(g.key)}
            aria-pressed={g.key === game}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="controls">
        <button className="primary" onClick={start}>
          {run ? "다시 돌리기" : "자동 대국 시작"}
        </button>
      </div>

      {run && (
        <>
          <p className="outcome" role="status">
            {meta.label} · {run.unfinished ? "중단" : "종료"} ·{" "}
            <strong>{run.outcome}</strong> · {run.moves}
          </p>

          {game === "janggi" && run.result && (
            <div
              className="board janggi"
              style={boardGridStyle(meta.size)}
              role="img"
              aria-label={`${meta.label} 최종 보드`}
            >
              {janggiBoard.map((row, y) =>
                row.map((piece, x) => (
                  <div key={`${x},${y}`} className="cell janggi-cell">
                    {piece && (
                      <span
                        className={`piece ${piece.side}`}
                        aria-label={pieceAriaLabel(piece.type, piece.side)}
                        title={pieceAriaLabel(piece.type, piece.side)}
                      >
                        {pieceGlyph(piece.type, piece.side)}
                      </span>
                    )}
                  </div>
                )),
              )}
            </div>
          )}

          {game === "dotsandboxes" && dotsBoard && (
            <>
              <p className="hint">
                점수 · <strong>{dotsScoreLabel(dotsBoard, dotsLabel)}</strong>
              </p>
              <div
                className="board dotsandboxes"
                role="img"
                aria-label={`${meta.label} 최종 보드`}
                style={{
                  gridTemplateColumns: dotsGridTemplate(dotsBoard.cols),
                  gridTemplateRows: dotsGridTemplate(dotsBoard.rows),
                }}
              >
                {dotsGridCells(dotsBoard).map((cell) => {
                  const key = `${cell.gridRow},${cell.gridCol}`;
                  if (cell.kind === "dot") {
                    return <span key={key} className="dots-dot" aria-hidden="true" />;
                  }
                  if (cell.kind === "box") {
                    return (
                      <span
                        key={key}
                        className={`dots-box${cell.owner ? ` owner-p${cell.owner}` : ""}`}
                        aria-label={cell.owner ? `${dotsLabel(cell.owner)} 박스` : "빈 박스"}
                      >
                        {cell.owner ? dotsLabel(cell.owner) : ""}
                      </span>
                    );
                  }
                  // 변(수평/수직): 자동 대국 결과는 모든 변이 그어진 종국 상태다(빈 변도 색 외 단서로 표시).
                  return (
                    <span
                      key={key}
                      className={`dots-edge ${cell.kind}${cell.drawn ? " drawn" : ""}`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            </>
          )}

          {game === "checkers" && checkersBoard && (
            <div
              className="board checkers"
              style={boardGridStyle(meta.size)}
              role="img"
              aria-label={`${meta.label} 최종 보드`}
            >
              {checkersBoard.map((cells, row) =>
                cells.map((cell, col) => {
                  const view = checkersCellView(cell);
                  const dark = isDarkSquare(row, col);
                  return (
                    <div
                      key={`${col},${row}`}
                      className={`cell ${dark ? "sq-dark" : "sq-light"}`}
                      aria-hidden="true"
                    >
                      {cell && (
                        <span
                          className={`checker ${cell.color}${cell.king ? " king" : ""}`}
                          title={view.label}
                        >
                          {view.glyph}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          )}

          {game === "mancala" && mancalaBoard && (
            <>
              <p className="hint">
                점수 ·{" "}
                <strong>{mancalaScoreLabel(mancalaBoard, mancalaLabel)}</strong>
              </p>
              <div
                className="board mancala"
                role="img"
                aria-label={`${meta.label} 최종 보드`}
                style={{
                  gridTemplateColumns: `auto repeat(${mancalaBoard.pitsPerSide}, 1fr) auto`,
                }}
              >
                <div
                  className="mancala-store owner-p2"
                  style={{ gridColumn: 1, gridRow: "1 / 3" }}
                  aria-label={mancalaStoreAriaLabel(
                    2,
                    mancalaBoard.stores[2],
                    mancalaLabel,
                  )}
                >
                  <span className="mancala-store-label" aria-hidden="true">
                    {mancalaLabel(2)}
                  </span>
                  <span className="mancala-seeds">{mancalaBoard.stores[2]}</span>
                </div>
                {Array.from(
                  { length: mancalaBoard.pitsPerSide },
                  (_, col) => mancalaBoard.pitsPerSide - 1 - col,
                ).map((index, col) => (
                  <div
                    key={`p2-${index}`}
                    className="mancala-pit owner-p2"
                    style={{ gridRow: 1, gridColumn: col + 2 }}
                    aria-label={mancalaPitAriaLabel(
                      2,
                      index,
                      mancalaBoard.pits[2][index]!,
                      mancalaLabel,
                    )}
                  >
                    <span className="mancala-pit-label" aria-hidden="true">
                      {mancalaLabel(2)}
                    </span>
                    <span className="mancala-seeds">
                      {mancalaBoard.pits[2][index]}
                    </span>
                  </div>
                ))}
                {Array.from({ length: mancalaBoard.pitsPerSide }, (_, index) => (
                  <div
                    key={`p1-${index}`}
                    className="mancala-pit owner-p1"
                    style={{ gridRow: 2, gridColumn: index + 2 }}
                    aria-label={mancalaPitAriaLabel(
                      1,
                      index,
                      mancalaBoard.pits[1][index]!,
                      mancalaLabel,
                    )}
                  >
                    <span className="mancala-pit-label" aria-hidden="true">
                      {mancalaLabel(1)}
                    </span>
                    <span className="mancala-seeds">
                      {mancalaBoard.pits[1][index]}
                    </span>
                  </div>
                ))}
                <div
                  className="mancala-store owner-p1"
                  style={{ gridColumn: mancalaBoard.pitsPerSide + 2, gridRow: "1 / 3" }}
                  aria-label={mancalaStoreAriaLabel(
                    1,
                    mancalaBoard.stores[1],
                    mancalaLabel,
                  )}
                >
                  <span className="mancala-store-label" aria-hidden="true">
                    {mancalaLabel(1)}
                  </span>
                  <span className="mancala-seeds">{mancalaBoard.stores[1]}</span>
                </div>
              </div>
            </>
          )}

          {game !== "janggi" &&
            game !== "dotsandboxes" &&
            game !== "checkers" &&
            game !== "mancala" &&
            run.result && (
            <div
              className={`board ${meta.boardClass}`.trim()}
              style={boardGridStyle(meta.size)}
              role="img"
              aria-label={`${meta.label} 최종 보드`}
            >
              {glyphBoard.map((row, y) =>
                row.map((cell, x) => (
                  <div key={`${x},${y}`} className="cell" aria-hidden="true">
                    {cell && (
                      <span className={cell.className} title={cell.label}>
                        {cell.glyph}
                      </span>
                    )}
                  </div>
                )),
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

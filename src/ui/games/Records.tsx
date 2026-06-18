import { useSyncExternalStore } from "react";
import { getStandings, listRecords, recordsPersisted, subscribe } from "../records";
import { toEloLeaderboard } from "./recordsEloView";
import { toWinRankingRows } from "./recordsRankingView";
import { toStreakRankingRows, type StreakRankingRow } from "./recordsStreakRankingView";
import { recordsPersistenceHint } from "./recordsHintView";
import { toHeadToHeadList } from "./recordsHeadToHeadView";
import { buildRecordsByGameRows } from "./recordsByGameView";
import { GAME_LABEL } from "./recordsGameLabelView";

const RESULT_LABEL = { win: "승", loss: "패", draw: "무" } as const;

/** 현재 연속 기록을 색에 의존하지 않는 텍스트 라벨로 표현한다(예: 3연승·2연패·무·-). */
function currentStreakLabel(row: StreakRankingRow): string {
  switch (row.currentType) {
    case "win":
      return `${row.currentLength}연승`;
    case "loss":
      return `${row.currentLength}연패`;
    case "draw":
      return "무";
    default:
      return "-";
  }
}

export function Records() {
  // 외부 저장소(records.ts) 변경에 맞춰 다시 렌더한다.
  const standings = useSyncExternalStore(subscribe, getStandings);
  const records = useSyncExternalStore(subscribe, listRecords);
  // 누적 기록으로 ELO 레이팅 리더보드를 계산한다(domain/computeEloRatings 재사용, 표시용 변환).
  const leaderboard = toEloLeaderboard(records);
  // 누적 전적을 승수·승률 기준 순위표로 변환한다(domain/rankPlayers 재사용, 표시용 변환).
  const winRanking = toWinRankingRows(standings);
  // 플레이어별 최장 연승·현재 연승 순위(domain/playerStreak 재사용, 표시용 변환).
  const streakRanking = toStreakRankingRows(records);
  // 맞붙은 플레이어 쌍별 상대 전적(domain/headToHead 재사용, 표시용 변환).
  const headToHead = toHeadToHeadList(records);
  // 게임별(per-game) 전적(domain/summarizeByGame 재사용, 표시용 변환).
  const byGame = buildRecordsByGameRows(records, (game) => GAME_LABEL[game]);

  return (
    <section className="game">
      <h2>전적</h2>
      <p className="hint">{recordsPersistenceHint(recordsPersisted)}</p>

      {standings.length === 0 ? (
        <p className="hint">아직 기록이 없습니다. 게임을 한 판 끝내면 여기에 쌓입니다.</p>
      ) : (
        <table className="standings">
          <thead>
            <tr>
              <th>플레이어</th>
              <th>승</th>
              <th>패</th>
              <th>무</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.player}>
                <td>{s.player}</td>
                <td>{s.wins}</td>
                <td>{s.losses}</td>
                <td>{s.draws}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {leaderboard.length > 0 && (
        <>
          <h3>레이팅</h3>
          <p className="hint">
            초기 1000점에서 시작하는 ELO 레이팅(2인 대국 기준, 레이팅 내림차순).
          </p>
          <table className="standings">
            <thead>
              <tr>
                <th>순위</th>
                <th>플레이어</th>
                <th>레이팅</th>
                <th>판수</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.player}>
                  <td>{row.rank}</td>
                  <td>{row.player}</td>
                  <td>{row.rating}</td>
                  <td>{row.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {winRanking.length > 0 && (
        <>
          <h3>승수 순위</h3>
          <p className="hint">
            누적 승수·승률 기준 순위입니다(승 → 승률 → 패 순). 동점은 같은 순위를 공유합니다
            (예: 1, 2, 2, 4).
          </p>
          <div className="table-scroll">
            <table className="standings">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>플레이어</th>
                  <th>승</th>
                  <th>패</th>
                  <th>무</th>
                  <th>경기수</th>
                  <th>승률</th>
                </tr>
              </thead>
              <tbody>
                {winRanking.map((row) => (
                  <tr key={row.player}>
                    <td>{row.rank}</td>
                    <td>{row.player}</td>
                    <td>{row.wins}</td>
                    <td>{row.losses}</td>
                    <td>{row.draws}</td>
                    <td>{row.gamesPlayed}</td>
                    <td>{(row.winRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {streakRanking.length > 0 && (
        <>
          <h3>연승 순위</h3>
          <p className="hint">
            플레이어별 역대 최장 연승 기준 순위입니다(최장 연승 → 현재 연승 길이 순). 현재
            연속은 종류와 길이를 함께 표시합니다(예: 3연승·2연패·무). 동점은 같은 순위를
            공유합니다(예: 1, 2, 2, 4).
          </p>
          <div className="table-scroll">
            <table className="standings">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>플레이어</th>
                  <th>최장 연승</th>
                  <th>현재 연속</th>
                </tr>
              </thead>
              <tbody>
                {streakRanking.map((row) => (
                  <tr key={row.player}>
                    <td>{row.rank}</td>
                    <td>{row.player}</td>
                    <td>{row.longestWin}</td>
                    <td>{currentStreakLabel(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {standings.length > 0 && (
        <>
          <h3>상대 전적</h3>
          <p className="hint">
            정확히 두 사람이 직접 맞붙은 판만 모은 상대 전적입니다(판수 많은 순). 승 열은
            "맞대결"에 표기된 앞 사람·뒤 사람 기준입니다.
          </p>
          {headToHead.length === 0 ? (
            <p className="hint">아직 두 사람이 직접 맞붙은 기록이 없습니다.</p>
          ) : (
            <table className="standings">
              <thead>
                <tr>
                  <th>맞대결</th>
                  <th>앞 사람 승</th>
                  <th>뒤 사람 승</th>
                  <th>무</th>
                  <th>총 판수</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((row) => (
                  <tr key={`${row.playerA} vs ${row.playerB}`}>
                    <td>
                      {row.playerA} vs {row.playerB}
                    </td>
                    <td>{row.winsA}</td>
                    <td>{row.winsB}</td>
                    <td>{row.draws}</td>
                    <td>{row.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {standings.length > 0 && (
        <>
          <h3>게임별 전적</h3>
          <p className="hint">
            게임 종류별로 묶은 플레이어별 승/패/무입니다(기록이 있는 게임만, 처음 등장한
            순서).
          </p>
          {byGame.length === 0 ? (
            <p className="hint">아직 게임별로 집계할 기록이 없습니다.</p>
          ) : (
            <div className="table-scroll">
              <table className="standings">
                <thead>
                  <tr>
                    <th>게임</th>
                    <th>총 판수</th>
                    <th>플레이어</th>
                    <th>승</th>
                    <th>패</th>
                    <th>무</th>
                  </tr>
                </thead>
                <tbody>
                  {byGame.map((row) =>
                    row.players.map((p, i) => (
                      <tr key={`${row.game}:${p.player}`}>
                        {i === 0 ? (
                          <>
                            <td rowSpan={row.players.length}>{row.gameLabel}</td>
                            <td rowSpan={row.players.length}>{row.totalGames}</td>
                          </>
                        ) : null}
                        <td>{p.player}</td>
                        <td>{p.wins}</td>
                        <td>{p.losses}</td>
                        <td>{p.draws}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {records.length > 0 && (
        <>
          <h3>최근 기록</h3>
          <ul className="record-list">
            {records
              .slice()
              .reverse()
              .map((r, i) => (
                <li key={records.length - i}>
                  <span className="record-game">{GAME_LABEL[r.game]}</span>
                  {r.outcomes.map((o) => (
                    <span key={o.player} className="record-outcome">
                      {o.player} {RESULT_LABEL[o.result]}
                    </span>
                  ))}
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}

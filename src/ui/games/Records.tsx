import { useSyncExternalStore } from "react";
import type { GameId } from "../../domain/gameRecord";
import { getStandings, listRecords, subscribe } from "../records";

const GAME_LABEL: Record<GameId, string> = {
  rps: "가위바위보",
  oddEven: "홀짝",
  gomoku: "오목",
  card: "하이카드",
  go: "바둑",
  janggi: "장기",
};

const RESULT_LABEL = { win: "승", loss: "패", draw: "무" } as const;

export function Records() {
  // 외부 저장소(records.ts) 변경에 맞춰 다시 렌더한다.
  const standings = useSyncExternalStore(subscribe, getStandings);
  const records = useSyncExternalStore(subscribe, listRecords);

  return (
    <section className="game">
      <h2>전적</h2>
      <p className="hint">
        이번 세션에 저장된 대국 기록과 플레이어별 누적 전적입니다(새로고침 시 초기화).
      </p>

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

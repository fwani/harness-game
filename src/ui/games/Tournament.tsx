import { useMemo, useState } from "react";
import { generateRoundRobinSchedule, type Round } from "../../domain/roundRobin";
import { computeStandings, type MatchOutcome } from "../../domain/standings";
import {
  allMatchesDecided,
  byePlayersForRound,
  decidedCount,
  flattenSchedule,
  toMatchResults,
  validatePlayers,
} from "./tournamentView";

const OUTCOME_CHOICES: { value: MatchOutcome; label: (a: string, b: string) => string }[] = [
  { value: "a", label: (a) => `${a} 승` },
  { value: "draw", label: () => "무" },
  { value: "b", label: (_a, b) => `${b} 승` },
];

export function Tournament() {
  // 입력 단계: 참가자 이름들. 최소 두 칸으로 시작한다.
  const [names, setNames] = useState<string[]>(["", ""]);
  // 진행 단계: 생성된 대진표와 그때 확정된 참가자 스냅샷.
  const [schedule, setSchedule] = useState<Round[] | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // 경기 id → 결과. 입력된 경기만 보관한다.
  const [outcomes, setOutcomes] = useState<Record<string, MatchOutcome>>({});

  const matches = useMemo(() => (schedule ? flattenSchedule(schedule) : []), [schedule]);
  const standings = useMemo(() => computeStandings(toMatchResults(matches, outcomes)), [matches, outcomes]);
  const decided = decidedCount(matches, outcomes);
  const finished = allMatchesDecided(matches, outcomes);

  const updateName = (index: number, value: string) => {
    setNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const addPlayer = () => setNames((prev) => [...prev, ""]);

  const removePlayer = (index: number) => {
    // 최소 두 칸은 유지한다.
    setNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const generate = () => {
    const validation = validatePlayers(names);
    if (validation.error) {
      setError(validation.error);
      setSchedule(null);
      return;
    }
    setError(null);
    setPlayers(validation.players);
    setSchedule(generateRoundRobinSchedule(validation.players));
    setOutcomes({});
  };

  const setOutcome = (id: string, outcome: MatchOutcome) => {
    setOutcomes((prev) => ({ ...prev, [id]: outcome }));
  };

  const reset = () => {
    setSchedule(null);
    setPlayers([]);
    setOutcomes({});
    setError(null);
  };

  return (
    <section className="game">
      <h2>토너먼트</h2>
      <p className="hint">
        참가자를 입력해 라운드 로빈(모두와 한 번씩) 대진을 만들고, 경기 결과를 입력하면 승점 순위표가 집계됩니다.
      </p>

      {schedule === null ? (
        <>
          <div className="tournament-players">
            {names.map((name, index) => (
              <div key={index} className="tournament-player-row">
                <label>
                  <span className="hand-label">참가자 {index + 1}</span>
                  <input
                    type="text"
                    value={name}
                    placeholder="이름"
                    onChange={(e) => updateName(index, e.target.value)}
                  />
                </label>
                <button
                  className="tab"
                  type="button"
                  onClick={() => removePlayer(index)}
                  disabled={names.length <= 2}
                  aria-label={`참가자 ${index + 1} 삭제`}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          <div className="controls">
            <button className="tab" type="button" onClick={addPlayer}>
              참가자 추가
            </button>
            <button className="primary" type="button" onClick={generate}>
              대진 생성
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="hint">
            진행도: {decided} / {matches.length} 경기 입력됨
            {finished ? " · 모든 경기 종료" : ""}
          </p>

          {schedule.map((round, roundIndex) => {
            const byes = byePlayersForRound(round, players);
            return (
              <div key={roundIndex} className="tournament-round">
                <h3>{roundIndex + 1} 라운드</h3>
                {round.map((pairing, index) => {
                  const id = `r${roundIndex}-m${index}`;
                  const selected = outcomes[id];
                  return (
                    <div key={id} className="tournament-match">
                      <span className="tournament-match-label">
                        {pairing.a} vs {pairing.b}
                      </span>
                      <span className="tournament-match-choices">
                        {OUTCOME_CHOICES.map((choice) => (
                          <button
                            key={choice.value}
                            type="button"
                            className={selected === choice.value ? "tab active" : "tab"}
                            aria-pressed={selected === choice.value}
                            onClick={() => setOutcome(id, choice.value)}
                          >
                            {choice.label(pairing.a, pairing.b)}
                          </button>
                        ))}
                      </span>
                    </div>
                  );
                })}
                {byes.length > 0 && (
                  <p className="hint">부전승(이번 라운드 쉼): {byes.join(", ")}</p>
                )}
              </div>
            );
          })}

          {standings.length > 0 && (
            <>
              <h3>순위표</h3>
              <p className="outcome">
                {finished ? "🏆 토너먼트 종료 — 최종 순위" : "현재까지 집계된 순위 (승점 3·무 1·패 0)"}
              </p>
              <div className="table-scroll">
                <table className="standings">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>참가자</th>
                      <th>경기</th>
                      <th>승</th>
                      <th>무</th>
                      <th>패</th>
                      <th>승점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.player}>
                        <td>{row.rank}</td>
                        <td>{row.player}</td>
                        <td>{row.played}</td>
                        <td>{row.wins}</td>
                        <td>{row.draws}</td>
                        <td>{row.losses}</td>
                        <td>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="controls">
            <button className="primary" type="button" onClick={reset}>
              새 토너먼트
            </button>
          </div>
        </>
      )}
    </section>
  );
}

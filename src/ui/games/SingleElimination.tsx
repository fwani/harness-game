import { useState } from "react";
import {
  advanceSingleEliminationRound,
  generateSingleEliminationFirstRound,
  type BracketPairing,
} from "../../domain/singleElimination";
import {
  isRoundDecided,
  roundLabel,
  validateBracketPlayers,
  winnersInOrder,
} from "./singleEliminationView";

export function SingleElimination() {
  // 입력 단계: 참가자 이름들. 최소 두 칸으로 시작한다.
  const [names, setNames] = useState<string[]>(["", ""]);
  // 진행 단계: 누적된 라운드들(rounds===null이면 입력 단계).
  const [rounds, setRounds] = useState<BracketPairing[][] | null>(null);
  // 전체 라운드 수(라벨용). 결승/준결승/N강 판정에 쓴다.
  const [totalRounds, setTotalRounds] = useState(0);
  // 라운드별 승자 선택. picks[roundIndex][pairing.a] = 승자.
  const [picks, setPicks] = useState<Record<string, string | null>[]>([]);
  // 우승자(확정 시).
  const [champion, setChampion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateName = (index: number, value: string) => {
    setNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const addPlayer = () => setNames((prev) => [...prev, ""]);

  const removePlayer = (index: number) => {
    // 최소 두 칸은 유지한다.
    setNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const start = () => {
    const validation = validateBracketPlayers(names);
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }
    setError(null);
    const first = generateSingleEliminationFirstRound(validation.players);
    setRounds([first]);
    setPicks([{}]);
    setTotalRounds(Math.ceil(Math.log2(validation.players.length)));
    setChampion(null);
  };

  const pickWinner = (roundIndex: number, key: string, winner: string) => {
    setPicks((prev) =>
      prev.map((round, i) => (i === roundIndex ? { ...round, [key]: winner } : round)),
    );
  };

  const advance = () => {
    if (rounds === null) return;
    const lastIndex = rounds.length - 1;
    const lastRound = rounds[lastIndex] as BracketPairing[];
    const winners = winnersInOrder(lastRound, picks[lastIndex] as Record<string, string | null>);
    const next = advanceSingleEliminationRound(lastRound, winners);
    if (next.length === 0) {
      // 진출자 1명 = 우승 확정. winnersInOrder는 빈칸 없이 1명을 돌려준다.
      setChampion(winners[0] as string);
      return;
    }
    setRounds([...rounds, next]);
    setPicks([...picks, {}]);
  };

  const reset = () => {
    setRounds(null);
    setPicks([]);
    setTotalRounds(0);
    setChampion(null);
    setError(null);
  };

  return (
    <section className="game">
      <h2>녹아웃</h2>
      <p className="hint">
        참가자를 입력해 싱글 엘리미네이션(녹아웃) 대진을 만들고, 각 대진의 승자를 선택해 다음
        라운드로 진출시키면 우승자가 가려집니다. 참가자 수가 2의 거듭제곱이 아니면 상위 시드에게
        부전승이 주어집니다.
      </p>

      {rounds === null ? (
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
            <button className="primary" type="button" onClick={start}>
              대진 시작
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
            {champion !== null
              ? "토너먼트 종료"
              : `진행 중 · ${roundLabel(rounds.length - 1, totalRounds)} (${rounds.length} / ${totalRounds} 라운드)`}
          </p>

          {rounds.map((round, roundIndex) => {
            const isCurrent = roundIndex === rounds.length - 1 && champion === null;
            const roundPicks = (picks[roundIndex] ?? {}) as Record<string, string | null>;
            return (
              <div key={roundIndex} className="tournament-round">
                <h3>{roundLabel(roundIndex, totalRounds)}</h3>
                {round.map((pairing) => {
                  if (pairing.b === null) {
                    return (
                      <div key={pairing.a} className="tournament-match">
                        <span className="tournament-match-label">{pairing.a}</span>
                        <span className="hint">부전승 — 자동 진출</span>
                      </div>
                    );
                  }
                  const selected = roundPicks[pairing.a];
                  return (
                    <div key={pairing.a} className="tournament-match">
                      <span className="tournament-match-label">
                        {pairing.a} vs {pairing.b}
                      </span>
                      <span className="tournament-match-choices">
                        {[pairing.a, pairing.b].map((candidate) => (
                          <button
                            key={candidate}
                            type="button"
                            className={selected === candidate ? "tab active" : "tab"}
                            aria-pressed={selected === candidate}
                            disabled={!isCurrent}
                            onClick={() => pickWinner(roundIndex, pairing.a, candidate as string)}
                          >
                            {candidate} 승
                          </button>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {champion !== null ? (
            <p className="outcome">🏆 우승: {champion}</p>
          ) : (
            <div className="controls">
              <button
                className="primary"
                type="button"
                onClick={advance}
                disabled={
                  !isRoundDecided(
                    rounds[rounds.length - 1] as BracketPairing[],
                    (picks[rounds.length - 1] ?? {}) as Record<string, string | null>,
                  )
                }
              >
                {rounds[rounds.length - 1]?.length === 1 ? "우승 확정" : "다음 라운드"}
              </button>
            </div>
          )}

          <div className="controls">
            <button className="tab" type="button" onClick={reset}>
              새 토너먼트
            </button>
          </div>
        </>
      )}
    </section>
  );
}

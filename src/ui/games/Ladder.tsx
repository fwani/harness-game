import { useState } from "react";
import { playLadder, type LadderGameResult } from "../../application/playLadder";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { ladderRows, tracePathColumns, validateLadderInput } from "./ladderView";

// 난수(부수효과)는 infrastructure 어댑터로 주입한다. UI에서 Math.random을 직접 쓰지 않는다.
const source = new MathRandomSource();

interface LadderEntry {
  player: string;
  outcome: string;
}

const INITIAL_ENTRIES: LadderEntry[] = [
  { player: "A", outcome: "🎁 선물" },
  { player: "B", outcome: "청소 당번" },
  { player: "C", outcome: "커피 사기" },
];

// 사다리의 가로줄 개수(세로 단계 수). 열 수에 비례해 충분한 교차가 생기도록 잡는다.
function rowCountFor(columnCount: number): number {
  return Math.max(columnCount + 1, 5);
}

// SVG 좌표 상수.
const COL_GAP = 64;
const ROW_GAP = 44;
const PAD_X = 28;
const PAD_Y = 16;

export function Ladder() {
  const [entries, setEntries] = useState<LadderEntry[]>(INITIAL_ENTRIES);
  const [result, setResult] = useState<LadderGameResult | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 입력이 바뀌면 이전 사다리 결과는 더 이상 유효하지 않으므로 비운다.
  const clearResult = () => {
    setResult(null);
    setSelected(null);
  };

  const updateEntry = (index: number, key: keyof LadderEntry, value: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [key]: value } : e)));
    clearResult();
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { player: "", outcome: "" }]);
    clearResult();
  };

  const removeEntry = (index: number) => {
    // 최소 2칸은 유지한다.
    if (entries.length <= 2) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
    clearResult();
  };

  const play = () => {
    const players = entries.map((e) => e.player);
    const outcomes = entries.map((e) => e.outcome);
    const reason = validateLadderInput(players, outcomes);
    if (reason) {
      setError(reason);
      setResult(null);
      setSelected(null);
      return;
    }
    setError(null);
    const trimmedPlayers = players.map((p) => p.trim());
    const trimmedOutcomes = outcomes.map((o) => o.trim());
    // 규칙·난수·배정은 application playLadder에 위임한다(UI에서 재구현 금지).
    const game = playLadder(trimmedPlayers, trimmedOutcomes, rowCountFor(trimmedPlayers.length), source);
    setResult(game);
    setSelected(null);
  };

  const reset = () => {
    setEntries(INITIAL_ENTRIES);
    setResult(null);
    setSelected(null);
    setError(null);
  };

  return (
    <section className="game">
      <h2>사다리타기</h2>
      <p className="hint">
        참가자와 결과를 입력하고 “사다리 생성”을 누르면 무작위 사다리로 1:1 배정됩니다. 참가자를
        선택하면 도착까지의 경로가 강조됩니다.
      </p>

      <div className="ladder-entries">
        {entries.map((entry, index) => (
          <div key={index} className="ladder-entry-row">
            <label>
              <span className="hand-label">참가자 {index + 1}</span>
              <input
                type="text"
                value={entry.player}
                placeholder="이름"
                onChange={(e) => updateEntry(index, "player", e.target.value)}
              />
            </label>
            <label>
              <span className="hand-label">결과 {index + 1}</span>
              <input
                type="text"
                value={entry.outcome}
                placeholder="결과"
                onChange={(e) => updateEntry(index, "outcome", e.target.value)}
              />
            </label>
            <button
              className="tab"
              type="button"
              onClick={() => removeEntry(index)}
              disabled={entries.length <= 2}
              aria-label={`${index + 1}번 줄 삭제`}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="controls">
        <button className="tab" type="button" onClick={addEntry}>
          줄 추가
        </button>
        <button className="primary" type="button" onClick={play}>
          {result ? "다시 돌리기" : "사다리 생성"}
        </button>
        <button className="tab" type="button" onClick={reset}>
          새 게임
        </button>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {result && <LadderBoard result={result} selected={selected} onSelect={setSelected} />}
    </section>
  );
}

function LadderBoard({
  result,
  selected,
  onSelect,
}: {
  result: LadderGameResult;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const { columnCount, rungs, pairs } = result;
  const levels = ladderRows(rungs);
  const levelIndex = new Map<number, number>();
  levels.forEach((row, i) => levelIndex.set(row, i));

  const x = (col: number) => PAD_X + col * COL_GAP;
  const yTop = PAD_Y;
  const levelY = (i: number) => PAD_Y + (i + 1) * ROW_GAP;
  const yBottom = PAD_Y + (levels.length + 1) * ROW_GAP;
  const width = PAD_X * 2 + (columnCount - 1) * COL_GAP;
  const height = yBottom + PAD_Y;

  // 선택된 참가자의 경로(폴리라인 좌표).
  let pathPoints = "";
  let arrival: { player: string; outcome: string } | null = null;
  if (selected !== null) {
    const trace = tracePathColumns(columnCount, rungs, selected);
    const pts: [number, number][] = [[x(selected), yTop]];
    for (let i = 0; i < levels.length; i += 1) {
      pts.push([x(trace[i]!), levelY(i)]);
      if (trace[i + 1] !== trace[i]) {
        pts.push([x(trace[i + 1]!), levelY(i)]);
      }
    }
    pts.push([x(trace[trace.length - 1]!), yBottom]);
    pathPoints = pts.map(([px, py]) => `${px},${py}`).join(" ");
    arrival = pairs[selected]!;
  }

  return (
    <div className="ladder-result">
      <p className="hint">참가자를 선택해 경로를 확인하세요.</p>
      <div className="ladder-players" role="group" aria-label="참가자 선택">
        {pairs.map((pair, index) => (
          <button
            key={index}
            type="button"
            className={selected === index ? "tab active" : "tab"}
            aria-pressed={selected === index}
            onClick={() => onSelect(index)}
          >
            {pair.player}
          </button>
        ))}
      </div>

      <div className="ladder-scroll">
        <svg
          className="ladder-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={
            arrival
              ? `${arrival.player}의 사다리 경로 — 도착: ${arrival.outcome}`
              : "사다리. 참가자를 선택하면 경로가 강조됩니다."
          }
        >
          {/* 세로줄 + 열 라벨(참가자/결과) */}
          {Array.from({ length: columnCount }, (_, col) => (
            <g key={`col-${col}`}>
              <line className="ladder-line" x1={x(col)} y1={yTop} x2={x(col)} y2={yBottom} />
              <text className="ladder-label" x={x(col)} y={yTop - 4} textAnchor="middle">
                {pairs[col]!.player}
              </text>
              <text className="ladder-label" x={x(col)} y={yBottom + 14} textAnchor="middle">
                {/* 아래쪽 라벨은 그 열에 떨어지는 결과 항목 */}
                {outcomeAtColumn(result, col)}
              </text>
            </g>
          ))}

          {/* 가로줄 */}
          {rungs.map((rung, i) => {
            const li = levelIndex.get(rung.row)!;
            return (
              <line
                key={`rung-${i}`}
                className="ladder-rung"
                x1={x(rung.left)}
                y1={levelY(li)}
                x2={x(rung.left + 1)}
                y2={levelY(li)}
              />
            );
          })}

          {/* 선택된 경로 강조(색 + 굵은 선; 텍스트 라벨로도 도착을 안내) */}
          {pathPoints && <polyline className="ladder-path" points={pathPoints} />}
        </svg>
      </div>

      {arrival && (
        <p className="outcome" aria-live="polite">
          🪜 {arrival.player} → <strong>{arrival.outcome}</strong>
        </p>
      )}

      <h3>전체 배정</h3>
      <table className="standings">
        <thead>
          <tr>
            <th>참가자</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, index) => (
            <tr key={index} className={selected === index ? "ladder-row-active" : undefined}>
              <td>{pair.player}</td>
              <td>{pair.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 도착 열(col)에 떨어지는 참가자의 결과 = outcomes[col]. assignment[i]=col 이므로 outcomes[col]는
// pairs 중 outcome이 그 열에 해당하는 값이다. 표시는 결과 항목 자체이므로 outcomes[col]을 쓴다.
function outcomeAtColumn(result: LadderGameResult, col: number): string {
  // assignment[start] === col 인 start를 찾아 그 참가자의 outcome(=outcomes[col])을 가져온다.
  const start = result.assignment.findIndex((dest) => dest === col);
  return start >= 0 ? result.pairs[start]!.outcome : "";
}

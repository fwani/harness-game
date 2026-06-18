import { useEffect, useRef, useState } from "react";
import {
  startReversiGame,
  applyReversiTurn,
  reversiResult,
  type ReversiState,
} from "../../application/playReversi";
import type { Stone } from "../../domain/reversi";
import { countReversiDiscs } from "../../domain/reversiScore";
import { MathRandomSource } from "../../infrastructure/mathRandomSource";
import { recordGame } from "../records";
import { moveKey, legalMoveKeySet, reversiWinSide } from "./reversiView";
import { chooseCpuReversiMove } from "./reversiCpuView";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";

const SIZE = 8;

const STONE = { black: "●", white: "○" } as const;
const LABEL = { black: "흑", white: "백" } as const;

type Mode = "local" | "cpu";

// vs CPU 모드: 사람은 흑(선공), CPU는 백(후공).
const HUMAN: Stone = "black";
const CPU: Stone = "white";

// UI 난수 어댑터(부수효과는 infrastructure에). 테스트는 헬퍼에 스텁을 주입한다.
const rng = new MathRandomSource();

export function Reversi() {
  const [mode, setMode] = useState<Mode>("local");
  const [state, setState] = useState<ReversiState>(() => startReversiGame());
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드(사람/ CPU 어느 쪽 수로 끝나든 동작).
  const recorded = useRef(false);
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    SIZE,
    SIZE,
  );

  // vs CPU 모드에서 CPU(백) 차례면 한 수 자동 진행한다. 자동 패스로 다시 CPU 차례가 되면
  // state 변화로 이 effect가 재실행되어 연속으로 둔다. 사람은 effect가 도는 동안 입력 불가.
  useEffect(() => {
    if (mode !== "cpu" || state.finished || state.next !== CPU) {
      return;
    }
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.finished || prev.next !== CPU) {
          return prev;
        }
        const move = chooseCpuReversiMove(prev.board, CPU, rng);
        // next===CPU면 CPU는 둘 곳이 있다(applyReversiTurn이 둘 곳 없는 쪽으로 차례를
        // 넘기지 않음). 방어적으로 null이면 그대로 둔다.
        if (move === null) {
          return prev;
        }
        return applyReversiTurn(prev, move.x, move.y);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, state]);

  // 종료되면(사람/CPU 어느 수로든) 결과를 전적에 1회 기록한다.
  useEffect(() => {
    if (!state.finished || recorded.current) {
      return;
    }
    recorded.current = true;
    const result = reversiResult(state);
    if (result !== null) {
      const [a, b] =
        mode === "cpu" ? (["나", "CPU"] as const) : ([LABEL.black, LABEL.white] as const);
      recordGame("reversi", a, b, reversiWinSide(result));
    }
  }, [state, mode]);

  // vs CPU 모드에선 사람(흑) 차례에만 보드 입력을 허용한다.
  const humanTurn = mode === "local" || state.next === HUMAN;

  // 클릭 가능(하이라이트)한 합법 수: 사람 차례가 아니거나 종료면 없음.
  const legal =
    state.finished || !humanTurn
      ? new Set<string>()
      : legalMoveKeySet(state.board, state.next);

  const place = (x: number, y: number) => {
    focusOn(x, y);
    if (state.finished || !humanTurn || !legal.has(moveKey(x, y))) {
      return;
    }
    setState(applyReversiTurn(state, x, y));
  };

  const startGame = () => {
    recorded.current = false;
    setState(startReversiGame());
  };

  const changeMode = (next: Mode) => {
    if (next === mode) {
      return;
    }
    recorded.current = false;
    setMode(next);
    setState(startReversiGame());
  };

  // 진영 이름: 로컬은 흑/백, vs CPU는 나/CPU.
  const sideName = (stone: Stone): string =>
    mode === "cpu" ? (stone === HUMAN ? "나" : "CPU") : LABEL[stone];

  const discs = countReversiDiscs(state.board);
  const result = reversiResult(state);
  const winnerLabel =
    result === null
      ? null
      : result === "draw"
        ? "무승부"
        : `${sideName(result)} 승리! 🎉`;

  const cpuThinking = mode === "cpu" && !state.finished && state.next === CPU;

  return (
    <section className="game">
      <h2>
        오델로 ({SIZE}×{SIZE})
      </h2>
      <div className="controls" role="group" aria-label="플레이 모드 선택">
        <button
          className={mode === "local" ? "primary" : ""}
          aria-pressed={mode === "local"}
          onClick={() => changeMode("local")}
        >
          2인 로컬
        </button>
        <button
          className={mode === "cpu" ? "primary" : ""}
          aria-pressed={mode === "cpu"}
          onClick={() => changeMode("cpu")}
        >
          vs CPU
        </button>
      </div>
      <p className="hint">
        하이라이트된 합법 수 칸만 둘 수 있습니다 · ●(흑) 선공 / ○(백) 후공 ·
        한쪽이 둘 곳이 없으면 자동으로 차례가 넘어갑니다.
        {mode === "cpu" ? " · vs CPU: 내가 흑(●), CPU가 백(○)." : ""}
      </p>
      {state.finished ? (
        <p className="outcome">
          종료 · 흑 {discs.black} / 백 {discs.white} ·{" "}
          <strong>{winnerLabel}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {cpuThinking ? (
            <>CPU(○ 백) 생각 중…</>
          ) : (
            <>
              {STONE[state.next]} {sideName(state.next)} 차례
            </>
          )}{" "}
          · 흑 {discs.black} / 백 {discs.white}
          {state.lastWasPass
            ? ` · 상대가 둘 곳이 없어 ${sideName(state.next)}이(가) 연속해서 둡니다(패스)`
            : ""}
        </p>
      )}
      <div
        className="board reversi"
        style={boardGridStyle(SIZE)}
        role="grid"
        aria-label="오델로 보드 (방향 키로 칸 이동, Enter/Space로 착수)"
        onKeyDown={onKeyDown}
      >
        {state.board.map((row, y) =>
          row.map((cell, x) => {
            const playable = !state.finished && legal.has(moveKey(x, y));
            return (
              <button
                key={moveKey(x, y)}
                ref={setCellRef(x, y)}
                className={playable ? "cell legal" : "cell"}
                role="gridcell"
                tabIndex={tabIndexFor(x, y)}
                onClick={() => place(x, y)}
                aria-disabled={!playable}
                aria-label={
                  cell
                    ? `${x + 1}열 ${y + 1}행 ${LABEL[cell]}`
                    : `${x + 1}열 ${y + 1}행 ${playable ? "둘 수 있음" : "빈 칸"}`
                }
              >
                {cell && <span className={`stone ${cell}`}>{STONE[cell]}</span>}
              </button>
            );
          }),
        )}
      </div>
      <div className="controls">
        <button className="primary" onClick={startGame}>
          새 게임
        </button>
      </div>
    </section>
  );
}

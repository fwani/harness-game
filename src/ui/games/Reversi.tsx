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
import {
  DEFAULT_REVERSI_HUMAN_FIRST,
  reversiFirstPlayerOptions,
} from "./reversiStartOptionsView";
import { boardGridStyle } from "./boardView";
import { useBoardNavigation } from "./useBoardNavigation";

const SIZE = 8;

const STONE = { black: "●", white: "○" } as const;
const LABEL = { black: "흑", white: "백" } as const;

type Mode = "local" | "cpu";

// 오델로는 흑이 항상 선착한다(보드는 8×8 고정). vs CPU에서 humanFirst=true면 사람이 흑(선공),
// false면 사람이 백(후공)이고 CPU가 흑으로 선착한다. startReversiGame()은 항상 흑부터 시작하므로
// 색 선택은 "사람/CPU가 어느 돌을 잡는지"의 매핑만 바꾼다(도메인 변경 없음).
const FIRST_OPTIONS = reversiFirstPlayerOptions();

// UI 난수 어댑터(부수효과는 infrastructure에). 테스트는 헬퍼에 스텁을 주입한다.
const rng = new MathRandomSource();

export function Reversi() {
  const [mode, setMode] = useState<Mode>("local");
  const [humanFirst, setHumanFirst] = useState(DEFAULT_REVERSI_HUMAN_FIRST);
  const [state, setState] = useState<ReversiState>(() => startReversiGame());

  // 사람/CPU가 잡는 돌. humanFirst=true → 사람 흑·CPU 백, false → 사람 백·CPU 흑.
  const humanStone: Stone = humanFirst ? "black" : "white";
  const cpuStone: Stone = humanFirst ? "white" : "black";
  // 종료 전환 시 전적을 1회만 기록하기 위한 가드(사람/ CPU 어느 쪽 수로 끝나든 동작).
  const recorded = useRef(false);
  const { setCellRef, onKeyDown, tabIndexFor, focusOn } = useBoardNavigation(
    SIZE,
    SIZE,
  );

  // vs CPU 모드에서 CPU 차례면 한 수 자동 진행한다. 사람이 후공(백)이면 시작 시 CPU(흑)가
  // 선착한다. 자동 패스로 다시 CPU 차례가 되면 state 변화로 이 effect가 재실행되어 연속으로
  // 둔다. 사람은 effect가 도는 동안 입력 불가.
  useEffect(() => {
    if (mode !== "cpu" || state.finished || state.next !== cpuStone) {
      return;
    }
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.finished || prev.next !== cpuStone) {
          return prev;
        }
        const move = chooseCpuReversiMove(prev.board, cpuStone, rng);
        // next===cpuStone이면 CPU는 둘 곳이 있다(applyReversiTurn이 둘 곳 없는 쪽으로 차례를
        // 넘기지 않음). 방어적으로 null이면 그대로 둔다.
        if (move === null) {
          return prev;
        }
        return applyReversiTurn(prev, move.x, move.y);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, state, cpuStone]);

  // 종료되면(사람/CPU 어느 수로든) 결과를 전적에 1회 기록한다.
  useEffect(() => {
    if (!state.finished || recorded.current) {
      return;
    }
    recorded.current = true;
    const result = reversiResult(state);
    if (result !== null) {
      if (mode === "cpu") {
        // 사람=a/CPU=b로 저장(색 선택과 무관하게 집계 키 안정). 승패는 사람이 잡은 돌 기준으로
        // 매핑한다(사람이 백이어도 사람 승리는 "a").
        const winSide =
          result === "draw" ? "draw" : result === humanStone ? "a" : "b";
        recordGame("reversi", "나", "CPU", winSide);
      } else {
        recordGame("reversi", LABEL.black, LABEL.white, reversiWinSide(result));
      }
    }
  }, [state, mode, humanStone]);

  // vs CPU 모드에선 사람 차례(사람이 잡은 돌)에만 보드 입력을 허용한다.
  const humanTurn = mode === "local" || state.next === humanStone;

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

  // vs CPU 선공/색 선택. 진행 중 판은 새 게임으로 리셋한다(후공이면 CPU가 선착).
  const changeHumanFirst = (next: boolean) => {
    if (next === humanFirst) {
      return;
    }
    recorded.current = false;
    setHumanFirst(next);
    setState(startReversiGame());
  };

  // 진영 이름: 로컬은 흑/백, vs CPU는 나/CPU(사람이 잡은 돌 기준).
  const sideName = (stone: Stone): string =>
    mode === "cpu" ? (stone === humanStone ? "나" : "CPU") : LABEL[stone];

  const discs = countReversiDiscs(state.board);
  const result = reversiResult(state);
  const winnerLabel =
    result === null
      ? null
      : result === "draw"
        ? "무승부"
        : `${sideName(result)} 승리! 🎉`;

  const cpuThinking = mode === "cpu" && !state.finished && state.next === cpuStone;

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
      {mode === "cpu" && (
        <div className="controls" role="group" aria-label="선공·색 선택">
          {FIRST_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              className={humanFirst === opt.value ? "primary" : ""}
              aria-pressed={humanFirst === opt.value}
              onClick={() => changeHumanFirst(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <p className="hint">
        하이라이트된 합법 수 칸만 둘 수 있습니다 · ●(흑) 선공 / ○(백) 후공 ·
        한쪽이 둘 곳이 없으면 자동으로 차례가 넘어갑니다.
        {mode === "cpu"
          ? ` · vs CPU: 내가 ${STONE[humanStone]}(${LABEL[humanStone]}), CPU가 ${STONE[cpuStone]}(${LABEL[cpuStone]}).`
          : ""}
      </p>
      {state.finished ? (
        <p className="outcome">
          종료 · 흑 {discs.black} / 백 {discs.white} ·{" "}
          <strong>{winnerLabel}</strong>
        </p>
      ) : (
        <p className="hint" aria-live="polite">
          {cpuThinking ? (
            <>
              CPU({STONE[cpuStone]} {LABEL[cpuStone]}) 생각 중…
            </>
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

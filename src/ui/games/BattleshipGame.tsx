import { useState } from "react";
import { Battleship } from "./Battleship";
import { BattleshipMulti } from "./BattleshipMulti";
import {
  BATTLESHIP_MODE_OPTIONS,
  DEFAULT_BATTLESHIP_MODE,
  isModeSelected,
  type BattleshipMode,
} from "./battleshipMode";

/**
 * 배틀십 진입점: 시작 화면에서 **싱글(vs CPU) / 멀티(방)** 모드를 고른다(DoD B).
 * - 싱글: 기존 `Battleship`(vs CPU) 화면을 그대로 재사용한다(자체 `section`/`h2` 보유).
 * - 멀티: 주입형 RoomClient 포트를 소비하는 `BattleshipMulti`(방 생성·입장·비공개 배치·교대 사격).
 * 모드 선택은 색 비의존 세그먼트(`role="group"`+`aria-pressed`, 키보드 접근)이며, 모드 데이터는
 * `battleshipMode`(순수 헬퍼)에서 가져온다.
 */
export function BattleshipGame() {
  const [mode, setMode] = useState<BattleshipMode>(DEFAULT_BATTLESHIP_MODE);

  return (
    <>
      <section className="game">
        <h2>배틀십</h2>
        <div className="controls" role="group" aria-label="배틀십 모드 선택 (싱글/멀티)">
          <span className="hint">모드:</span>
          {BATTLESHIP_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              className={isModeSelected(mode, opt.mode) ? "primary" : ""}
              aria-pressed={isModeSelected(mode, opt.mode)}
              onClick={() => setMode(opt.mode)}
              title={opt.description}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="hint">
          {BATTLESHIP_MODE_OPTIONS.find((o) => o.mode === mode)?.description}
        </p>
      </section>

      {mode === "single" ? (
        <Battleship />
      ) : (
        <section className="game">
          <h2>배틀십 (멀티)</h2>
          <BattleshipMulti />
        </section>
      )}
    </>
  );
}

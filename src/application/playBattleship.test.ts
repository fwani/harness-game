import { describe, it, expect } from "vitest";
import {
  STANDARD_FLEET,
  createBattleshipBoard,
  fireShot,
  isValidPlacement,
  type BattleshipBoard,
  type Ship,
} from "../domain/battleship";
import {
  chooseRandomShot,
  chooseSmartShot,
  placeFleetRandomly,
  playBattleshipShot,
} from "./playBattleship";
import type { RandomSource } from "./dealCards";

/** 항상 같은 인덱스를 돌려주는 결정적 RandomSource 스텁. */
function fixedRng(index: number): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      return index;
    },
  };
}

/** 미리 정한 정수 수열을 순서대로 돌려주는 결정적 RandomSource 스텁. */
function sequenceRng(values: ReadonlyArray<number>): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      if (i >= values.length) throw new Error("sequenceRng exhausted");
      return values[i++]!;
    },
  };
}

/** 시드로 재현 가능한 결정적 의사난수(LCG). 실제 배치 흐름(다양한 좌표)을 테스트할 때 사용. */
function lcgRng(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive < 1) throw new Error("maxExclusive must be >= 1");
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state % maxExclusive;
    },
  };
}

/** 보드의 모든 칸을 사격해 미사격 칸이 없는 보드를 만든다. */
function fireAll(board: BattleshipBoard): BattleshipBoard {
  let next = board;
  for (let row = 0; row < next.length; row += 1) {
    for (let col = 0; col < next[row]!.length; col += 1) {
      next = fireShot(next, row, col);
    }
  }
  return next;
}

describe("placeFleetRandomly", () => {
  it("시드(스텁 RNG)로 결정적으로 배치하고 결과가 도메인에 유효하다", () => {
    // ship0: orientation=h, row=0, col=0 → (0,0),(0,1)
    // ship1 시도1: h,0,0 → ship0과 겹침(무효) → 시도2: v,1,0 → (1,0),(2,0)
    const rng = sequenceRng([0, 0, 0, 0, 0, 0, 1, 1, 0]);
    const ships = placeFleetRandomly(5, [2, 2], rng);
    expect(ships).toEqual<Ship[]>([
      { id: "ship-0", row: 0, col: 0, size: 2, orientation: "h" },
      { id: "ship-1", row: 1, col: 0, size: 2, orientation: "v" },
    ]);
    // 도메인 검증에 유효하고 createBattleshipBoard에 그대로 넣어도 throw하지 않는다.
    expect(isValidPlacement(5, ships)).toBe(true);
    expect(() => createBattleshipBoard(5, ships)).not.toThrow();
  });

  it("함선 수·길이를 보존한다(기본 STANDARD_FLEET)", () => {
    const ships = placeFleetRandomly(10, STANDARD_FLEET, lcgRng(42));
    expect(ships).toHaveLength(STANDARD_FLEET.length);
    expect(ships.map((s) => s.size)).toEqual([...STANDARD_FLEET]);
    // id가 모두 고유하다.
    expect(new Set(ships.map((s) => s.id)).size).toBe(STANDARD_FLEET.length);
    expect(isValidPlacement(10, ships)).toBe(true);
    expect(() => createBattleshipBoard(10, ships)).not.toThrow();
  });

  it("같은 시드는 같은 배치를 만든다(결정적)", () => {
    const a = placeFleetRandomly(10, STANDARD_FLEET, lcgRng(7));
    const b = placeFleetRandomly(10, STANDARD_FLEET, lcgRng(7));
    expect(a).toEqual(b);
  });

  it("fleet 인자를 생략하면 STANDARD_FLEET을 사용한다", () => {
    const ships = placeFleetRandomly(10, undefined, lcgRng(1));
    expect(ships.map((s) => s.size)).toEqual([...STANDARD_FLEET]);
  });

  it("배치 불가(함선이 보드보다 큼)면 throw 한다", () => {
    // 2×2 보드에 길이 3 함선은 어떤 배치로도 들어가지 않는다.
    expect(() => placeFleetRandomly(2, [3], fixedRng(0))).toThrow(/배치 실패/);
  });

  it("잘못된 보드 크기면 throw 한다", () => {
    expect(() => placeFleetRandomly(0, [2], fixedRng(0))).toThrow();
    expect(() => placeFleetRandomly(2.5, [2], fixedRng(0))).toThrow();
  });

  it("입력 fleet을 변형하지 않는다", () => {
    const fleet = [2, 3];
    const snapshot = JSON.stringify(fleet);
    placeFleetRandomly(8, fleet, lcgRng(5));
    expect(JSON.stringify(fleet)).toBe(snapshot);
  });
});

describe("chooseRandomShot", () => {
  const ships: Ship[] = [{ id: "a", row: 0, col: 0, size: 2, orientation: "h" }];

  it("미사격 칸을 행→열 순서로 균등 선택한다", () => {
    const board = createBattleshipBoard(5, ships);
    expect(chooseRandomShot(board, fixedRng(0))).toEqual({ row: 0, col: 0 });
    expect(chooseRandomShot(board, fixedRng(24))).toEqual({ row: 4, col: 4 });
  });

  it("이미 사격한 칸은 후보에서 제외한다", () => {
    const board = fireShot(createBattleshipBoard(5, ships), 0, 0);
    // (0,0)은 제외 → 첫 후보는 (0,1).
    expect(chooseRandomShot(board, fixedRng(0))).toEqual({ row: 0, col: 1 });
  });

  it("사격할 칸이 없으면 null을 반환한다", () => {
    const board = fireAll(createBattleshipBoard(3, [{ id: "a", row: 0, col: 0, size: 2, orientation: "h" }]));
    expect(chooseRandomShot(board, fixedRng(0))).toBeNull();
  });

  it("범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createBattleshipBoard(5, ships); // 후보 25칸
    expect(() => chooseRandomShot(board, fixedRng(25))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다", () => {
    const board = createBattleshipBoard(5, ships);
    const snapshot = JSON.stringify(board);
    chooseRandomShot(board, fixedRng(3));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("chooseSmartShot", () => {
  it("헌트 모드: 명중이 없으면 체커보드 패리티((row+col)짝수) 미사격 칸을 행→열 순서로 고른다", () => {
    const board = createBattleshipBoard(5, [
      { id: "a", row: 0, col: 0, size: 2, orientation: "h" },
    ]);
    // 첫 패리티 후보는 (0,0).
    expect(chooseSmartShot(board, fixedRng(0))).toEqual({ row: 0, col: 0 });
    // 두 번째 패리티 후보는 (0,2) — 홀수합 칸 (0,1)은 건너뛴다.
    expect(chooseSmartShot(board, fixedRng(1))).toEqual({ row: 0, col: 2 });
  });

  it("타깃 모드: 미격침 함선에 명중하면 인접한(상하좌우) 미사격 칸을 우선 고른다", () => {
    const ship: Ship = { id: "a", row: 2, col: 2, size: 3, orientation: "h" };
    // (2,2) 한 칸만 명중(함선은 아직 격침 아님).
    const board = fireShot(createBattleshipBoard(5, [ship]), 2, 2);
    const pick = chooseSmartShot(board, fixedRng(0));
    // 후보는 (2,2)의 상하좌우 미사격 칸뿐 — 멀리 떨어진 칸은 절대 고르지 않는다.
    const neighbors = [
      { row: 2, col: 3 },
      { row: 2, col: 1 },
      { row: 3, col: 2 },
      { row: 1, col: 2 },
    ];
    expect(neighbors).toContainEqual(pick);
    // DIRS 순서상 첫 후보는 오른쪽 (2,3).
    expect(pick).toEqual({ row: 2, col: 3 });
  });

  it("타깃 모드: 두 칸 이상 일직선 명중이면 그 직선 방향 연장칸을 우선한다(수직 이웃 배제)", () => {
    const ship: Ship = { id: "a", row: 2, col: 2, size: 3, orientation: "h" };
    let board = createBattleshipBoard(5, [ship]);
    board = fireShot(board, 2, 2);
    board = fireShot(board, 2, 3); // (2,2)-(2,3) 일직선 명중, 아직 미격침.
    // 직선 연장 후보는 같은 행의 양 끝 (2,1)·(2,4)뿐 — 수직 이웃 (1,2)/(3,2)/(1,3)/(3,3)은 배제.
    const a = chooseSmartShot(board, fixedRng(0));
    const b = chooseSmartShot(board, fixedRng(1));
    expect([a, b]).toEqual([
      { row: 2, col: 1 },
      { row: 2, col: 4 },
    ]);
    expect(a!.row).toBe(2);
    expect(b!.row).toBe(2);
  });

  it("격침된 함선의 명중 칸은 추적 대상에서 제외하고 헌트 모드로 떨어진다", () => {
    let board = createBattleshipBoard(5, [
      { id: "a", row: 0, col: 0, size: 2, orientation: "h" },
      { id: "b", row: 4, col: 4, size: 1, orientation: "h" },
    ]);
    board = fireShot(board, 0, 0);
    board = fireShot(board, 0, 1); // 함선 a 격침.
    // a의 인접칸을 추적하지 않고 헌트(패리티) 첫 미사격 칸 (0,2)를 고른다.
    expect(chooseSmartShot(board, fixedRng(0))).toEqual({ row: 0, col: 2 });
  });

  it("같은 시드(LCG)로 재현 가능하다(결정적)", () => {
    const board = createBattleshipBoard(8, placeFleetRandomly(8, STANDARD_FLEET, lcgRng(7)));
    expect(chooseSmartShot(board, lcgRng(99))).toEqual(chooseSmartShot(board, lcgRng(99)));
  });

  it("사격할 칸이 없으면 null을 반환한다", () => {
    const board = fireAll(
      createBattleshipBoard(3, [{ id: "a", row: 0, col: 0, size: 2, orientation: "h" }]),
    );
    expect(chooseSmartShot(board, fixedRng(0))).toBeNull();
  });

  it("범위 밖 인덱스를 주면 throw 한다", () => {
    const board = createBattleshipBoard(5, [
      { id: "a", row: 0, col: 0, size: 2, orientation: "h" },
    ]);
    expect(() => chooseSmartShot(board, fixedRng(100))).toThrow(/out-of-range/);
  });

  it("입력 board를 변형하지 않는다", () => {
    const ship: Ship = { id: "a", row: 2, col: 2, size: 3, orientation: "h" };
    const board = fireShot(createBattleshipBoard(5, [ship]), 2, 2);
    const snapshot = JSON.stringify(board);
    chooseSmartShot(board, fixedRng(0));
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe("playBattleshipShot", () => {
  const ships: Ship[] = [{ id: "a", row: 0, col: 0, size: 2, orientation: "h" }];

  it("빗나감: hit=false, sunkShipId=null, fleetDestroyed=false", () => {
    const board = createBattleshipBoard(5, ships);
    const r = playBattleshipShot(board, 4, 4);
    expect(r.hit).toBe(false);
    expect(r.sunkShipId).toBeNull();
    expect(r.fleetDestroyed).toBe(false);
  });

  it("명중(미격침): hit=true, sunkShipId=null", () => {
    const board = createBattleshipBoard(5, ships);
    const r = playBattleshipShot(board, 0, 0); // 함선 a의 한 칸만 명중
    expect(r.hit).toBe(true);
    expect(r.sunkShipId).toBeNull();
    expect(r.fleetDestroyed).toBe(false);
  });

  it("격침: 함선의 마지막 칸을 명중하면 sunkShipId가 채워지고 전 함대 격침이면 fleetDestroyed=true", () => {
    const board = fireShot(createBattleshipBoard(5, ships), 0, 0); // (0,0) 먼저 명중
    const r = playBattleshipShot(board, 0, 1); // (0,1)로 함선 a 격침
    expect(r.hit).toBe(true);
    expect(r.sunkShipId).toBe("a");
    expect(r.fleetDestroyed).toBe(true);
  });

  it("여러 함선: 한 함선만 격침되면 fleetDestroyed=false", () => {
    const twoShips: Ship[] = [
      { id: "a", row: 0, col: 0, size: 2, orientation: "h" },
      { id: "b", row: 2, col: 0, size: 2, orientation: "h" },
    ];
    const board = fireShot(createBattleshipBoard(5, twoShips), 0, 0);
    const r = playBattleshipShot(board, 0, 1); // 함선 a만 격침
    expect(r.sunkShipId).toBe("a");
    expect(r.fleetDestroyed).toBe(false);
  });

  it("불법 좌표는 도메인 에러를 전파한다", () => {
    const board = createBattleshipBoard(5, ships);
    expect(() => playBattleshipShot(board, -1, 0)).toThrow();
    expect(() => playBattleshipShot(board, 5, 0)).toThrow();
  });

  it("입력 board를 변형하지 않는다", () => {
    const board = createBattleshipBoard(5, ships);
    const snapshot = JSON.stringify(board);
    const r = playBattleshipShot(board, 0, 0);
    expect(JSON.stringify(board)).toBe(snapshot);
    expect(r.board).not.toBe(board);
  });
});

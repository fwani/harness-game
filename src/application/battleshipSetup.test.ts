import { describe, it, expect } from "vitest";
import {
  createBattleshipSetup,
  submitFleet,
  isSetupComplete,
  startBattleshipMatch,
  redactSetup,
  type BattleshipSetupState,
} from "./battleshipSetup";
import { createBattleshipEngine } from "./battleshipEngine";
import { STANDARD_FLEET, type Ship } from "../domain/battleship";

const SIZE = 10;

// STANDARD_FLEET([5,4,3,3,2])을 10×10에 겹침/범위초과 없이 둔 유효 함대(각 함선 한 행씩).
const VALID_P1: Ship[] = [
  { id: "a", row: 0, col: 0, size: 5, orientation: "h" },
  { id: "b", row: 1, col: 0, size: 4, orientation: "h" },
  { id: "c", row: 2, col: 0, size: 3, orientation: "h" },
  { id: "d", row: 3, col: 0, size: 3, orientation: "h" },
  { id: "e", row: 4, col: 0, size: 2, orientation: "h" },
];

// p2용 다른 유효 배치(세로). 길이 multiset은 동일.
const VALID_P2: Ship[] = [
  { id: "a", row: 0, col: 0, size: 5, orientation: "v" },
  { id: "b", row: 0, col: 1, size: 4, orientation: "v" },
  { id: "c", row: 0, col: 2, size: 3, orientation: "v" },
  { id: "d", row: 0, col: 3, size: 3, orientation: "v" },
  { id: "e", row: 0, col: 4, size: 2, orientation: "v" },
];

function freshSetup(): BattleshipSetupState {
  return createBattleshipSetup(SIZE, STANDARD_FLEET);
}

describe("createBattleshipSetup", () => {
  it("① 양측 null로 시작하고 size·fleet를 보존한다", () => {
    const s = freshSetup();
    expect(s.size).toBe(SIZE);
    expect(s.fleet).toEqual([...STANDARD_FLEET]);
    expect(s.p1Ships).toBeNull();
    expect(s.p2Ships).toBeNull();
    expect(isSetupComplete(s)).toBe(false);
  });

  it("fleet를 복사해 외부 변형으로부터 보호한다", () => {
    const fleet = [...STANDARD_FLEET];
    const s = createBattleshipSetup(SIZE, fleet);
    fleet.push(99);
    expect(s.fleet).toHaveLength(STANDARD_FLEET.length);
  });
});

describe("submitFleet — 거부(입력 불변)", () => {
  it("② 함선 길이 multiset 불일치는 ok:false로 거부하고 입력을 변형하지 않는다", () => {
    const s = freshSetup();
    // 길이 5짜리를 4로 바꿔 multiset 불일치.
    const wrong = VALID_P1.map((sh) =>
      sh.id === "a" ? { ...sh, size: 4 } : sh,
    );
    const r = submitFleet(s, "p1", wrong);
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
    expect(r.state).toBe(s); // 동일 참조(불변)
    expect(s.p1Ships).toBeNull();
  });

  it("② 범위 초과는 ok:false로 거부", () => {
    const s = freshSetup();
    const oob = VALID_P1.map((sh) =>
      sh.id === "a" ? { ...sh, col: 6 } : sh, // 6..10 → 범위 밖(size 10)
    );
    const r = submitFleet(s, "p1", oob);
    expect(r.ok).toBe(false);
    expect(s.p1Ships).toBeNull();
  });

  it("② 겹침은 ok:false로 거부", () => {
    const s = freshSetup();
    const overlap = VALID_P1.map((sh) =>
      sh.id === "b" ? { ...sh, row: 0 } : sh, // size4를 row0에 → size5와 겹침
    );
    const r = submitFleet(s, "p1", overlap);
    expect(r.ok).toBe(false);
    expect(s.p1Ships).toBeNull();
  });
});

describe("submitFleet — 채택", () => {
  it("③ 유효 제출은 해당 side만 채택하고 상대는 보존한다", () => {
    const s0 = freshSetup();
    const r1 = submitFleet(s0, "p1", VALID_P1);
    expect(r1.ok).toBe(true);
    expect(r1.state.p1Ships).toHaveLength(STANDARD_FLEET.length);
    expect(r1.state.p2Ships).toBeNull(); // 상대 미제출 보존
    expect(s0.p1Ships).toBeNull(); // 원본 불변

    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    expect(r2.ok).toBe(true);
    expect(r2.state.p1Ships).toHaveLength(STANDARD_FLEET.length); // p1 보존
    expect(r2.state.p2Ships).toHaveLength(STANDARD_FLEET.length);
  });

  it("채택된 함대는 입력 배열과 독립적인 복사본이다", () => {
    const ships = VALID_P1.map((sh) => ({ ...sh }));
    const r = submitFleet(freshSetup(), "p1", ships);
    ships[0]!.col = 9;
    expect(r.state.p1Ships![0]!.col).toBe(0);
  });

  it("양측 완료 전까지 재제출 허용", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const resub = submitFleet(r1.state, "p1", VALID_P2); // 같은 side 재제출
    expect(resub.ok).toBe(true);
    expect(resub.state.p1Ships![0]!.orientation).toBe("v"); // VALID_P2로 교체됨
  });

  it("양측 완료 후 재제출은 거부", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    expect(isSetupComplete(r2.state)).toBe(true);
    const after = submitFleet(r2.state, "p1", VALID_P1);
    expect(after.ok).toBe(false);
    expect(after.state).toBe(r2.state);
  });
});

describe("isSetupComplete", () => {
  it("④ 양측 제출 시에만 true", () => {
    const s0 = freshSetup();
    expect(isSetupComplete(s0)).toBe(false);
    const r1 = submitFleet(s0, "p1", VALID_P1);
    expect(isSetupComplete(r1.state)).toBe(false);
    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    expect(isSetupComplete(r2.state)).toBe(true);
  });
});

describe("startBattleshipMatch", () => {
  it("⑤ 미완료면 throw", () => {
    expect(() => startBattleshipMatch(freshSetup())).toThrow();
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    expect(() => startBattleshipMatch(r1.state)).toThrow();
  });

  it("⑤ 완료 시 createBattleshipEngine().init과 동일한 상태를 생성", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    const fromSetup = startBattleshipMatch(r2.state);
    const direct = createBattleshipEngine().init({
      size: SIZE,
      p1Ships: VALID_P1,
      p2Ships: VALID_P2,
    });
    expect(fromSetup).toEqual(direct);
    expect(fromSetup.next).toBe("p1");
  });
});

describe("redactSetup", () => {
  it("⑥ 상대 ships를 숨기고 자기 ships·제출여부는 보존(viewer=p1)", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    const view = redactSetup(r2.state, "p1");
    expect(view.p1Ships).toHaveLength(STANDARD_FLEET.length); // 자기 함대 그대로
    expect(view.p1Ships![0]!.size).toBe(5);
    expect(view.p2Ships).toEqual([]); // 상대: 제출됨이지만 위치 숨김
    expect(view.size).toBe(SIZE);
    expect(view.fleet).toEqual([...STANDARD_FLEET]);
  });

  it("⑥ viewer=p2 대칭", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    const view = redactSetup(r2.state, "p2");
    expect(view.p2Ships).toHaveLength(STANDARD_FLEET.length);
    expect(view.p2Ships![0]!.orientation).toBe("v");
    expect(view.p1Ships).toEqual([]); // 상대 숨김
  });

  it("⑥ 미제출 상대는 null로 노출(제출 여부 구분)", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const view = redactSetup(r1.state, "p1");
    expect(view.p1Ships).toHaveLength(STANDARD_FLEET.length);
    expect(view.p2Ships).toBeNull(); // 미제출은 null
  });

  it("⑥ 입력을 변형하지 않는다", () => {
    const r1 = submitFleet(freshSetup(), "p1", VALID_P1);
    const r2 = submitFleet(r1.state, "p2", VALID_P2);
    redactSetup(r2.state, "p1");
    expect(r2.state.p2Ships).toHaveLength(STANDARD_FLEET.length); // 원본 보존
  });
});

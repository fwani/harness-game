import { describe, it, expect } from "vitest";
import type { Ship } from "../domain/battleship";
import {
  createBattleshipSetupController,
  resolveSetupFor,
} from "./setupController";

/** 겹치지 않는 표준 함대([5,4,3,3,2])를 각기 다른 행에 가로로 배치한다(10×10에서 유효). */
function validFleet(): Ship[] {
  return [
    { id: "a", row: 0, col: 0, size: 5, orientation: "h" },
    { id: "b", row: 1, col: 0, size: 4, orientation: "h" },
    { id: "c", row: 2, col: 0, size: 3, orientation: "h" },
    { id: "d", row: 3, col: 0, size: 3, orientation: "h" },
    { id: "e", row: 4, col: 0, size: 2, orientation: "h" },
  ];
}

describe("resolveSetupFor", () => {
  it("battleship에는 SetupController를, 그 외에는 undefined를 반환한다", () => {
    expect(resolveSetupFor("battleship")).toBeDefined();
    expect(resolveSetupFor("tictactoe")).toBeUndefined();
    expect(resolveSetupFor("gomoku")).toBeUndefined();
  });
});

describe("createBattleshipSetupController", () => {
  it("create()는 양측 미제출 setup을 만든다", () => {
    const c = createBattleshipSetupController();
    const setup = c.create() as { p1Ships: unknown; p2Ships: unknown };
    expect(setup.p1Ships).toBeNull();
    expect(setup.p2Ships).toBeNull();
  });

  it("유효한 제출은 채택하고, 양측 완료 시 startState로 엔진 상태를 만든다", () => {
    const c = createBattleshipSetupController();
    const setup = c.create();
    const r1 = c.submit(setup, "p1", validFleet());
    expect(r1.ok).toBe(true);
    expect(c.isComplete(r1.state)).toBe(false);
    const r2 = c.submit(r1.state, "p2", validFleet());
    expect(r2.ok).toBe(true);
    expect(c.isComplete(r2.state)).toBe(true);
    const state = c.startState(r2.state) as { next: string };
    expect(state.next).toBe("p1");
  });

  it("형식이 깨진 제출(배열 아님/함선 아님)은 ok:false로 거부한다(throw 금지)", () => {
    const c = createBattleshipSetupController();
    const setup = c.create();
    expect(c.submit(setup, "p1", "nope").ok).toBe(false);
    expect(c.submit(setup, "p1", [1, 2, 3]).ok).toBe(false);
    expect(c.submit(setup, "p1", [null]).ok).toBe(false);
    expect(c.submit(setup, "p1", [{ id: "a", row: 0, col: 0 }]).ok).toBe(false);
  });

  it("규칙 위반(겹침/multiset 불일치)은 ok:false로 거부한다", () => {
    const c = createBattleshipSetupController();
    const setup = c.create();
    expect(c.submit(setup, "p1", [validFleet()[0]!]).ok).toBe(false); // 함선 1척만
    const overlap = validFleet();
    overlap[1] = { id: "b", row: 0, col: 0, size: 4, orientation: "h" }; // a와 겹침
    expect(c.submit(setup, "p1", overlap).ok).toBe(false);
  });

  it("redact()는 상대 함대 좌표를 숨기고 제출 여부만 노출한다", () => {
    const c = createBattleshipSetupController();
    const submitted = c.submit(c.create(), "p1", validFleet()).state;
    // p2 시점: p1은 제출했으나([]) 좌표는 비공개, p2는 미제출(null).
    const asP2 = c.redact(submitted, "p2") as { p1Ships: unknown; p2Ships: unknown };
    expect(asP2.p1Ships).toEqual([]);
    expect(asP2.p2Ships).toBeNull();
    // p1 시점: 자기 함대 좌표는 그대로 보인다.
    const asP1 = c.redact(submitted, "p1") as { p1Ships: Ship[] };
    expect(asP1.p1Ships).toHaveLength(5);
  });
});

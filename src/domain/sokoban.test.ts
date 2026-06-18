import { describe, expect, it } from "vitest";

import {
  SOKOBAN_LEVEL_COUNT,
  applySokobanMove,
  createSokobanLevel,
  isLegalSokobanMove,
  isSokobanSolved,
  legalSokobanMoves,
  parseSokobanLevel,
  type SokobanState,
} from "./sokoban";

// 보드 상태 스냅샷(불변성 검증용): 모든 동적 필드를 비교 가능한 형태로 직렬화.
function snapshot(state: SokobanState) {
  return {
    width: state.width,
    height: state.height,
    walls: [...state.walls].sort(),
    targets: [...state.targets].sort(),
    boxes: [...state.boxes].sort(),
    player: { ...state.player },
  };
}

describe("parseSokobanLevel", () => {
  it("칸 타입(벽/목표/상자/플레이어)을 좌표로 파싱한다", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    expect(state.width).toBe(5);
    expect(state.height).toBe(3);
    expect(state.player).toEqual({ row: 1, col: 1 });
    expect(state.boxes).toEqual(new Set(["1,2"]));
    expect(state.targets).toEqual(new Set(["1,3"]));
    // 테두리 벽(8칸) + 가운데 윗줄/아랫줄 = 12칸.
    expect(state.walls.has("0,0")).toBe(true);
    expect(state.walls.has("2,4")).toBe(true);
    expect(state.walls.has("1,1")).toBe(false);
  });

  it("'+'(목표 위 플레이어)와 '*'(목표 위 상자)를 동시에 목표로 친다", () => {
    // #+*$# : 목표 위 플레이어 + 목표 위 상자 + 일반 상자(상자 2·목표 2).
    const state = parseSokobanLevel(["#####", "#+*$#", "#####"].join("\n"));
    expect(state.player).toEqual({ row: 1, col: 1 });
    expect(state.boxes).toEqual(new Set(["1,2", "1,3"]));
    expect(state.targets).toEqual(new Set(["1,1", "1,2"]));
  });

  it("가장 긴 줄을 width로 삼고 짧은 줄 나머지는 바닥으로 본다", () => {
    const state = parseSokobanLevel(["####", "#@$.", "####"].join("\n"));
    expect(state.width).toBe(4);
    // 두 번째 줄은 끝에 벽이 없지만 파싱은 성공해야 한다.
    expect(state.player).toEqual({ row: 1, col: 1 });
  });

  it("플레이어가 0명이면 throw", () => {
    expect(() => parseSokobanLevel(["#####", "# $.#", "#####"].join("\n"))).toThrow(
      /플레이어/,
    );
  });

  it("플레이어가 2명이면 throw", () => {
    expect(() =>
      parseSokobanLevel(["######", "#@$.@#", "######"].join("\n")),
    ).toThrow(/플레이어/);
  });

  it("상자가 0개면 throw", () => {
    expect(() => parseSokobanLevel(["#####", "#@ .#", "#####"].join("\n"))).toThrow(
      /상자/,
    );
  });

  it("목표가 0개면 throw", () => {
    expect(() => parseSokobanLevel(["#####", "#@$ #", "#####"].join("\n"))).toThrow(
      /목표/,
    );
  });

  it("상자 수와 목표 수가 다르면 throw", () => {
    expect(() =>
      parseSokobanLevel(["######", "#@$$.#", "######"].join("\n")),
    ).toThrow(/상자 수|목표 수/);
  });

  it("알 수 없는 문자는 throw", () => {
    expect(() => parseSokobanLevel(["#####", "#@$X#", "#####"].join("\n"))).toThrow(
      /알 수 없는 문자/,
    );
  });

  it("빈 레이아웃은 throw", () => {
    expect(() => parseSokobanLevel("")).toThrow();
  });
});

describe("createSokobanLevel", () => {
  it("기본 레벨(0)은 풀 수 있는 결정적 시작 상태", () => {
    const state = createSokobanLevel();
    expect(isSokobanSolved(state)).toBe(false);
    expect(state.boxes.size).toBe(state.targets.size);
    expect(state.boxes.size).toBeGreaterThan(0);
  });

  it("내장 레벨 수만큼 모두 파싱 가능하다", () => {
    for (let i = 0; i < SOKOBAN_LEVEL_COUNT; i += 1) {
      const state = createSokobanLevel(i);
      expect(state.boxes.size).toBe(state.targets.size);
    }
  });

  it("범위 밖/비정수 레벨 번호는 throw", () => {
    expect(() => createSokobanLevel(-1)).toThrow();
    expect(() => createSokobanLevel(SOKOBAN_LEVEL_COUNT)).toThrow();
    expect(() => createSokobanLevel(0.5)).toThrow();
  });
});

describe("isLegalSokobanMove / legalSokobanMoves", () => {
  it("빈 바닥으로의 이동은 합법", () => {
    // 플레이어 주위가 바닥인 방.
    const state = parseSokobanLevel(
      ["#####", "#   #", "# @.#", "# $ #", "#####"].join("\n"),
    );
    expect(isLegalSokobanMove(state, "up")).toBe(true);
    expect(isLegalSokobanMove(state, "left")).toBe(true);
  });

  it("벽으로의 이동은 불법", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    expect(isLegalSokobanMove(state, "up")).toBe(false);
    expect(isLegalSokobanMove(state, "down")).toBe(false);
    expect(isLegalSokobanMove(state, "left")).toBe(false); // 왼쪽은 벽
  });

  it("너머가 빈 칸이면 상자 밀기 합법", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(true); // 상자 너머는 목표(빈 바닥)
  });

  it("상자 너머가 벽이면 밀기 불법", () => {
    // @ 오른쪽에 상자($), 그 너머는 테두리 벽(#).
    const state = parseSokobanLevel(["#####", "#.@$#", "#####"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(false);
  });

  it("상자 2개 연속 밀기는 불법", () => {
    const state = parseSokobanLevel(["#######", "#@$$..#", "#######"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(false);
  });

  it("legalSokobanMoves는 결정적 순서(위→아래→왼쪽→오른쪽)로 합법 방향만 반환", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    expect(legalSokobanMoves(state)).toEqual(["right"]);
  });
});

describe("applySokobanMove", () => {
  it("빈 칸 이동: 플레이어만 한 칸 이동, 상자 불변", () => {
    const state = parseSokobanLevel(
      ["#####", "#@  #", "# $.#", "#####"].join("\n"),
    );
    const next = applySokobanMove(state, "right");
    expect(next.player).toEqual({ row: 1, col: 2 });
    expect(next.boxes).toEqual(state.boxes);
  });

  it("상자 밀기: 상자와 플레이어가 함께 한 칸 이동", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    const next = applySokobanMove(state, "right");
    expect(next.player).toEqual({ row: 1, col: 2 });
    expect(next.boxes).toEqual(new Set(["1,3"]));
    expect(isSokobanSolved(next)).toBe(true);
  });

  it("불법 수(벽)는 throw", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    expect(() => applySokobanMove(state, "left")).toThrow(/불법 수/);
    expect(() => applySokobanMove(state, "up")).toThrow(/불법 수/);
  });

  it("불법 수(상자 2개 연속)는 throw", () => {
    const state = parseSokobanLevel(["#######", "#@$$..#", "#######"].join("\n"));
    expect(() => applySokobanMove(state, "right")).toThrow(/불법 수/);
  });

  it("입력 상태를 변형하지 않는다(불변)", () => {
    const state = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    const before = snapshot(state);
    applySokobanMove(state, "right");
    expect(snapshot(state)).toEqual(before);
  });
});

describe("isSokobanSolved", () => {
  it("모든 상자가 목표 위에 있으면 클리어", () => {
    // '*' = 목표 위 상자(상자 1·목표 1).
    const state = parseSokobanLevel(["####", "#@*#", "####"].join("\n"));
    expect(isSokobanSolved(state)).toBe(true);
  });

  it("상자 하나라도 목표 밖이면 미클리어", () => {
    const state = parseSokobanLevel(["######", "#@$.*#", "######"].join("\n"));
    expect(isSokobanSolved(state)).toBe(false);
  });

  it("내장 레벨 0을 끝까지 풀면 클리어로 판정", () => {
    const solved = applySokobanMove(createSokobanLevel(0), "right");
    expect(isSokobanSolved(solved)).toBe(true);
  });
});

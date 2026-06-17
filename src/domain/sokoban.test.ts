import { describe, expect, it } from "vitest";

import {
  applySokobanMove,
  createSokobanLevel,
  isLegalSokobanMove,
  isSokobanSolved,
  legalSokobanMoves,
  parseSokobanLevel,
  type Direction,
  type SokobanState,
} from "./sokoban";

// 상태 스냅샷(불변성 검증용): 좌표 집합과 플레이어를 비교 가능한 형태로 직렬화.
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
  it("타입별 칸을 정확히 파싱한다", () => {
    // #######
    // #@$  .#
    // #######
    const state = parseSokobanLevel(["#######", "#@$  .#", "#######"].join("\n"));
    expect(state.height).toBe(3);
    expect(state.width).toBe(7);
    expect(state.player).toEqual({ row: 1, col: 1 });
    expect(state.boxes).toEqual(new Set(["1,2"]));
    expect(state.targets).toEqual(new Set(["1,5"]));
    // 둘레 벽 + 위/아래 전체 벽.
    expect(state.walls.has("0,0")).toBe(true);
    expect(state.walls.has("1,0")).toBe(true);
    expect(state.walls.has("1,6")).toBe(true);
    expect(state.walls.has("2,3")).toBe(true);
  });

  it("'+'(목표 위 플레이어)를 플레이어+목표로 분해한다", () => {
    // #+$ # : 플레이어가 목표 위(1,1), 상자(1,2), 목표 1개 → 상자=목표=1 균형.
    const state = parseSokobanLevel(["#####", "#+$ #", "#####"].join("\n"));
    expect(state.player).toEqual({ row: 1, col: 1 });
    expect(state.targets).toEqual(new Set(["1,1"]));
    expect(state.boxes).toEqual(new Set(["1,2"]));
    expect(isSokobanSolved(state)).toBe(false);
  });

  it("'*'(목표 위 상자)를 상자+목표로 분해하고 클리어로 본다", () => {
    const state = parseSokobanLevel(["####", "#@*#", "####"].join("\n"));
    expect(state.targets).toEqual(new Set(["1,2"]));
    expect(state.boxes).toEqual(new Set(["1,2"]));
    expect(isSokobanSolved(state)).toBe(true);
  });

  it("플레이어가 1명이 아니면 throw 한다", () => {
    expect(() => parseSokobanLevel(["#####", "#$ .#", "#####"].join("\n"))).toThrow(
      /플레이어/,
    );
    expect(() => parseSokobanLevel(["######", "#@@$.#", "######"].join("\n"))).toThrow(
      /플레이어/,
    );
  });

  it("상자가 없으면 throw 한다", () => {
    expect(() => parseSokobanLevel(["#####", "#@ .#", "#####"].join("\n"))).toThrow(
      /상자/,
    );
  });

  it("목표가 없으면 throw 한다", () => {
    expect(() => parseSokobanLevel(["#####", "#@$ #", "#####"].join("\n"))).toThrow(
      /목표/,
    );
  });

  it("상자 수와 목표 수가 다르면 throw 한다", () => {
    expect(() =>
      parseSokobanLevel(["#######", "#@$$ .#", "#######"].join("\n")),
    ).toThrow(/일치/);
  });

  it("알 수 없는 문자에 throw 한다", () => {
    expect(() => parseSokobanLevel(["####", "#@X#", "####"].join("\n"))).toThrow(
      /알 수 없는 문자/,
    );
  });

  it("빈 레이아웃에 throw 한다", () => {
    expect(() => parseSokobanLevel("")).toThrow();
  });
});

describe("createSokobanLevel", () => {
  it("기본(0번) 레벨을 결정적으로 만든다", () => {
    const a = createSokobanLevel();
    const b = createSokobanLevel(0);
    expect(snapshot(a)).toEqual(snapshot(b));
    expect(a.boxes.size).toBe(a.targets.size);
    expect(isSokobanSolved(a)).toBe(false);
  });

  it("1번 레벨도 유효하다", () => {
    const level = createSokobanLevel(1);
    expect(level.boxes.size).toBe(level.targets.size);
    expect(level.boxes.size).toBeGreaterThanOrEqual(1);
  });

  it("범위 밖 index면 throw 한다", () => {
    expect(() => createSokobanLevel(-1)).toThrow();
    expect(() => createSokobanLevel(99)).toThrow();
  });
});

describe("isLegalSokobanMove / legalSokobanMoves", () => {
  it("빈 칸으로 이동은 합법, 벽으로 이동은 불법", () => {
    // #####
    // #@  #
    // #####
    const state = parseSokobanLevel(["#####", "#@ .#", "#####", "#$###"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(true);
    expect(isLegalSokobanMove(state, "left")).toBe(false); // 벽
    expect(isLegalSokobanMove(state, "up")).toBe(false); // 벽
  });

  it("상자를 빈 칸으로 미는 것은 합법", () => {
    const state = parseSokobanLevel(["#######", "#@$  .#", "#######"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(true);
  });

  it("상자 너머가 벽이면 밀기 불법", () => {
    // 상자 오른쪽이 벽: @$#
    const state = parseSokobanLevel(["#####", "#@$#", "#  .#", "#####"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(false);
  });

  it("상자 2개 연속 밀기 불법", () => {
    const state = parseSokobanLevel(["########", "#@$$ ..#", "########"].join("\n"));
    expect(isLegalSokobanMove(state, "right")).toBe(false);
  });

  it("경계 밖 이동은 불법", () => {
    // 둘레 벽이 없는 레벨에서 플레이어가 가장자리에 있으면 경계 밖.
    const state = parseSokobanLevel(["@ ", "$.", "  "].join("\n"));
    expect(isLegalSokobanMove(state, "up")).toBe(false);
    expect(isLegalSokobanMove(state, "left")).toBe(false);
  });

  it("legalSokobanMoves가 합법 방향만 돌려준다", () => {
    const state = parseSokobanLevel(["#######", "#@$  .#", "#######"].join("\n"));
    expect(legalSokobanMoves(state).sort()).toEqual(["right"]);
  });
});

describe("applySokobanMove", () => {
  it("빈 칸 이동 시 플레이어만 옮기고 입력 상태를 변형하지 않는다", () => {
    const state = parseSokobanLevel(["#######", "#@ $ .#", "#######"].join("\n"));
    const before = snapshot(state);
    const next = applySokobanMove(state, "right");
    expect(next.player).toEqual({ row: 1, col: 2 });
    expect(next.boxes).toEqual(state.boxes);
    // 입력 불변.
    expect(snapshot(state)).toEqual(before);
    expect(next).not.toBe(state);
  });

  it("상자를 한 칸 밀며 함께 이동한다", () => {
    const state = parseSokobanLevel(["#######", "#@$  .#", "#######"].join("\n"));
    const next = applySokobanMove(state, "right");
    expect(next.player).toEqual({ row: 1, col: 2 });
    expect(next.boxes).toEqual(new Set(["1,3"]));
    // 입력 불변.
    expect(state.player).toEqual({ row: 1, col: 1 });
    expect(state.boxes).toEqual(new Set(["1,2"]));
  });

  it("불법 수면 throw 한다", () => {
    const state = parseSokobanLevel(["#####", "#@$#", "#  .#", "#####"].join("\n"));
    expect(() => applySokobanMove(state, "right")).toThrow(/불법/);
  });

  it("상자를 목표까지 밀면 클리어된다", () => {
    let state = parseSokobanLevel(["#######", "#@$  .#", "#######"].join("\n"));
    expect(isSokobanSolved(state)).toBe(false);
    // @$  . → 상자를 목표(col=5)까지 3칸 민다.
    state = applySokobanMove(state, "right"); // box 1,3
    state = applySokobanMove(state, "right"); // box 1,4
    state = applySokobanMove(state, "right"); // box 1,5 (목표)
    expect(state.boxes).toEqual(new Set(["1,5"]));
    expect(isSokobanSolved(state)).toBe(true);
  });
});

describe("isSokobanSolved", () => {
  it("상자가 목표 위에 없으면 false", () => {
    const unsolved = parseSokobanLevel(["#####", "#@$.#", "#####"].join("\n"));
    expect(isSokobanSolved(unsolved)).toBe(false);
  });

  it("상자=목표 1:1로 모두 올라간 경우 true", () => {
    const state = parseSokobanLevel(["####", "#@*#", "####"].join("\n"));
    expect(isSokobanSolved(state)).toBe(true);
  });
});

describe("legalSokobanMoves 완전 탐색 가능성(소규모 풀이)", () => {
  it("0번 레벨은 우측 밀기 시퀀스로 풀린다", () => {
    let state: SokobanState = createSokobanLevel(0);
    const moves: Direction[] = ["right", "right", "right"];
    for (const m of moves) {
      state = applySokobanMove(state, m);
    }
    expect(isSokobanSolved(state)).toBe(true);
  });
});

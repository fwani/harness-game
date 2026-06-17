import { describe, expect, it } from "vitest";
import {
  applySokobanMove,
  createSokobanLevel,
  type SokobanState,
} from "../../domain/sokoban";
import {
  arrowKeyToDirection,
  countRemainingTargets,
  describeSokobanStatus,
  sokobanCellViews,
  sokobanMoveErrorReason,
  SOKOBAN_MOVE_CONTROLS,
} from "./sokobanView";

// 레벨 0: "#####" / "#@$.#" / "#####" — 플레이어(@) 오른쪽으로 한 번 밀면 상자($)가 목표(.)로 가 클리어.
function level0(): SokobanState {
  return createSokobanLevel(0);
}

describe("sokobanCellViews", () => {
  it("보드를 row-major 셀 뷰 격자로 변환한다(좌표계 일치)", () => {
    const views = sokobanCellViews(level0());
    expect(views).toHaveLength(3); // height
    expect(views[0]).toHaveLength(5); // width
  });

  it("각 칸을 기호+라벨+종류로 구분한다(색 비의존)", () => {
    const views = sokobanCellViews(level0());
    // row1: # @ $ . #
    expect(views[1]![0]).toMatchObject({ kind: "wall", symbol: "#" });
    expect(views[1]![1]).toMatchObject({ kind: "player", symbol: "@" });
    expect(views[1]![2]).toMatchObject({ kind: "box", symbol: "□" });
    expect(views[1]![3]).toMatchObject({ kind: "target", symbol: "◎" });
    expect(views[1]![4]).toMatchObject({ kind: "wall", symbol: "#" });
    // aria-label에 좌표가 들어간다.
    expect(views[1]![1]!.ariaLabel).toContain("2행 2열");
  });

  it("상자가 목표 위로 가면 box-on-target, 플레이어가 목표 위면 player-on-target", () => {
    // 오른쪽으로 한 번 밀면 상자가 목표 칸(col3)으로, 플레이어는 col2로 이동.
    const after = applySokobanMove(level0(), "right");
    const views = sokobanCellViews(after);
    expect(views[1]![2]).toMatchObject({ kind: "player", symbol: "@" });
    expect(views[1]![3]).toMatchObject({ kind: "box-on-target", symbol: "■" });
  });
});

describe("countRemainingTargets", () => {
  it("상자가 올라가지 않은 목표 수를 센다", () => {
    expect(countRemainingTargets(level0())).toBe(1);
    const solved = applySokobanMove(level0(), "right");
    expect(countRemainingTargets(solved)).toBe(0);
  });

  it("레벨 1(목표 2개)은 초기에 2를 반환한다", () => {
    expect(countRemainingTargets(createSokobanLevel(1))).toBe(2);
  });
});

describe("describeSokobanStatus", () => {
  it("진행 중에는 남은 목표 수를 안내한다", () => {
    expect(describeSokobanStatus(level0())).toContain("남은 목표 1개");
  });

  it("클리어 시 승리 문구를 반환한다", () => {
    const solved = applySokobanMove(level0(), "right");
    expect(describeSokobanStatus(solved)).toContain("클리어");
  });
});

describe("sokobanMoveErrorReason", () => {
  it("합법 수는 null을 반환한다", () => {
    expect(sokobanMoveErrorReason(level0(), "right")).toBeNull();
  });

  it("벽/경계를 향한 이동은 사유를 반환한다", () => {
    // 위쪽은 벽(row0)이라 불법.
    expect(sokobanMoveErrorReason(level0(), "up")).toContain("벽");
  });

  it("상자 너머가 벽이면 밀 수 없다는 사유를 반환한다", () => {
    // 레벨 1: "#.$@$.#" — 플레이어 왼쪽 상자를 왼쪽으로 밀면 너머가 목표 바닥이라 합법.
    // 대신 상자 너머가 벽이 되도록 한 칸 민 뒤 다시 같은 방향을 시도한다.
    const lvl1 = createSokobanLevel(1);
    const afterLeft = applySokobanMove(lvl1, "left"); // 왼쪽 상자를 목표(.)로 밂
    // 이제 플레이어 왼쪽 칸은 상자, 그 너머는 벽(#) → 왼쪽 이동 불법.
    const reason = sokobanMoveErrorReason(afterLeft, "left");
    expect(reason).toContain("밀 수 없");
  });
});

describe("arrowKeyToDirection", () => {
  it("화살표 키를 방향으로 매핑한다", () => {
    expect(arrowKeyToDirection("ArrowUp")).toBe("up");
    expect(arrowKeyToDirection("ArrowDown")).toBe("down");
    expect(arrowKeyToDirection("ArrowLeft")).toBe("left");
    expect(arrowKeyToDirection("ArrowRight")).toBe("right");
  });

  it("그 외 키는 null을 반환한다", () => {
    expect(arrowKeyToDirection("Enter")).toBeNull();
    expect(arrowKeyToDirection("a")).toBeNull();
  });
});

describe("SOKOBAN_MOVE_CONTROLS", () => {
  it("상/하/좌/우 네 방향을 모두 노출한다", () => {
    const dirs = SOKOBAN_MOVE_CONTROLS.map((c) => c.dir);
    expect(dirs).toEqual(expect.arrayContaining(["up", "down", "left", "right"]));
    expect(dirs).toHaveLength(4);
  });
});

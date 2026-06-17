import { describe, expect, it } from "vitest";
import { createHanoi, applyHanoiMove } from "../../domain/hanoi";
import {
  describeHanoiStatus,
  hanoiMoveCountLabel,
  hanoiMoveErrorReason,
  hanoiSelectionPrompt,
  pegAriaLabel,
  pegDiskViews,
  topDiskSize,
  HANOI_DEFAULT_DISKS,
  HANOI_DISK_OPTIONS,
} from "./hanoiView";

describe("pegDiskViews", () => {
  it("위에서 아래 순서(맨 위 디스크 먼저)로 변환하고 맨 위만 isTop", () => {
    // 도메인은 바닥→위 순서: [3,2,1] (바닥=3, 위=1).
    const views = pegDiskViews([3, 2, 1], 3);
    expect(views.map((v) => v.size)).toEqual([1, 2, 3]); // 위→아래
    expect(views[0]!.isTop).toBe(true); // 맨 위(크기 1)
    expect(views[1]!.isTop).toBe(false);
    expect(views[2]!.isTop).toBe(false);
  });

  it("폭 백분율은 크기에 비례(가장 큰 디스크가 100%)", () => {
    const views = pegDiskViews([4, 3, 2, 1], 4);
    const bySize = new Map(views.map((v) => [v.size, v.widthPercent]));
    expect(bySize.get(4)).toBe(100);
    expect(bySize.get(2)).toBe(50);
    expect(bySize.get(1)).toBe(25);
  });

  it("라벨은 크기 숫자 문자열", () => {
    const views = pegDiskViews([2, 1], 2);
    expect(views.map((v) => v.label)).toEqual(["1", "2"]);
  });

  it("빈 기둥은 빈 배열", () => {
    expect(pegDiskViews([], 3)).toEqual([]);
  });

  it("입력 배열을 변형하지 않는다", () => {
    const disks = [3, 2, 1];
    pegDiskViews(disks, 3);
    expect(disks).toEqual([3, 2, 1]);
  });

  it("diskCount가 1 미만이면 throw", () => {
    expect(() => pegDiskViews([1], 0)).toThrow();
  });
});

describe("topDiskSize", () => {
  it("맨 위 디스크 크기를 돌려준다", () => {
    expect(topDiskSize([3, 2, 1])).toBe(1);
  });
  it("빈 기둥은 null", () => {
    expect(topDiskSize([])).toBeNull();
  });
});

describe("pegAriaLabel", () => {
  it("빈 기둥", () => {
    expect(pegAriaLabel(1, [])).toBe("기둥 2, 비어 있음");
  });
  it("디스크를 위에서부터 나열", () => {
    expect(pegAriaLabel(0, [3, 2, 1])).toBe("기둥 1, 디스크 3개, 위에서부터 1, 2, 3");
  });
  it("선택된 기둥은 안내를 덧붙인다", () => {
    expect(pegAriaLabel(0, [3, 2, 1], true)).toBe(
      "기둥 1, 디스크 3개, 위에서부터 1, 2, 3 (선택됨, 옮길 기둥을 고르세요)",
    );
  });
});

describe("describeHanoiStatus", () => {
  it("승리/진행 중을 구분", () => {
    expect(describeHanoiStatus(true).kind).toBe("won");
    expect(describeHanoiStatus(false).kind).toBe("playing");
    expect(describeHanoiStatus(true).message).toContain("클리어");
  });
});

describe("hanoiMoveCountLabel", () => {
  it("이동 수와 최소 수를 함께 표시", () => {
    expect(hanoiMoveCountLabel(0, 7)).toBe("이동 0회 · 최소 7회");
    expect(hanoiMoveCountLabel(5, 7)).toBe("이동 5회 · 최소 7회");
  });
});

describe("hanoiSelectionPrompt", () => {
  it("승리 시 안내", () => {
    expect(hanoiSelectionPrompt(0, true)).toContain("클리어");
  });
  it("출발 기둥 미선택", () => {
    expect(hanoiSelectionPrompt(null, false)).toContain("출발 기둥");
  });
  it("출발 기둥 선택됨", () => {
    expect(hanoiSelectionPrompt(0, false)).toContain("도착 기둥");
    expect(hanoiSelectionPrompt(0, false)).toContain("기둥 1");
  });
});

describe("hanoiMoveErrorReason", () => {
  const state = createHanoi(3); // pegs[0]=[3,2,1]

  it("합법 수는 null", () => {
    expect(hanoiMoveErrorReason(state, 0, 2)).toBeNull();
  });

  it("같은 기둥", () => {
    expect(hanoiMoveErrorReason(state, 0, 0)).toContain("같은 기둥");
  });

  it("빈 기둥에서 꺼내기", () => {
    expect(hanoiMoveErrorReason(state, 1, 2)).toContain("비어");
  });

  it("작은 디스크 위에 큰 디스크", () => {
    // 1을 0→2로 옮긴 뒤, 2를 0→2로 옮기려 하면 불법(1 위에 2 불가).
    const moved = applyHanoiMove(state, { from: 0, to: 2 });
    expect(hanoiMoveErrorReason(moved, 0, 2)).toContain("작은 디스크 위");
  });

  it("범위 밖 인덱스도 불법 사유를 돌려준다", () => {
    expect(hanoiMoveErrorReason(state, 0, 5)).not.toBeNull();
  });
});

describe("상수", () => {
  it("기본 디스크 수는 옵션에 포함", () => {
    expect(HANOI_DISK_OPTIONS).toContain(HANOI_DEFAULT_DISKS);
  });
});

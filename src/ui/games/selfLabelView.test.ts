import { describe, it, expect } from "vitest";
import { selfDisplayLabel, withSelfDisplayName } from "./selfLabelView";
import { SELF_PLAYER } from "./streakView";

describe("selfDisplayLabel", () => {
  it("self 키는 게스트 표시 이름으로 매핑한다", () => {
    expect(selfDisplayLabel(SELF_PLAYER, "용감한 너구리 37")).toBe(
      "용감한 너구리 37",
    );
  });

  it("self가 아닌 라벨은 그대로 보존한다(상대·CPU 등)", () => {
    expect(selfDisplayLabel("CPU", "용감한 너구리 37")).toBe("CPU");
    expect(selfDisplayLabel("상대", "여우 1")).toBe("상대");
    // 표시 이름과 같은 글자라도 self 키가 아니면 매핑하지 않는다.
    expect(selfDisplayLabel("여우 1", "여우 1")).toBe("여우 1");
  });

  it("표시 이름이 비었거나 공백뿐이면 SELF_PLAYER로 폴백한다", () => {
    expect(selfDisplayLabel(SELF_PLAYER, "")).toBe(SELF_PLAYER);
    expect(selfDisplayLabel(SELF_PLAYER, "   ")).toBe(SELF_PLAYER);
  });

  it("이름이 바뀌면 바뀐 이름을 반영한다(표시 전용·결정적)", () => {
    expect(selfDisplayLabel(SELF_PLAYER, "여우 1")).toBe("여우 1");
    expect(selfDisplayLabel(SELF_PLAYER, "여우 2")).toBe("여우 2");
  });

  it("정상 표시 이름은 변형하지 않고 그대로 반환한다(폴백 아님)", () => {
    expect(selfDisplayLabel(SELF_PLAYER, "  나의 이름  ")).toBe("  나의 이름  ");
  });
});

describe("withSelfDisplayName", () => {
  it("제목의 (나) 토큰을 게스트 표시 이름으로 치환한다", () => {
    expect(withSelfDisplayName("내 전적 (나)", "여우 1")).toBe("내 전적 (여우 1)");
    expect(withSelfDisplayName("윷놀이 통산 전적 (나)", "곰 9")).toBe(
      "윷놀이 통산 전적 (곰 9)",
    );
  });

  it("표시 이름이 비면 (나)를 유지한다(폴백)", () => {
    expect(withSelfDisplayName("내 전적 (나)", "  ")).toBe("내 전적 (나)");
  });

  it("self 토큰이 없으면 원본을 그대로 둔다", () => {
    expect(withSelfDisplayName("매치 전적", "여우 1")).toBe("매치 전적");
  });

  it("이름이 바뀌면 제목 표시도 갱신된다", () => {
    expect(withSelfDisplayName("내 전적 (나)", "여우 1")).toBe("내 전적 (여우 1)");
    expect(withSelfDisplayName("내 전적 (나)", "여우 2")).toBe("내 전적 (여우 2)");
  });
});

import { describe, it, expect } from "vitest";
import type { MemoryCard } from "../../domain/memoryMatch";
import {
  MEMORY_SYMBOLS,
  memoryCardLabel,
  memoryCardView,
  memoryProgressLabel,
  describeMemoryStatus,
} from "./memoryMatchView";

const card = (value: number, status: MemoryCard["status"]): MemoryCard => ({ value, status });

describe("memoryCardLabel", () => {
  it("팔레트 안 값은 고유 기호로, 밖 값은 #N(1-기반)으로 구분한다", () => {
    expect(memoryCardLabel(0)).toBe(MEMORY_SYMBOLS[0]);
    expect(memoryCardLabel(3)).toBe(MEMORY_SYMBOLS[3]);
    // 같은 값은 같은 기호(짝 식별), 다른 값은 다른 기호.
    expect(memoryCardLabel(1)).not.toBe(memoryCardLabel(2));
    // 팔레트를 벗어나면 숫자 텍스트로 안전 대체(색 비의존 유지).
    expect(memoryCardLabel(MEMORY_SYMBOLS.length)).toBe(`#${MEMORY_SYMBOLS.length + 1}`);
  });
});

describe("memoryCardView", () => {
  it("덮인 카드는 값을 숨기고 선택 가능하다", () => {
    const v = memoryCardView(card(2, "down"), 0);
    expect(v.status).toBe("down");
    expect(v.content).toBe("");
    expect(v.selectable).toBe(true);
    expect(v.ariaLabel).toContain("덮인");
  });

  it("뒤집힌 카드는 값을 노출하고 판정 대기라 선택 불가다", () => {
    const v = memoryCardView(card(2, "up"), 1);
    expect(v.status).toBe("up");
    expect(v.content).toBe(memoryCardLabel(2));
    expect(v.selectable).toBe(false);
    expect(v.ariaLabel).toContain("뒤집힌");
    expect(v.ariaLabel).toContain("2번 카드");
  });

  it("짝 완성 카드는 값을 노출하고 선택 불가다", () => {
    const v = memoryCardView(card(5, "matched"), 4);
    expect(v.status).toBe("matched");
    expect(v.content).toBe(memoryCardLabel(5));
    expect(v.selectable).toBe(false);
    expect(v.ariaLabel).toContain("짝 완성");
  });
});

describe("memoryProgressLabel", () => {
  it("시도 수·완성한 짝·남은 짝을 함께 표시한다", () => {
    const label = memoryProgressLabel(3, 2, 8);
    expect(label).toContain("시도 3회");
    expect(label).toContain("완성한 짝 2/8");
    expect(label).toContain("남은 짝 6");
  });

  it("pairCount가 양의 정수가 아니면 throw 한다", () => {
    expect(() => memoryProgressLabel(0, 0, 0)).toThrow();
    expect(() => memoryProgressLabel(0, 0, -1)).toThrow();
    expect(() => memoryProgressLabel(0, 0, 1.5)).toThrow();
  });
});

describe("describeMemoryStatus", () => {
  it("클리어와 진행 중을 구분되는 한국어 메시지로 만든다", () => {
    const clear = describeMemoryStatus(true, 12, 8);
    expect(clear.kind).toBe("clear");
    expect(clear.message).toContain("클리어");
    expect(clear.message).toContain("12회");

    const playing = describeMemoryStatus(false, 0, 8);
    expect(playing.kind).toBe("playing");
    expect(playing.message).toContain("짝");
  });
});

import { describe, expect, it } from "vitest";
import { createFloodIt } from "../../domain/floodIt";
import type { RandomSource } from "../../application/dealCards";
import {
  MAX_FLOOD_COLORS,
  colorHex,
  colorLabel,
  floodItMoveLimit,
  floodItStatus,
  startScrambledFloodIt,
} from "./floodItView";

describe("colorLabel / colorHex", () => {
  it("모든 지원 색이 서로 다른 기호·문자·색을 가진다(색 비의존)", () => {
    const symbols = new Set<string>();
    const texts = new Set<string>();
    const hexes = new Set<string>();
    for (let c = 0; c < MAX_FLOOD_COLORS; c += 1) {
      const { symbol, text } = colorLabel(c);
      symbols.add(symbol);
      texts.add(text);
      hexes.add(colorHex(c));
    }
    expect(symbols.size).toBe(MAX_FLOOD_COLORS);
    expect(texts.size).toBe(MAX_FLOOD_COLORS);
    expect(hexes.size).toBe(MAX_FLOOD_COLORS);
  });

  it("문자 라벨은 A부터 시작한다", () => {
    expect(colorLabel(0).text).toBe("A");
    expect(colorLabel(1).text).toBe("B");
  });

  it("범위 밖 색이면 throw", () => {
    expect(() => colorLabel(-1)).toThrow();
    expect(() => colorLabel(MAX_FLOOD_COLORS)).toThrow();
    expect(() => colorHex(MAX_FLOOD_COLORS)).toThrow();
  });
});

describe("floodItMoveLimit", () => {
  it("size * 2 + colorCount", () => {
    expect(floodItMoveLimit(6, 5)).toBe(17);
    expect(floodItMoveLimit(8, 6)).toBe(22);
  });

  it("잘못된 인자면 throw", () => {
    expect(() => floodItMoveLimit(0, 5)).toThrow();
    expect(() => floodItMoveLimit(6, 0)).toThrow();
    expect(() => floodItMoveLimit(6.5, 5)).toThrow();
  });
});

describe("floodItStatus", () => {
  // 단색 보드(이미 클리어).
  const solvedBoard = createFloodIt(
    [
      [0, 0],
      [0, 0],
    ],
    2,
  );
  // 미클리어 보드.
  const unsolvedBoard = createFloodIt(
    [
      [0, 1],
      [1, 0],
    ],
    2,
  );

  it("단색이면 solved", () => {
    const status = floodItStatus(solvedBoard, 3, 10);
    expect(status.solved).toBe(true);
    expect(status.failed).toBe(false);
    expect(status.message).toContain("클리어");
    expect(status.message).toContain("3");
  });

  it("미클리어 + 턴 소진이면 failed", () => {
    const status = floodItStatus(unsolvedBoard, 10, 10);
    expect(status.solved).toBe(false);
    expect(status.failed).toBe(true);
    expect(status.message).toContain("모두");
  });

  it("미클리어 + 턴 남음이면 진행중", () => {
    const status = floodItStatus(unsolvedBoard, 4, 10);
    expect(status.solved).toBe(false);
    expect(status.failed).toBe(false);
    expect(status.message).toContain("진행 중");
    expect(status.message).toContain("6수 남음");
  });

  it("이미 클리어면 턴을 다 써도 failed가 아니다", () => {
    const status = floodItStatus(solvedBoard, 10, 10);
    expect(status.solved).toBe(true);
    expect(status.failed).toBe(false);
  });
});

describe("startScrambledFloodIt", () => {
  // 고정 시퀀스를 도는 결정적 RandomSource(테스트용).
  function seqRandom(seq: number[]): RandomSource {
    let i = 0;
    return {
      nextInt: (max: number) => {
        const v = seq[i % seq.length]! % max;
        i += 1;
        return v;
      },
    };
  }

  it("application createScrambledFloodIt에 위임해 요청한 크기·색의 보드를 만든다", () => {
    const state = startScrambledFloodIt(seqRandom([0, 1, 2, 3]), {
      size: 3,
      colorCount: 4,
    });
    expect(state.size).toBe(3);
    expect(state.colorCount).toBe(4);
    expect(state.board.length).toBe(3);
    expect(state.board[0]!.length).toBe(3);
  });
});

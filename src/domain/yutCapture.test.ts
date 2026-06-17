import { describe, it, expect } from "vitest";
import { resolveYutCapture } from "./yutCapture";

describe("resolveYutCapture", () => {
  it("같은 칸 상대 말 1개 → 해당 인덱스 1개, extraThrow true", () => {
    expect(resolveYutCapture(7, [3, 7, 12])).toEqual({
      capturedIndices: [1],
      extraThrow: true,
    });
  });

  it("같은 칸 상대 말 여러 개 → 인덱스 모두 반환(오름차순), extraThrow true", () => {
    expect(resolveYutCapture(10, [10, 5, 10, 10])).toEqual({
      capturedIndices: [0, 2, 3],
      extraThrow: true,
    });
  });

  it("같은 칸 상대 없음 → 빈 배열, extraThrow false", () => {
    expect(resolveYutCapture(8, [1, 5, 12, 19])).toEqual({
      capturedIndices: [],
      extraThrow: false,
    });
  });

  it("moverTraveled === 0(출발점)이면 같은 칸이어도 잡지 않음", () => {
    expect(resolveYutCapture(0, [0, 0, 5])).toEqual({
      capturedIndices: [],
      extraThrow: false,
    });
  });

  it("moverTraveled === 20(완주)이면 같은 칸이어도 잡지 않음", () => {
    expect(resolveYutCapture(20, [20, 20])).toEqual({
      capturedIndices: [],
      extraThrow: false,
    });
  });

  it("opponentTraveled 빈 배열 경계", () => {
    expect(resolveYutCapture(7, [])).toEqual({
      capturedIndices: [],
      extraThrow: false,
    });
  });

  it("moverTraveled 범위 밖/비정수 → throw", () => {
    expect(() => resolveYutCapture(-1, [5])).toThrow();
    expect(() => resolveYutCapture(21, [5])).toThrow();
    expect(() => resolveYutCapture(7.5, [5])).toThrow();
    expect(() => resolveYutCapture(NaN, [5])).toThrow();
  });

  it("opponentTraveled 원소 범위 밖/비정수 → throw", () => {
    expect(() => resolveYutCapture(7, [5, -1])).toThrow();
    expect(() => resolveYutCapture(7, [5, 21])).toThrow();
    expect(() => resolveYutCapture(7, [5, 3.5])).toThrow();
    expect(() => resolveYutCapture(7, [5, NaN])).toThrow();
  });

  it("입력 배열/값을 변형하지 않는다(순수 함수)", () => {
    const mover = 10;
    const opponents = [10, 5, 10];
    const result = resolveYutCapture(mover, opponents);
    expect(mover).toBe(10);
    expect(opponents).toEqual([10, 5, 10]);
    expect(result.capturedIndices).not.toBe(opponents);
  });
});

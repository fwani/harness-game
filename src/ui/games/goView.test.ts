import { describe, it, expect } from "vitest";
import { goErrorMessage } from "./goView";

describe("goErrorMessage", () => {
  it("자살수 예외를 한국어 사유로 매핑(영어/함수 이름 노출 금지)", () => {
    const msg = goErrorMessage(
      new Error("placeStone: suicide move is not allowed"),
    );
    expect(msg).toBe("그 자리는 둘 수 없습니다(자살수).");
    expect(msg).not.toMatch(/placeStone|suicide|allowed/i);
  });

  it("범위 밖 예외를 한국어 사유로 매핑", () => {
    const msg = goErrorMessage(
      new Error("placeStone: coordinate out of bounds"),
    );
    expect(msg).toBe("그 자리는 바둑판 밖이라 둘 수 없습니다.");
    expect(msg).not.toMatch(/placeStone|bounds/i);
  });

  it("이미 점유된 칸 예외를 한국어 사유로 매핑", () => {
    const msg = goErrorMessage(new Error("placeStone: cell already occupied"));
    expect(msg).toBe("그 자리에는 이미 돌이 있습니다.");
    expect(msg).not.toMatch(/placeStone|occupied/i);
  });

  it("종료된 대국 예외를 한국어 사유로 매핑", () => {
    const msg = goErrorMessage(new Error("applyMove: game already finished"));
    expect(msg).toBe("이미 끝난 대국입니다. 새 게임을 시작하세요.");
    expect(msg).not.toMatch(/applyMove|finished/i);
  });

  it("알 수 없는 예외는 일반 한국어 폴백", () => {
    const msg = goErrorMessage(new Error("something unexpected"));
    expect(msg).toBe("그 자리에는 둘 수 없습니다.");
    expect(msg).not.toMatch(/something|unexpected/i);
  });

  it("Error가 아닌 값(문자열 등)도 폴백으로 안전 처리", () => {
    expect(goErrorMessage("boom")).toBe("그 자리에는 둘 수 없습니다.");
    expect(goErrorMessage(null)).toBe("그 자리에는 둘 수 없습니다.");
  });
});

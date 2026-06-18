import { describe, it, expect } from "vitest";
import { recordsPersistenceHint } from "./recordsHintView";

describe("recordsPersistenceHint", () => {
  it("영속(localStorage) 환경에서는 '새로고침 후에도 유지'를 안내한다", () => {
    const hint = recordsPersistenceHint(true);
    expect(hint).toContain("유지");
    expect(hint).toContain("이 브라우저에만 저장");
    // 회귀 방지(QA #230): 영속인데 '초기화'라고 잘못 안내하면 안 된다.
    expect(hint).not.toContain("초기화");
  });

  it("인메모리 폴백 환경에서는 '새로고침 시 초기화'를 안내한다", () => {
    const hint = recordsPersistenceHint(false);
    expect(hint).toContain("초기화");
    expect(hint).not.toContain("유지");
  });
});

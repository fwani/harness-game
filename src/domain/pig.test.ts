import { describe, expect, it } from "vitest";
import {
  applyPigHold,
  applyPigRoll,
  createPigGame,
  findPigWinner,
  isPigOver,
  type PigState,
} from "./pig";

describe("createPigGame", () => {
  it("기본 target=100, 선공 a, 누계/총점 0, winner null", () => {
    expect(createPigGame()).toEqual({
      scores: { a: 0, b: 0 },
      turn: "a",
      turnTotal: 0,
      target: 100,
      winner: null,
    });
  });

  it("사용자 지정 target을 그대로 둔다", () => {
    expect(createPigGame(50).target).toBe(50);
  });

  it("호출마다 독립 객체를 반환한다", () => {
    const a = createPigGame();
    const b = createPigGame();
    expect(a).not.toBe(b);
    expect(a.scores).not.toBe(b.scores);
  });

  it("target이 양의 정수가 아니면 throw", () => {
    expect(() => createPigGame(0)).toThrow();
    expect(() => createPigGame(-5)).toThrow();
    expect(() => createPigGame(1.5)).toThrow();
    expect(() => createPigGame(Number.NaN)).toThrow();
  });
});

describe("applyPigRoll", () => {
  it("1이 아닌 눈은 turnTotal에 더하고 차례를 유지한다", () => {
    const s = createPigGame();
    const next = applyPigRoll(s, 4);
    expect(next.turnTotal).toBe(4);
    expect(next.turn).toBe("a");
    expect(next.scores).toEqual({ a: 0, b: 0 });
    expect(next.winner).toBeNull();
  });

  it("연속 굴림으로 누계가 합산된다", () => {
    let s = createPigGame();
    s = applyPigRoll(s, 3);
    s = applyPigRoll(s, 6);
    s = applyPigRoll(s, 2);
    expect(s.turnTotal).toBe(11);
    expect(s.turn).toBe("a");
  });

  it("1이 나오면 누계가 소멸하고 차례가 상대로 넘어간다(버스트)", () => {
    let s = createPigGame();
    s = applyPigRoll(s, 5);
    s = applyPigRoll(s, 1);
    expect(s.turnTotal).toBe(0);
    expect(s.turn).toBe("b");
    expect(s.scores).toEqual({ a: 0, b: 0 });
  });

  it("버스트 시에는 확정 총점이 변하지 않는다", () => {
    let s = createPigGame();
    s = applyPigHold({ ...s, turnTotal: 20 }); // a 총점 20, 차례 b
    s = applyPigRoll(s, 3); // b 누계 3
    s = applyPigRoll(s, 1); // b 버스트
    expect(s.scores).toEqual({ a: 20, b: 0 });
    expect(s.turn).toBe("a");
  });

  it("die가 1~6 정수가 아니면 throw", () => {
    const s = createPigGame();
    expect(() => applyPigRoll(s, 0)).toThrow();
    expect(() => applyPigRoll(s, 7)).toThrow();
    expect(() => applyPigRoll(s, 2.5)).toThrow();
    expect(() => applyPigRoll(s, Number.NaN)).toThrow();
  });

  it("이미 종료된 state에 호출하면 throw", () => {
    const over: PigState = {
      scores: { a: 100, b: 0 },
      turn: "a",
      turnTotal: 0,
      target: 100,
      winner: "a",
    };
    expect(() => applyPigRoll(over, 3)).toThrow();
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const s = createPigGame();
    const snapshot = JSON.parse(JSON.stringify(s));
    applyPigRoll(s, 4);
    applyPigRoll(s, 1);
    expect(s).toEqual(snapshot);
  });
});

describe("applyPigHold", () => {
  it("멈추면 turnTotal이 총점에 반영되고 차례가 넘어간다", () => {
    let s = createPigGame();
    s = applyPigRoll(s, 6);
    s = applyPigRoll(s, 4);
    s = applyPigHold(s);
    expect(s.scores).toEqual({ a: 10, b: 0 });
    expect(s.turn).toBe("b");
    expect(s.turnTotal).toBe(0);
    expect(s.winner).toBeNull();
  });

  it("목표 도달 시 그 플레이어가 승리하고 종료한다", () => {
    const s: PigState = {
      scores: { a: 95, b: 0 },
      turn: "a",
      turnTotal: 5,
      target: 100,
      winner: null,
    };
    const next = applyPigHold(s);
    expect(next.scores.a).toBe(100);
    expect(next.winner).toBe("a");
    expect(next.turn).toBe("a"); // 승리 시 차례 유지
    expect(isPigOver(next)).toBe(true);
  });

  it("목표 초과해도 승리한다", () => {
    const s: PigState = {
      scores: { a: 98, b: 0 },
      turn: "a",
      turnTotal: 5,
      target: 100,
      winner: null,
    };
    const next = applyPigHold(s);
    expect(next.scores.a).toBe(103);
    expect(next.winner).toBe("a");
  });

  it("b 차례에 멈추면 b 총점에 반영된다", () => {
    const s: PigState = {
      scores: { a: 30, b: 40 },
      turn: "b",
      turnTotal: 12,
      target: 100,
      winner: null,
    };
    const next = applyPigHold(s);
    expect(next.scores).toEqual({ a: 30, b: 52 });
    expect(next.turn).toBe("a");
  });

  it("이미 종료된 state에 호출하면 throw", () => {
    const over: PigState = {
      scores: { a: 100, b: 0 },
      turn: "a",
      turnTotal: 0,
      target: 100,
      winner: "a",
    };
    expect(() => applyPigHold(over)).toThrow();
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const s: PigState = {
      scores: { a: 10, b: 20 },
      turn: "a",
      turnTotal: 5,
      target: 100,
      winner: null,
    };
    const snapshot = JSON.parse(JSON.stringify(s));
    applyPigHold(s);
    expect(s).toEqual(snapshot);
  });
});

describe("isPigOver / findPigWinner", () => {
  it("진행 중이면 over=false, winner=null", () => {
    const s = createPigGame();
    expect(isPigOver(s)).toBe(false);
    expect(findPigWinner(s)).toBeNull();
  });

  it("winner가 설정되면 over=true, 그 값을 반환", () => {
    const s: PigState = {
      scores: { a: 100, b: 30 },
      turn: "a",
      turnTotal: 0,
      target: 100,
      winner: "a",
    };
    expect(isPigOver(s)).toBe(true);
    expect(findPigWinner(s)).toBe("a");
  });

  it("winner 미설정이라도 총점이 target 이상이면 그 플레이어를 찾는다", () => {
    const s: PigState = {
      scores: { a: 40, b: 105 },
      turn: "a",
      turnTotal: 0,
      target: 100,
      winner: null,
    };
    expect(findPigWinner(s)).toBe("b");
  });

  it("findPigWinner는 입력을 변형하지 않는다", () => {
    const s = createPigGame();
    const snapshot = JSON.parse(JSON.stringify(s));
    findPigWinner(s);
    expect(s).toEqual(snapshot);
  });
});

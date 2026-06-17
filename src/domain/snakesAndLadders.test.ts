import { describe, expect, it } from "vitest";
import {
  applyDiceMove,
  createSnakesAndLaddersGame,
  findSnakesAndLaddersWinner,
  isSnakesAndLaddersOver,
  resolveSnakesAndLaddersCell,
  type SnakesAndLaddersState,
} from "./snakesAndLadders";

describe("createSnakesAndLaddersGame", () => {
  it("기본값: size=100, positions {a:0,b:0}, turn a, winner null", () => {
    const s = createSnakesAndLaddersGame();
    expect(s.size).toBe(100);
    expect(s.positions).toEqual({ a: 0, b: 0 });
    expect(s.turn).toBe("a");
    expect(s.winner).toBeNull();
  });

  it("기본 링크 세트가 비어있지 않고 사다리·뱀을 모두 포함한다", () => {
    const { links } = createSnakesAndLaddersGame();
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((l) => l.to > l.from)).toBe(true); // 사다리
    expect(links.some((l) => l.to < l.from)).toBe(true); // 뱀
  });

  it("호출마다 독립 객체를 반환한다", () => {
    const a = createSnakesAndLaddersGame();
    const b = createSnakesAndLaddersGame();
    expect(a).not.toBe(b);
    expect(a.positions).not.toBe(b.positions);
    expect(a.links).not.toBe(b.links);
  });

  it("사용자 지정 size/links를 사용한다", () => {
    const s = createSnakesAndLaddersGame({
      size: 25,
      links: [{ from: 5, to: 15 }],
    });
    expect(s.size).toBe(25);
    expect(s.links).toEqual([{ from: 5, to: 15 }]);
  });

  it("입력 links 배열/요소를 복사해 공유하지 않는다", () => {
    const links = [{ from: 5, to: 15 }];
    const s = createSnakesAndLaddersGame({ size: 25, links });
    expect(s.links).not.toBe(links);
    expect(s.links[0]).not.toBe(links[0]);
  });

  it("size가 2 미만이거나 정수가 아니면 throw", () => {
    expect(() => createSnakesAndLaddersGame({ size: 1 })).toThrow();
    expect(() => createSnakesAndLaddersGame({ size: 0 })).toThrow();
    expect(() => createSnakesAndLaddersGame({ size: -10 })).toThrow();
    expect(() => createSnakesAndLaddersGame({ size: 10.5 })).toThrow();
    expect(() => createSnakesAndLaddersGame({ size: Number.NaN })).toThrow();
  });

  it("링크 from/to가 범위 밖이면 throw", () => {
    expect(() =>
      createSnakesAndLaddersGame({ size: 25, links: [{ from: 0, to: 10 }] }),
    ).toThrow();
    expect(() =>
      createSnakesAndLaddersGame({ size: 25, links: [{ from: 5, to: 26 }] }),
    ).toThrow();
    expect(() =>
      createSnakesAndLaddersGame({ size: 25, links: [{ from: 5, to: 0 }] }),
    ).toThrow();
  });

  it("from==to인 링크면 throw", () => {
    expect(() =>
      createSnakesAndLaddersGame({ size: 25, links: [{ from: 5, to: 5 }] }),
    ).toThrow();
  });

  it("출발칸(1)이나 골(size)에서 시작하는 링크면 throw", () => {
    expect(() =>
      createSnakesAndLaddersGame({ size: 25, links: [{ from: 1, to: 10 }] }),
    ).toThrow();
    expect(() =>
      createSnakesAndLaddersGame({ size: 25, links: [{ from: 25, to: 10 }] }),
    ).toThrow();
  });

  it("from이 중복되면 throw", () => {
    expect(() =>
      createSnakesAndLaddersGame({
        size: 25,
        links: [
          { from: 5, to: 15 },
          { from: 5, to: 20 },
        ],
      }),
    ).toThrow();
  });

  it("기본 링크 세트 자체가 모든 검증 규칙을 만족한다", () => {
    const { links, size } = createSnakesAndLaddersGame();
    const froms = new Set<number>();
    for (const { from, to } of links) {
      expect(from).toBeGreaterThanOrEqual(1);
      expect(from).toBeLessThanOrEqual(size);
      expect(to).toBeGreaterThanOrEqual(1);
      expect(to).toBeLessThanOrEqual(size);
      expect(from).not.toBe(to);
      expect(from).not.toBe(1);
      expect(from).not.toBe(size);
      expect(froms.has(from)).toBe(false);
      froms.add(from);
    }
  });
});

describe("resolveSnakesAndLaddersCell", () => {
  const state = createSnakesAndLaddersGame({
    size: 30,
    links: [
      { from: 5, to: 22 }, // 사다리
      { from: 27, to: 3 }, // 뱀
    ],
  });

  it("사다리 바닥에 닿으면 위로 오른다", () => {
    expect(resolveSnakesAndLaddersCell(state, 5)).toBe(22);
  });

  it("뱀 머리에 닿으면 아래로 미끄러진다", () => {
    expect(resolveSnakesAndLaddersCell(state, 27)).toBe(3);
  });

  it("링크 없는 칸은 그대로 반환한다", () => {
    expect(resolveSnakesAndLaddersCell(state, 10)).toBe(10);
  });
});

describe("applyDiceMove", () => {
  it("일반 전진 후 턴이 상대로 전환된다", () => {
    const s = createSnakesAndLaddersGame({ size: 30, links: [] });
    const next = applyDiceMove(s, 3);
    expect(next.positions).toEqual({ a: 3, b: 0 });
    expect(next.turn).toBe("b");
    expect(next.winner).toBeNull();
  });

  it("사다리 바닥에 닿으면 위로 올라 안착한다", () => {
    const s = createSnakesAndLaddersGame({
      size: 30,
      links: [{ from: 4, to: 20 }],
    });
    const next = applyDiceMove(s, 4);
    expect(next.positions.a).toBe(20);
    expect(next.turn).toBe("b");
  });

  it("뱀 머리에 닿으면 아래로 미끄러져 안착한다", () => {
    const s = createSnakesAndLaddersGame({
      size: 30,
      links: [{ from: 6, to: 2 }],
    });
    const next = applyDiceMove(s, 6);
    expect(next.positions.a).toBe(2);
    expect(next.turn).toBe("b");
  });

  it("size 초과 시 제자리에 머물고 턴만 전환된다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 28, b: 0 },
      turn: "a",
      winner: null,
    };
    const next = applyDiceMove(s, 5); // 28+5=33 > 30
    expect(next.positions.a).toBe(28);
    expect(next.turn).toBe("b");
    expect(next.winner).toBeNull();
  });

  it("정확히 size 도달 시 승리하고 턴은 전환되지 않는다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 27, b: 0 },
      turn: "a",
      winner: null,
    };
    const next = applyDiceMove(s, 3); // 27+3=30
    expect(next.positions.a).toBe(30);
    expect(next.winner).toBe("a");
    expect(next.turn).toBe("a");
    expect(isSnakesAndLaddersOver(next)).toBe(true);
  });

  it("사다리로 우연히 골에 도달해도 승리로 인정한다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [{ from: 25, to: 30 }],
      positions: { a: 20, b: 0 },
      turn: "a",
      winner: null,
    };
    const next = applyDiceMove(s, 5); // 25 → 사다리 → 30
    expect(next.positions.a).toBe(30);
    expect(next.winner).toBe("a");
    expect(next.turn).toBe("a");
  });

  it("b 차례에 이동하면 b 위치가 갱신된다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 10, b: 5 },
      turn: "b",
      winner: null,
    };
    const next = applyDiceMove(s, 4);
    expect(next.positions).toEqual({ a: 10, b: 9 });
    expect(next.turn).toBe("a");
  });

  it("steps가 1~6 정수가 아니면 throw", () => {
    const s = createSnakesAndLaddersGame({ size: 30, links: [] });
    expect(() => applyDiceMove(s, 0)).toThrow();
    expect(() => applyDiceMove(s, 7)).toThrow();
    expect(() => applyDiceMove(s, 2.5)).toThrow();
    expect(() => applyDiceMove(s, Number.NaN)).toThrow();
  });

  it("이미 종료된 state에 호출하면 throw", () => {
    const over: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 30, b: 0 },
      turn: "a",
      winner: "a",
    };
    expect(() => applyDiceMove(over, 3)).toThrow();
  });

  it("입력 state를 변형하지 않는다(불변)", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [{ from: 4, to: 20 }],
      positions: { a: 0, b: 0 },
      turn: "a",
      winner: null,
    };
    const snapshot = JSON.parse(JSON.stringify(s));
    applyDiceMove(s, 4);
    applyDiceMove(s, 6);
    expect(s).toEqual(snapshot);
  });
});

describe("findSnakesAndLaddersWinner / isSnakesAndLaddersOver", () => {
  it("진행 중이면 winner null, over false", () => {
    const s = createSnakesAndLaddersGame();
    expect(findSnakesAndLaddersWinner(s)).toBeNull();
    expect(isSnakesAndLaddersOver(s)).toBe(false);
  });

  it("a가 size에 도달하면 a를 찾는다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 30, b: 10 },
      turn: "a",
      winner: "a",
    };
    expect(findSnakesAndLaddersWinner(s)).toBe("a");
    expect(isSnakesAndLaddersOver(s)).toBe(true);
  });

  it("b가 size에 도달하면 b를 찾는다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 10, b: 30 },
      turn: "a",
      winner: "b",
    };
    expect(findSnakesAndLaddersWinner(s)).toBe("b");
  });

  it("applyDiceMove 승리 결과와 findSnakesAndLaddersWinner가 일관된다", () => {
    const s: SnakesAndLaddersState = {
      size: 30,
      links: [],
      positions: { a: 27, b: 0 },
      turn: "a",
      winner: null,
    };
    const next = applyDiceMove(s, 3);
    expect(next.winner).toBe(findSnakesAndLaddersWinner(next));
  });

  it("findSnakesAndLaddersWinner는 입력을 변형하지 않는다", () => {
    const s = createSnakesAndLaddersGame();
    const snapshot = JSON.parse(JSON.stringify(s));
    findSnakesAndLaddersWinner(s);
    expect(s).toEqual(snapshot);
  });
});

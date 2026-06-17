import { describe, expect, it } from "vitest";
import type { Card } from "./card";
import {
  applyOneCardPlay,
  createOneCardGame,
  drawOneCard,
  findOneCardWinner,
  isLegalOneCardPlay,
  legalOneCardPlays,
  topDiscard,
} from "./oneCard";

const c = (suit: Card["suit"], rank: Card["rank"]): Card => ({ suit, rank });

describe("createOneCardGame", () => {
  it("유효한 입력으로 상태를 생성한다", () => {
    const state = createOneCardGame(
      [[c("spades", "A")], [c("hearts", "2")]],
      [c("clubs", "3")],
      [c("diamonds", "5")],
      0,
    );
    expect(state.hands).toHaveLength(2);
    expect(state.currentPlayer).toBe(0);
    expect(topDiscard(state)).toEqual(c("diamonds", "5"));
  });

  it("플레이어가 2명 미만이면 throw", () => {
    expect(() => createOneCardGame([[c("spades", "A")]], [], [c("diamonds", "5")], 0)).toThrow();
  });

  it("버림더미가 비어 있으면 throw", () => {
    expect(() =>
      createOneCardGame([[c("spades", "A")], [c("hearts", "2")]], [], [], 0),
    ).toThrow();
  });

  it("currentPlayer가 범위를 벗어나면 throw", () => {
    expect(() =>
      createOneCardGame([[c("spades", "A")], [c("hearts", "2")]], [], [c("diamonds", "5")], 2),
    ).toThrow();
    expect(() =>
      createOneCardGame([[c("spades", "A")], [c("hearts", "2")]], [], [c("diamonds", "5")], -1),
    ).toThrow();
    expect(() =>
      createOneCardGame([[c("spades", "A")], [c("hearts", "2")]], [], [c("diamonds", "5")], 0.5),
    ).toThrow();
  });

  it("입력 배열을 깊은 복사해 외부 변형으로부터 격리한다", () => {
    const hands = [[c("spades", "A")], [c("hearts", "2")]];
    const draw = [c("clubs", "3")];
    const discard = [c("diamonds", "5")];
    const state = createOneCardGame(hands, draw, discard, 0);
    hands[0]!.push(c("spades", "K"));
    draw.push(c("clubs", "9"));
    discard.push(c("diamonds", "9"));
    expect(state.hands[0]).toHaveLength(1);
    expect(state.drawPile).toHaveLength(1);
    expect(state.discardPile).toHaveLength(1);
  });
});

describe("isLegalOneCardPlay", () => {
  const top = c("spades", "7");
  it("무늬가 같으면 합법", () => {
    expect(isLegalOneCardPlay(top, c("spades", "2"))).toBe(true);
  });
  it("숫자가 같으면 합법", () => {
    expect(isLegalOneCardPlay(top, c("hearts", "7"))).toBe(true);
  });
  it("무늬·숫자 둘 다 다르면 불법", () => {
    expect(isLegalOneCardPlay(top, c("hearts", "2"))).toBe(false);
  });
});

describe("legalOneCardPlays", () => {
  it("맨 위 카드 기준으로 낼 수 있는 카드만 원본 순서로 반환한다", () => {
    const state = createOneCardGame(
      [
        [c("spades", "2"), c("hearts", "9"), c("clubs", "9"), c("diamonds", "K")],
        [c("hearts", "2")],
      ],
      [],
      [c("spades", "9")],
      0,
    );
    // top = spades 9 → spades 2(무늬), hearts 9(숫자), clubs 9(숫자) 가능. diamonds K 불가.
    expect(legalOneCardPlays(state)).toEqual([
      c("spades", "2"),
      c("hearts", "9"),
      c("clubs", "9"),
    ]);
  });

  it("낼 카드가 없으면 빈 배열", () => {
    const state = createOneCardGame(
      [[c("hearts", "2"), c("diamonds", "3")], [c("spades", "A")]],
      [],
      [c("spades", "9")],
      0,
    );
    expect(legalOneCardPlays(state)).toEqual([]);
  });
});

describe("applyOneCardPlay", () => {
  it("손패에서 카드를 제거하고 버림더미에 올리며 턴을 넘긴다", () => {
    const state = createOneCardGame(
      [[c("spades", "2"), c("hearts", "9")], [c("clubs", "K")]],
      [c("diamonds", "4")],
      [c("spades", "9")],
      0,
    );
    const next = applyOneCardPlay(state, c("spades", "2"));
    expect(next.hands[0]).toEqual([c("hearts", "9")]);
    expect(topDiscard(next)).toEqual(c("spades", "2"));
    expect(next.currentPlayer).toBe(1);
  });

  it("마지막 플레이어 다음은 0번으로 순환한다", () => {
    const state = createOneCardGame(
      [[c("clubs", "K")], [c("spades", "2")]],
      [],
      [c("spades", "9")],
      1,
    );
    const next = applyOneCardPlay(state, c("spades", "2"));
    expect(next.currentPlayer).toBe(0);
  });

  it("불법(무늬/숫자 불일치) 내기는 throw", () => {
    const state = createOneCardGame(
      [[c("hearts", "2")], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    expect(() => applyOneCardPlay(state, c("hearts", "2"))).toThrow();
  });

  it("손패에 없는 카드는 throw", () => {
    const state = createOneCardGame(
      [[c("spades", "2")], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    expect(() => applyOneCardPlay(state, c("spades", "9"))).toThrow();
  });

  it("입력 state를 변형하지 않는다", () => {
    const state = createOneCardGame(
      [[c("spades", "2"), c("hearts", "9")], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    applyOneCardPlay(state, c("spades", "2"));
    expect(state.hands[0]).toHaveLength(2);
    expect(state.discardPile).toHaveLength(1);
    expect(state.currentPlayer).toBe(0);
  });
});

describe("drawOneCard", () => {
  it("드로우더미 맨 위 카드를 손패에 넣고 턴을 넘긴다", () => {
    const state = createOneCardGame(
      [[c("hearts", "2")], [c("clubs", "K")]],
      [c("diamonds", "4"), c("diamonds", "5")],
      [c("spades", "9")],
      0,
    );
    const next = drawOneCard(state);
    expect(next.hands[0]).toEqual([c("hearts", "2"), c("diamonds", "4")]);
    expect(next.drawPile).toEqual([c("diamonds", "5")]);
    expect(next.currentPlayer).toBe(1);
  });

  it("드로우더미가 비어 있으면 throw", () => {
    const state = createOneCardGame(
      [[c("hearts", "2")], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    expect(() => drawOneCard(state)).toThrow();
  });

  it("입력 state를 변형하지 않는다", () => {
    const state = createOneCardGame(
      [[c("hearts", "2")], [c("clubs", "K")]],
      [c("diamonds", "4")],
      [c("spades", "9")],
      0,
    );
    drawOneCard(state);
    expect(state.hands[0]).toHaveLength(1);
    expect(state.drawPile).toHaveLength(1);
    expect(state.currentPlayer).toBe(0);
  });
});

describe("findOneCardWinner", () => {
  it("손패가 빈 플레이어 인덱스를 반환한다", () => {
    const state = createOneCardGame(
      [[c("hearts", "2")], [], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    expect(findOneCardWinner(state)).toBe(1);
  });

  it("손패가 빈 플레이어가 없으면 null", () => {
    const state = createOneCardGame(
      [[c("hearts", "2")], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    expect(findOneCardWinner(state)).toBeNull();
  });

  it("마지막 카드를 내면 그 플레이어가 승자가 된다", () => {
    const state = createOneCardGame(
      [[c("spades", "2")], [c("clubs", "K")]],
      [],
      [c("spades", "9")],
      0,
    );
    const next = applyOneCardPlay(state, c("spades", "2"));
    expect(findOneCardWinner(next)).toBe(0);
  });
});

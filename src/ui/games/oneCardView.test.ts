import { describe, expect, it } from "vitest";
import type { Card } from "../../domain/card";
import { createOneCardGame, type OneCardState } from "../../domain/oneCard";
import type { OneCardTurnAction } from "../../application/playOneCard";
import type { RandomSource } from "../../application/dealCards";
import {
  ONE_CARD_CPU,
  ONE_CARD_HUMAN,
  oneCardActionSummary,
  oneCardCardView,
  oneCardHandView,
  oneCardOutcomeLabel,
  oneCardTurnLabel,
  playOneCardCpuTurns,
} from "./oneCardView";

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return { suit, rank };
}

/** 스크립트한 인덱스 시퀀스를 순서대로 돌려주는 결정적 RandomSource 스텁. */
function scriptedRandom(sequence: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      const value = sequence[i] ?? 0;
      i += 1;
      if (value >= maxExclusive) {
        // 스텁이 범위를 넘기면 안전하게 0으로 클램프(테스트 시나리오 보호).
        return 0;
      }
      return value;
    },
  };
}

describe("oneCardCardView", () => {
  it("네 무늬가 서로 다른 기호를 가진다(색 비의존)", () => {
    const symbols = new Set(
      (["spades", "hearts", "diamonds", "clubs"] as const).map(
        (suit) => oneCardCardView(card(suit, "A")).symbol,
      ),
    );
    expect(symbols.size).toBe(4);
  });

  it("기호는 무늬 글리프+숫자, 라벨은 한국어 무늬 이름+숫자", () => {
    const view = oneCardCardView(card("hearts", "7"));
    expect(view.symbol).toBe("♥7");
    expect(view.label).toBe("하트 7");
    expect(view.red).toBe(true);
  });

  it("스페이드/클로버는 색 단서가 검정(red=false)", () => {
    expect(oneCardCardView(card("spades", "K")).red).toBe(false);
    expect(oneCardCardView(card("clubs", "2")).red).toBe(false);
  });
});

describe("oneCardHandView", () => {
  // 버림더미 맨 위 = 스페이드 5. 손패: 무늬 일치/숫자 일치/불일치 섞음.
  function game(): OneCardState {
    return createOneCardGame(
      [
        [card("spades", "9"), card("hearts", "5"), card("clubs", "2")],
        [card("diamonds", "K")],
      ],
      [card("clubs", "7")],
      [card("spades", "5")],
      ONE_CARD_HUMAN,
    );
  }

  it("무늬(스페이드) 또는 숫자(5) 일치 카드만 legal=true", () => {
    const view = oneCardHandView(game(), ONE_CARD_HUMAN);
    expect(view.map((c) => c.legal)).toEqual([true, true, false]);
  });

  it("각 카드에 색 비의존 라벨·기호가 채워진다", () => {
    const view = oneCardHandView(game(), ONE_CARD_HUMAN);
    expect(view[0]!.symbol).toBe("♠9");
    expect(view[0]!.label).toBe("스페이드 9");
  });

  it("손패 범위를 벗어난 플레이어 인덱스는 throw", () => {
    expect(() => oneCardHandView(game(), 5)).toThrow(/범위를 벗어난/);
  });
});

describe("oneCardTurnLabel / oneCardOutcomeLabel", () => {
  function game(currentPlayer: number, hands: Card[][]): OneCardState {
    return createOneCardGame(
      hands,
      [card("clubs", "7")],
      [card("spades", "5")],
      currentPlayer,
    );
  }

  it("진행 중에는 현재 차례(사람/CPU)를 안내한다", () => {
    expect(
      oneCardTurnLabel(game(ONE_CARD_HUMAN, [[card("spades", "9")], [card("hearts", "3")]])),
    ).toContain("당신");
    expect(
      oneCardTurnLabel(game(ONE_CARD_CPU, [[card("spades", "9")], [card("hearts", "3")]])),
    ).toContain("CPU");
  });

  it("승자가 있으면 차례 안내 대신 종료, 승자별 결과 문구", () => {
    const humanWon = game(ONE_CARD_CPU, [[], [card("hearts", "3")]]);
    expect(oneCardTurnLabel(humanWon)).toBe("게임 종료");
    expect(oneCardOutcomeLabel(humanWon)).toContain("당신");

    const cpuWon = game(ONE_CARD_HUMAN, [[card("spades", "9")], []]);
    expect(oneCardOutcomeLabel(cpuWon)).toContain("CPU");
  });

  it("승자가 없으면 진행 중 문구", () => {
    expect(
      oneCardOutcomeLabel(game(ONE_CARD_HUMAN, [[card("spades", "9")], [card("hearts", "3")]])),
    ).toContain("진행 중");
  });
});

describe("oneCardActionSummary", () => {
  it("play는 낸 카드를 공개해 표시한다", () => {
    const action: OneCardTurnAction = { kind: "play", card: card("hearts", "7") };
    expect(oneCardActionSummary(action)).toContain("하트 7");
  });

  it("draw는 무엇을 뽑았는지 드러내지 않는다(비공개)", () => {
    const action: OneCardTurnAction = { kind: "draw", card: card("clubs", "2") };
    const summary = oneCardActionSummary(action);
    expect(summary).toContain("뽑");
    expect(summary).not.toContain("클로버");
  });

  it("pass는 차례를 넘겼음을 알린다", () => {
    expect(oneCardActionSummary({ kind: "pass" })).toContain("넘겼");
  });
});

describe("playOneCardCpuTurns", () => {
  it("CPU가 합법 카드를 내고 사람 차례에서 멈춘다(2인)", () => {
    // CPU(1) 차례. top=스페이드5. CPU 합법 카드=스페이드7만(legal index 0).
    const state = createOneCardGame(
      [[card("hearts", "9")], [card("spades", "7"), card("hearts", "9")]],
      [card("clubs", "2")],
      [card("spades", "5")],
      ONE_CARD_CPU,
    );
    const { state: next, log } = playOneCardCpuTurns(state, scriptedRandom([0]));
    expect(log).toEqual(["CPU가 스페이드 7 카드를 냈습니다."]);
    expect(next.currentPlayer).toBe(ONE_CARD_HUMAN);
    expect(next.hands[ONE_CARD_CPU]).toHaveLength(1);
  });

  it("CPU가 마지막 카드를 내고 이기면 즉시 멈춘다", () => {
    const state = createOneCardGame(
      [[card("hearts", "9")], [card("spades", "7")]],
      [card("clubs", "2")],
      [card("spades", "5")],
      ONE_CARD_CPU,
    );
    const { state: next, log } = playOneCardCpuTurns(state, scriptedRandom([0]));
    expect(log).toHaveLength(1);
    expect(next.hands[ONE_CARD_CPU]).toHaveLength(0);
  });

  it("낼 게 없으면 한 장 뽑고 사람 차례로 넘어간다", () => {
    const state = createOneCardGame(
      [[card("hearts", "9")], [card("hearts", "9")]],
      [card("clubs", "2")],
      [card("spades", "5")],
      ONE_CARD_CPU,
    );
    const { state: next, log } = playOneCardCpuTurns(state, scriptedRandom([0]));
    expect(log).toEqual(["CPU가 낼 카드가 없어 한 장 뽑았습니다."]);
    expect(next.currentPlayer).toBe(ONE_CARD_HUMAN);
    expect(next.hands[ONE_CARD_CPU]).toHaveLength(2);
  });

  it("재셔플 후에도 뽑을 카드가 없으면 패스하고 멈춘다(무한 루프 방지)", () => {
    const state = createOneCardGame(
      [[card("hearts", "9")], [card("hearts", "9")]],
      [], // drawPile 비어 있음
      [card("spades", "5")], // discard 1장 → 재셔플 불가
      ONE_CARD_CPU,
    );
    const { state: next, log } = playOneCardCpuTurns(state, scriptedRandom([0]));
    expect(log).toEqual(["CPU가 낼 카드도 뽑을 카드도 없어 차례를 넘겼습니다."]);
    expect(next.currentPlayer).toBe(ONE_CARD_CPU); // 차례가 넘어가지 못함
  });

  it("여러 CPU가 연속으로 진행하다 사람 차례에서 멈춘다(3인 누적 로그)", () => {
    // P0=사람, P1·P2=CPU. P1 차례에서 시작. 둘 다 합법 카드(스페이드)를 내고 P0로 돌아온다.
    const state = createOneCardGame(
      [
        [card("hearts", "2")],
        [card("spades", "7"), card("clubs", "9")],
        [card("spades", "8"), card("diamonds", "4")],
      ],
      [card("clubs", "3")],
      [card("spades", "5")],
      ONE_CARD_CPU,
    );
    const { state: next, log } = playOneCardCpuTurns(state, scriptedRandom([0, 0]));
    expect(log).toHaveLength(2);
    expect(next.currentPlayer).toBe(ONE_CARD_HUMAN);
  });

  it("이미 사람 차례면 아무것도 하지 않는다", () => {
    const state = createOneCardGame(
      [[card("hearts", "9")], [card("spades", "7")]],
      [card("clubs", "2")],
      [card("spades", "5")],
      ONE_CARD_HUMAN,
    );
    const { state: next, log } = playOneCardCpuTurns(state, scriptedRandom([0]));
    expect(log).toEqual([]);
    expect(next).toBe(state);
  });
});

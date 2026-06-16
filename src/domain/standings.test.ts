import { describe, expect, it } from "vitest";
import type { Pairing } from "./roundRobin";
import { computeStandings, type MatchResult, type PointsRule } from "./standings";

const p = (a: string, b: string): Pairing => ({ a, b });

describe("computeStandings", () => {
  it("기본 집계: 참가자별 played/wins/draws/losses/points를 정확히 합산한다", () => {
    const results: MatchResult[] = [
      { pairing: p("alice", "bob"), outcome: "a" }, // alice 승
      { pairing: p("alice", "carol"), outcome: "draw" }, // 무승부
      { pairing: p("bob", "carol"), outcome: "b" }, // carol 승
    ];

    const table = computeStandings(results);
    const byPlayer = new Map(table.map((r) => [r.player, r]));

    const alice = byPlayer.get("alice")!;
    expect(alice).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, points: 4 });

    const carol = byPlayer.get("carol")!;
    expect(carol).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, points: 4 });

    const bob = byPlayer.get("bob")!;
    expect(bob).toMatchObject({ played: 2, wins: 0, draws: 0, losses: 2, points: 0 });
  });

  it("기본 승점 규칙(승3/무1/패0)을 적용한다", () => {
    const results: MatchResult[] = [
      { pairing: p("a", "b"), outcome: "a" },
      { pairing: p("a", "b"), outcome: "draw" },
      { pairing: p("a", "b"), outcome: "b" },
    ];
    const table = computeStandings(results);
    const a = table.find((r) => r.player === "a")!;
    // 1승 1무 1패 → 3 + 1 + 0 = 4
    expect(a.points).toBe(4);
    const b = table.find((r) => r.player === "b")!;
    expect(b.points).toBe(4);
  });

  it("커스텀 rule을 반영한다", () => {
    const rule: PointsRule = { win: 2, draw: 1, loss: -1 };
    const results: MatchResult[] = [
      { pairing: p("a", "b"), outcome: "a" }, // a:+2, b:-1
      { pairing: p("a", "b"), outcome: "draw" }, // a:+1, b:+1
    ];
    const table = computeStandings(results, rule);
    const a = table.find((r) => r.player === "a")!;
    const b = table.find((r) => r.player === "b")!;
    expect(a.points).toBe(3);
    expect(b.points).toBe(0);
  });

  it("정렬·순위: points 내림차순 → wins → player 사전순, 동점자는 같은 rank를 공유한다", () => {
    // x: 2승(6점), y: 2승(6점), z: 0승(0점), w: 0승(0점)
    const results: MatchResult[] = [
      { pairing: p("x", "z"), outcome: "a" },
      { pairing: p("x", "w"), outcome: "a" },
      { pairing: p("y", "z"), outcome: "a" },
      { pairing: p("y", "w"), outcome: "a" },
    ];
    const table = computeStandings(results);
    // x,y 동점(6점,2승) → 사전순 x<y. z,w 동점(0점,0승) → 사전순 w<z.
    expect(table.map((r) => r.player)).toEqual(["x", "y", "w", "z"]);
    expect(table.map((r) => r.rank)).toEqual([1, 1, 3, 3]);
  });

  it("표준 경쟁식 순위(1,2,2,4)를 만든다", () => {
    const results: MatchResult[] = [
      // a: 2승 6점
      { pairing: p("a", "c"), outcome: "a" },
      { pairing: p("a", "d"), outcome: "a" },
      // b,c: 각 1승 3점 (동점)
      { pairing: p("b", "d"), outcome: "a" },
      { pairing: p("c", "d"), outcome: "a" },
    ];
    const table = computeStandings(results);
    // a(6,2승), b(3,1승), c(3,1승), d(0,0승)
    expect(table.map((r) => r.player)).toEqual(["a", "b", "c", "d"]);
    expect(table.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("무승부는 양쪽 모두 draws+1 및 무 승점으로 반영된다", () => {
    const results: MatchResult[] = [{ pairing: p("a", "b"), outcome: "draw" }];
    const table = computeStandings(results);
    for (const player of ["a", "b"]) {
      const row = table.find((r) => r.player === player)!;
      expect(row).toMatchObject({ played: 1, wins: 0, draws: 1, losses: 0, points: 1 });
    }
  });

  it("빈 입력이면 빈 배열을 반환한다(throw 안 함)", () => {
    expect(computeStandings([])).toEqual([]);
  });

  it("입력 results / rule 을 변형하지 않는다(불변)", () => {
    const pairing = p("a", "b");
    const results: MatchResult[] = [{ pairing, outcome: "a" }];
    const rule: PointsRule = { win: 3, draw: 1, loss: 0 };

    const resultsSnapshot = JSON.parse(JSON.stringify(results));
    const ruleSnapshot = { ...rule };

    computeStandings(results, rule);

    expect(results).toEqual(resultsSnapshot);
    expect(rule).toEqual(ruleSnapshot);
    // 동일 pairing 객체가 그대로 유지되는지(참조 변형 없음)
    expect(results[0]!.pairing).toBe(pairing);
  });

  it("같은 입력 → 같은 출력(결정적)", () => {
    const results: MatchResult[] = [
      { pairing: p("a", "b"), outcome: "a" },
      { pairing: p("b", "c"), outcome: "draw" },
      { pairing: p("c", "a"), outcome: "b" },
    ];
    expect(computeStandings(results)).toEqual(computeStandings(results));
  });
});

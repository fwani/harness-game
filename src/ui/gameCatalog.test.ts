import { describe, it, expect } from "vitest";
import {
  CATEGORY_ORDER,
  GAME_CATALOG,
  filterGames,
  groupGamesByCategory,
  type GameMeta,
} from "./gameCatalog";

describe("GAME_CATALOG", () => {
  it("모든 게임의 key가 유일하다(중복 없음)", () => {
    const keys = GAME_CATALOG.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("모든 게임의 category는 CATEGORY_ORDER에 포함된다", () => {
    for (const g of GAME_CATALOG) {
      expect(CATEGORY_ORDER).toContain(g.category);
    }
  });
});

describe("groupGamesByCategory", () => {
  it("모든 게임을 누락·중복 없이 분류한다", () => {
    const groups = groupGamesByCategory(GAME_CATALOG);
    const grouped = groups.flatMap((grp) => grp.games);
    expect(grouped).toHaveLength(GAME_CATALOG.length);
    expect(new Set(grouped.map((g) => g.key)).size).toBe(GAME_CATALOG.length);
    // 원본의 모든 key가 그룹 결과에도 존재
    const groupedKeys = new Set(grouped.map((g) => g.key));
    for (const g of GAME_CATALOG) {
      expect(groupedKeys.has(g.key)).toBe(true);
    }
  });

  it("CATEGORY_ORDER 순서를 보존한다", () => {
    const groups = groupGamesByCategory(GAME_CATALOG);
    const order = groups.map((grp) => grp.category);
    const expected = CATEGORY_ORDER.filter((c) =>
      GAME_CATALOG.some((g) => g.category === c),
    );
    expect(order).toEqual(expected);
  });

  it("그룹 내 게임은 입력 순서를 보존한다", () => {
    const sample: GameMeta[] = [
      { key: "go", label: "바둑", category: "보드/추상" },
      { key: "rps", label: "가위바위보", category: "실시간/캐주얼" },
      { key: "chess", label: "체스", category: "보드/추상" },
    ];
    const groups = groupGamesByCategory(sample);
    const board = groups.find((g) => g.category === "보드/추상");
    expect(board?.games.map((g) => g.key)).toEqual(["go", "chess"]);
  });

  it("빈 그룹은 제외한다", () => {
    const sample: GameMeta[] = [
      { key: "rps", label: "가위바위보", category: "실시간/캐주얼" },
    ];
    const groups = groupGamesByCategory(sample);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe("실시간/캐주얼");
  });

  it("빈 입력이면 빈 배열을 반환한다", () => {
    expect(groupGamesByCategory([])).toEqual([]);
  });
});

describe("filterGames", () => {
  it("빈 질의는 전체를 반환한다", () => {
    expect(filterGames(GAME_CATALOG, "")).toBe(GAME_CATALOG);
    expect(filterGames(GAME_CATALOG, "   ")).toBe(GAME_CATALOG);
  });

  it("한글 라벨 부분일치로 거른다", () => {
    const result = filterGames(GAME_CATALOG, "카드");
    const labels = result.map((g) => g.label);
    expect(labels).toContain("카드 딜");
    expect(labels).toContain("원카드");
    expect(labels).not.toContain("포커");
  });

  it("앞뒤 공백을 무시한다", () => {
    const a = filterGames(GAME_CATALOG, "바둑");
    const b = filterGames(GAME_CATALOG, "  바둑  ");
    expect(b.map((g) => g.key)).toEqual(a.map((g) => g.key));
    expect(a.map((g) => g.key)).toEqual(["go"]);
  });

  it("영문/숫자 라벨은 대소문자를 무시한다", () => {
    const sample: GameMeta[] = [
      { key: "game2048", label: "2048", category: "퍼즐(1인)" },
      { key: "wordle", label: "Wordle", category: "퍼즐(1인)" },
    ];
    expect(filterGames(sample, "WORDLE").map((g) => g.key)).toEqual(["wordle"]);
    expect(filterGames(sample, "2048").map((g) => g.key)).toEqual(["game2048"]);
  });

  it("일치하는 게임이 없으면 빈 배열을 반환한다", () => {
    expect(filterGames(GAME_CATALOG, "존재하지않는게임zzz")).toEqual([]);
  });
});

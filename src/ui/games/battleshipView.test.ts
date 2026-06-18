import { describe, expect, it } from "vitest";
import {
  createBattleshipBoard,
  fireShot,
  type Ship,
} from "../../domain/battleship";
import type { RandomSource } from "../../application/dealCards";
import { playBattleshipShot } from "../../application/playBattleship";
import {
  battleshipStatusLabel,
  cellView,
  coordLabel,
  difficultyLabel,
  fireCellDisabled,
  isCellSunk,
  nextShipSize,
  placeShipAt,
  placementComplete,
  placementPreview,
  placementStatusLabel,
  playBattleshipCpuRound,
  remainingShips,
  shipName,
  shotSummary,
  toggleOrientation,
} from "./battleshipView";

/** 주어진 인덱스 시퀀스를 순서대로 돌려주는 결정적 가짜 난수(테스트 전용). */
function seqRandom(values: number[]): RandomSource {
  let i = 0;
  return {
    nextInt(maxExclusive: number): number {
      const v = values[i] ?? 0;
      i += 1;
      // 방어: candidates 범위를 넘지 않게 클램프(테스트 의도 보호).
      return v % maxExclusive;
    },
  };
}

describe("coordLabel", () => {
  it("0-기반 행/열을 클래식 배틀십 표기(행 글자+열 번호)로 바꾼다", () => {
    expect(coordLabel(0, 0)).toBe("A1");
    expect(coordLabel(1, 2)).toBe("B3");
    expect(coordLabel(9, 9)).toBe("J10");
  });
});

describe("shipName", () => {
  it("함선 길이를 한국어 함종명으로 바꾼다(색 비의존 라벨)", () => {
    expect(shipName(5)).toBe("항공모함");
    expect(shipName(4)).toBe("전함");
    expect(shipName(3)).toBe("순양함");
    expect(shipName(2)).toBe("구축함");
    expect(shipName(1)).toBe("길이 1 함선");
  });
});

describe("cellView", () => {
  // 2×2 보드: (0,0)-(0,1) 가로 함선 1척.
  const ship: Ship = { id: "s", row: 0, col: 0, size: 2, orientation: "h" };
  const base = createBattleshipBoard(2, [ship]);

  it("미사격·함선 없는 칸은 물(기호 없음)", () => {
    const v = cellView(base[1]![1]!, 1, 1, { revealShips: false, sunk: false });
    expect(v.state).toBe("water");
    expect(v.glyph).toBe("");
    expect(v.fired).toBe(false);
    expect(v.label).toBe("B2 미사격");
  });

  it("revealShips=true면 안 맞은 함선 칸을 ■로 노출, false면 가린다(색 비의존)", () => {
    const shown = cellView(base[0]![0]!, 0, 0, { revealShips: true, sunk: false });
    expect(shown.state).toBe("ship");
    expect(shown.glyph).toBe("■");
    expect(shown.label).toBe("A1 함선");

    const hidden = cellView(base[0]![0]!, 0, 0, { revealShips: false, sunk: false });
    expect(hidden.state).toBe("water");
    expect(hidden.glyph).toBe("");
  });

  it("빗나감은 ○, 명중은 ✕, 격침은 💥로 구분한다(색 비의존)", () => {
    // 함선 없는 칸 사격 → 빗나감.
    const missed = fireShot(base, 1, 0);
    const miss = cellView(missed[1]![0]!, 1, 0, { revealShips: false, sunk: false });
    expect(miss.state).toBe("miss");
    expect(miss.glyph).toBe("○");
    expect(miss.label).toBe("B1 빗나감");

    // 함선 한 칸만 사격 → 명중(미격침).
    const oneHit = fireShot(base, 0, 0);
    const hit = cellView(oneHit[0]![0]!, 0, 0, {
      revealShips: false,
      sunk: isCellSunk(oneHit, oneHit[0]![0]!),
    });
    expect(hit.state).toBe("hit");
    expect(hit.glyph).toBe("✕");

    // 함선 두 칸 모두 사격 → 격침.
    const sunkBoard = fireShot(fireShot(base, 0, 0), 0, 1);
    const sunk = cellView(sunkBoard[0]![0]!, 0, 0, {
      revealShips: false,
      sunk: isCellSunk(sunkBoard, sunkBoard[0]![0]!),
    });
    expect(sunk.state).toBe("sunk");
    expect(sunk.glyph).toBe("💥");
    expect(sunk.label).toBe("A1 격침");
  });
});

describe("isCellSunk", () => {
  const ship: Ship = { id: "s", row: 0, col: 0, size: 2, orientation: "h" };
  const base = createBattleshipBoard(2, [ship]);

  it("함선 모든 칸이 맞아야 true, 일부만 맞으면 false, 물 칸은 false", () => {
    expect(isCellSunk(base, base[0]![0]!)).toBe(false);
    const partial = fireShot(base, 0, 0);
    expect(isCellSunk(partial, partial[0]![0]!)).toBe(false);
    const full = fireShot(partial, 0, 1);
    expect(isCellSunk(full, full[0]![0]!)).toBe(true);
    expect(isCellSunk(full, full[1]![1]!)).toBe(false); // 물 칸.
  });
});

describe("shotSummary", () => {
  const ship: Ship = { id: "s", row: 0, col: 0, size: 2, orientation: "h" };
  const base = createBattleshipBoard(2, [ship]);

  it("빗나감/명중/격침/전 함대 격침을 구분해 한국어로 요약한다", () => {
    const miss = playBattleshipShot(base, 1, 1);
    expect(shotSummary("사람", miss, miss.board)).toBe("사람 사격: 빗나감 ○");

    const hit = playBattleshipShot(base, 0, 0);
    expect(shotSummary("사람", hit, hit.board)).toBe("사람 사격: 명중! ✕");

    // 두 칸짜리 함선의 두 번째 칸까지 맞히면 격침 + 전 함대 격침(함선 1척뿐).
    const sunk = playBattleshipShot(hit.board, 0, 1);
    expect(sunk.fleetDestroyed).toBe(true);
    expect(shotSummary("CPU", sunk, sunk.board)).toBe("CPU 사격: 전 함대 격침! 🎉");
  });

  it("격침이지만 전 함대가 남아있으면 함종명으로 격침을 안내한다", () => {
    // 함선 2척: 구축함(길이2)·순양함(길이3).
    const ships: Ship[] = [
      { id: "d", row: 0, col: 0, size: 2, orientation: "h" },
      { id: "c", row: 2, col: 0, size: 3, orientation: "h" },
    ];
    const board = createBattleshipBoard(3, ships);
    const r1 = playBattleshipShot(board, 0, 0);
    const r2 = playBattleshipShot(r1.board, 0, 1); // 구축함 격침, 순양함 생존.
    expect(r2.fleetDestroyed).toBe(false);
    expect(r2.sunkShipId).toBe("d");
    expect(shotSummary("사람", r2, r2.board)).toBe("사람 사격: 구축함 격침! 💥");
  });
});

describe("battleshipStatusLabel", () => {
  it("승자/진행 중을 명확히 구분한다", () => {
    expect(battleshipStatusLabel(null)).toContain("사람 차례");
    expect(battleshipStatusLabel("a")).toContain("사람 승리");
    expect(battleshipStatusLabel("b")).toContain("CPU 승리");
  });
});

describe("remainingShips", () => {
  it("아직 격침되지 않은 함선 수를 센다", () => {
    const ships: Ship[] = [
      { id: "d", row: 0, col: 0, size: 2, orientation: "h" },
      { id: "c", row: 2, col: 0, size: 3, orientation: "h" },
    ];
    const board = createBattleshipBoard(3, ships);
    expect(remainingShips(board)).toBe(2);
    const afterSink = fireShot(fireShot(board, 0, 0), 0, 1); // 구축함 격침.
    expect(remainingShips(afterSink)).toBe(1);
  });
});

describe("함선 수동 배치 헬퍼", () => {
  const fleet = [3, 2];

  describe("nextShipSize", () => {
    it("배치 순서대로 다음 함선 길이를 주고, 모두 배치되면 null", () => {
      expect(nextShipSize([], fleet)).toBe(3);
      const one: Ship = { id: "ship-0", row: 0, col: 0, size: 3, orientation: "h" };
      expect(nextShipSize([one], fleet)).toBe(2);
      const two: Ship = { id: "ship-1", row: 2, col: 0, size: 2, orientation: "h" };
      expect(nextShipSize([one, two], fleet)).toBeNull();
    });
  });

  describe("toggleOrientation", () => {
    it("가로↔세로를 토글한다", () => {
      expect(toggleOrientation("h")).toBe("v");
      expect(toggleOrientation("v")).toBe("h");
    });
  });

  describe("placeShipAt", () => {
    it("유효한 위치면 함선을 추가하고 ok=true(올바른 id 인덱스)", () => {
      const r = placeShipAt([], 0, 3, 0, 0, "h", 5);
      expect(r.ok).toBe(true);
      expect(r.ships).toEqual([{ id: "ship-0", row: 0, col: 0, size: 3, orientation: "h" }]);
    });

    it("범위를 벗어나면 ok=false, ships 불변", () => {
      const r = placeShipAt([], 0, 3, 0, 3, "h", 5); // (0,3)(0,4)(0,5) → 5 밖
      expect(r.ok).toBe(false);
      expect(r.ships).toEqual([]);
    });

    it("기존 함선과 겹치면 ok=false, ships 불변", () => {
      const placed: Ship[] = [{ id: "ship-0", row: 0, col: 0, size: 3, orientation: "h" }];
      const r = placeShipAt(placed, 1, 2, 0, 2, "v", 5); // (0,2)가 기존 함선과 겹침
      expect(r.ok).toBe(false);
      expect(r.ships).toEqual(placed);
    });

    it("회전(세로)으로도 배치된다", () => {
      const r = placeShipAt([], 0, 3, 0, 0, "v", 5);
      expect(r.ok).toBe(true);
      expect(r.ships[0]!.orientation).toBe("v");
    });
  });

  describe("placementComplete", () => {
    it("배치 수가 함대 수에 도달하면 true", () => {
      expect(placementComplete([], fleet)).toBe(false);
      const ships: Ship[] = [
        { id: "ship-0", row: 0, col: 0, size: 3, orientation: "h" },
        { id: "ship-1", row: 2, col: 0, size: 2, orientation: "h" },
      ];
      expect(placementComplete(ships, fleet)).toBe(true);
    });
  });

  describe("placementPreview", () => {
    it("후보 칸과 유효성을 함께 준다(겹침이면 valid=false지만 칸은 계산)", () => {
      const placed: Ship[] = [{ id: "ship-0", row: 0, col: 0, size: 3, orientation: "h" }];
      const ok = placementPreview(placed, 1, 2, 2, 0, "h", 5);
      expect(ok.cells).toEqual([
        [2, 0],
        [2, 1],
      ]);
      expect(ok.valid).toBe(true);

      const bad = placementPreview(placed, 1, 2, 0, 2, "v", 5); // (0,2) 겹침
      expect(bad.cells).toEqual([
        [0, 2],
        [1, 2],
      ]);
      expect(bad.valid).toBe(false);
    });
  });

  describe("placementStatusLabel", () => {
    it("다음 함종 안내, 완료 시 시작 안내", () => {
      expect(placementStatusLabel([], fleet)).toContain("순양함");
      const ships: Ship[] = [
        { id: "ship-0", row: 0, col: 0, size: 3, orientation: "h" },
        { id: "ship-1", row: 2, col: 0, size: 2, orientation: "h" },
      ];
      expect(placementStatusLabel(ships, fleet)).toContain("완료");
    });
  });
});

describe("playBattleshipCpuRound", () => {
  function makeBoards() {
    // 사람·CPU 모두 (0,0)-(0,1) 가로 함선 1척(2×2 보드).
    const ship: Ship = { id: "s", row: 0, col: 0, size: 2, orientation: "h" };
    return {
      humanBoard: createBattleshipBoard(2, [ship]),
      cpuBoard: createBattleshipBoard(2, [ship]),
    };
  }

  it("사람이 빗나가면 CPU가 사람 보드에 한 발 되쏜다", () => {
    const { humanBoard, cpuBoard } = makeBoards();
    // CPU는 index 0 → 미사격 후보 중 첫(0,0)을 쏜다(명중).
    const round = playBattleshipCpuRound(humanBoard, cpuBoard, { row: 1, col: 1 }, seqRandom([0]));
    expect(round.humanShot.hit).toBe(false);
    expect(round.cpuShot).not.toBeNull();
    expect(round.cpuShot!.row).toBe(0);
    expect(round.cpuShot!.col).toBe(0);
    expect(round.cpuShot!.result.hit).toBe(true);
    expect(round.outcome).toBeNull();
    // 입력 보드는 변형되지 않는다.
    expect(humanBoard[0]![0]!.hit).toBe(false);
    expect(cpuBoard[1]![1]!.hit).toBe(false);
  });

  it("사람이 적 함대를 전멸시키면 즉시 종료하고 CPU는 쏘지 않는다(사람 승)", () => {
    const { humanBoard, cpuBoard } = makeBoards();
    // 먼저 (0,0)을 맞혀 명중, 다음 라운드에 (0,1)로 전 함대 격침.
    const first = playBattleshipCpuRound(humanBoard, cpuBoard, { row: 0, col: 0 }, seqRandom([0]));
    expect(first.outcome).toBeNull();
    const win = playBattleshipCpuRound(
      first.humanBoard,
      first.cpuBoard,
      { row: 0, col: 1 },
      seqRandom([0]),
    );
    expect(win.humanShot.fleetDestroyed).toBe(true);
    expect(win.cpuShot).toBeNull();
    expect(win.outcome).toBe("a");
  });

  it("CPU 사격으로 사람 함대가 전멸하면 CPU 승으로 종료한다", () => {
    const { humanBoard, cpuBoard } = makeBoards();
    // 사람 함선 (0,0) 한 칸을 미리 맞혀 둔 보드에서 시작.
    const dented = fireShot(humanBoard, 0, 0);
    // 사람은 (1,1) 빗나감. CPU는 남은 후보 중 (0,1)을 골라(인덱스 조정) 사람 함대를 격침.
    // 미사격 후보(row-major): (0,1),(1,0),(1,1). index 0 → (0,1) = 사람 함선 둘째 칸.
    const round = playBattleshipCpuRound(dented, cpuBoard, { row: 1, col: 1 }, seqRandom([0]));
    expect(round.cpuShot!.row).toBe(0);
    expect(round.cpuShot!.col).toBe(1);
    expect(round.cpuShot!.result.fleetDestroyed).toBe(true);
    expect(round.outcome).toBe("b");
  });

  it("범위 밖 좌표를 사람이 지정하면 도메인 에러가 전파된다", () => {
    const { humanBoard, cpuBoard } = makeBoards();
    expect(() =>
      playBattleshipCpuRound(humanBoard, cpuBoard, { row: 5, col: 5 }, seqRandom([0])),
    ).toThrow(/잘못된 사격 좌표/);
  });

  it("난이도에 따라 CPU 사격 선택이 달라진다: easy=무작위 순서, hard=명중 인접 추적", () => {
    // 사람 보드: (2,2)-(2,4) 가로 함선, (2,2)는 이미 명중(추적 대상).
    const humanShip: Ship = { id: "h", row: 2, col: 2, size: 3, orientation: "h" };
    const humanBoard = fireShot(createBattleshipBoard(5, [humanShip]), 2, 2);
    // CPU 보드: (0,0)-(0,1) 함선 — 사람은 (4,4)로 빗나가 게임이 계속된다.
    const cpuBoard = createBattleshipBoard(5, [
      { id: "c", row: 0, col: 0, size: 2, orientation: "h" },
    ]);

    // easy: chooseRandomShot → 행→열 첫 미사격 칸 (0,0).
    const easy = playBattleshipCpuRound(
      humanBoard,
      cpuBoard,
      { row: 4, col: 4 },
      seqRandom([0]),
      "easy",
    );
    expect(easy.cpuShot!.row).toBe(0);
    expect(easy.cpuShot!.col).toBe(0);

    // hard: chooseSmartShot → 명중 칸 (2,2)의 인접 칸 (2,3)을 추적.
    const hard = playBattleshipCpuRound(
      humanBoard,
      cpuBoard,
      { row: 4, col: 4 },
      seqRandom([0]),
      "hard",
    );
    expect(hard.cpuShot!.row).toBe(2);
    expect(hard.cpuShot!.col).toBe(3);
  });

  it("difficulty 인자를 생략하면 기존처럼 easy(무작위)로 동작한다", () => {
    const humanShip: Ship = { id: "h", row: 2, col: 2, size: 3, orientation: "h" };
    const humanBoard = fireShot(createBattleshipBoard(5, [humanShip]), 2, 2);
    const cpuBoard = createBattleshipBoard(5, [
      { id: "c", row: 0, col: 0, size: 2, orientation: "h" },
    ]);
    const round = playBattleshipCpuRound(humanBoard, cpuBoard, { row: 4, col: 4 }, seqRandom([0]));
    expect(round.cpuShot!.row).toBe(0);
    expect(round.cpuShot!.col).toBe(0);
  });
});

describe("difficultyLabel", () => {
  it("난이도별 한국어 라벨을 돌려준다", () => {
    expect(difficultyLabel("easy")).toBe("쉬움 (무작위)");
    expect(difficultyLabel("hard")).toBe("어려움 (추적)");
  });
});

describe("fireCellDisabled", () => {
  it("아직 안 쏜 칸은 진행 중이면 활성(클릭 가능)이다", () => {
    expect(fireCellDisabled(false, false)).toBe(false);
  });

  it("이미 사격한 칸은 비활성이다(다시 쏠 수 없음)", () => {
    expect(fireCellDisabled(false, true)).toBe(true);
  });

  it("게임이 끝나면 모든 칸이 비활성이다", () => {
    expect(fireCellDisabled(true, false)).toBe(true);
    expect(fireCellDisabled(true, true)).toBe(true);
  });
});

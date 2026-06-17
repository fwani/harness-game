import { describe, it, expect } from "vitest";
import { getStandings, listRecords, recordGame, subscribe } from "./records";

// 회귀 방지: useSyncExternalStore는 스냅샷 게터의 반환값을 Object.is로 비교한다.
// 저장소가 바뀌지 않았다면 동일 참조를 돌려줘야 무한 렌더 루프(앱 백스크린)가 안 난다.
describe("records snapshot stability", () => {
  it("저장소 변경이 없으면 getStandings는 동일 참조를 반환한다", () => {
    expect(getStandings()).toBe(getStandings());
  });

  it("저장소 변경이 없으면 listRecords는 동일 참조를 반환한다", () => {
    expect(listRecords()).toBe(listRecords());
  });

  it("recordGame 이후에는 새 스냅샷(다른 참조)을 반환한다", () => {
    const beforeStandings = getStandings();
    const beforeRecords = listRecords();

    recordGame("rps", "나", "CPU", "a");

    const afterStandings = getStandings();
    const afterRecords = listRecords();

    expect(afterStandings).not.toBe(beforeStandings);
    expect(afterRecords).not.toBe(beforeRecords);
    // 갱신 후에도 다시 호출하면 동일 참조로 안정화된다.
    expect(getStandings()).toBe(afterStandings);
    expect(listRecords()).toBe(afterRecords);
  });

  it("기록한 결과가 standings/records에 반영된다", () => {
    const beforeCount = listRecords().length;
    recordGame("rps", "나", "CPU", "a");
    const records = listRecords();
    expect(records.length).toBe(beforeCount + 1);
    // "나"의 누적 승수가 집계되어 있어야 한다.
    const me = getStandings().find((s) => s.player === "나");
    expect(me).toBeDefined();
    expect(me!.wins).toBeGreaterThanOrEqual(1);
  });

  it("구독자는 recordGame 시 통지받고, 해제 후에는 받지 않는다", () => {
    let calls = 0;
    const unsubscribe = subscribe(() => {
      calls += 1;
    });
    recordGame("rps", "나", "CPU", "draw");
    expect(calls).toBe(1);
    unsubscribe();
    recordGame("rps", "나", "CPU", "draw");
    expect(calls).toBe(1);
  });
});

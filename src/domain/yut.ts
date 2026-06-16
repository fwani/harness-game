// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

export type YutResult = "do" | "gae" | "geol" | "yut" | "mo";

export interface YutThrow {
  result: YutResult; // 도/개/걸/윷/모
  steps: number; // do=1, gae=2, geol=3, yut=4, mo=5
  extraThrow: boolean; // 윷·모면 true (한 번 더 던짐)
}

/**
 * 윷가락 4개의 면으로 던짐 결과(도·개·걸·윷·모)를 판정한다(순수).
 * - sticks: 길이 4의 boolean[], true=배(평평한 면이 위).
 * - 배의 개수: 0→모(5칸, 한 번 더), 1→도(1칸), 2→개(2칸), 3→걸(3칸), 4→윷(4칸, 한 번 더).
 * - 배열 길이가 4가 아니면 throw. 입력 배열은 변형하지 않는다.
 */
export function evaluateYutThrow(sticks: boolean[]): YutThrow {
  if (sticks.length !== 4) {
    throw new Error("evaluateYutThrow requires exactly 4 sticks");
  }
  const bellies = sticks.reduce((count, isBelly) => count + (isBelly ? 1 : 0), 0);
  switch (bellies) {
    case 0:
      return { result: "mo", steps: 5, extraThrow: true };
    case 1:
      return { result: "do", steps: 1, extraThrow: false };
    case 2:
      return { result: "gae", steps: 2, extraThrow: false };
    case 3:
      return { result: "geol", steps: 3, extraThrow: false };
    default:
      return { result: "yut", steps: 4, extraThrow: true };
  }
}

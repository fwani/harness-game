// Domain layer: pure game rules. No outward dependency (no application/infrastructure).

const START = 0; // 출발점 — 잡기 안전 지대
const FINISH = 20; // 윷판 외곽 한 바퀴 완주 지점 — 잡기 안전 지대 (yutMove.ts와 동일한 0..20 좌표)

export interface YutCaptureResult {
  capturedIndices: number[]; // 잡힌 상대 말의 (입력 배열 기준) 인덱스 목록, 오름차순
  extraThrow: boolean; // 한 마리라도 잡으면 true (한 번 더 던짐)
}

function assertPosition(value: number, label: string): void {
  if (!Number.isInteger(value) || value < START || value > FINISH) {
    throw new Error(`resolveYutCapture requires integer ${label} in 0..20`);
  }
}

/**
 * 이동을 마친 내 말의 위치와 상대 말들의 위치를 비교해 잡기·한 번 더 던짐을 판정한다(순수).
 * - moverTraveled, opponentTraveled의 각 원소는 0..20 정수여야 하며, 벗어나거나 비정수면 throw.
 * - 내 말이 멈춘 칸과 같은 칸의 상대 말은 잡힌다 → 그 인덱스를 capturedIndices에 포함(오름차순).
 * - 단, 출발점(0)·완주(20) 칸에서는 잡기가 일어나지 않는다(안전 지대) → 빈 배열.
 * - 같은 칸에 상대 말이 여러 개면 모두 잡는다. opponentTraveled가 비면 빈 배열.
 * - extraThrow = capturedIndices.length > 0.
 * - 입력 배열/값을 변형하지 않는다.
 */
export function resolveYutCapture(
  moverTraveled: number,
  opponentTraveled: number[],
): YutCaptureResult {
  assertPosition(moverTraveled, "moverTraveled");

  const inSafeZone = moverTraveled === START || moverTraveled === FINISH;
  const capturedIndices: number[] = [];
  for (let i = 0; i < opponentTraveled.length; i++) {
    const pos = opponentTraveled[i] as number;
    assertPosition(pos, "opponentTraveled element");
    // 안전 지대(출발점·완주)에서는 잡기 없음. 그 외 같은 칸이면 잡는다.
    if (!inSafeZone && pos === moverTraveled) {
      capturedIndices.push(i);
    }
  }

  // 순회 순서상 이미 오름차순이지만, 인덱스 목록 계약을 명시적으로 보장한다.
  capturedIndices.sort((a, b) => a - b);

  return { capturedIndices, extraThrow: capturedIndices.length > 0 };
}

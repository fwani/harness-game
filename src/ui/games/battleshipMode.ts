// Presentation helper: 배틀십 시작 화면의 **싱글(vs CPU) / 멀티(방)** 모드 선택(순수·결정적, 입력 불변).
// 색에 의존하지 않게 라벨/설명을 텍스트로 제공하고, 세그먼트 토글(`role="group"`+`aria-pressed`)을
// 데이터로만 기술한다. React 컴포넌트는 이 데이터를 그대로 렌더해 모드를 전환한다.
// 게임 규칙과 무관한 화면 모드 상태만 다룬다(도메인/엔진 미import).

/** 배틀십 진입 모드: 싱글(혼자/vs CPU) | 멀티(방 기반 원격/로컬 시뮬). */
export type BattleshipMode = "single" | "multi";

/** 한 모드 선택지(세그먼트 버튼 1개) — 색 비의존 라벨/설명. */
export interface BattleshipModeOption {
  mode: BattleshipMode;
  /** 버튼에 보이는 라벨. */
  label: string;
  /** 보조 설명(무엇을 하는 모드인지). */
  description: string;
}

/** 모드 선택지 목록(표시 순서 고정: 싱글 먼저). */
export const BATTLESHIP_MODE_OPTIONS: ReadonlyArray<BattleshipModeOption> = [
  {
    mode: "single",
    label: "싱글 (vs CPU)",
    description: "혼자 CPU와 대결합니다.",
  },
  {
    mode: "multi",
    label: "멀티 (방)",
    description: "방 코드로 두 좌석이 같은 방에서 비공개 배치 후 교대 사격합니다.",
  },
];

/** 기본 진입 모드(싱글 — 기존 vs CPU 흐름 유지). */
export const DEFAULT_BATTLESHIP_MODE: BattleshipMode = "single";

/** 현재 모드 기준 세그먼트 한 칸의 aria-pressed 값(선택 여부). 색 비의존 상태 표시용. */
export function isModeSelected(current: BattleshipMode, option: BattleshipMode): boolean {
  return current === option;
}

// Presentation helper: 배틀십 멀티(방) 매치 종료 시 전적 기록(DoD C) 결정 로직.
// 순수·결정적 — recordGame의 호출 시점/인자/중복 방지 가드를 React 밖에서 단위 테스트할 수 있게 분리한다.
// 도메인/애플리케이션 규칙을 재구현하지 않고, 서버가 **전체 상태**로 계산한 권위 있는 GameStatus만 환원한다.
//
// fog-of-war 주의(battleshipMultiView.ts 참고): 좌석에 전달되는 보드(state)는 redact돼 종료/승자 판정에
// 쓸 수 없다. 종료·승자는 redact 대상이 아닌 서버 status를 신뢰해 **좌석 무관 절대 승자**(p1/p2)로 다룬다.
//
// 중복 기록 방지: 인메모리 허브 로컬 시뮬에서는 두 좌석(p1·p2)이 같은 over status를 모두 구독하므로,
// 같은 매치를 두 번 기록할 수 있다. 매치 단위 1회 기록 가드(alreadyRecorded)를 호출자가 보관·리셋하고,
// 본 헬퍼는 그 가드를 받아 "지금 기록할 인자"만 순수하게 산출한다(싱글 Battleship.tsx의 recorded 가드 패턴).
import type { GameStatus } from "../../application/gameEngine";
import type { WinSide } from "../records";
import { SELF_PLAYER } from "./streakView";

/**
 * 멀티 매치 전적의 안정적 저장 키.
 * - playerA(p1) = 로컬 표시 이름 = 싱글과 동일 유저(SELF_PLAYER) → 싱글/멀티 전적이 한 유저로 통합된다.
 * - playerB(p2) = 상대 좌석 라벨(고정 안정값 — #535 표시 이름 매핑 관례).
 */
export const MULTI_PLAYER_A = SELF_PLAYER;
export const MULTI_PLAYER_B = "상대(P2)";

/**
 * 권위 있는 status(좌석 무관 절대 승자 p1/p2)를 playerA/playerB 기준 WinSide로 환원한다(순수·결정적).
 * 승자 p1 → "a"(playerA 승), p2 → "b"(playerB 승). 배틀십은 무승부가 없어 "draw"는 발생하지 않는다.
 * 미종료(over=false)거나 승자 미정이면 null(기록 대상 아님).
 */
export function battleshipMultiWinSide(status: GameStatus): WinSide | null {
  if (!status.over || status.winner === null) {
    return null;
  }
  return status.winner === "p1" ? "a" : "b";
}

/** 한 판을 recordGame에 넘길 인자. */
export interface MatchRecordEntry {
  playerA: string;
  playerB: string;
  win: WinSide;
}

/**
 * 매치 종료 status를 받아 (정확히 1회만) 기록할 인자를 산출한다(순수·결정적, 부수효과 없음).
 * 두 좌석이 같은 over status를 모두 구독해도 alreadyRecorded 가드로 1회만 기록되게 한다.
 * - alreadyRecorded면 null(이미 기록함).
 * - 종료 + 승자 확정 + 미기록이면 기록 인자(playerA/playerB/win).
 * - 그 외(미종료 등)는 null.
 * 가드(alreadyRecorded)의 보관·리셋(재대국 시)은 호출자(컴포넌트 ref)가 담당한다.
 */
export function battleshipMultiMatchRecord(
  status: GameStatus,
  alreadyRecorded: boolean,
): MatchRecordEntry | null {
  if (alreadyRecorded) {
    return null;
  }
  const win = battleshipMultiWinSide(status);
  if (win === null) {
    return null;
  }
  return { playerA: MULTI_PLAYER_A, playerB: MULTI_PLAYER_B, win };
}

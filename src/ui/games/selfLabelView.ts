// Presentation 전용 self(SELF_PLAYER) 표시 매핑 헬퍼. 순수 함수만 둔다
// (React/DOM·난수·시간 없음, 입력 불변·결정적).
//
// 설계: 저장(record)·집계 키는 계속 SELF_PLAYER(안정값)를 쓴다. 표시 이름(displayName)은
// 가변(이름 변경 가능)이라 키로 쓰면 이름 변경 시 같은 사람의 집계가 쪼개진다. 그래서 이 모듈은
// "표시 전용" 매핑이며 저장 경로·도메인은 건드리지 않는다(#535, #515 게스트 정체성 후속).
import { SELF_PLAYER } from "./streakView";

/**
 * player가 self(SELF_PLAYER)이면 게스트 표시 이름으로, 아니면 원래 라벨 그대로 보여준다(불변·결정적).
 * - player !== SELF_PLAYER → player 그대로(상대·CPU 등 다른 플레이어 라벨 보존).
 * - 표시 이름이 빈 문자열/공백뿐이면 안정 라벨 SELF_PLAYER로 폴백한다(비정상 입력 방어).
 */
export function selfDisplayLabel(
  player: string,
  selfDisplayName: string,
): string {
  if (player !== SELF_PLAYER) return player;
  return selfDisplayName.trim().length > 0 ? selfDisplayName : SELF_PLAYER;
}

/**
 * 제목 등 문자열 안의 self 토큰 "(SELF_PLAYER)"을 게스트 표시 이름으로 치환한다.
 * 모든 게임 화면이 StreakPanel title에 "(나)"를 박아 넘기므로(중복 금지), 표시 매핑을 한 곳에서 처리한다.
 * self 토큰이 없으면 원본을 그대로 돌려준다(불변·결정적).
 */
export function withSelfDisplayName(
  title: string,
  selfDisplayName: string,
): string {
  const token = `(${SELF_PLAYER})`;
  const label = `(${selfDisplayLabel(SELF_PLAYER, selfDisplayName)})`;
  return title.split(token).join(label);
}

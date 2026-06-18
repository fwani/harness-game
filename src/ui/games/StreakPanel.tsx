import { useSyncExternalStore } from "react";
import type { StreakSummary } from "./streakView";
import { getIdentity, subscribeIdentity } from "../identity";
import { withSelfDisplayName } from "./selfLabelView";

/**
 * 화면 내 통산 전적·연승 표시 패널(가위바위보·홀짝 등 공용).
 * 표시용 라벨은 streakView.summarizeStreakForGame에서 만든 것을 그대로 보여준다.
 * 색만으로 구분하지 않도록 항목명을 텍스트 라벨(dt)로 병기한다.
 *
 * self 표시 이름은 여기 한 곳에서 매핑한다(각 게임 화면은 title에 "(나)"를 그대로 넘긴다, 중복 금지).
 * 게스트 정체성을 구독해 이름 변경 시 즉시 갱신한다(GuestIdentity·useSyncExternalStore 관례 재사용).
 * 저장/집계 키는 SELF_PLAYER(안정값) 그대로이고 화면 표시만 displayName으로 바꾼다(#535).
 */
export function StreakPanel({
  title,
  summary,
}: {
  title: string;
  summary: StreakSummary;
}) {
  const identity = useSyncExternalStore(
    subscribeIdentity,
    getIdentity,
    getIdentity,
  );
  const displayTitle = withSelfDisplayName(title, identity.displayName);
  return (
    <section className="streak" aria-label={displayTitle}>
      <h3>{displayTitle}</h3>
      <dl>
        <dt>현재 연속</dt>
        <dd>{summary.currentLabel}</dd>
        <dt>통산</dt>
        <dd>{summary.totalLabel}</dd>
        <dt>최장 기록</dt>
        <dd>{summary.bestLabel}</dd>
      </dl>
    </section>
  );
}

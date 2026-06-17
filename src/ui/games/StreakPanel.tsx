import type { StreakSummary } from "./streakView";

/**
 * 화면 내 통산 전적·연승 표시 패널(가위바위보·홀짝 등 공용).
 * 표시용 라벨은 streakView.summarizeStreakForGame에서 만든 것을 그대로 보여준다.
 * 색만으로 구분하지 않도록 항목명을 텍스트 라벨(dt)로 병기한다.
 */
export function StreakPanel({
  title,
  summary,
}: {
  title: string;
  summary: StreakSummary;
}) {
  return (
    <section className="streak" aria-label={title}>
      <h3>{title}</h3>
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

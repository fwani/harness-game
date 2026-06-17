// 전적 화면 상단 안내 문구 결정(표시용 순수 함수).
// 전적은 #182에서 localStorage로 영속화되었으므로, 안내 문구가 실제 동작과
// 일치하도록 영속 여부에 따라 다른 문구를 보여준다(QA #230: 문구가 동작과 정반대였음).

/**
 * 전적 영속 여부에 맞는 안내 문구를 돌려준다.
 * @param persisted localStorage 어댑터로 실제 영속 저장 중이면 true,
 *                  인메모리 폴백(SSR/비공개 모드 등)이면 false.
 */
export function recordsPersistenceHint(persisted: boolean): string {
  return persisted
    ? "이 브라우저에 저장된 대국 기록과 플레이어별 누적 전적입니다(새로고침·재방문 후에도 유지, 이 브라우저에만 저장)."
    : "이번 세션에 저장된 대국 기록과 플레이어별 누적 전적입니다(저장 불가 환경이라 새로고침 시 초기화).";
}

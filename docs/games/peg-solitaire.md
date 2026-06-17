# 페그 솔리테어(Peg Solitaire) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).

## 1. 개요

- **장르**: 못 빼기 퍼즐, 1인(플레이어 vs 퍼즐).
- **인원**: 1인.
- **목표**: 표준 33칸 English 십자 보드(중앙만 빈 32못)에서 못을 인접한 못 위로 직선 2칸
  뛰어넘어 가운데 못을 제거한다. 더 둘 수 없을 때 못이 **1개** 남으면 클리어, 그 1개가
  **중앙**이면 완벽 클리어다. 난수 없는 결정적 단일 시작 퍼즐이다.

## 2. 규칙

- 7×7 격자 중 네 모서리 2×2를 제외한 33칸이 보드 안(valid). 좌표는 `{row, col}`(0-indexed).
- 시작 상태: 중앙 `(3,3)`만 빈 구멍이고 나머지 32칸에 못이 있다(`createPegSolitaire`).
- 한 수(`PegMove = {from, over, to}`): `from`의 못이 인접한 `over`의 못을 상하좌우로 정확히
  2칸 뛰어넘어 빈 칸 `to`로 안착한다. `from`·`over`에 못이 있고 `to`는 빈 칸이며,
  `over`는 `from`과 `to`의 정확한 중점이어야 한다(대각선·다른 거리 불가). 적용 시 `over` 못이 제거된다.
- 종료(`isPegSolitaireFinished`): 합법 수가 0개일 때.
- 클리어(`isPegSolitaireSolved(state)`): 남은 못이 정확히 1개. `requireCenter=true`면 그 1개가
  중앙일 때만 true(완벽 클리어).
- 모든 함수는 결정적 순수 함수이며 입력을 변형하지 않는다(난수 없음).

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/pegSolitaire.ts`](../../src/domain/pegSolitaire.ts) | `createPegSolitaire`/`isLegalPegMove`/`legalPegMoves`/`applyPegMove`/`pegCount`/`isPegSolitaireFinished`/`isPegSolitaireSolved` | ✅ |
| 애플리케이션 | — | 난수·셔플 없는 결정적 단일 시작이라 헬퍼 불필요(UI가 도메인 직접 호출) | — |
| UI | [`src/ui/games/PegSolitaire.tsx`](../../src/ui/games/PegSolitaire.tsx) + [`pegSolitaireView.ts`](../../src/ui/games/pegSolitaireView.ts) | 출발 못→합법 착지 2단계 클릭·강조·불법 사유·종료/클리어/완벽 클리어/실패 | ✅ |
| 기록 | `GameId="pegsolitaire"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 종료 시 `recordGame("pegsolitaire","나","시스템",클리어=승/실패=패)` → 전적 탭 노출 | ✅ |

## 4. UI/UX 요구사항

- [x] 목적·조작 한 줄 안내(`.hint`): 못을 한 칸 건너 빈 구멍으로 뛰어넘어 제거한다.
- [x] 진행 상태 표시: 남은 못 수(`pegRemainingLabel`)·선택 안내(`pegSelectionPrompt`).
- [x] 종료·승패 명확 구분(`.outcome`): 클리어/완벽 클리어/실패를 `describePegSolitaireStatus`로 구분.
- [x] 잘못된 입력 피드백: 불법 클릭(빈 출발·도착 점유·대각선/거리 오류·건너뛸 못 없음·보드 밖)을
  `pegMoveErrorReason`으로 `.error` 안내(조용한 무시 금지).
- [x] 회복 경로: "새 게임" 버튼으로 `createPegSolitaire` 재호출 리셋, 같은 칸 재클릭=선택 해제.
- [x] 키보드 조작: 칸은 실제 `<button>`(포커스/Enter·Space).
- [x] 색 비의존: 못/빈 구멍/착지 가능을 색뿐 아니라 기호(●/◆)·입체·aria-label로 구분.
- [x] 좁은 화면 미파손: 보드 `boardGridStyle`·`max-width` 반응형.
- [x] 구현 로직 실제 호출: 화면이 도메인 `pegSolitaire`를 호출(보기 전용 아님).
- [x] 표시-상태 일치: 종료 시 `pegSolitaireCells`가 어떤 칸도 강조하지 않고 입력 차단.
- [x] 기록 저장 + 화면 내 통산 전적·연승(`StreakPanel`+`selfStreakSummary`/`SELF_PLAYER`).

## 5. 알려진 갭 / 백로그

- **실행 취소(undo)/힌트**: 미구현(선택적 향상). 막다른 길에서 되돌리려면 "새 게임"으로 재시작.
- **보드 변형(European 보드 등)**: 표준 English 십자만 지원(다른 시작 배치는 비목표).
- **보드 셀 키보드 내비게이션**: 화살표 이동/로빙 탭인덱스는 공통 백로그(별도 이슈).

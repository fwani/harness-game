# 바카라 (Baccarat / Punto Banco) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).
> 베팅 측·베팅액(가상 칩) 선택 → 표준 punto banco 타블로 자동 진행 → 배당 정산·뱅크롤·전적까지 UI에 연결됨(vs 하우스 1인 베팅).

## 1. 개요

- **장르**: 1인 카지노 베팅 게임(플레이어가 하우스/타블로를 상대로 베팅). 사람은 패를 조작하지 않고 **어느 측에 거는가**만 결정한다.
- **카드 모델**: 표준 52장 덱([`card.ts`](../../src/domain/card.ts))을 재사용. 끗수는 블랙잭과 다르다(A는 항상 1).
- **목표**: 한 판(플레이어 vs 뱅커)의 승자를 맞혀 가상 칩(뱅크롤)을 늘린다. 베팅 측은 **플레이어 · 뱅커 · 타이** 셋.

## 2. 규칙

### 끗수(점수) 계산 (`baccarat.ts` · `evaluateBaccaratHand`)
- 랭크 끗수: **A=1, 2~9=숫자 그대로, 10·J·Q·K=0**. 슈트는 무시한다.
- 손패 점수 = 끗수 합을 **10으로 나눈 나머지(0~9)**.
- **내추럴**: 정확히 2장이며 점수가 **8 또는 9**. 내추럴이면 양측 모두 추가 드로우 없이 즉시 비교.
- 빈 손패는 throw(손패에는 최소 1장 필요).

### 타블로(3rd-card) 진행 (`playBaccaratRound.ts`)
- 플레이어 먼저 번갈아 2장씩 분배(플레이어 idx 0·2 / 뱅커 idx 1·3), 나머지는 드로우 큐.
- 어느 한쪽이라도 내추럴(8/9)이면 즉시 종료·비교.
- **플레이어 규칙**: 초기 점수 0~5면 세 번째 카드를 받고, 6~7이면 스탠드.
- **뱅커 규칙**:
  - 플레이어가 스탠드(세 번째 카드 미수령)했으면 뱅커는 0~5 드로우 · 6~7 스탠드.
  - 플레이어가 세 번째 카드(끗수값 `p3`)를 받았으면 표준 타블로를 따른다:
    | 뱅커 점수 | 드로우 조건(플레이어 3rd 끗수 `p3`) |
    | --- | --- |
    | 0·1·2 | 항상 드로우 |
    | 3 | `p3 ≠ 8` 이면 드로우 |
    | 4 | `p3 ∈ 2..7` 이면 드로우 |
    | 5 | `p3 ∈ 4..7` 이면 드로우 |
    | 6 | `p3 ∈ 6..7` 이면 드로우 |
    | 7 | 스탠드 |
- 최종 끗수가 큰 쪽이 승, 같으면 **타이**. 같은 RNG 시퀀스면 항상 같은 결과(결정적).

### 배당 정산 (`baccarat.ts` · `settleBaccaratBet`)
- **플레이어 적중**: +bet (1:1).
- **뱅커 적중**: +`floor(bet × 0.95)` — 커미션 5% 차감(실수령 0.95:1, 내림).
- **타이 적중**: +bet × 8 (8:1).
- **타이 결과 + 플레이어/뱅커 베팅**: push(net 0, 원금 환원).
- 그 외 미적중: −bet. 베팅액이 양의 정수가 아니면 throw.

### 뱅크롤(가상 칩) (`baccaratBankrollView.ts`)
- 시작 뱅크롤 1000칩, 베팅액 프리셋 10·50·100·500(+직접 입력). 베팅액은 잔고로 클램프.
- 정산 net을 잔고에 반영(`nextBankroll`). 잔고 0이면 파산 → "새 뱅크롤로 리셋" 경로.
- **외부 인증·실거래 없음**: 뱅크롤은 세션/로컬 상태로만 유지되는 가상 칩이다.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인(끗수) | [`src/domain/baccarat.ts`](../../src/domain/baccarat.ts) | `evaluateBaccaratHand()` — 끗수·내추럴 | ✅ |
| 도메인(정산) | [`src/domain/baccarat.ts`](../../src/domain/baccarat.ts) | `settleBaccaratBet()` — punto banco 배당(1:1 / 0.95:1 / 8:1 / push) | ✅ |
| 애플리케이션 | [`src/application/playBaccaratRound.ts`](../../src/application/playBaccaratRound.ts) | `playBaccaratRound()` 타블로 진행 · `resolveBaccaratWager()` 베팅 결합 | ✅ |
| 인프라(RNG) | [`src/infrastructure/mathRandomSource.ts`](../../src/infrastructure/mathRandomSource.ts) | 셔플용 `RandomSource`(`Math.random`) | ✅ |
| UI | [`src/ui/games/Baccarat.tsx`](../../src/ui/games/Baccarat.tsx) | 베팅 측·베팅액 선택 → 딜링 → **카드 단계적 공개**(즉시 점프 금지) → 손패·끗수·승자·정산·뱅크롤 표시 | ✅ |
| UI 보조(뷰) | [`baccaratView.ts`](../../src/ui/games/baccaratView.ts) · [`baccaratStartOptionsView.ts`](../../src/ui/games/baccaratStartOptionsView.ts) · [`baccaratBankrollView.ts`](../../src/ui/games/baccaratBankrollView.ts) | 라벨 · **딜링 공개 순서(`baccaratRevealSteps`/`baccaratRevealedThrough`)** · 베팅 옵션·뱅크롤/정산 포맷(순수 함수, 단위 테스트) | ✅ |
| 기록 | `GameId="baccarat"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 매 판 베팅 기준 나=a 적중/b 빗나감/draw(타이 push)로 저장 → 전적 노출 | ✅ |

## 4. UI/UX 요구사항

- [x] 목적·조작·배당 안내(`.hint`): 베팅 측/액 선택 후 딜링, 1:1·0.95:1·8:1·타이 push 설명.
- [x] **시작 옵션 UI**: 베팅 측(플레이어/뱅커/타이) + 베팅액(프리셋·직접 입력) 선택(`aria-pressed`).
- [x] 현재 베팅 측·베팅액·보유 칩(뱅크롤)을 상시 표시(`aria-live`).
- [x] **딜링 단계적 공개(DoD A 턴제/상호작용)**: 플레이어→뱅커→플레이어→뱅커 초기 4장 + (있으면)세 번째 카드를 한 장씩 순차 공개(즉시 점프 금지). 진행 단계를 `role="status"` `aria-live`로 안내("뱅커 카드 공개 중" 등), "건너뛰기"로 즉시 전체 공개 선택 가능, 공개 중 "다시 딜링" 비활성. 정산·뱅크롤·전적은 **마지막 결과 공개 시 1회만** 반영(중복 없음).
- [x] 결과: 양측 손패(랭크+슈트 텍스트)·끗수·핸드 승자·베팅 적중 여부·정산액·갱신 잔고 명확 표시.
- [x] 잘못된 입력 피드백: 잔고 초과 베팅 비활성(`disabled`), 파산 시 경고(`role="alert"`)·리셋 경로.
- [x] "딜링/다시 딜링" 반복 경로와 파산 시 "새 뱅크롤로 리셋" 회복 경로.
- [x] 색 비의존: 인터랙티브 요소는 `<button>`(키보드 포커스), 카드 랭크+슈트 기호 텍스트 병행.
- [x] 디자인 토큰 사용(생짜 hex 금지), 좁은 화면(360px) 미파손.
- [x] 종료 시 결과를 전적에 저장 → 전적 탭 노출.

## 5. 알려진 갭 / 백로그

- **멀티플레이(B): 해당 없음(N/A)** — 바카라는 사람이 패를 조작하지 않고 **하우스/타블로를 상대로 거는 1인 베팅 게임**이라 턴 소유권·방 기반 원격 대전 개념이 없다. ROADMAP DoD의 "1인 게임 멀티 면제" 규칙으로 B를 면제한다(같은 테이블에 여러 명이 각자 베팅하는 실 카지노 멀티는 범위 밖 별도 백로그).
- **뱅크롤 영속성**: 뱅크롤·전적은 인메모리 — 새로고침 시 초기화(공통 갭).
- **베팅 변형**: 사이드 베팅(Pair·Big/Small 등)·다중 덱·버닝 카드는 범위 밖.

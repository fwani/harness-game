# 카드 (덱·딜·하이카드) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).
> 카드는 **공통 덱/딜 유틸**과 그 위의 **카드 게임(하이카드)**으로 나뉜다.

## 1. 개요

- **덱·딜**: 52장 표준 트럼프 덱을 만들고, 섞고, 인원·장수만큼 나눠준다. (게임이 아닌 유틸)
- **하이카드**: 두 카드를 랭크로 비교해 승자를 가린다. (가장 단순한 카드 게임)
- **인원**: 딜은 N명, 하이카드는 2인.

## 2. 규칙

### 덱·딜
- 덱: 4 무늬(♠♥♦♣) × 13 랭크 = **52장**, 중복 없음.
- 셔플: 주입된 `RandomSource`로 섞는다(결정적 테스트 가능, 인프라가 난수 제공).
- 딜: `players`명에게 `perPlayer`장씩 나눈다. 요청 총량이 덱(52장)을 넘으면 에러.

### 하이카드
- 랭크 수치는 **에이스 하이**: 2..10 = 2..10, J=11, Q=12, K=13, A=14.
- 무늬는 비교에 쓰지 않는다.
- 결과: a가 크면 `first`, b가 크면 `second`, 같으면 `draw`.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인(덱) | [`src/domain/card.ts`](../../src/domain/card.ts) | `createDeck()`, `rankValue()`, `compareCards()` | ✅ |
| 도메인(하이카드) | [`src/domain/highCard.ts`](../../src/domain/highCard.ts) | `compareHighCard(a, b)` → first/second/draw | ✅ |
| 애플리케이션(딜) | [`src/application/dealCards.ts`](../../src/application/dealCards.ts) | `shuffle(cards, rng)`, `deal(...)` → `DealResult` | ✅ |
| 애플리케이션(하이카드) | [`src/application/playHighCard.ts`](../../src/application/playHighCard.ts) | `playHighCardRound(rng)` — 덱 셔플→두 장 뽑아 비교 | ✅ |
| 인프라 | [`src/infrastructure/mathRandomSource.ts`](../../src/infrastructure/mathRandomSource.ts) | 셔플용 난수 | ✅ |
| UI(딜) | [`src/ui/games/Deal.tsx`](../../src/ui/games/Deal.tsx) | 인원·장수 입력 → 딜, 입력 검증 에러 표시 | ✅ |
| UI(하이카드) | [`src/ui/games/HighCard.tsx`](../../src/ui/games/HighCard.tsx) | "카드 뽑기" → 나 vs CPU 카드·승패 표시 | ✅ |
| 기록 | `GameId="card"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 하이카드 결과를 "나"/"CPU"로 저장 | ✅ |

## 4. UI/UX 요구사항

### 딜(현재)
- [x] 인원·장수 입력과 딜 결과 표시.
- [x] 잘못된 입력(총량 초과 등)에 사유 피드백.

### 하이카드(구현 완료)
- [x] 덱에서 두 카드를 뽑아 비교, 승자(승/패/무)를 명확히 표시.
- [x] "카드 뽑기"로 다시 뽑기(회복 경로).
- [x] 카드 표시는 색만이 아닌 기호+랭크 병행(`card-chip` 재사용).
- [x] 결과를 기록(`recordGame("card", …)`)에 저장 → 전적 탭 노출.

## 5. 알려진 갭 / 백로그

- ✅ ~~하이카드 오케스트레이션~~: `playHighCardRound(rng)` 추가(완료, 테스트 포함).
- ✅ ~~하이카드 UI~~: `HighCard.tsx` 신규 탭으로 추가(완료).
- **딜의 게임화**(선택): 딜은 유틸이라 승패가 없음. 비목표인지 명시 필요.

# 홀짝 (Odd/Even) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).

## 1. 개요

- **장르**: 1판 맞히기, 플레이어 vs 난수.
- **인원**: 1인.
- **목표**: 추첨될 수의 홀짝을 맞힌다.

## 2. 규칙

- 0–99 범위의 정수를 무작위로 추첨한다(범위는 인프라 `RandomNumberSource`가 정함).
- 플레이어는 `odd`(홀) 또는 `even`(짝)을 추측한다.
- 추첨 수의 홀짝이 추측과 같으면 승리.
- `parityOf`는 정수가 아니면 throw(도메인 불변식).

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/oddEven.ts`](../../src/domain/oddEven.ts) | `parityOf(n)`, `isWin(guess, drawn)` | ✅ |
| 애플리케이션 | [`src/application/playOddEven.ts`](../../src/application/playOddEven.ts) | `playRound(guess, source)` → `RoundResult` | ✅ |
| 인프라 | [`src/infrastructure/randomNumberSource.ts`](../../src/infrastructure/randomNumberSource.ts) | 0–99 난수 | ✅ |
| UI | [`src/ui/games/OddEven.tsx`](../../src/ui/games/OddEven.tsx) | 홀/짝 선택 → 추첨 → 결과 | ✅ |
| 기록 | `GameId="oddEven"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 매 판 "나"/"딜러"로 저장 → 전적 탭 노출 | ✅ |

## 4. UI/UX 요구사항

- [x] 조작 안내(`.hint`): "0–99 무작위 수의 홀짝을 맞혀보세요".
- [x] 추첨된 수와 승패 결과 표시.
- [x] **기록 저장** — 매 판 결과를 공통 저장소에 남기고 전적 탭에 노출.
- [ ] **누적/연승 점수(화면 내)** — 홀짝 화면 자체엔 통산 표시 없음(전적 탭과 별개).

## 5. 알려진 갭 / 백로그

- ✅ ~~기록 연동~~: `recordGame("oddEven", "나", "딜러", …)`로 저장(완료).
- **누적 점수/세션(화면 내)**: 홀짝 화면의 연승·통산 표시.
- **난이도/범위 옵션**(선택): 추첨 범위 조절 등은 비목표일 수 있음 — 정의 필요.

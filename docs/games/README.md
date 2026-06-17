# 게임 사양 (Game Specs)

> 이 디렉터리는 **게임별로 규칙(도메인) + UI/UX 요구사항 + 구현 상태**를 한 곳에 모은다.
> 목적은 한 가지다: 게임을 만들 때 **도메인 로직과 UI 연동 중 어느 한쪽도 누락되지 않게** 한다.
>
> 게임 제품에서는 규칙(도메인 로직)과 플레이 경험(UI/UX)이 동급의 제품 요소다.
> 도메인에 합법 수·승패 판정이 있어도 플레이어가 화면에서 쓸 수 없으면 게임으로는 미완성이다.

## 이 문서를 언제 보나

- **새 게임/규칙 이슈를 만들 때**: 해당 게임 사양에서 "구현 상태" 표를 보고, 도메인만 만드는
  이슈인지 UI 연동까지 짝으로 필요한지 판단한다.
- **UI 이슈를 만들 때**: 사양의 "UI/UX 요구사항" 체크리스트로 누락을 점검한다.
- **구현을 끝냈을 때**: 사양의 상태 표(✅/⚠️/❌)를 갱신한다(문서-코드 동기화, AGENTS.md 규칙).

## 관련 문서

- 제품 맥락·사용자·핵심 흐름 → [`../agent-harness/PRODUCT_CONTEXT.md`](../agent-harness/PRODUCT_CONTEXT.md)
- UI/UX 원칙·체크리스트·현재 UI 상태 → [`../agent-harness/UX_GUIDELINES.md`](../agent-harness/UX_GUIDELINES.md)
- 레이어 규칙(domain/application/infrastructure/ui) → [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)
- 문서 최신화 기준 → [`../agent-harness/DOC_GARDENING.md`](../agent-harness/DOC_GARDENING.md)

## 게임 목록

| 게임 | 사양 | 한 줄 요약 |
| --- | --- | --- |
| 가위바위보 | [rps.md](rps.md) | vs CPU 1판. 가위바위보 승패 판정 |
| 홀짝 | [odd-even.md](odd-even.md) | 0–99 난수의 홀짝 맞히기 |
| 카드 (덱·딜·하이카드) | [card.md](card.md) | 52장 덱 셔플·딜, 하이카드 비교 |
| 오목 | [gomoku.md](gomoku.md) | 2인 로컬, 5목 승리 판정 (레퍼런스 구현) |
| 바둑 | [go.md](go.md) | 2인 로컬 착수·따냄, 영역 계가 |
| 오델로 | [reversi.md](reversi.md) | 2인 로컬, 합법 수 착수·자동 패스·디스크 계가 |
| 장기 | [janggi.md](janggi.md) | 표준 차림, 이동·장군·외통 판정 |
| 윷놀이 | (사양 미작성) | vs CPU 말 1개 외곽 20칸 완주 경주, 도개걸윷모 |
| 2048 | [2048.md](2048.md) | 4×4 타일 슬라이드·병합, 2048 도달/이동 불가 판정 |
| 기록(공통) | [records.md](records.md) | 게임 종류 독립 전적 기록·집계 |

## 구현 상태 매트릭스 (갱신: 2026-06-16)

각 게임이 **도메인 → 애플리케이션 → UI → 기록 연동**의 어디까지 왔는지 한눈에 본다.
✅ 완료 · ⚠️ 부분 · ❌ 없음.

| 게임 | 도메인 규칙 | 애플리케이션 | UI 플레이 | 기록 연동 |
| --- | --- | --- | --- | --- |
| 가위바위보 | ✅ `rps.ts` | ✅ `playRps.ts` | ✅ vs CPU 1판 | ✅ 저장(`recordGame`) |
| 홀짝 | ✅ `oddEven.ts` | ✅ `playOddEven.ts` | ✅ vs 난수 | ✅ 저장 |
| 카드 딜 | ✅ `card.ts` | ✅ `dealCards.ts` | ✅ 딜만(유틸) | — (게임 아님) |
| 하이카드 | ✅ `highCard.ts` | ✅ `playHighCard.ts` | ✅ vs CPU 1판 | ✅ 저장(`GameId="card"`) |
| 오목 | ✅ `gomoku.ts` | ✅ `playGomoku.ts` | ✅ 2인 로컬 | ✅ 저장 |
| 바둑 | ✅ `go.ts`+`goScore.ts` | ✅ `playGo.ts` | ✅ 착수·패스·계가·승자 | ✅ 저장 |
| 오델로 | ✅ `reversi*.ts` | ✅ `playReversi.ts` | ✅ 착수·자동패스·계가·승자 | ✅ 저장 |
| 장기 | ✅ `janggi.ts` | ✅ `playJanggi.ts` | ✅ 선택·합법수·이동·턴·승부 | ✅ 저장 |
| 윷놀이 | ✅ `yut.ts`+`yutMove.ts` | ✅ `playYutTurn.ts` | ✅ vs CPU 20칸 완주 경주 | ✅ 저장(`GameId="yut"`) |
| 2048 | ✅ `game2048.ts` | ✅ `play2048.ts` | ✅ vs 자기기록(키보드·점수) | ✅ 저장(`GameId="game2048"`) |

> **2026-06-16 갱신**: 이전의 핵심 갭(장기 보기 전용, 하이카드 부재, 바둑 종료·계가 미연동,
> 기록 미저장)은 모두 닫혔다. 각 게임은 결과를 공통 저장소(`src/ui/records.ts`)에 기록하고,
> **전적** 탭([`Records.tsx`](../../src/ui/games/Records.tsx))에서 누적 승/패/무와 최근 기록을 본다.
> 남은 후속 작업(무승부 처리·영속성·원격 멀티 등)은 각 게임 사양의 "알려진 갭"과 `UX_GUIDELINES.md`를 본다.

## 게임 사양 템플릿

새 게임을 추가하면 아래 구조로 사양을 만든다(기존 문서 재사용).

1. **개요** — 무엇을, 누가, 몇 명이.
2. **규칙** — 도메인 규칙을 사람이 읽을 수 있게(좌표 규약·승패·예외 포함).
3. **구현 상태** — 도메인/애플리케이션/UI/기록을 위치+상태(✅/⚠️/❌) 표로.
4. **UI/UX 요구사항** — `UX_GUIDELINES.md` 체크리스트 기준의 화면 요건.
5. **알려진 갭 / 백로그** — 누락된 도메인·UI·기록 항목(이슈 후보).

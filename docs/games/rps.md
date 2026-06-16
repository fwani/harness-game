# 가위바위보 (RPS) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).

## 1. 개요

- **장르**: 1판 승부, 플레이어 vs CPU(난수).
- **인원**: 1인(상대는 CPU). 도메인은 2인 일반 판정(`judge(a, b)`).
- **목표**: 가위/바위/보 중 하나를 내서 상대를 이긴다.

## 2. 규칙

- 손은 셋: `rock`(바위) · `paper`(보) · `scissors`(가위).
- 상성: 바위>가위, 가위>보, 보>바위.
- 같은 손이면 무승부(`draw`).
- 판정 기준은 a(플레이어): `a-win` / `b-win` / `draw`.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/rps.ts`](../../src/domain/rps.ts) | `judge(a, b)` 승패 판정 | ✅ |
| 애플리케이션 | [`src/application/playRps.ts`](../../src/application/playRps.ts) | `playRpsRound(playerA, playerB)` — `HandSource.choose()`로 양쪽 손을 받아 한 판 | ✅ |
| 인프라 | [`src/infrastructure/randomHandSource.ts`](../../src/infrastructure/randomHandSource.ts) | CPU용 무작위 손 | ✅ |
| UI | [`src/ui/games/Rps.tsx`](../../src/ui/games/Rps.tsx) | 손 선택 → CPU와 1판, 결과 표시 | ✅ |
| 기록 | `GameId="rps"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 매 판 "나"/"CPU"로 저장 → 전적 탭 노출 | ✅ |

## 4. UI/UX 요구사항

- [x] 조작 안내(`.hint`): "손을 골라 CPU와 대결".
- [x] 결과를 명확히(승/패/무) 이모지+텍스트로.
- [x] **기록 저장** — 매 판 결과를 공통 저장소에 남기고 전적 탭에 노출.
- [ ] **누적/연승 점수(게임 화면 내)** — 전적 탭에는 통산이 쌓이나, RPS 화면 자체엔 연승 표시 없음.
- [x] 색만으로 구분하지 않음(이모지+레이블 병행).

## 5. 알려진 갭 / 백로그

- ✅ ~~기록 연동~~: `recordGame("rps", "나", "CPU", …)`로 저장 → 전적 탭 노출(완료).
- **누적 점수/세션(화면 내)**: RPS 화면 자체의 연승·통산 점수 표시(전적 탭과 별개).
- **멀티플레이**: 제품 설명의 "멀티"가 현재 vs CPU만. 원격 2인 범위는 별도 이슈.

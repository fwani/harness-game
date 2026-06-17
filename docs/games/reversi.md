# 오델로 (Reversi) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).
> 착수·자동 패스·디스크 계가·승자까지 UI에 연결됨(2인 로컬 핫시트).

## 1. 개요

- **장르**: 2인 로컬(핫시트) 보드 게임.
- **보드**: 8×8 고정. 표준 초기 배치(중앙 4칸 흑/백 교차).
- **목표**: 게임 종료 시 자기 색 디스크가 더 많은 쪽이 승리.

## 2. 규칙

### 착수·뒤집기 (`reversi.ts`)
- 빈 칸에만 착수. 한 방향 이상에서 상대 디스크가 끼여 뒤집히는 곳만 합법(`isLegalReversiMove`).
- 착수 시 8방향으로 끼인 상대 디스크를 모두 뒤집는다(`applyReversiMove`, 불변).
- 합법 수가 아니면 throw(범위 밖·비정수·뒤집힘 0개 동일 계약).

### 합법 수·패스·종료 (`reversiMoves.ts` / `reversiScore.ts`)
- `legalReversiMoves(board, stone)` — 결정적 순서(행→열)로 합법 수 전체 열거.
- `hasLegalReversiMove` — 한 수라도 있으면 true(패스 판정 토대).
- `isReversiGameOver` — 흑·백 모두 둘 곳이 없으면 종료.
- **자동 패스**: 상대가 둘 곳이 없고 자신은 있으면 차례가 자신에게 되돌아온다(`lastWasPass`).

### 계가 (`reversiScore.ts`)
- `countReversiDiscs(board)` — 흑/백 디스크 수 집계, 많은 쪽이 승자(동수면 무승부 `null`).

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인(착수) | [`src/domain/reversi.ts`](../../src/domain/reversi.ts) | `createReversiBoard()`, `applyReversiMove()`, `isLegalReversiMove()` | ✅ |
| 도메인(합법수) | [`src/domain/reversiMoves.ts`](../../src/domain/reversiMoves.ts) | `legalReversiMoves()`, `hasLegalReversiMove()` | ✅ |
| 도메인(계가) | [`src/domain/reversiScore.ts`](../../src/domain/reversiScore.ts) | `countReversiDiscs()`, `isReversiGameOver()` | ✅ |
| 애플리케이션 | [`src/application/playReversi.ts`](../../src/application/playReversi.ts) | `startReversiGame()`, `applyReversiTurn()`, `reversiResult()` → `ReversiState` | ✅ |
| UI | [`src/ui/games/Reversi.tsx`](../../src/ui/games/Reversi.tsx) | 8×8 합법 수 착수·**자동 패스 안내·디스크 점수·승자/무 표시**. `playReversi` 상태 사용 | ✅ |
| 기록 | `GameId="reversi"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 종료 시 흑=a/백=b/무=draw로 저장 | ✅ |

## 4. UI/UX 요구사항

- [x] 목적·조작법 한 줄 설명(`.hint`).
- [x] 현재 차례(●흑/○백)와 흑/백 디스크 수 표시.
- [x] 합법 수 칸만 활성화·하이라이트(불법 수는 애초에 비활성).
- [x] 자동 패스 사유 피드백(`lastWasPass`).
- [x] 종료 시 디스크 수·승자(또는 무승부) 명확 표시(`.outcome`).
- [x] "새 게임" 리셋 회복 경로.
- [x] 인터랙티브 요소는 `<button>`(키보드 포커스), 색만이 아닌 기호+레이블 병행.
- [x] 종료 시 결과를 전적에 저장 → 전적 탭 노출.

## 5. 알려진 갭 / 백로그

- ✅ ~~오델로 플레이 UI 연동~~: 착수·자동 패스·계가·승자·기록(완료).
- **vs-CPU(AI)**: `chooseRandomReversiMove`(#149)·`createReversiEngine`와 연동한 대-CPU 모드(별도 이슈).
- **원격 멀티플레이**: 로컬 핫시트만 — 원격 대전은 범위 밖.
- **기록 영속성**: 인메모리 — 새로고침 시 초기화(공통 갭).

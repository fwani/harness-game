# 오목 (Gomoku) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).
> 현재 보드 게임 UI의 **레퍼런스 구현**(턴/승자/리셋이 다 갖춰짐).

## 1. 개요

- **장르**: 2인 로컬(핫시트) 보드 게임.
- **보드**: 기본 15×15(도메인 `createBoard(size)`로 크기 조절 가능, UI는 15 고정).
- **목표**: 가로/세로/대각으로 같은 색 돌 5개를 먼저 잇는다.

## 2. 규칙

- 빈 칸에만 착수, 이미 돌이 있거나 보드 밖이면 throw(불변·불법 수 거부).
- 흑이 먼저, 이후 번갈아 둔다.
- 방금 둔 돌 기준 4방향(가로·세로·두 대각) 중 같은 색이 **5개 이상 연속**이면 그 색 승리.
- `placeStone`은 불변: 입력 보드를 변형하지 않고 새 보드를 반환한다.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/gomoku.ts`](../../src/domain/gomoku.ts) | `createBoard()`, `placeStone()`, `checkWin()`, `isBoardFull()` | ✅ |
| 애플리케이션 | [`src/application/playGomoku.ts`](../../src/application/playGomoku.ts) | `startGame(size)`, `applyMove(state, x, y)` → `GomokuState{board, next, winner, isDraw}`, `isFinished(state)` (무승부 종료 포함) | ✅ |
| UI | [`src/ui/games/Gomoku.tsx`](../../src/ui/games/Gomoku.tsx) | 2인 로컬 착수, 턴/승자 표시 | ✅ |
| 기록 | `GameId="gomoku"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 승자 확정 시 "흑"/"백"으로 저장 | ✅ |

## 4. UI/UX 요구사항

- [x] 현재 차례(흑/백) 표시.
- [x] 승자 표시("흑 승리! 🎉").
- [x] 이미 둔 칸/종료 후 입력 무시.
- [x] "새 게임" 리셋 버튼.
- [x] **기록 저장** — 승자 확정 시 결과를 저장하고 전적 탭에 노출.
- [x] **무승부(보드 가득 참)** — 5목 없이 꽉 차면 application(`playGomoku`)에서 `isDraw=true`로 종료, UI는 "무승부! 🤝" 표시 후 `draw` 기록.

## 5. 알려진 갭 / 백로그

- ✅ ~~기록 연동~~: 승자 확정 시 `recordGame("gomoku", "흑", "백", …)` 저장(완료).
- ✅ ~~무승부 처리~~: 승자 없이 보드가 가득 차면 application `applyMove`가 도메인 `isBoardFull`로 판정해 `isDraw=true`로 종료(`isFinished` 헬퍼 제공). UI는 application 상태만 소비해 "무승부! 🤝" 표시·`draw` 기록(완료).
- **금수(렌주 룰)** 등 변형 규칙은 비목표 — 필요 시 별도 정의.

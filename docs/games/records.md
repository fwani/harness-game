# 기록 (Game Records) 사양 — 공통

> 게임 종류에 독립적인 "한 판 결과" 기록·전적 집계. 상위 인덱스: [README.md](README.md).
> 이건 단일 게임이 아니라 **모든 게임이 공유하는 횡단 관심사**다.

## 1. 개요

- **목적**: 어떤 게임이든 한 판 결과를 같은 모델로 기록하고, 플레이어별 전적(승/패/무)을 집계한다.
- 제품 설명의 "기록을 할 수 있는 게임시스템"을 떠받치는 토대.
- 도메인은 입력만으로 **결정적**이다 — 시각(timestamp)·식별자 생성 같은 비결정 요소는
  도메인에 두지 않는다(추후 infrastructure 포트).

## 2. 규칙(모델)

- `GameRecord`: `{ game, outcomes }`. `outcomes`는 2인 기준 **정확히 2개**.
- 승패 조합 유효성: `(win, loss)` 또는 `(draw, draw)`만 허용 — 그 외 조합이면 throw.
- 플레이어 라벨은 공백 아닌 문자열, 두 플레이어는 서로 달라야 한다.
- `summarize`: 여러 판을 플레이어별 `{wins, losses, draws}`로 집계. 등장 순서 보존(결정적).
- `summarizeByGame`: 게임(`GameId`)별로 묶어 각 게임의 `PlayerStats[]`를 집계. 기록 있는 게임만,
  게임/플레이어 모두 처음 등장 순서 보존(결정적, 입력 불변).
- **`GameId` = `"rps" | "oddEven" | "gomoku" | "card" | "go" | "janggi" | "reversi" | "dice"`** (전 게임 커버).

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/gameRecord.ts`](../../src/domain/gameRecord.ts) | `createGameRecord()`, `summarize()`, `summarizeByGame()`, `GameId`, `PlayerStats`, `GameStats` | ✅ |
| 애플리케이션 | [`src/application/gameRecordStore.ts`](../../src/application/gameRecordStore.ts) | `GameRecordRepository` 포트, `standings(repo)` | ✅ |
| 인프라 | [`src/infrastructure/inMemoryGameRecordRepository.ts`](../../src/infrastructure/inMemoryGameRecordRepository.ts) | 인메모리 저장소 | ✅ |
| 애플리케이션(쓰기) | [`src/application/recordRound.ts`](../../src/application/recordRound.ts) | `recordRound(repo, game, players, winner)` — 승자→검증된 기록 저장 | ✅ |
| UI(연동) | [`src/ui/records.ts`](../../src/ui/records.ts) | 공유 저장소 + 구독 + `recordGame()`(저장은 `recordRound`에 위임) | ✅ |
| UI(뷰 헬퍼) | [`src/ui/games/recordsByGameView.ts`](../../src/ui/games/recordsByGameView.ts) | `buildRecordsByGameRows()` — 게임별 전적 표시 행 변환(`summarizeByGame` 재사용) | ✅ |
| UI(화면) | [`src/ui/games/Records.tsx`](../../src/ui/games/Records.tsx) | "전적" 탭 — 플레이어별 승/패/무 표 + 게임별 전적 표 + 최근 기록 | ✅ |

> 각 게임 화면이 한 판을 끝내면 `recordGame(game, playerA, playerB, win)`을 호출해 저장하고,
> 전적 화면은 `useSyncExternalStore`로 변경을 구독해 실시간 갱신한다.

## 4. UI/UX 요구사항

- [x] **결과 저장 연동**: 6개 게임이 한 판 종료 시 `recordGame(...)` 호출 → `repo.save(...)`.
- [x] **전적/히스토리 화면**: `standings(repo)`로 승/패/무 표 + 대국 기록 목록.
- [x] 빈 기록 상태를 명확히 표시("아직 기록이 없습니다…").

## 5. 알려진 갭 / 백로그

- ✅ ~~`GameId` 확장~~: `"go"`·`"janggi"`·`"reversi"`·`"dice"` 추가(완료).
- ✅ ~~기록 저장 연동~~: 전 게임 "종료 → 저장" 연결(완료).
- ✅ ~~기록 노출 UI~~: "전적" 탭 신설(완료).
- ✅ ~~게임별(per-game) 전적~~: "게임별 전적" 표 추가(`summarizeByGame` + `Records.tsx`, 완료).
- **영속성**: 현재 인메모리만 — 새로고침 시 소실. 영속 저장소(localStorage/서버) 필요 여부 정의.
- **플레이어 라벨 정합성**: vs CPU는 "나"/"CPU"/"딜러", 보드 게임은 "흑"/"백"·"초"/"한"으로
  라벨이 게임마다 달라 전적이 라벨별로 분리 집계된다. 통합 식별 체계(로그인/세션) 필요 여부 정의.
- ✅ ~~오목 무승부 기록~~: 보드 가득 종료가 application `playGomoku`(`isDraw`)에 모델링되어, UI가 `draw`로 기록(완료). 바둑/장기의 2인 승패 매핑도 연결됨.

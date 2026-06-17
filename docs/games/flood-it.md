# 플러드 잇(Flood-It) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).

## 1. 개요

- **장르**: 색 칠하기 퍼즐, 1인(플레이어 vs 자기 기록).
- **인원**: 1인.
- **목표**: NxN 색 격자에서 좌상단(0,0)을 기준으로, 매 턴 한 색을 골라 좌상단과 연결된
  동일 색 영역(flood region)을 그 색으로 칠한다. 보드 전체가 한 색이 되면 클리어.

## 2. 규칙

- 행 우선(row-major) `board[row][col]` 정사각 격자. 각 칸은 색 인덱스 `0..colorCount-1`.
  (색상값이 아니라 인덱스로 다뤄 UI에서 색 비의존 라벨/기호 렌더가 가능하다.)
- **flood region**: 좌상단(0,0)과 4방 인접(상/하/좌/우, 대각선 제외)으로 연결된 동일 색 칸들.
- 한 수: 현재 좌상단 색과 **다른** 색 하나를 골라 flood region 전체를 그 색으로 칠한다.
  칠한 뒤 영역이 인접한 같은 새 색 칸으로 확장된다(다음 region이 커진다).
- 같은 색(보드 불변) 선택과 범위 밖 색은 **불법 수**로 정의해 일관 처리한다(throw).
- 승리: 보드 전체가 단일 색(`isFloodItSolved`).
- 결정적 순수 규칙만 도메인 범위다. 무작위 시작 보드 생성은 application(`RandomSource` 주입)
  후속 짝 이슈로 분리한다.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/floodIt.ts`](../../src/domain/floodIt.ts) | `createFloodIt`/`currentRegion`/`isLegalFloodMove`/`legalFloodMoves`/`applyFloodMove`/`isFloodItSolved`/`topLeftColor` | ✅ |
| 애플리케이션 | (후속 짝 이슈) | `createScrambledFloodIt`(또는 `createFloodItBoard`, `RandomSource` 주입으로 무작위·풀이 가능 시작 보드 생성) | ❌ |
| UI | (후속 짝 이슈) | `FloodIt.tsx`(색 비의존 라벨/기호 렌더, 턴 수 제한 표시, 클리어 판정, 새 게임, 전적 저장) | ❌ |

## 4. UI/UX 요구사항 (후속 UI 이슈에서 충족)

- [ ] 목적·조작 한 줄 안내(`.hint`): 색을 골라 좌상단 영역을 넓혀 전부 한 색으로 만든다.
- [ ] 진행 상태 표시: 사용한 턴 수(/제한)·현재 영역 크기 등. 턴제가 아니므로 진행을 노출.
- [ ] 종료·승패 명확 구분(`.outcome`): 클리어(단색)와 턴 소진 실패를 구분.
- [ ] 잘못된 입력 피드백: 같은 색(보드 불변) 선택은 `.error`로 안내.
- [ ] 회복 경로: "새 게임" 버튼으로 무작위 보드 재생성 리셋.
- [ ] 키보드 조작: 색 선택을 실제 `<button>`/키보드로.
- [ ] 색 비의존: 색뿐 아니라 라벨/기호로 칸을 구분(색각 이상 대응).
- [ ] 좁은 화면 미파손: 보드 `max-width`·반응형 셀.
- [ ] 구현 로직 실제 호출: 화면이 도메인/application을 호출(보기 전용 아님).
- [ ] 기록 저장 + 화면 내 통산 전적·연승(`StreakPanel`).

## 5. 알려진 갭 / 백로그

- **무작위 시작 보드 생성(application)**: `RandomSource` 주입으로 결정적·풀이 가능 보드 생성
  헬퍼가 후속 짝 이슈로 필요(`createScrambledLightsOut` 패턴 참고).
- **플레이 UI 연동(`FloodIt.tsx`)**: 도메인만 존재 — UI 연동 후속 짝 이슈로 필요.
- **턴 수 제한/목표 수**: 최소 수 계산·턴 제한 규칙은 도메인 범위 밖(정의 시 application/UI).

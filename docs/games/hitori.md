# 히토리(Hitori) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).

## 1. 개요

- **장르**: 결정적 1인 격자 논리 퍼즐(스도쿠/네모로직/비나이로/후토시키 패밀리).
- **인원**: 1인.
- **목표**: 숫자가 미리 채워진 N×N(N≥2) 격자에서 일부 칸을 **칠해(black)** 남은 칸(white)이
  세 제약을 모두 만족하면 클리어한다.

## 2. 규칙

- 행 우선(row-major) `numbers[row][col]` 정사각 격자. 모든 칸은 양의 정수.
- 각 칸은 **white(미칠)** 또는 **black(칠)** 두 상태. 초기에는 전부 white.
- 클리어 3제약:
  1. **white 중복 금지**: 칠하지 않은(white) 칸 기준, 각 행·열에 같은 숫자가 두 번 이상 나오지 않는다.
  2. **black 비인접**: 칠한(black) 칸끼리 상하좌우(대각선 제외)로 인접하지 않는다.
  3. **white 연결**: 칠하지 않은(white) 칸 전체가 상하좌우로 하나의 영역으로 연결된다.
- 무작위성 없는 순수·불변 함수만 도메인 범위다. 입력 상태를 변형하지 않고 새 상태를 반환한다.
  비정상 입력(비정사각·양의 정수 아님·범위 밖 토글)은 한국어 사유로 `throw`.
- 무작위 시작(어떤 퍼즐로 시작할지)·전적 저장은 도메인 범위 밖이며, 후속 application/UI 짝 이슈로 분리한다.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/hitori.ts`](../../src/domain/hitori.ts) | `createHitori`/`toggleHitoriCell`/`inHitoriBounds`/`hitoriViolations`/`isHitoriSolved`/`HITORI_PUZZLES` | ✅ |
| 애플리케이션 | (미구현) | 무작위 시작 헬퍼(`RandomSource` 주입) — 후속 짝 이슈 | ❌ |
| UI | (미구현) | `Hitori.tsx` + `hitoriView` 플레이 화면·전적 저장(`GameId="hitori"`) — 후속 짝 이슈 | ❌ |

- `hitoriViolations`는 세 위반 종류(`"duplicate"`/`"adjacent"`/`"disconnected"`)를 위치와 함께 구분 반환해
  UI 강조에 쓸 수 있다. `isHitoriSolved`는 `hitoriViolations`가 빈 배열인 것과 동치다.

## 4. UI/UX 요구사항 (후속 UI 이슈에서 충족)

- [ ] 목적·조작 한 줄 안내(`.hint`): 칸을 칠해 white가 행/열 중복 없이·black 비인접·white 연결되게 한다.
- [ ] 진행 상태 표시: 칠한 칸 수/위반 수 등.
- [ ] 종료·승리 명확 표시(`.outcome`): 클리어 구분.
- [ ] 잘못된 입력 피드백(`.error`): 범위 밖 토글 등 도메인 에러 사유.
- [ ] 회복 경로: "새 게임"/리셋.
- [ ] 키보드 조작: 칸은 실제 `<button>`. 색만으로 white/black·위반을 구분하지 않음(기호/`aria-label`).
- [ ] 좁은 화면 미파손: `boardGridStyle`·`max-width`.
- [ ] 구현 로직 실제 호출: 화면이 도메인(`toggleHitoriCell`/`hitoriViolations`/`isHitoriSolved`)을 호출(보기 전용 아님).
- [ ] 기록 저장 + 화면 내 통산 전적·연승(`GameId`=`hitori`, `StreakPanel`).

## 5. 알려진 갭 / 백로그

- **무작위 시작 헬퍼(application)**: `HITORI_PUZZLES`에서 `RandomSource` 주입으로 한 판 시작·토글 진행을
  오케스트레이션하는 application 헬퍼가 필요(스도쿠/비나이로/후토시키와 동일 패턴) — 후속 짝 이슈.
- **플레이 UI 연동(`Hitori.tsx` + `hitoriView`)**: 도메인은 존재 — UI 연동 후속 짝 이슈로 필요.

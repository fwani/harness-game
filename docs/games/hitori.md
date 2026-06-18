# 히토리(Hitori) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).

## 1. 개요

- **장르**: 결정적 격자 논리 퍼즐, 1인.
- **인원**: 1인.
- **목표**: 숫자가 미리 채워진 N×N 격자에서 일부 칸을 **칠해(black)** 세 제약을 모두 만족시킨다.
  (1) 칠하지 않은(white) 칸 기준 각 행·열에 같은 숫자가 두 번 나오지 않고, (2) 칠한 칸끼리
  상하좌우로 인접하지 않으며, (3) 칠하지 않은 칸 전체가 하나로 연결되면 클리어.

## 2. 규칙

- 행 우선(row-major) `numbers[row][col]` 정사각 N×N(N≥2) 격자. 모든 칸은 양의 정수(고정 단서).
- 각 칸의 칠 상태 `marks[row][col]`는 `"white"`(미칠) 또는 `"black"`(칠). 시작은 전부 white.
- **세 제약(클리어 조건)**:
  1. white로 남은 칸 기준, 같은 행·열에 같은 숫자가 둘 이상 있으면 안 된다(중복 금지).
  2. black 칸끼리 4방(상/하/좌/우, 대각선 제외) 인접 금지.
  3. white 칸 전체가 4방 인접으로 하나로 연결되어야 한다.
- `hitoriViolations`는 위 세 종류를 `type`(`duplicate-white`/`adjacent-black`/`disconnected-white`)으로
  구분해 위반 위치(좌표/쌍)와 함께 열거한다(UI 색 비의존 강조용). 위반이 비면 `isHitoriSolved`가 `true`
  (둘은 동치).
- 범위 밖 좌표 토글·비정사각/음수·비정수 숫자판은 한국어 사유로 `throw`(조용한 무시 금지).
- 결정적 순수 규칙만 도메인 범위다. 무작위 시작 퍼즐 생성은 application(`RandomSource` 주입) 후속
  짝 이슈로 분리한다.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/hitori.ts`](../../src/domain/hitori.ts) | `createHitori`/`toggleHitoriCell`/`hitoriMarkAt`/`inHitoriBounds`/`hitoriViolations`/`isHitoriSolved` | ✅ |
| 애플리케이션 | (미구현) | 무작위 시작 퍼즐 뱅크 + `RandomSource` 주입 시작 헬퍼 | ❌ |
| UI | (미구현) | 플레이 화면(칸 칠하기·위반 강조·클리어·새 게임·전적 저장) | ❌ |

## 4. UI/UX 요구사항 (후속 UI 이슈에서 충족 예정)

> `UX_GUIDELINES.md`의 "새 게임 화면 UI/UX 체크리스트" 기준. 아직 화면이 없어 모두 미충족(❌).

- [ ] 목적·조작 한 줄 안내(`.hint`): 칸을 칠해 행/열 중복을 없애고 white를 한 덩어리로 만든다.
- [ ] 진행 상태 표시: 칠한 칸 수·남은 위반 등(턴제가 아니므로 진행을 노출).
- [ ] 클리어 판정 표시(`.outcome`).
- [ ] 잘못된 입력 피드백: 세 위반 종류를 색 비의존(밑줄/기호/라벨)으로 강조.
- [ ] 회복 경로: "새 게임" 버튼으로 퍼즐 재시작.
- [ ] 키보드 조작·반응형·색 비의존.
- [ ] 도메인(`toggleHitoriCell`/`hitoriViolations`/`isHitoriSolved`) 실제 호출(보기 전용 아님).
- [ ] 전적 저장(`GameId="hitori"`).

## 5. 알려진 갭 / 백로그

- **무작위 시작 퍼즐 생성(application)**: `RandomSource` 주입 + 풀이 가능한 퍼즐 뱅크에서 무작위 시작
  헬퍼가 후속 짝 이슈로 필요(`pickRandomHitoriPuzzle`/`startHitoriGame`/`playHitoriToggle` 류).
- **플레이 UI 연동(`Hitori.tsx` + `hitoriView`)**: 도메인만 존재 — UI 연동 후속 짝 이슈로 필요
  (`UX_GUIDELINES.md` "새 게임 화면 UI/UX 체크리스트" 충족 + 전적 저장 `GameId="hitori"`).

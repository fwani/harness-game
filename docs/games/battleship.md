# 배틀십 (Battleship) 사양

> 규칙 + 구현 상태 + UI/UX 요구사항. 상위 인덱스: [README.md](README.md).
> 함대 배치(직접/무작위)·사격(명중/빗나감/격침)·전 함대 격침 승패까지 vs CPU UI에 연결됨.

## 1. 개요

- **장르**: vs CPU 1인 플레이(사람=a / CPU=b).
- **보드**: 10×10 고정, 양측 각자 함대 보드(사람 함대 / CPU 함대).
- **함대**: 표준 5척 — 항공모함5·전함4·순양함3·잠수함3·구축함2(`STANDARD_FLEET`).
- **목표**: 상대 함대를 먼저 전부 격침(전 함대 격침)하면 승리.

## 2. 규칙

### 보드·배치 (`battleship.ts`)
- `createBattleshipBoard(size, ships)` — size×size 격자에 함선 배치(겹침/범위/ id 중복 검증, 불변).
- `isValidPlacement(size, ships)` — 범위·겹침 검증(인접은 허용).
- `shipCellsAt(row, col, size, orientation)` — 한 함선이 점유할 칸 목록(내부 `shipCells` 재사용, 배치 미리보기용).

### 사격·격침 (`battleship.ts`)
- `fireShot(board, row, col)` — 한 칸 사격(불변, 이미 쏜 칸은 멱등, 범위 밖은 throw).
- `isHit` / `isShipSunk` / `isFleetDestroyed` — 명중·함선 격침·전 함대 격침 판정.

### 무작위 배치·CPU 사격 (`playBattleship.ts`)
- `placeFleetRandomly(size, fleet, rng)` — `isValidPlacement`로 유효 배치만 채택(난수 주입).
- `chooseRandomShot(board, rng)` — 미사격 칸 중 균등 선택(난수 주입, 쉬움 난이도용).
- `chooseSmartShot(board, rng)` — 헌트/타깃 추적(어려움 난이도용): 미격침 함선에 명중하면 인접 미사격 칸 우선, 두 칸 이상 일직선 명중이면 직선 연장칸 우선, 타깃 후보 없으면 체커보드 패리티 헌트(난수 주입). `isHit`/`isShipSunk` 재사용.
- `playBattleshipShot(board, row, col)` — 한 발 사격 후 명중·격침·전 함대 격침 계산.

### 배치 단계 (`battleshipView.ts`, presentation)
- `nextShipSize(placed, fleet)` — 다음 배치할 함선 길이(모두 배치 시 null).
- `placeShipAt(placed, next, size, row, col, orientation, boardSize)` — 후보 함선 배치(`isValidPlacement`로 검증, 실패 시 ok=false·불변).
- `placementPreview(placed, next, size, row, col, orientation, boardSize)` — 미리보기 칸 + 유효성(`shipCellsAt`+`isValidPlacement`).
- `placementComplete(placed, fleet)` · `toggleOrientation(o)` · `placementStatusLabel(placed, fleet)` — 완료 판정·방향 토글·안내 라벨.

### vs CPU 턴 진행 (`battleshipView.ts`, presentation)
- `playHumanTurn(cpuBoard, row, col)` — 사람 사격 1발만 진행(CPU 보드 갱신·결과·전 함대 격침 시 outcome=a).
- `playCpuTurn(humanBoard, rng, difficulty="easy")` — CPU 사격 1발만 진행(미사격 칸이 없으면 cpuShot=null로 생략).
  난이도에 따라 CPU 좌표를 `chooseRandomShot`(easy=무작위) 또는 `chooseSmartShot`(hard=헌트/타깃 추적)로 고른다.
  UI는 사람 사격 결과를 먼저 화면에 반영한 뒤 짧은 지연(생각 중) 후 CPU 반격을 드러내려고 두 함수를 단계적으로 호출한다.
- `playBattleshipCpuRound(humanBoard, cpuBoard, shot, rng, difficulty="easy")` — 위 두 턴을 한 번에 합성(한 번에 두 턴이 필요한 호출부·테스트용).
  명중해도 한 발씩 교대(단순화). 사람 사격으로 전 함대 격침이면 CPU는 쏘지 않는다.
- `difficultyLabel(difficulty)` — 난이도 한국어 라벨("쉬움 (무작위)"/"어려움 (추적)").

### 멀티(DoD B) 엔진·안개 가림 (`battleshipEngine.ts`, application)
- `createBattleshipEngine()` — 양측 보드를 들고 멀티 코어가 통일되게 쓰는 `GameEngine` 어댑터(init/turn/isLegal/apply/status).
- `redactBattleshipState(state, viewer)` — 시점(side)별 안개(fog-of-war) 가림 순수 함수: viewer 자기 보드는 그대로,
  상대 보드의 **미사격 칸**은 `hasShip:false`·`shipId:null`로 덮어 함선 위치를 숨긴다(사격된 명중/빗나감 칸·`next`는 보존, 입력 불변).
  멀티 전송 시 연결별로 redact한 뷰를 라우팅해 상대 함선 위치 누수를 막는다(실제 ws side 라우팅은 후속). 하위 헬퍼 `redactOpponentBoard(board)`.

### 멀티(DoD B) 배치 setup 단계 (`battleshipSetup.ts`, application)
- `createBattleshipSetup(size, fleet)`·`submitFleet(setup, side, ships)`·`isSetupComplete(setup)`·`startBattleshipMatch(setup)`·`redactSetup(setup, viewer)` — 두 사람이 각자 함대를 비공개로 제출(길이 multiset 일치 + `isValidPlacement` 통과 시에만 채택, 실패는 `ok:false`로 거부·입력 불변, 양측 완료 전까지 재제출 허용)하고, 양측 완료 시 기존 `createBattleshipEngine().init`으로 사격 엔진 상태를 생성하는 전송 비종속 순수 단위. `redactSetup`은 상대 함대 위치를 숨기고 제출 여부만 노출(제출=`[]`/미제출=`null`).

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/battleship.ts`](../../src/domain/battleship.ts) | 보드·배치 검증·사격·격침·전 함대 격침 | ✅ |
| 애플리케이션 | [`src/application/playBattleship.ts`](../../src/application/playBattleship.ts) | `placeFleetRandomly`·`chooseRandomShot`·`chooseSmartShot`(헌트/타깃 AI)·`playBattleshipShot` | ✅ |
| UI(싱글 진입·모드) | [`src/ui/games/BattleshipGame.tsx`](../../src/ui/games/BattleshipGame.tsx) + [`battleshipMode.ts`](../../src/ui/games/battleshipMode.ts) | 시작 화면 **싱글(vs CPU)/멀티(방)** 모드 세그먼트(`role="group"`+`aria-pressed`, 색 비의존)로 분기 | ✅ |
| UI(싱글) | [`src/ui/games/Battleship.tsx`](../../src/ui/games/Battleship.tsx) | 배치 단계(직접/무작위 배치·회전·미리보기·CPU 난이도 선택) → 사격 단계(두 보드 렌더·사격 클릭·CPU 차례 "생각 중" 단계 표시 후 반격·승패·새 게임) | ✅ |
| UI(멀티 온라인, 단계5) | [`src/ui/games/BattleshipMulti.tsx`](../../src/ui/games/BattleshipMulti.tsx) + [`battleshipRoomClient.ts`](../../src/ui/games/battleshipRoomClient.ts) | 주입형 `RoomClient` 포트(send/subscribe)만 소비하는 방 화면 — 방 코드 입장·좌석 배정·비공개 배치(`submitSetup`)·시점별 안개 사격(`makeMove`)·턴 소유권·전 함대 격침·재대국. 기본값은 소켓 없는 **인메모리 허브**(`reduceRoom`+`resolveSetup`+`redactBattleshipState` 위에 좌석별 라우팅)로 한 화면 2석 로컬 시뮬. `battleshipMultiView` 좌석 뷰 소비 | ✅(인메모리 전송) / 실 native ws 바인딩 후속(#595) |
| 멀티(엔진) | [`src/application/battleshipEngine.ts`](../../src/application/battleshipEngine.ts) | `createBattleshipEngine` GameEngine 어댑터 + `redactBattleshipState`/`redactOpponentBoard`(시점별 안개 가림 순수 함수) | ✅(엔진·가림) / ws side 라우팅 후속 |
| 멀티(배치 setup) | [`src/application/battleshipSetup.ts`](../../src/application/battleshipSetup.ts) | `createBattleshipSetup`·`submitFleet`·`isSetupComplete`·`startBattleshipMatch`·`redactSetup`(양측 비공개 배치 제출→매치 시작, 전송 비종속 순수 단위) | ✅(순수 단위) / UI 소비 후속 |
| 멀티(방 런타임 연동) | [`src/infrastructure/server/room.ts`](../../src/infrastructure/server/room.ts) + [`setupRegistry.ts`](../../src/infrastructure/server/setupRegistry.ts) | 게임 무관 `SetupAdapter`/`resolveSetup` 주입 — 2석 착석 시 setup 시작(즉시 매치 X), `submitSetup` 메시지로 양측 비공개 함대 제출 후 `startBattleshipMatch`로 매치 시작. 좌석별 `redactSetup` 뷰(`setupState`)로 상대 위치 미노출 | ✅(단일 방 reduceRoom) / native ws 전송 후속(#595) |
| 기록 | `GameId="battleship"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 종료 시 사람=a/CPU=b로 저장 | ✅ |

## 4. UI/UX 요구사항

- **배치 단계 → 사격 단계 2단계**: 사격 전 내 함대를 직접 배치(클릭=시작좌표, R/버튼=회전, 미리보기로 가능/불가 표시),
  "무작위 배치"·"초기화"·"이 배치로 시작" 버튼. 배치 완료 후에만 사격 단계 진입(CPU 함대는 무작위). 미리보기는
  색뿐 아니라 외곽선(`--good`/`--bad`)+aria-label로 가능/불가를 구분, 잘못된 위치는 `.error`로 사유 표시.
- **CPU 난이도 선택**: 배치 단계에서 쉬움(무작위)/어려움(추적)을 고른다(`role="group"`+`aria-pressed`, 키보드 접근). 새 게임에도 선택이 유지되고, 사격 단계 안내에 현재 난이도를 표시(`difficultyLabel`).
- 목적·조작법 한 줄 설명(`.hint`), 현재 진행/승패 표시(`battleshipStatusLabel`).
- **CPU 차례가 화면에 드러난다(DoD A)**: 사람 사격 직후 결과를 먼저 보여주고, 짧은 지연 동안 상태줄에
  "CPU 차례: 생각 중…"(`role="status"` aria-live)을 표시한 뒤 CPU 반격 결과를 단계적으로 공개한다(즉시 동시 처리 금지).
  이 지연 동안 적 보드 사격은 비활성(중복 입력 차단).
- 미사격/빗나감(○)/명중(✕)/격침(💥)·함선(■)을 색뿐 아니라 기호+aria-label로 구분(`cellView`).
- 사격 결과 요약(명중/빗나감/`○○함 격침`/전 함대 격침)을 텍스트로 안내(`shotSummary`).
- 이미 쏜 칸은 비활성, 종료 후 입력 차단, "새 게임" 회복 경로, 좁은 화면 대응(`boardGridStyle`).
- **멀티(방) 모드(DoD B, 단계5)**: 시작 화면에서 싱글/멀티를 고르고(`role="group"`+`aria-pressed`), 멀티는
  방 코드 입력→입장(좌석 p1/p2 배정·상대 입장 안내 `role="status"`), 좌석별 비공개 배치(상대 위치 미노출·제출 여부만),
  내 차례에만 상대 보드 사격(턴 소유권 — 상대 차례엔 `aria-disabled`로 비활성), 상대 미사격 칸 함선 비노출(안개),
  전 함대 격침 종료·재대국·방 나가기. UI는 주입형 `RoomClient` 포트만 소비(소켓 비종속, `ws` 직접 import 금지) —
  기본값은 인메모리 허브로 한 화면 두 좌석을 번갈아 조작하는 로컬 시뮬이며, 실제 원격 ws 전송은 후속(#595).
- 도메인/애플리케이션 함수를 실제 호출(규칙 재구현·데드 코드 금지). 난수는 `MathRandomSource` 주입.

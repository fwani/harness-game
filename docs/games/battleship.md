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
- `chooseRandomShot(board, rng)` — 미사격 칸 중 균등 선택(난수 주입).
- `playBattleshipShot(board, row, col)` — 한 발 사격 후 명중·격침·전 함대 격침 계산.

### 배치 단계 (`battleshipView.ts`, presentation)
- `nextShipSize(placed, fleet)` — 다음 배치할 함선 길이(모두 배치 시 null).
- `placeShipAt(placed, next, size, row, col, orientation, boardSize)` — 후보 함선 배치(`isValidPlacement`로 검증, 실패 시 ok=false·불변).
- `placementPreview(placed, next, size, row, col, orientation, boardSize)` — 미리보기 칸 + 유효성(`shipCellsAt`+`isValidPlacement`).
- `placementComplete(placed, fleet)` · `toggleOrientation(o)` · `placementStatusLabel(placed, fleet)` — 완료 판정·방향 토글·안내 라벨.

### vs CPU 라운드 (`battleshipView.ts`, presentation)
- `playBattleshipCpuRound(humanBoard, cpuBoard, shot, rng)` — 사람 사격 1발 + 미종료 시 CPU 사격 1발.
  명중해도 한 발씩 교대(단순화). 사람 사격으로 전 함대 격침이면 CPU는 쏘지 않는다.

## 3. 구현 상태

| 레이어 | 위치 | 내용 | 상태 |
| --- | --- | --- | --- |
| 도메인 | [`src/domain/battleship.ts`](../../src/domain/battleship.ts) | 보드·배치 검증·사격·격침·전 함대 격침 | ✅ |
| 애플리케이션 | [`src/application/playBattleship.ts`](../../src/application/playBattleship.ts) | `placeFleetRandomly`·`chooseRandomShot`·`playBattleshipShot` | ✅ |
| UI | [`src/ui/games/Battleship.tsx`](../../src/ui/games/Battleship.tsx) | 배치 단계(직접/무작위 배치·회전·미리보기) → 사격 단계(두 보드 렌더·사격 클릭·CPU 자동 사격·승패·새 게임) | ✅ |
| 기록 | `GameId="battleship"` + [`src/ui/records.ts`](../../src/ui/records.ts) | 종료 시 사람=a/CPU=b로 저장 | ✅ |

## 4. UI/UX 요구사항

- **배치 단계 → 사격 단계 2단계**: 사격 전 내 함대를 직접 배치(클릭=시작좌표, R/버튼=회전, 미리보기로 가능/불가 표시),
  "무작위 배치"·"초기화"·"이 배치로 시작" 버튼. 배치 완료 후에만 사격 단계 진입(CPU 함대는 무작위). 미리보기는
  색뿐 아니라 외곽선(`--good`/`--bad`)+aria-label로 가능/불가를 구분, 잘못된 위치는 `.error`로 사유 표시.
- 목적·조작법 한 줄 설명(`.hint`), 현재 진행/승패 표시(`battleshipStatusLabel`).
- 미사격/빗나감(○)/명중(✕)/격침(💥)·함선(■)을 색뿐 아니라 기호+aria-label로 구분(`cellView`).
- 사격 결과 요약(명중/빗나감/`○○함 격침`/전 함대 격침)을 텍스트로 안내(`shotSummary`).
- 이미 쏜 칸은 비활성, 종료 후 입력 차단, "새 게임" 회복 경로, 좁은 화면 대응(`boardGridStyle`).
- 도메인/애플리케이션 함수를 실제 호출(규칙 재구현·데드 코드 금지). 난수는 `MathRandomSource` 주입.

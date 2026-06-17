# UI/UX Guidelines

> 이 레포는 **게임 시스템**이다. 게임에서는 규칙(도메인 로직)만큼이나
> **플레이 경험(UI/UX)** 이 제품 가치다. 도메인 로직이 구현돼도 그 로직을
> 플레이어가 화면에서 쓸 수 없으면 "게임"으로는 미완성이다.
>
> 이슈 생성기·기획·에이전트는 새 기능/이슈를 만들 때 이 문서를 함께 참고해
> **UI/UX 측면을 누락하지 않는다.** (도메인 규칙 이슈를 만들면, 그 규칙을
> 플레이어가 실제로 쓰는 UI 연동 이슈가 함께 필요한지 점검한다.)

## 적용 범위

- 웹 UI: `src/ui/`(Vite + React). 진입 `npm run dev`(기본 http://localhost:5173).
- 각 게임 화면: `src/ui/games/*.tsx`, 공용 스타일 `src/ui/styles.css`.
- 도메인/애플리케이션 로직(`src/domain`, `src/application`)은 UI가 호출하는 대상이다.
  UI는 이 레이어를 import 해 화면을 만든다(infrastructure 어댑터 포함).

## UI/UX 원칙

1. **구현된 규칙은 플레이 가능해야 한다.** 도메인/애플리케이션에 합법 수·승패
   판정이 있으면 UI도 그 흐름(수 두기 → 턴 전환 → 종료/승자 표시)을 노출한다.
   "보기 전용(view-only)" 화면은 임시 상태로만 두고, 백로그에 연동 이슈를 남긴다.
2. **상태가 항상 보여야 한다.** 누구 차례인지, 점수/따냄, 승패 결과, 오류 사유를
   화면에 명시한다(기존 `.hint` / `.error` / `.outcome` 패턴 재사용).
3. **되돌릴 수 있어야 한다.** 판이 끝나거나 막히면 "새 게임" 등 회복 경로를 둔다.
4. **명확한 피드백.** 잘못된 입력은 조용히 무시하지 말고 사유를 보여준다
   (예: 바둑 착수 실패 메시지). 승리/무승부는 분명히 구분한다.
5. **접근성·반응형 기본.** 인터랙티브 요소는 실제 `<button>`을 쓰고(키보드 포커스),
   보드는 좁은 화면에서도 깨지지 않게 한다(`max-width`, 가로 스크롤 허용).
   색만으로 정보를 구분하지 않는다(흑/백·초/한은 기호+레이블 병행).
6. **일관성.** 새 게임 화면은 기존 컴포넌트 구조(`<section className="game">`,
   `h2` 제목, `.hint` 설명, 결과 영역)와 공용 클래스를 재사용한다.

## 새 게임 화면 UI/UX 체크리스트

새/변경 게임 UI PR은 다음을 만족하는지 점검한다.

- [ ] 게임 목적·조작법을 한 줄 설명(`.hint`)으로 안내한다.
- [ ] 현재 턴/차례 또는 진행 상태를 표시한다(턴제 게임).
- [ ] 종료 조건과 승자/무승부를 화면에 명확히 표시한다.
- [ ] 불법 수·잘못된 입력에 사유를 피드백한다(가능하면 도메인 에러 메시지).
- [ ] "새 게임"/리셋 등 회복 경로가 있다.
- [ ] 키보드로 조작 가능(인터랙티브 요소는 `<button>`)하고 색만으로 구분하지 않는다.
- [ ] 좁은 화면에서 레이아웃이 깨지지 않는다.
- [ ] 구현된 도메인/애플리케이션 로직을 실제로 호출한다(데드 코드/보기 전용 금지).

## 현재 UI 상태 (관찰: 브라우저 + `src/ui` 코드, 갱신 2026-06-18)

> 게임별 상세는 `docs/games/`(각 게임 사양 + 구현 상태 매트릭스).

| 게임 | 화면 | 플레이 가능성 | UX 메모 |
| --- | --- | --- | --- |
| 가위바위보 (`Rps.tsx`) | 손 선택 → CPU와 1판 | ✅ vs CPU | 결과를 전적에 저장. 화면 내 현재 연승·통산·최장 연속 표시(`streakView`) |
| 묵찌빠 (`Mukjjippa.tsx`) | 묵/찌/빠 선택 → CPU와 라운드 진행(선공 결정→공격자 유지/전환→같은 손이면 공격자 승) | ✅ vs CPU·승자까지 | `playMukjjippaTurn`+`chooseRandomMukjjippaHand`(`MathRandomSource` 주입, `mukjjippaView.playMukjjippaCpuRound`) 연동. 사람=a/CPU=b, 단계(선공 결정/공격 중)·공격자(사람/CPU)·매 라운드 양측 손을 표시(`mukjjippaStageLabel`/`mukjjippaAttackerLabel`), 같은 손이면 공격자 승으로 종료·`.outcome` 표시, 종료 후 입력 차단, 새 게임 리셋, 종료 시 전적 저장(`mukjjippa`, 사람=a/CPU=b). 손은 색뿐 아니라 라벨(묵/찌/빠)+기호(✊/✌️/✋)로 구분. 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 홀짝 (`OddEven.tsx`) | 홀/짝 추측 → 추첨 | ✅ vs 난수 | 결과를 전적에 저장. 화면 내 현재 연승·통산·최장 연속 표시(`streakView`) |
| 카드 딜 (`Deal.tsx`) | 인원·장수 입력 → 딜 | ✅ 딜만 | 게임이 아닌 유틸. 입력 검증 에러를 플레이어용 한국어 사유로 표시(`dealView.validateDealInput`) |
| 하이카드 (`HighCard.tsx`) | 카드 뽑기 → CPU와 비교 | ✅ vs CPU | `playHighCard` 연동, 결과를 전적에 저장(`highcard`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 주사위 (`Dice.tsx`) | 모드(합계/족보) 선택 → 굴리기 → CPU와 비교 | ✅ vs CPU | 합계: `playDiceRound`. 족보(야추류): `playDiceCategoryRound`(5개 굴림, 족보 이름 표시). 주사위 면+숫자·승패 표시, 전적 저장(`dice`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 바카라 (`Baccarat.tsx`) | 딜링 → 뱅커와 1판 | ✅ vs 뱅커 | `playBaccaratRound` 연동(punto banco 타블로), 손패·끗수·승패 표시, 전적 저장(`baccarat`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 블랙잭 (`Blackjack.tsx`) | 딜링 → 딜러와 1판 자동 진행 | ✅ vs 딜러 | `playBlackjackRound` 연동. 양측 손패·합계(버스트/블랙잭 라벨)·승패 표시, 전적 저장(`blackjack`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 섯다 (`Sutda.tsx`) | 딜링 → CPU와 2장 1판 | ✅ vs CPU | `playSutdaRound` 연동. 양측 2장(월 표기)·등급(땡/특수패/끗)·승패 표시, 전적 저장(`sutda`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 포커 (`Poker.tsx`) | 딜링 → CPU와 5장 쇼다운 | ✅ vs CPU | `playPokerShowdown` 연동. 양측 5장(무늬+숫자)·족보 이름·승패(동률 무승부) 표시, 전적 저장(`poker`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 오목 (`Gomoku.tsx`) | 2인 로컬 / vs CPU 착수 | ✅ vs CPU | 모드 토글(2인 로컬/vs CPU). vs CPU는 `chooseCpuGomokuMove`(`gomokuCpuView`)로 백을 자동 착수. 턴/승자·무승부 표시·리셋·전적 저장 |
| 바둑 (`Go.tsx`) | 2인 로컬 / vs CPU 착수+따냄+패스 | ✅ vs CPU·계가·승자까지 | 모드 토글(2인 로컬/vs CPU). vs CPU는 `chooseCpuGoMove`(`goCpuView`)로 백을 자동 착수(둘 곳 없으면 자동 패스 안내). `playGo`+`scoreArea` 연동, 패스→2패스 종료→계가, 전적 저장. 무효수 사유는 `goView` 한국어 매핑 |
| 오델로 (`Reversi.tsx`) | 2인 로컬 / vs CPU 합법 수 착수 | ✅ vs CPU·자동 패스·계가·승자까지 | `playReversi`+`reversiCpuView`(`chooseRandomReversiMove`) 연동. 모드 토글·합법 수만 활성·자동 패스 안내·디스크 점수·전적 저장 |
| 커넥트포 (`ConnectFour.tsx`) | 2인 로컬 / vs CPU 열 착수(중력 낙하) | ✅ vs CPU·4목 승리/무승부까지 | `playConnectFourMove`+`connectFourCpuView`(`chooseRandomConnectFourColumn`) 연동. 모드 토글·열(▼) 버튼 착수·가득 찬 열 비활성·턴/승자·무승부 표시·새 게임·전적 저장(`connectfour`). 디스크는 색뿐 아니라 기호(●/○)로 1·2 구분(색 비의존) |
| 장기 (`Janggi.tsx`) | 2인 로컬 / vs CPU 기물 이동 | ✅ vs CPU·승부까지 | 모드 토글(2인 로컬/vs CPU). vs CPU는 사람=초(선)·CPU=한이며 `chooseCpuJanggiMove`(`janggiCpuView`→`chooseRandomJanggiMove`)로 한을 자동 착수(둘 수 없으면 사람 승리). 선택·합법 수·이동·턴·장군 경고·외통/포획/빅장 승부·전적 저장. 진영 구분은 색뿐 아니라 자형(초=이체자)·도형(초 원형/한 각형)·접근성 라벨로도 표시(`janggiView`, 색 비의존) |
| 체스 (`Chess.tsx`) | 2인 로컬 / vs CPU 기물 이동 | ✅ vs CPU·외통/스테일메이트까지 | 모드 토글(2인 로컬/vs CPU). vs CPU는 사람=백(선)·CPU=흑(후)이며 `chooseCpuChessMove`(`chessCpuView`→`chessAi.chooseRandomChessMove`, `MathRandomSource` 주입)로 흑을 자동 착수(합법 수/외통/스테일메이트 판정은 `playChess`/`chess` 재사용, 규칙 재구현 금지). 선택 유지·합법 수 하이라이트(`legalTargetsFrom`)·직전 수 강조, 불법 수는 `chessMoveErrorReason` 사유를 `.error`로 표시(조용한 무시 금지), 외통 승/스테일메이트 무승부/체크 경고를 `chessStatusLabel`로 `.outcome`/안내 구분, 종료 후·CPU 차례 입력 차단, 모드 전환·새 게임 리셋. 전적 저장은 2인 로컬=백/흑 핫시트, vs CPU=사람(`SELF_PLAYER`)=a/CPU=b(`chessWinSide`), `GameId`는 두 모드 공통 `chess`. 기물은 색뿐 아니라 자형(백=외곽선 ♔♕♖♗♘♙·흑=채움 ♚♛♜♝♞♟)·좌표/기물명 aria-label로 구분(`chessSquareView`, 색 비의존), 좁은 화면 대응(`boardGridStyle`). vs CPU 화면에 통산 전적·연승 표시(`StreakPanel`, 사람=`SELF_PLAYER`) |
| 윷놀이 (`Yut.tsx`) | 모드 토글(잡기 경주/단순 경주) → 윷 던지기 → CPU 자동 던지기 → 외곽 20칸 완주 경주 | ✅ vs CPU·잡기까지 | 모드 토글: 잡기 경주(`playYutCaptureRound`→`playYutCaptureTurn`, 같은 칸 잡기→출발점 리셋·한 번 더, 출발점·완주 안전지대) / 단순 경주(`playYutRound`→`playYutTurn`). 도개걸윷모 텍스트 라벨·진행도 막대(traveled/20)·잡기/한 번 더 피드백·승패 표시, 전적 저장(`yut`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 숫자야구 (`NumberBaseball.tsx`) | 비밀 수 생성 → 추측 입력 → S/B/아웃 피드백·히스토리 → 정답 종료 | ✅ vs 출제(난수) | `generateSecretBaseballNumber`(`MathRandomSource` 주입)+`playBaseballGuess` 연동. 시도 횟수·추측 히스토리(`describeBaseballResult`: `nS mB`/아웃/정답!)·정답 시 비밀 수 공개, 잘못된 입력은 `numberBaseballView.parseGuessInput`이 한국어 사유(`.error`)로 안내. 새 게임 리셋, 전적 저장(`numberBaseball`, win="a"). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 2048 (`Game2048.tsx`) | 4×4 타일 밀기(화살표 키/방향 버튼) → 합치기 → 2048 도달(승)·이동 불가(게임오버) | ✅ vs 자기기록 | `startGame`/`play2048`(`MathRandomSource` 주입) 연동. 점수(`gained` 합산)·최고 타일 표시, 막힌 방향은 `.error` 피드백(보드 불변), 승리/게임오버를 `game2048View.describe2048Status`로 `.outcome` 구분. 타일은 색뿐 아니라 숫자 텍스트로 구분(색 비의존), 좁은 화면 대응(`max-width`). 키 핸들러가 보드 div에 걸려 있어 마운트·"새 게임" 직후 보드에 자동 포커스(`focus({preventScroll})`)를 줘 클릭 없이 바로 화살표 키 조작 가능(포커스 링 `.board2048:focus-visible`). 새 게임 리셋, 종료 시 전적 저장(`game2048`, 승=목표도달/패=게임오버). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 틱택토 (`TicTacToe.tsx`) | vs CPU 3×3 한 판(클릭 착수·턴 전환) | ✅ vs CPU·승리/무승부까지 | `playTicTacToeMove`+`ticTacToeCpuView`(`chooseCpuTicTacToeMove`→`chooseRandomTicTacToeMove`) 연동. 사람=X(선)/CPU=O(후), 채워진 칸·종료 후 입력 차단, 승자·무승부를 `.outcome`로 표시, 새 게임 리셋, 종료 시 전적 저장(`tictactoe`, 사람=a/CPU=b). X/O는 색뿐 아니라 기호로 구분 |
| 지뢰찾기 (`Minesweeper.tsx`) | 9×9·지뢰 10개 1인 플레이 → 칸 열기(연쇄 공개)·승(클리어)/패(지뢰) | ✅ vs 보드 | `startMinesweeperGame`/`playMinesweeperTurn`(`MathRandomSource` 주입) 연동. 첫 클릭은 안전(첫 칸 `exclude`로 지뢰 미배치), 지뢰 수·남은 미공개 칸 표시, 패배 시 모든 지뢰 공개. 미공개/숫자(0~8)/지뢰를 색뿐 아니라 입체·숫자·기호(💣)·라벨로 구분(`minesweeperView.cellView`), 상태는 `describeMinesweeperStatus`로 `.outcome` 구분, 좁은 화면 대응(`boardGridStyle`). 새 게임 리셋, 종료 시 전적 저장(`minesweeper`, 승=클리어/패=지뢰). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 도트 앤 박스 (`DotsAndBoxes.tsx`) | 2인 로컬 / vs CPU 변 클릭 긋기(완성 박스 보너스 턴·점수·승부) | ✅ vs CPU·승자/무승부까지 | `playDotsAndBoxesTurn`+`chooseRandomDotsEdge`(`MathRandomSource` 주입) 연동. 점·변·박스 교차 격자(`dotsAndBoxesView.dotsGridCells`/`dotsGridTemplate`)에서 미사용 변을 `<button>`으로 클릭해 긋고, 박스 완성 시 같은 플레이어가 한 번 더 둔다(도메인/헬퍼 보너스 턴 그대로). vs CPU는 사람=P1(선)·CPU=P2(후)이며 보너스 턴 포함 자동 진행. 점수(`dotsScoreLabel`)·차례/보너스 안내(`dotsTurnLabel`)·승자/무승부(`dotsOutcomeLabel`)를 `.outcome`로 표시, 종료 후 입력 차단, 새 게임 리셋, 종료 시 전적 저장(`dotsandboxes`, 1=a/2=b/무승부=draw). 박스 소유는 색뿐 아니라 레이블(P1/P2)로 구분(색 비의존). vs CPU 화면에 통산 전적·연승 표시(`StreakPanel`) |
| 만칼라 (`Mancala.tsx`) | 2인 로컬 / vs CPU 구덩이 클릭 씨 뿌리기(자기 곳간 한 번 더·포획·종료/승부) | ✅ vs CPU·승자/무승부까지 | `playMancalaTurn`+`chooseRandomMancalaMove`(`MathRandomSource` 주입) 연동. 표준 Kalah 6·4 보드를 CSS 그리드로 렌더(윗줄 P2 구덩이 역순으로 포획 맞은편 세로 정렬, 양 끝 곳간). 자기 차례에 씨앗 있는 구덩이만 `<button>` 활성, 마지막 알이 자기 곳간에 안착하면 같은 플레이어가 한 번 더 둔다(헬퍼 `again` 그대로). vs CPU는 사람=P1(선)·CPU=P2(후)이며 한 번 더 포함 자동 진행. 곳간 점수(`mancalaScoreLabel`)·차례/한 번 더 안내(`mancalaTurnLabel`)·포획 수(`mancalaCaptureLabel`)·승자/무승부(`mancalaOutcomeLabel`)를 표시, 종료 후 입력 차단, 새 게임 리셋, 종료 시 전적 저장(`mancala`, 1=a/2=b/무승부=draw). 구덩이/곳간 소유는 색뿐 아니라 P1/P2 레이블·aria-label(`mancalaPitAriaLabel`/`mancalaStoreAriaLabel`)로 구분(색 비의존), 좁은 화면 대응(`max-width`·가로 스크롤). vs CPU 화면에 통산 전적·연승 표시(`StreakPanel`) |
| 님 (`Nim.tsx`) | vs CPU 한 판: 더미 선택 → 가져갈 개수 클릭 → CPU 자동 착수 → 마지막 돌 가져가면 승리 | ✅ vs CPU·승자까지 | `playNimTurn`+`chooseRandomNimMove`(`MathRandomSource` 주입) 연동. 표준 [3,5,7] 더미를 세로로 렌더, 각 더미에서 가져갈 개수(1..돌 수)를 합법 수(`nimView.nimPileViews`→도메인 `legalNimMoves`)대로만 `<button>`으로 노출. 사람=선(1)/CPU=후(2)이며 사람이 두면 미종료 시 CPU가 곧바로 자동 착수. 차례(`nimTurnLabel`)·직전 라운드 수(`nimMoveSummary`)·승자(`nimOutcomeLabel`)를 `.outcome`로 표시, 불법 입력은 `.error`로 사유 안내(조용한 무시 금지), 종료 후 입력 차단, 새 게임 리셋, 종료 시 전적 저장(`nim`, 사람=a/CPU=b, `nimWinSide`). 더미는 색이 아니라 돌 개수 숫자+기호(●)+라벨(`nimStonesSymbol`/`nimPileLabel`/aria-label)로 구분(색 비의존), 좁은 화면 대응(`max-width`·버튼 줄바꿈). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 배틀십 (`Battleship.tsx`) | 10×10 두 보드(내 함대/적 함대) vs CPU 한 판 → 적 보드 칸 클릭 사격·CPU 자동 사격·전 함대 격침 승패 | ✅ vs CPU·승자까지 | `placeFleetRandomly`+`createBattleshipBoard`로 양측 함대 무작위 배치(사람=a/CPU=b), `playBattleshipCpuRound`(`battleshipView`)가 `playBattleshipShot`/`chooseRandomShot`(application, `MathRandomSource` 주입)에 위임해 사람 사격 1발+CPU 사격 1발을 처리(규칙 재구현 금지). 적 함대 보드의 미사격 칸만 `<button>`으로 활성, 명중해도 한 발씩 교대(단순화·문서화). 미사격(○ 없음)/빗나감(○)/명중(✕)/격침(💥)·함선(■)을 색뿐 아니라 기호+aria-label(`cellView`, 좌표 `coordLabel` A1~J10)로 구분, 사격 결과를 `shotSummary`(명중/빗나감/`○○함 격침`/전 함대 격침)로 로그 표시, 남은 함선 수(`remainingShips`)·진행/승패(`battleshipStatusLabel`)를 `.outcome`로 표시. 종료 후 입력 차단·적 함대 공개, 새 게임 리셋, 종료 시 전적 저장(`battleship`, 사람=a/CPU=b). 좁은 화면 대응(`boardGridStyle`·보드 줄바꿈). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 하노이탑 (`Hanoi.tsx`) | 디스크 수(3~6) 선택 → 출발 기둥→도착 기둥 두 단계 클릭으로 맨 위 디스크 이동 → 목표 기둥(맨 오른쪽)에 전부 모으면 클리어 1인 플레이 | ✅ vs 퍼즐·클리어까지 | `createHanoi`/`applyHanoiMove`/`isLegalHanoiMove`/`isHanoiSolved`/`minHanoiMoves`(domain `hanoi`)를 UI가 직접 호출(무작위성 없는 결정적 퍼즐이라 별도 application 헬퍼 불필요). 기둥을 `<button>`으로 노출해 출발→도착 2단계 선택(같은 기둥 재클릭=선택 해제), 불법 수(빈 기둥·작은 디스크 위 큰 디스크·같은 기둥)는 조용히 무시하지 않고 `hanoiView.hanoiMoveErrorReason`으로 `.error` 사유 표시. 디스크는 색뿐 아니라 폭(크기 비례)+숫자 라벨로 구분하고 맨 위(집을 수 있는) 디스크를 굵은 테두리·aria(`pegDiskViews`/`pegAriaLabel`)로 강조(색 비의존). 이동 횟수와 `minHanoiMoves` 최소 수를 함께 표시(`hanoiMoveCountLabel`, `.hint`), 진행/선택 안내(`hanoiSelectionPrompt`)·클리어를 `describeHanoiStatus`로 `.outcome` 구분, 종료 후 입력 차단, 새 게임/디스크 수 변경 리셋, 클리어 시 전적 저장(`hanoi`, 승=클리어). 좁은 화면 대응(`max-width`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 슬라이드 퍼즐 (`SlidePuzzle.tsx`) | 크기(3×3/4×4, 기본 4×4) 선택 → 무작위 solvable 시작 → 빈 칸과 맞닿은 타일 클릭으로 밀어 1..N-1 순서 정렬 클리어 1인 플레이 | ✅ vs 퍼즐·클리어까지 | application `createShuffledSlidePuzzle`(`MathRandomSource` 주입)로 항상 풀이 가능·미완성 시작 상태를 만들고, domain `applySlidePuzzleMove`/`isSlidePuzzleSolved`/`legalSlidePuzzleMoves`만 호출(규칙/셔플 재구현 금지). 타일을 `<button>`으로 노출하고 빈 칸과 인접한(합법 수) 타일을 강조 테두리(`slidePuzzleView.slidePuzzleCells`의 `movable`)로 표시, 인접하지 않은 타일 클릭은 조용히 무시하지 않고 도메인 에러 메시지를 `.error`로 노출. 타일은 색뿐 아니라 숫자 텍스트·aria-label(좌표/밀 수 있음 여부)로 구분하고 빈 칸은 입체(움푹한 모양)로도 구분(색 비의존). 이동 횟수(`moveCountLabel`)를 `.hint`로 표시, 클리어를 `describeSlidePuzzleStatus`로 `.outcome` 구분, 종료 후 입력 차단(클리어 시 `slidePuzzleCells(state, solved)`로 어떤 타일도 `movable` 강조/“밀 수 있음” aria 안내를 하지 않아 종료 상태와 표시 일치), 크기 변경/새 게임(재셔플) 리셋, 클리어 시 전적 저장(`slidepuzzle`, 승=클리어). 좁은 화면 대응(`boardGridStyle`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 페그 솔리테어 (`PegSolitaire.tsx`) | 표준 33칸 십자 보드(중앙만 빈 32못) → 출발 못→합법 착지(빈) 구멍 두 단계 클릭으로 인접 못을 직선 2칸 뛰어넘어 제거 → 더 둘 수 없을 때 못 1개=클리어(중앙이면 완벽 클리어)·2개 이상=실패 1인 플레이 | ✅ vs 퍼즐·클리어/실패까지 | `createPegSolitaire`/`applyPegMove`/`isLegalPegMove`/`legalPegMoves`/`pegCount`/`isPegSolitaireFinished`/`isPegSolitaireSolved`(domain `pegSolitaire`)를 UI가 직접 호출(난수·셔플 없는 결정적 단일 시작 퍼즐이라 별도 application 헬퍼 불필요). 칸을 `<button>`으로 노출해 출발 못→착지 빈 구멍 2단계 선택(같은 칸 재클릭=선택 해제, 다른 못 클릭=출발 재선택). 선택 없음일 때 뛸 수 있는 못을, 출발 선택 시 그 칸의 합법 착지 칸을 강조(`pegSolitaireView.pegSolitaireCells`의 `selectable`/`movableTarget`, `legalPegMoves` 위임). 불법 클릭(빈 출발·도착 점유·대각선/거리 오류·건너뛸 못 없음·보드 밖)은 조용히 무시하지 않고 `pegMoveErrorReason`으로 `.error` 사유 표시. 못/빈 구멍은 색뿐 아니라 기호(●/◆)·입체·aria-label로 구분(색 비의존). 남은 못 수(`pegRemainingLabel`)를 `.hint`로 표시, 종료/클리어/완벽 클리어/실패를 `describePegSolitaireStatus`로 `.outcome` 구분, 종료 후 입력 차단(종료 상태에서 `pegSolitaireCells`가 어떤 칸도 강조하지 않아 표시-상태 일치), 새 게임 리셋, 종료 시 전적 저장(`pegsolitaire`, 클리어=승/실패=패). 좁은 화면 대응(`boardGridStyle`·`max-width`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 소코반 (`Sokoban.tsx`) | 레벨 선택 → 방향 버튼/화살표 키로 플레이어(@) 이동·상자(□) 밀기 → 모든 상자를 목표(◎)에 올리면 클리어 1인 플레이 | ✅ vs 퍼즐·클리어까지 | domain `sokoban`을 UI가 직접 호출(무작위성 없는 결정적 퍼즐이라 별도 application 헬퍼 불필요). `createSokobanLevel`/`SOKOBAN_LEVEL_COUNT`로 레벨 선택·리셋, `applySokobanMove`/`isLegalSokobanMove`/`isSokobanSolved`만 호출(이동/밀기/클리어 재구현 금지). 방향은 `<button>`(상/하/좌/우) + 보드 포커스 시 화살표 키로 조작(마운트·리셋 시 자동 포커스), 불법 수는 조용히 무시하지 않고 `sokobanView.sokobanMoveErrorReason`으로 `.error` 사유 표시(벽/경계·상자 너머 막힘·상자 2개 밀기). 칸은 색뿐 아니라 기호(`#`/◎/□/■/@)+aria-label(좌표/종류)로 구분하고 목표 위 상자·플레이어는 굵은 테두리로도 강조(`sokobanCellViews`, 색 비의존). 이동 수·남은 목표 수(`countRemainingTargets`)를 `.hint`로, 진행/클리어를 `describeSokobanStatus`로 `.outcome` 구분, 종료 후 입력 차단, 다시 시작/레벨 변경 리셋, 클리어 시 전적 저장(`sokoban`, 승=클리어). 좁은 화면 대응(`boardGridStyle`·`max-width`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 메모리 (`MemoryMatch.tsx`) | 난이도(6/8쌍) 선택 → 카드 두 장 뒤집기 → 매치/미스 → 전체 짝 완성(클리어) 1인 플레이 | ✅ vs 보드 | `startMemoryGame`/`playMemoryAttempt`(`MathRandomSource` 주입, application `playMemory`) 연동. 카드 클릭(`<button>`)으로 첫 장→둘째 장을 앞면으로 보여준 뒤 짧은 지연 후 판정(매치는 남기고 미스는 다시 덮음), 판정 대기 중 추가 클릭 차단. 시도 수·완성/남은 짝 표시(`memoryMatchView.memoryProgressLabel`), 클리어를 `describeMemoryStatus`로 `.outcome` 구분. 카드 값은 색뿐 아니라 기호(🍎 등)·상태 라벨로 구분하고 덮임/뒤집힘/매치는 입체·테두리(점선)로도 구분(색 비의존), 좁은 화면 대응(`boardGridStyle`). 새 게임 리셋, 클리어 시 전적 저장(`memory`, 승=클리어). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 행맨 (`Hangman.tsx`) | 무작위 단어 → 알파벳 키패드로 한 글자씩 추측 → 마스킹 공개·오답 누적·승(완성)/패(한도 초과) 1인 플레이 | ✅ vs 단어·승/패까지 | `startHangmanGame`(`MathRandomSource` 주입)/`playHangmanGuess` 연동(규칙 재구현 금지). 마스킹 정답(`hangmanView.maskedDisplay`, 색 비의존 텍스트 `_`/글자)·남은 기회(`remainingMisses`)·오답 글자 목록(`wrongLetters`)·상태(`hangmanStatusLabel`)를 `.outcome`로 표시, 패배 시 정답 공개. a–z 키패드는 `<button>`이며 이미 추측·종료 후엔 `letterButtons`가 `disabled`로 차단(조용한 무시 금지·`isLegalHangmanGuess` 위임). 새 게임 리셋, 종료 시 전적 저장(`hangman`, 승=완성/패=한도 초과). 좁은 화면 대응(키패드 `flex-wrap`·`max-width`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 빙고 (`Bingo.tsx`) | 무작위 5×5 카드 시작 → "번호 추첨" 버튼으로 번호를 하나씩 뽑아 카드 칸 자동 마킹 → 가로/세로/대각 한 줄 완성(빙고) 1인 플레이 | ✅ vs 추첨·빙고까지 | application `startBingoGame`/`drawBingoNumber`/`isBingoGameWon`(`MathRandomSource` 주입)와 domain `countBingoLines`/`isBingo`만 호출(규칙/추첨/마킹 재구현 금지). "번호 추첨" `<button>`으로 `drawBingoNumber`를 호출해 상태를 갱신하고, 빙고 달성·번호 소진 시 버튼을 비활성으로 차단(조용한 무시 금지). 카드 칸은 색뿐 아니라 번호 텍스트 + 마킹 기호(✓)·점선 테두리·aria-label(번호/표시 여부)로 구분(`bingoView.bingoCellViews`, 색 비의존). 직전 추첨 번호(`drawSummaryLabel`)·남은 번호 수(`remainingLabel`)·완성 줄 수(`bingoLinesLabel`)를 표시, 진행/빙고를 `describeBingoStatus`로 `.outcome` 구분, 새 게임 리셋, 빙고 시 전적 저장(`bingo`, 승=빙고). 좁은 화면 대응(`bingoGridTemplate`·`max-width`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 뱀과 사다리 (`SnakesAndLadders.tsx`) | 표준 100칸 보드 → "주사위 굴리기" 버튼으로 사람 한 턴 진행 → 미종료면 CPU 한 턴 자동 진행 → 정확히 골 도달 시 승리 vs CPU 한 판 | ✅ vs CPU·승자 종료까지 | application `playSnakesAndLaddersTurn`/`rollSnakesAndLaddersDie`(`MathRandomSource` 주입)와 domain `applyDiceMove`만 호출(이동/사다리·뱀/승패/난수 재구현 금지). "주사위 굴리기" `<button>`으로 `snakesAndLaddersView.playSnlRound`(사람 한 턴 + 미종료 시 CPU 한 턴 조립)를 호출, 종료 후 버튼 비활성으로 차단(조용한 무시 금지). 양측 진행도는 색뿐 아니라 위치 텍스트(`snlPositionLabel`, 0칸=출발 전)와 `<progress>`(`snlProgressRatio`)·aria-label로 표시(색 비의존). 직전 라운드 굴림·사다리 상승/뱀 하강/초과 제자리/골 도달을 `formatSnlRoll` 로그로 안내, 진행/승패를 `describeSnlStatus`로 `.outcome` 구분, 새 게임 리셋, 종료 시 전적 저장(`snakesandladders`, 사람=a/CPU=b). 좁은 화면 대응(`pig-scoreboard` 그리드·`max-width`). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 마스터마인드 (`Mastermind.tsx`) | 무작위 비밀 코드(기본 4칸·6색·10시도) 시작 → 색 팔레트로 칸 채워 추측 제출 → exact/present 피드백을 행마다 누적 → 정답 적중(승) 또는 시도 한도 소진(패) 1인 추리 | ✅ 추리·승/패까지 | application `startMastermindGame`/`playMastermindGuess`(`MathRandomSource` 주입)와 domain `isMastermindWon`/`isMastermindLost`/`isLegalMastermindGuess`만 호출(채점/승패/무작위 재구현 금지). 색 팔레트 `<button>`으로 빈 칸을 채우고(핀 클릭으로 비움·초기화), "추측 제출" `<button>`이 `playMastermindGuess`로 채점한다. 불완전·불법 추측은 `mastermindView.validateGuess`(→`isLegalMastermindGuess`)로 잡아 시도 소진 없이 `.error`로 한국어 사유 표시(조용한 무시 금지). 핀·피드백은 색뿐 아니라 기호(●/■/▲ 등)+문자(A~F)+aria-label로 구분(`pegLabel`/`feedbackLabel`, 색 비의존). 코드 길이·색 가짓수·남은 시도(`remainingGuessesLabel`)를 `.hint`로 안내, 승/패를 `describeMastermindStatus`로 `.outcome` 구분(패배 시 비밀 코드 공개·승리 시 비공개), 종료 후 팔레트·제출 비활성 차단, 새 게임 리셋, 종료 시 전적 저장(`mastermind`, 승=정답 적중/패=시도 소진). 화면 내 통산 전적·연승 표시(`StreakPanel`) |
| 관전 (`SelfPlay.tsx`) | 보드 게임 선택 → CPU vs CPU 한 판 자동 진행 → 결과 | ✅ 종료·승자/무승부까지 | `playEngineGame`+엔진 어댑터(`createGomokuEngine`/`createGoEngine`/`createReversiEngine`/`createJanggiEngine`/`createConnectFourEngine`/`createTicTacToeEngine`/`createDotsAndBoxesEngine`/`createCheckersEngine`/`createMancalaEngine`/`createNimEngine`)+`chooseRandom*Move`(도트 앤 박스는 `chooseRandomDotsEdge`, 체커는 `chooseRandomCheckersMove`, 만칼라는 `chooseRandomMancalaMove`, 님은 `chooseRandomNimMove`)를 `selfPlayView`로 묶어 호출. 오목/바둑/오델로/장기/커넥트포/틱택토/도트앤박스/체커/만칼라/님 지원, 승자(게임별 side 라벨: 흑/백·초/한·1P●/2P○·X/O·1P/2P·1P(선)/2P(후))·무승부·수순 길이·최종 보드 요약 표시, 다시 돌리기 회복 경로. 최종 보드는 `selfPlayGlyphBoard`로 색 비의존 글리프(●/○·X/O) 렌더, 장기는 `janggiView` 기물 자형/도형/접근성 라벨로 렌더, 도트 앤 박스는 `selfPlayDotsBoard`로 보드를 뽑아 `dotsAndBoxesView`의 점·변·박스 격자(`dotsGridCells`/`dotsGridTemplate`)·점수(`dotsScoreLabel`)로 렌더하고 박스 소유는 P1/P2 라벨로 색 비의존 구분, 체커는 `selfPlayCheckersBoard`로 뽑아 `checkersView.checkersCellView`(●/○·♚/♔ + 라벨)로 색 비의존 렌더, 만칼라는 `selfPlayMancalaBoard`로 뽑아 `mancalaView`의 점수·구덩이/곳간 라벨(P1/P2, `mancalaScoreLabel`/`mancalaPitAriaLabel`/`mancalaStoreAriaLabel`)로 색 비의존 렌더, 님은 2D 격자가 아니라 더미(piles) 게임이라 `selfPlayNimBoard`로 최종 더미를 뽑아 `nimView`의 더미별 글리프(`nimPileLabel`/`nimStonesSymbol`/`nimPileAriaLabel`, ●●● + 돌 수)로 색 비의존 렌더(종국=모든 더미 0). 수 제한(무작위 무한 진행) 도달 시 "무종국(수 제한 도달)"으로 우아하게 안내(장기·체커는 king 회피로 길어질 수 있어 `maxMoves` 상한). 커넥트포(≤42수)·틱택토(≤9수)·도트앤박스(유한 변)·만칼라(씨앗 단조 감소)·님(돌 단조 감소)은 유한 게임이라 수 제한 불필요 |
| 녹아웃 (`SingleElimination.tsx`) | 참가자 입력 → 대진(부전승) → 라운드별 승자 선택 → 우승자 | ✅ 우승자까지 | `generateSingleEliminationFirstRound`+`advanceSingleEliminationRound` 연동. 시드 부전승 안내·라운드 라벨(결승/준결승/N강)·우승 표시·리셋 |
| 사다리타기 (`Ladder.tsx`) | 참가자/결과 입력 → 무작위 사다리 생성 → 참가자 선택 시 경로 강조·도착 표시 | ✅ 1:1 배정까지 | `playLadder`(application, `MathRandomSource` 주입)로 한 판 진행, `tracePathColumns`(→domain `resolveLadder`)로 선택 참가자 경로 추적. SVG 사다리 렌더(가로 스크롤)·전체 배정 표·입력 검증 사유(`ladderView.validateLadderInput`)·새 게임. 승/패 개념 없는 배정 게임이라 전적 저장은 범위 밖 |
| 전적 (`Records.tsx`) | 플레이어별 승/패/무 + ELO 레이팅 + 상대 전적 + 기록 | ✅ | 공유 저장소 구독, 빈 상태 표시, localStorage 영속(새로고침 후 유지). 맞붙은 쌍별 상대 전적(`headToHead`) 표 노출 |

## 알려진 UI/UX 갭 (백로그 후보)

> 이슈 생성기가 새 이슈를 만들 때 이 목록을 참고한다. 도메인 로직만 있는 항목은
> "UI 연동" 이슈가 짝으로 필요하다. (✅ 표시는 2026-06-16에 닫힌 항목.)

- ✅ ~~장기 플레이 UI 연동~~: 기물 선택·합법 수·이동·턴·장군·승부 연결(완료).
- ✅ ~~오델로 플레이 UI 연동~~: 2인 로컬 합법 수 착수·자동 패스·디스크 계가·승자·전적 저장(완료).
- ✅ ~~바둑 종료·계가 UI~~: 패스→2패스 종료→`scoreArea` 집·승자 표시(완료).
- ✅ ~~기록(record) 노출~~: "전적" 탭 신설 + 전 게임 결과 저장(완료).
- ✅ ~~상대 전적(head-to-head) 노출~~: 전적 화면에 맞붙은 플레이어 쌍별 승/패/무·총 판수
  표 추가(`recordsHeadToHeadView` + domain `headToHead` 재사용, 완료).
- **장기 외통(checkmate) 종료**: 현재 장 포획으로 판정 — `isCheckmate` 정식 종료는 미연동.
- **멀티플레이**: 제품 설명의 "멀티 진행"이 UI에는 로컬 핫시트/대-CPU만 있고
  원격 멀티가 없다. 범위·방식 정의 필요(별도 이슈).
- ✅ ~~기록 영속성(localStorage)~~: `LocalStorageGameRecordRepository`로 브라우저
  localStorage에 영속화 — 새로고침/재방문 후에도 전적 유지(미가용 시 인메모리 폴백). 서버 영속화는 범위 밖(별도 이슈).
- ✅ ~~누적 점수/세션(화면 내)~~: 가위바위보·홀짝에 더해 단판 vs CPU 화면
  (하이카드·바카라·블랙잭·섯다·포커·주사위·윷놀이)에도 현재 연승/통산/최장 연속을
  표시(`streakView.selfStreakSummary`/`SELF_PLAYER` + `StreakPanel` 재사용,
  카드 5종은 각자 고유 `GameId`로 기록·집계되어 게임별 패널을 따로 가진다) — 완료.
- ✅ ~~하노이탑 플레이 UI 연동~~: 도메인(`hanoi`)만 있던 결정적 퍼즐을 `Hanoi.tsx`로 연결 —
  디스크 수 선택·출발/도착 2단계 기둥 클릭·불법 수 사유(`.error`)·이동 수/최소 수·클리어 승리
  판정·새 게임·전적 저장(`hanoi`)까지(완료, `hanoiView` + `hanoiView.test`).
- ✅ ~~슬라이드 퍼즐(15-퍼즐) 플레이 UI 연동~~: 도메인(`slidePuzzle`)·application(`createShuffledSlidePuzzle`)만
  있던 퍼즐을 `SlidePuzzle.tsx`로 연결 — 크기(3×3/4×4) 선택·무작위 solvable 시작·빈 칸 인접 타일 클릭
  슬라이드·불법 클릭 사유(`.error`)·이동 횟수·클리어 승리 판정·재셔플/새 게임·전적 저장(`slidepuzzle`)까지
  (완료, `slidePuzzleView` + `slidePuzzleView.test`).
- ✅ ~~빙고(Bingo) 플레이 UI 연동~~: 도메인(`bingo`)·application(`playBingo`)만 있던 빙고를
  `Bingo.tsx`로 연결 — 무작위 카드 시작·번호 추첨 버튼·자동 마킹(색 비의존 ✓/라벨)·직전 추첨/남은 번호/
  완성 줄 표시·빙고 승리 판정·새 게임·전적 저장(`bingo`)까지(완료, `bingoView` + `bingoView.test`).
- ✅ ~~뱀과 사다리(Snakes and Ladders) 플레이 UI 연동~~: 도메인(`snakesAndLadders`)·application
  (`playSnakesAndLadders`)만 있던 게임을 `SnakesAndLadders.tsx`로 연결 — vs CPU 한 판(주사위 굴리기 버튼·
  사람+CPU 한 라운드 조립·양측 진행도·사다리/뱀/초과/골 도달 로그·정확히 골 도달 승자 종료·새 게임·전적
  저장(`snakesandladders`))까지(완료, `snakesAndLaddersView` + `snakesAndLaddersView.test`).
- ✅ ~~페그 솔리테어(Peg Solitaire) 플레이 UI 연동~~: 도메인(`pegSolitaire`)만 있던 결정적 단일 시작
  퍼즐을 `PegSolitaire.tsx`로 연결 — 표준 33칸 십자 보드·출발 못→합법 착지 2단계 클릭·합법 착지/뛸 못
  강조·불법 수 사유(`.error`)·남은 못 수·종료 시 클리어/완벽 클리어/실패 판정·새 게임·전적 저장
  (`pegsolitaire`)까지(완료, `pegSolitaireView` + `pegSolitaireView.test`).
- ✅ ~~플러드 잇(Flood-It) UI 연동(application 무작위 보드 + 화면)~~: 도메인(`floodIt`) +
  application 무작위 시작 보드(`createScrambledFloodIt`)를 `FloodIt.tsx`로 연결 — 색 선택 팔레트
  버튼·색 비의존 문자 라벨(A~E)/기호 렌더·사용 턴/제한·현재 영역 크기·불법 수(현재 색)는 버튼 비활성·
  클리어/턴 소진 실패 구분·보드 크기(5/6/8) 선택·새 게임·전적 저장(`floodit`)까지
  (완료, `floodItView` + `floodItView.test`). 사양: [`docs/games/flood-it.md`](../games/flood-it.md).
- ✅ ~~마스터마인드(Mastermind) 플레이 UI 연동~~: 도메인(`mastermind`) + application 무작위 비밀
  코드·한 추측 진행(`startMastermindGame`/`playMastermindGuess`)을 `Mastermind.tsx`로 연결 — 색 팔레트
  입력·색 비의존 핀/피드백(기호+A~F)·exact/present 이력 누적·남은 시도·불법/불완전 추측 사유(`.error`,
  시도 소진 없이 거부)·승(정답)/패(시도 소진, 비밀 코드 공개) 구분·새 게임·전적 저장(`mastermind`)까지
  (완료, `mastermindView` + `mastermindView.test`).
- **접근성/반응형 점검**: 보드 셀 키보드 내비게이션, 모바일 레이아웃, 명도 대비.

## 참고

- 게임별 규칙 + UI/UX 요구사항 + 구현 상태(누락 방지 사양): `docs/games/`
- 제품 맥락·사용자·핵심 흐름: `docs/agent-harness/PRODUCT_CONTEXT.md`
- 레이어 규칙(UI는 application/domain/infrastructure를 어떻게 호출하나):
  `ARCHITECTURE.md`
- 문서 최신화 기준: `docs/agent-harness/DOC_GARDENING.md`

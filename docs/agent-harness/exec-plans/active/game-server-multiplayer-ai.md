# 게임 서버화: AI 대전 + 소켓 멀티플레이

> 상태: **활성(active) — 우선 추진.** 2026-06-18 제품 방향 전환으로 **새 게임 도메인 추가는 동결**되고,
> 이 멀티플레이어 계획은 UI/UX 품질 향상과 **병행하는 최우선 작업**이 되었다. 아래 "사람 결정 필요"의
> 1·3·4가 사용자 결정으로 확정됐다(전송=native ws, 식별=익명+랜덤이름, 1차 목표=로컬 서버+브라우저 다중 탭).
> 각 단계는 독립적으로 머지 가능하고 검증 가능해야 한다.
> 구현 착수 시 이 파일을 갱신하고, 단계가 끝나면 해당 범위를 `../completed/`로 옮긴다.

## Goal (한 문장)

로컬 2인 전용인 현재 게임들을, **(A) AI vs 플레이어**와 **(B) 소켓 기반 방(room) 멀티플레이**를
같은 코어 추상화 위에서 지원하는 **게임 서버 형태**로 발전시킨다.

### 이번 방향에 함께 포함 (2026-06-18)

- **방(room) 옵션 설정**: 방 생성 시 게임별 규칙 옵션(보드 크기·난이도·선공·변형 룰 등)을 고른다.
  옵션은 `Match.init(config)`로 흘러 도메인/애플리케이션이 받는 config로 연결된다(UI는 방 세팅 화면).
- **싱글/멀티 구분**: 각 게임이 혼자(혼자/vs CPU) 모드인지 멀티(방) 모드인지 메타데이터로 분류하고
  카탈로그 UI에서 나눈다. AI 대전(A)은 싱글의 한 형태로, 방 멀티(B)는 멀티로 묶인다.
- **유저 단위 전적**: 익명 세션 id + 랜덤 표시 이름을 부여하고, 싱글/멀티 전적을 같은 유저 개념으로 집계한다.

## 왜 / 배경

- 현재는 각 게임이 `application`의 개별 오케스트레이터(`playGomoku`, `playGo`, `playRps`,
  `playOddEven`)로 2인 로컬 진행만 한다. UI(`src/ui/games/*`)는 이 함수를 직접 호출하며,
  바둑은 도메인 `placeStone`을 UI에서 직접 부르고 장기는 보기 전용이다.
- `package.json` 설명("멀티로 진행도 되며, 기록을 할 수 있는 게임시스템")의 멀티/서버 부분은
  아직 미구현이다.
- AI 대전과 소켓 멀티는 **공통 코어**(게임 엔진 인터페이스 + 매치 진행 + 플레이어 추상)를
  공유한다. 코어를 먼저 통일하면 두 모드가 같은 코드 위에 얹힌다 — 중복 방지(AGENTS.md).

## 현재 상태 (코드 기준 사실)

| 영역 | 현황 |
|---|---|
| domain | `rps`, `oddEven`, `gomoku`, `go`, `janggi`(이동 규칙 `isLegalMove` 포함), `card`, `gameRecord` |
| application | `playRps`, `playOddEven`, `playGomoku`, `playGo`(패스/연속패스 종료) — 게임별 `State`/`applyMove` 시그니처가 **제각각** |
| infrastructure | `cli.ts`, 난수 포트(`mathRandomSource` 등) — **네트워크/서버 없음** |
| ui | React 단일 페이지, 각 게임 컴포넌트가 application/domain을 직접 호출, **로컬 단일 클라이언트** |

알려진 갭(이 작업과 맞물림):
- `application` 오케스트레이터들의 인터페이스가 통일돼 있지 않아 "게임 무관" 매치 진행이 불가능하다.
- `domain/gameRecord`의 `GameId`는 `"rps" | "oddEven" | "gomoku" | "card"`로 `go`/`janggi`가 빠져 있다.
- 플레이어 식별/턴 소유권(누가 어느 side인지) 개념이 application에 없다 — 로컬 2인은 UI가 암묵 처리.

## 목표 아키텍처

기존 레이어 규칙(`ARCHITECTURE.md`)을 **그대로 지킨다.** 새 의존성 방향은 추가하지 않는다.

```
domain          : 순수 규칙 (변경 없음 — 외부 의존 0)
application      : 게임 엔진 인터페이스 · 매치(세션) 진행 · 플레이어 모델 · AiPolicy 포트(인터페이스) · 프로토콜 메시지 타입
infrastructure   : 소켓 서버 · 방/매치메이킹 런타임 · 전송(transport) 어댑터 · (필요 시) 무거운/외부 AI 어댑터 · 기록 영속화 어댑터
ui               : 소켓 클라이언트 + 기존 로컬 모드
```

- `application -> domain`만 사용(현행 유지).
- 소켓 서버·방 관리·전송은 **infrastructure** (`infrastructure -> application -> domain`).
- AI "정책"의 **인터페이스(`AiPolicy`)와 순수 휴리스틱 구현**은 application(도메인 규칙만으로 결정적).
  외부 API/무거운 탐색 등 비결정·부수효과가 있으면 그 어댑터만 infrastructure에 둔다.

### 핵심 추상화 (application)

1. **`GameEngine<State, Move>` (통일 인터페이스)** — 게임 무관 매치 진행의 토대.
   기존 `play*` 모듈을 이 인터페이스로 감싸는 어댑터를 만든다(기존 함수는 보존, 점진 이행).
   ```ts
   type Side = "p1" | "p2";            // 게임별 black/white·cho/han을 매핑
   interface GameStatus { over: boolean; winner: Side | null; draw: boolean }
   interface GameEngine<S, M> {
     init(config?: unknown): S;
     turn(state: S): Side;             // 현재 둘 차례
     isLegal(state: S, move: M, by: Side): boolean;
     apply(state: S, move: M, by: Side): S;   // 불변 — 기존 applyMove 규약 계승
     status(state: S): GameStatus;
   }
   ```
   - gomoku/go의 `next: Stone`, janggi의 side 등은 어댑터에서 `Side`로 매핑.
   - go의 `pass`는 `Move`의 한 변형(`{ type: "pass" }`)으로 표현.

2. **`Player` 모델**
   ```ts
   interface Player { id: string; side: Side; kind: "human" | "ai"; label: string }
   ```

3. **`Match` / 세션 진행** — 엔진 + 플레이어 2인 + 수순 기록을 묶는다.
   - `applyMove`가 **둔 사람(by)이 현재 차례인지** 검증(현재 UI 암묵 규칙을 명시화).
   - 종료 시 `domain/gameRecord.createGameRecord`로 기록 생성(아래 GameId 확장 필요).
   - 순수/결정적으로 유지 — 시간·id 생성은 주입(infrastructure 포트).

4. **`AiPolicy` 포트**
   ```ts
   interface AiPolicy<S, M> { chooseMove(state: S, side: Side): M }
   ```
   - 1차 구현: 합법 수 중 무작위/간단 휴리스틱(난수는 기존 `RandomSource` 포트 주입).
   - AI 차례에 `Match`가 `AiPolicy.chooseMove` 결과를 `apply`한다 → **AI vs 플레이어**는
     "플레이어 한 명이 AiPolicy인 매치"로 자연히 표현된다(별도 코드 경로 불필요).

5. **전송 프로토콜 메시지 타입(전송 수단 비종속)** — application에 타입만 정의.
   - client→server: `joinRoom`, `makeMove`(`{ gameType, move }`), `leaveRoom`, `requestRematch`
   - server→client: `roomState`, `gameState`(직렬화된 State + status + 현재 차례),
     `error`, `gameOver`(record 포함)
   - `gameType` 디스크리미네이터로 게임 무관 처리. 직렬화 형식은 단계 3에서 확정.

### 런타임 (infrastructure)

- **Room**: 한 매치 + 접속 플레이어(+관전자) + side 배정 + 상태 브로드캐스트.
- **매치메이킹/로비**: 방 생성·코드로 입장·자동 매칭(1차는 "방 코드 입장"만).
- **Transport 어댑터**: WebSocket 연결 수명주기·직렬화·재연결. **라이브러리 선택은 사람 결정(아래)**.
- **기록 영속화**: `gameRecord` 저장. 1차는 인메모리, 이후 어댑터로 교체 가능하게.

## 플레이 모드 매핑

- **AI vs 플레이어**: 서버/로컬 어느 쪽이든 `Match` 한 개에 `{human, ai}` 두 Player.
  AI 차례면 `AiPolicy`로 수를 만들어 적용. **소켓 없이도(로컬) 동작** — 같은 코어 재사용.
- **소켓 멀티(방)**: Room이 두 human Player를 서로 다른 연결에 매핑. `makeMove` 수신 →
  `Match.applyMove(by)` → 새 `gameState`를 방 전체에 브로드캐스트. 한쪽이 AI여도 동일.

## Files to change (단계별 예상 — 착수 시 확정)

> 신규는 기존 레이어 디렉터리 안에 둔다. 새 최상위 디렉터리/레이어는 만들지 않는다.

- `src/application/gameEngine.ts` (신규) — `GameEngine` 인터페이스 + 게임별 어댑터(또는 `engines/`).
- `src/application/match.ts` (신규) — `Player`, `Match` 진행/턴 소유권 검증.
- `src/application/aiPolicy.ts` (신규) — `AiPolicy` 포트 + 무작위/휴리스틱 구현.
- `src/application/protocol.ts` (신규) — 메시지 타입.
- `src/domain/gameRecord.ts` (수정) — `GameId`에 `"go" | "janggi"` 추가(+회귀 테스트).
- `src/infrastructure/server/*` (신규) — 소켓 서버·Room·매치메이킹·전송 어댑터.
- `src/infrastructure/recordStore.ts` (신규) — 기록 저장 포트 + 인메모리 구현.
- `src/ui/*` (수정) — AI 상대 토글, 온라인 방 입장 UI, 소켓 클라이언트(로컬 모드 유지).
- 문서: `ARCHITECTURE.md`(엔트리포인트/서버 추가), `PRODUCT_CONTEXT.md`(멀티/AI 흐름),
  `docs/agent-harness/TESTING.md`(서버 테스트), `.agent-harness.yml`(run 명령/포트) 동기화.

## Steps (단계 = 머지 단위, 각 단계 독립 검증)

1. **코어 통일 — `GameEngine` + 어댑터.** 기존 `play*`는 보존하고 어댑터로 감싼다.
   게임별 엔진 동작을 단위 테스트(legal/apply/status/turn). *네트워크 없음.*
2. **`Match` + `Player` + 턴 소유권.** 잘못된 차례·종료 후 착수 거부, 종료 시 `gameRecord` 생성.
   (선행: `gameRecord` `GameId` 확장.) *순수 로직, 테스트로 검증.*
3. **`AiPolicy` + AI 대전(로컬).** 무작위/휴리스틱 AI. UI에 "AI와 대전" 토글. *소켓 없이 동작.*
4. **프로토콜 + 인메모리 소켓 서버 + 방.** 방 코드 입장, 2인 동기화, 브로드캐스트.
   서버는 단계 1~2 코어를 그대로 호출. *통합 테스트(서버 인스턴스 + 가짜 클라이언트 2개).*
5. **온라인 UI.** 방 만들기/입장, 실시간 상태 반영, 재대국. 로컬·AI 모드와 공존.
6. **기록 영속화 + 전적.** `recordStore` 포트, `summarize` 노출(전적 화면). 영속 수단은 6에서 확정.

> 각 단계는 별도 PR. 단계 4부터 전송 라이브러리·직렬화가 필요하므로 **그 전에 아래 결정**을 받는다.

## Verification (단계별)

- 단계 1~3: `scripts/agent-harness/agent-verify`(lint/typecheck/test/build) + 엔진/매치/AI 단위 테스트.
- 단계 4~5: 서버 통합 테스트(인메모리 전송으로 2클라 시뮬), `agent-arch-check`로 레이어 위반 0 확인.
- 공통: 아키텍처 경계(`infrastructure -> application -> domain`) 위반 없음, 문서 동기화 점검.
- 게임 제품 원칙(PRODUCT_CONTEXT/UX_GUIDELINES): 로직이 생기면 **플레이어가 UI에서 쓸 수 있어야** 완성.

## 사람 결정 (2026-06-18 일부 확정)

> AGENTS.md "추측하지 않는다" + "에스컬레이션" 기준. 아래 1·3·4는 사용자가 확정했고, 2·5는 해당 단계 전에 받는다.

1. ✅ **전송 라이브러리 = native `ws`**(가벼운 신규 의존성). socket.io 등 무거운 대안은 쓰지 않는다.
2. **기록 영속화 수단**: 인메모리만 / 파일 / DB. DB면 마이그레이션·운영 부담(에스컬레이션 항목). 단계 6 전에 결정.
3. ✅ **플레이어 식별 = 익명 + 랜덤 이름**. 로그인/비밀번호/외부 인증은 도입하지 않는다(필요해지면 별도 에스컬레이션).
   첫 진입 시 익명 세션 id + 무작위 표시 이름을 부여하고 사용자가 이름을 바꿀 수 있게 한다. 식별값은 민감정보로 다룬다(SECURITY.md).
4. ✅ **호스팅/배포 — 1차 목표는 로컬 서버 + 브라우저 다중 탭**. 같은 머신의 ws 서버에 여러 탭/브라우저가 같은 방으로 접속해
   실시간 동기화되는 것까지를 자동개발 범위로 한다. **다른 노드(인터넷)에서의 원격 접속·실제 배포는 최종 목표이며 인프라/비용
   영향이 있어 `needs-human` 에스컬레이션**으로 분리한다(자동 진행 금지).
5. **장기·바둑 종료 판정 의존성**: AI/매치 종료에 장기 외통·바둑 계가가 필요한지(현재 도메인 미구현 범위). 해당 단계 전에 결정.

## 비목표 (이번 발전 방향에서 명시적으로 안 하는 것)

- 매치메이킹 랭킹/ELO, 채팅, 관전 고도화, 리플레이 재생기.
- 장기 외통(checkmate)·바둑 계가/패(ko) 등 **도메인 규칙 신규 구현**(별도 이슈로 분리).
- 보안 인증 체계 본격 도입(식별 최소 수준만; 정식 인증은 4-결정 이후 별도).

## Risks / rollback

- **위험: 레이어 경계 침범.** 서버 편의를 위해 application이 전송/소켓을 import하면 규칙 위반.
  → 전송은 infrastructure에만. `agent-arch-check`가 CI에서 기계적으로 막는다.
- **위험: 코어 통일 중 기존 게임 회귀.** → `play*` 함수를 지우지 말고 어댑터로 감싸고, 기존 테스트 유지.
- **위험: 상태 직렬화 불일치(서버/클라).** → 프로토콜 타입을 application 단일 소스로 공유.
- **롤백**: 각 단계가 독립 PR이므로 단계 단위 revert로 되돌린다. 코어(1~3)는 네트워크와 분리돼
  단독으로 가치가 있어, 서버(4~)를 미루더라도 손실이 없다.

# automation/ — 로컬 자동 개발 파이프라인

이 디렉터리는 harness-game의 **무인 자동 개발 파이프라인**을 정의한다. 사람 개입
없이 (기획) 이슈를 등록하고 → (개발) 구현·PR·머지까지 진행한다. 게이트는 사람
승인이 아니라 **CI(`harness` 체크) + AI 셀프리뷰**이며, main branch protection이
CI 통과를 강제한다.

## 구성

```
launchd (로컬 macOS, 컴퓨터가 켜져 있을 때)
 ├─ com.fwani.harness-game.planner → planner.sh → 백로그<TARGET(기본 6)이면 planner-prompt.md로 이슈 생성
 ├─ com.fwani.harness-game.dev     → dev.sh     → ready-for-dev 있으면 dev-prompt.md로 구현→PR→머지
 ├─ com.fwani.harness-game.dev2    → dev.sh (AUTODEV_WORKER=2) → 2번째 병렬 개발 워커
 ├─ com.fwani.harness-game.dev3    → dev.sh (AUTODEV_WORKER=3) → 3번째 병렬 개발 워커
 └─ com.fwani.harness-game.qa      → qa.sh      → 게임 1개를 브라우저로 플레이테스트 → qa-finding 이슈
```

| 파일 | 역할 |
| --- | --- |
| `planner-prompt.md` | 기획 봇 동작 명세 (이슈 생성 기준·**우선순위**·UI/UX 누락 점검). **이슈 우선순위를 바꾸려면 여기 §2를 수정.** |
| `dev-prompt.md` | 개발 봇 동작 명세 (레이어 규칙·검증·PR·자동 머지·보안 바닥). |
| `qa-prompt.md` | QA/플레이테스트 봇 명세. **Playwright MCP로 AI가 게임을 직접 플레이**하며 런타임 문제·UX 갭을 찾아 `qa-finding` 이슈로 등록(코드 수정 X). |
| `planner.sh` / `dev.sh` / `qa.sh` | launchd가 호출하는 실행 스크립트. 싼 게이트 후 로컬 `claude -p` 호출. 프롬프트는 **origin/main의 위 .md에서 읽는다**(버전관리 단일 소스). `qa.sh`는 vite 개발 서버를 띄우고 claude에 Playwright MCP를 붙인다. |
| `com.fwani.harness-game.*.plist` | launchd LaunchAgent 정의 (실행 주기 등). |

> 프롬프트가 단일 소스다. 동작을 바꾸려면 `*-prompt.md`를 수정해 PR로 머지하면
> 다음 틱부터 자동 반영된다(스크립트가 매 실행 origin/main에서 프롬프트를 읽음).

## 동작 규칙 (요약)

- **폭주 방지**: 기획은 open `ready-for-dev`가 `TARGET`(기본 6) 미만일 때만 부족분 보충 (dev 워커 2개가 늘 서로 다른 이슈를 잡도록 백로그를 넉넉히 유지).
- **비용 절감**: 두 스크립트 모두 gh로 일거리 유무를 먼저 확인하고, 있을 때만 claude 호출.
- **격리**: 봇은 전용 클론(`~/Library/Application Support/harness-game-autodev/repo-{dev,planner}`)에서 작업 — 사용자 작업 디렉터리를 건드리지 않는다.
- **시간대별 간격**: planner/dev/dev2는 09~18시 3분·그 외 10분(plist `StartInterval=180`). QA는 09~18시 5분·그 외 10분(`StartInterval=300`). 각 스크립트 내 시간 게이트로 제어.
- **QA**: 한 실행에 게임 1개를 회전(`.qa.rotation`)하며 플레이테스트. 발견은 `qa-finding` 라벨로만 등록(자동 수정 X — 사람/planner 검토용). 중복·폭주 방지 게이트 내장.
- **보안 바닥**: 파괴적 명령/auth/권한/데이터 삭제는 `needs-human` 라벨로 에스컬레이션(자동 처리 금지).

## 라벨

- `ready-for-dev` — 개발 큐(봇이 집어 구현). 사람이 직접 붙여 작업을 시킬 수도 있다.
- `in-progress-ai` — 봇이 작업 중.
- `qa-finding` — QA 봇이 플레이테스트로 찾은 문제(검토 후 ready-for-dev로 승격).
- `needs-human` — 사람 확인 필요(에스컬레이션).

## 설치 (1회)

```sh
BASE="$HOME/Library/Application Support/harness-game-autodev"
mkdir -p "$BASE"
cp automation/dev.sh automation/planner.sh automation/qa.sh "$BASE"/
cp automation/dev-prompt.md automation/planner-prompt.md automation/qa-prompt.md "$BASE"/   # origin/main 읽기 전 fallback
chmod +x "$BASE"/dev.sh "$BASE"/planner.sh "$BASE"/qa.sh
# QA 봇용 브라우저(1회): npx playwright install chromium
# plist 템플릿의 __HOME__ 를 실제 홈 경로로 치환해 설치 후 등록 (dev2/qa 포함)
for L in dev dev2 planner qa; do
  sed "s#__HOME__#$HOME#g" "automation/com.fwani.harness-game.$L.plist.template" \
    > "$HOME/Library/LaunchAgents/com.fwani.harness-game.$L.plist"
  launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/com.fwani.harness-game.$L.plist"
done
```

> 로컬 경로 노출을 피하려고 스크립트는 `$HOME` 기반이고, launchd plist는 절대경로가
> 필요해 `__HOME__` 플레이스홀더 **템플릿**으로 보관한다. 설치 시 위처럼 `$HOME`로
> 치환한다. (PATH의 homebrew 경로는 `/opt/homebrew` 기준 — 인텔 맥이면 `/usr/local`로 수정.)

## 다중 dev 워커

`dev.sh`는 `AUTODEV_WORKER` 환경변수로 병렬 워커를 지원한다. 미설정이면 1차 워커
(`repo-dev`/`dev.log`, actionable≥1). `N`을 설정하면 워커 N(`repo-dev<N>`/`dev-<N>.log`)으로
동작하며, **actionable이 N건 이상일 때만** + **(N-1)×20초 스태거** 후 시작한다. 즉 dev=1·
dev2=2·dev3=3건 이상에서만 깨어나 낮은 번호 워커가 먼저 claim하므로, 워커들이 항상 서로
다른 이슈를 잡는다. `com.fwani.harness-game.dev2/dev3.plist.template`가 예시
(`AUTODEV_WORKER=2`/`3`). 워커 추가(예: dev3) 설치:

```sh
for N in 2 3; do
  sed "s#__HOME__#$HOME#g" "automation/com.fwani.harness-game.dev$N.plist.template" \
    > "$HOME/Library/LaunchAgents/com.fwani.harness-game.dev$N.plist"
  launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/com.fwani.harness-game.dev$N.plist"
done
```

> 워커 수가 늘면 백로그도 그만큼 필요하다(planner `TARGET` ≥ 워커 수). 현재 TARGET=6.
> in-progress-ai claim + 번호별 스태거 + actionable≥N 게이트로 중복을 막지만, 거의 동시에
> 목록을 조회하는 극히 짧은 창에선 같은 이슈를 집을 수 있다(드묾).

## 운영

```sh
BASE="$HOME/Library/Application Support/harness-game-autodev"
tail -f "$BASE/dev.log"        # 개발 로그
tail -f "$BASE/planner.log"    # 기획 로그
launchctl kickstart -k gui/$(id -u)/com.fwani.harness-game.planner   # 지금 1회
launchctl bootout   gui/$(id -u) ~/Library/LaunchAgents/com.fwani.harness-game.dev.plist   # 끄기
```

- 실행 주기: plist의 `StartInterval`(초).
- 기획 백로그 목표: `planner.sh`의 `TARGET`.
- 클라우드 routine(claude.ai/code/routines)으로도 만들 수 있으나 현재는 로컬 launchd만 사용(클라우드 버전은 비활성).

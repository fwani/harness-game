#!/bin/zsh
# 자동 개발 tick — launchd가 3분(09~18시)/10분(그 외)마다 실행.
# 싼 gh 체크로 처리할 ready-for-dev 이슈가 있을 때만 로컬 claude에게 개발을 시킨다.
# 봇 전용 클론에서 작업하므로 사용자 작업 디렉터리는 건드리지 않는다.
# 프롬프트는 레포의 automation/dev-prompt.md(origin/main)에서 읽는다 — 버전관리되는 단일 소스.
# 설치: 이 파일을 ~/Library/Application Support/harness-game-autodev/ 로 복사하고
#       automation/com.fwani.harness-game.dev.plist 를 launchd에 bootstrap. (README 참고)

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="fwani/harness-game"
BASE="$HOME/Library/Application Support/harness-game-autodev"
# 다중 워커: AUTODEV_WORKER가 설정되면 보조 워커(전용 클론/로그/스탬프 분리, 백로그>=2일 때만).
W="${AUTODEV_WORKER:-}"
WORKDIR="$BASE/repo-dev${W}"
LOG="$BASE/dev${W:+-$W}.log"
ts() { date '+%F %T'; }
mkdir -p "$BASE"

# 보조 워커는 1차 워커가 가장 오래된 이슈를 먼저 claim(in-progress-ai)하도록 잠깐 스태거 — 중복 claim 방지.
[ -n "$W" ] && sleep 25

# 0) 시간대별 간격 게이트: 09~18시 = 180초(3분), 그 외 = 600초(10분).
H=$((10#$(date +%H)))
if [ "$H" -ge 9 ] && [ "$H" -lt 18 ]; then REQ=180; else REQ=600; fi
STAMP="$BASE/.dev${W:+-$W}.laststamp"; NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
[ $((NOW - LAST)) -lt "$REQ" ] && exit 0
echo "$NOW" > "$STAMP"

# 1) 처리 가능한 이슈 = open + ready-for-dev + (in-progress-ai 없음) + (assignee 없음)
actionable=$(gh issue list --repo "$REPO" --label ready-for-dev --state open \
  --json number,labels,assignees \
  --jq '[.[] | select((.labels|map(.name)|index("in-progress-ai"))|not) | select(.assignees|length==0)] | length' \
  2>>"$LOG")
[ -z "$actionable" ] && { echo "$(ts) gh 조회 실패 — skip" >>"$LOG"; exit 0; }
# 1차 워커는 1건 이상, 보조 워커는 2건 이상일 때만 동작(외톨이 이슈는 1차에 양보 → 같은 이슈 중복 claim 회피).
MIN=1; [ -n "$W" ] && MIN=2
[ "$actionable" -lt "$MIN" ] && { echo "$(ts) actionable=$actionable < $MIN — skip" >>"$LOG"; exit 0; }

# 2) 전용 클론 보장
if [ ! -d "$WORKDIR/.git" ]; then
  echo "$(ts) cloning -> $WORKDIR" >>"$LOG"
  git clone "https://github.com/fwani/harness-game" "$WORKDIR" >>"$LOG" 2>&1
fi
git -C "$WORKDIR" fetch origin --prune >>"$LOG" 2>&1

# 3) 프롬프트를 origin/main에서 읽고(버전관리 단일 소스) 로컬 claude에 위임
PROMPT=$(git -C "$WORKDIR" show origin/main:automation/dev-prompt.md 2>/dev/null)
[ -z "$PROMPT" ] && PROMPT=$(cat "$BASE/dev-prompt.md" 2>/dev/null)   # fallback
[ -z "$PROMPT" ] && { echo "$(ts) 프롬프트를 찾지 못함 — skip" >>"$LOG"; exit 0; }

echo "$(ts) actionable=$actionable -> 로컬 개발 시작" >>"$LOG"
cd "$WORKDIR" || exit 1
claude -p "$PROMPT" \
  --allowedTools Bash Read Write Edit Glob Grep >>"$LOG" 2>&1
echo "$(ts) 개발 tick 종료 (claude exit $?)" >>"$LOG"

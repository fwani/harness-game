#!/bin/zsh
# 기획 tick — launchd가 3분(09~18시)/10분(그 외)마다 실행.
# open ready-for-dev 백로그가 목표(TARGET) 미만일 때만 로컬 claude에게 이슈 생성을 시킨다.
# 봇 전용 클론에서 읽기만 한다(이슈 생성은 gh).
# 프롬프트는 레포의 automation/planner-prompt.md(origin/main)에서 읽는다 — 버전관리되는 단일 소스.

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="fwani/harness-game"
TARGET=6
BASE="$HOME/Library/Application Support/harness-game-autodev"
WORKDIR="$BASE/repo-planner"
LOG="$BASE/planner.log"
ts() { date '+%F %T'; }
mkdir -p "$BASE"

# 0) 시간대별 간격 게이트: 09~18시 = 180초(3분), 그 외 = 600초(10분).
H=$((10#$(date +%H)))
if [ "$H" -ge 9 ] && [ "$H" -lt 18 ]; then REQ=180; else REQ=600; fi
STAMP="$BASE/.planner.laststamp"; NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
[ $((NOW - LAST)) -lt "$REQ" ] && exit 0
echo "$NOW" > "$STAMP"

backlog=$(gh issue list --repo "$REPO" --label ready-for-dev --state open --json number -q 'length' 2>>"$LOG")
[ -z "$backlog" ] && { echo "$(ts) gh 조회 실패 — skip" >>"$LOG"; exit 0; }
if [ "$backlog" -ge "$TARGET" ]; then
  echo "$(ts) 백로그 충분 (open ready-for-dev=$backlog >= $TARGET) — skip" >>"$LOG"
  exit 0
fi

# 전용 클론 보장 (기획 봇이 코드를 읽고 중복을 피하기 위함)
if [ ! -d "$WORKDIR/.git" ]; then
  echo "$(ts) cloning -> $WORKDIR" >>"$LOG"
  git clone "https://github.com/fwani/harness-game" "$WORKDIR" >>"$LOG" 2>&1
fi
git -C "$WORKDIR" fetch origin --prune >>"$LOG" 2>&1

PROMPT=$(git -C "$WORKDIR" show origin/main:automation/planner-prompt.md 2>/dev/null)
[ -z "$PROMPT" ] && PROMPT=$(cat "$BASE/planner-prompt.md" 2>/dev/null)   # fallback
[ -z "$PROMPT" ] && { echo "$(ts) 프롬프트를 찾지 못함 — skip" >>"$LOG"; exit 0; }

echo "$(ts) backlog=$backlog < $TARGET -> 로컬 기획 시작" >>"$LOG"
cd "$WORKDIR" || exit 1
claude -p "$PROMPT" \
  --allowedTools Bash Read Glob Grep >>"$LOG" 2>&1
echo "$(ts) 기획 tick 종료 (claude exit $?)" >>"$LOG"

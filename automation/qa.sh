#!/bin/zsh
# QA/플레이테스트 tick — launchd가 5분(09~18시)/10분(그 외)마다 실행.
# vite 개발 서버를 띄우고, claude가 Playwright MCP 브라우저로 게임 1개를 실제 플레이하며
# 런타임 문제·UX 갭을 찾아 qa-finding 이슈로 등록한다. 코드는 고치지 않는다(이슈만).
# 봇 전용 클론(repo-qa)에서 읽기만 하므로 사용자 작업 디렉터리를 건드리지 않는다.
# 프롬프트는 origin/main의 automation/qa-prompt.md에서 읽는다(버전관리 단일 소스).

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="fwani/harness-game"
PORT=5179
URL="http://localhost:$PORT"
BASE="$HOME/Library/Application Support/harness-game-autodev"
WORKDIR="$BASE/repo-qa"
LOG="$BASE/qa.log"
ROT="$BASE/.qa.rotation"
ts() { date '+%F %T'; }
mkdir -p "$BASE"

# 0) 시간대별 간격 게이트: 09~18시 = 60초(1분), 그 외 = 600초(10분). (실제 실행 시간이 1분보다 길면 연속 실행됨)
H=$((10#$(date +%H)))
if [ "$H" -ge 9 ] && [ "$H" -lt 18 ]; then REQ=60; else REQ=600; fi
STAMP="$BASE/.qa.laststamp"; NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
[ $((NOW - LAST)) -lt "$REQ" ] && exit 0
echo "$NOW" > "$STAMP"

# 1) 전용 클론 최신화 (QA는 트리를 더럽히지 않으므로 ff 충분)
if [ ! -d "$WORKDIR/.git" ]; then
  echo "$(ts) cloning -> $WORKDIR" >>"$LOG"
  git clone "https://github.com/fwani/harness-game" "$WORKDIR" >>"$LOG" 2>&1
fi
cd "$WORKDIR" || exit 1
git fetch origin --prune >>"$LOG" 2>&1
git checkout main >>"$LOG" 2>&1
git pull --ff-only >>"$LOG" 2>&1
npm ci >>"$LOG" 2>&1

# 2) 개발 서버 기동 (이전 잔여 프로세스 정리 후 전용 포트, 종료 시 정리)
lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null
npm run dev -- --port $PORT --strictPort >/tmp/qa-vite.log 2>&1 &
VITE_PID=$!
cleanup() { kill "$VITE_PID" 2>/dev/null; lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null; }
trap cleanup EXIT
up=0
for i in $(seq 1 40); do curl -sf "$URL" >/dev/null 2>&1 && { up=1; break; }; sleep 1; done
if [ "$up" -ne 1 ]; then echo "$(ts) vite 서버 기동 실패 — skip" >>"$LOG"; exit 0; fi

# 3) Playwright MCP 설정 + 회전 인덱스
cat > "$BASE/pw-mcp.json" <<JSON
{"mcpServers":{"playwright":{"command":"npx","args":["-y","@playwright/mcp@latest","--headless","--isolated"]}}}
JSON
ROTN=$(cat "$ROT" 2>/dev/null); [ -z "$ROTN" ] && ROTN=0
echo $((ROTN + 1)) > "$ROT"

# 4) 프롬프트(origin/main) + 이번 실행 파라미터 주입
PROMPT=$(git -C "$WORKDIR" show origin/main:automation/qa-prompt.md 2>/dev/null)
[ -z "$PROMPT" ] && PROMPT=$(cat "$BASE/qa-prompt.md" 2>/dev/null)
[ -z "$PROMPT" ] && { echo "$(ts) 프롬프트를 찾지 못함 — skip" >>"$LOG"; exit 0; }
PROMPT="$PROMPT

## 이번 실행 파라미터
- 개발 서버 URL: $URL
- 회전 인덱스: $ROTN (게임 목록에서 이 인덱스 mod 게임수 번째 1개만 테스트)"

echo "$(ts) QA 시작 (rotation=$ROTN, url=$URL)" >>"$LOG"
claude -p "$PROMPT" \
  --mcp-config "$BASE/pw-mcp.json" \
  --allowedTools "mcp__playwright" Bash Read Glob Grep >>"$LOG" 2>&1
echo "$(ts) QA tick 종료 (claude exit $?)" >>"$LOG"

#!/bin/zsh
# QA/플레이테스트 tick — launchd가 5분(09~18시)/10분(그 외)마다 실행.
# vite 개발 서버를 띄우고, claude가 Playwright MCP 브라우저로 게임 1개를 실제 플레이하며
# 런타임 문제·UX 갭을 찾아 qa-finding 이슈로 등록한다. 코드는 고치지 않는다(이슈만).
# 봇 전용 클론(repo-qa)에서 읽기만 한다.
# 프롬프트는 automation/qa-prompt.md(origin/main)에서 읽는다 — 단일 소스.
#
# 로그 형식:
#   qa.log         사람용 단계별 타임라인
#   qa.detail.log  npm/git/claude 원시 출력 (실행마다 새로 덮어씀)

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="fwani/harness-game"
PORT=5179
URL="http://localhost:$PORT"
BASE="$HOME/Library/Application Support/harness-game-autodev"
WORKDIR="$BASE/repo-qa"
LOG="$BASE/qa.log"
DETAIL="$BASE/qa.detail.log"
ROT="$BASE/.qa.rotation"
mkdir -p "$BASE"
log()  { printf '%s [qa] %s\n' "$(date '+%F %T')" "$*" >>"$LOG"; }
hr()   { printf '%s [qa] ======== %s ========\n' "$(date '+%F %T')" "$*" >>"$LOG"; }
tailsum() { tail -n 8 "$DETAIL" 2>/dev/null | sed "s/^/$(date '+%F %T') [qa]   │ /" >>"$LOG"; }

# 0) 시간대별 간격 게이트 (조용히 종료)
H=$((10#$(date +%H)))
if [ "$H" -ge 9 ] && [ "$H" -lt 18 ]; then REQ=300; else REQ=600; fi
STAMP="$BASE/.qa.laststamp"; NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
[ $((NOW - LAST)) -lt "$REQ" ] && exit 0
echo "$NOW" > "$STAMP"

# ── 실제 실행 ──
hr "RUN 시작"
: > "$DETAIL"

# 1) 전용 클론 최신화 (QA는 트리를 더럽히지 않으므로 ff 충분)
if [ ! -d "$WORKDIR/.git" ]; then
  log "1) 전용 클론 생성: $WORKDIR"
  git clone "https://github.com/fwani/harness-game" "$WORKDIR" >>"$DETAIL" 2>&1
fi
cd "$WORKDIR" || { log "✗ cd 실패: $WORKDIR"; exit 1; }
log "1) main 최신화 + 의존성 설치 (fetch/checkout/pull/npm ci)"
{ git fetch origin --prune && git checkout main && git pull --ff-only && npm ci; } >>"$DETAIL" 2>&1

# 2) 개발 서버 기동 (이전 잔여 정리 후 전용 포트, 종료 시 정리)
lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null
npm run dev -- --port $PORT --strictPort >>"$DETAIL" 2>&1 &
VITE_PID=$!
cleanup() { kill "$VITE_PID" 2>/dev/null; lsof -ti tcp:$PORT 2>/dev/null | xargs kill 2>/dev/null; }
trap cleanup EXIT
up=0
for i in $(seq 1 40); do curl -sf "$URL" >/dev/null 2>&1 && { up=1; break; }; sleep 1; done
if [ "$up" -ne 1 ]; then log "✗ vite 서버 기동 실패 — skip (상세: $(basename "$DETAIL"))"; exit 0; fi
log "2) vite 개발 서버 기동 완료: $URL"

# 3) Playwright MCP 설정 + 회전 인덱스
cat > "$BASE/pw-mcp.json" <<JSON
{"mcpServers":{"playwright":{"command":"npx","args":["-y","@playwright/mcp@latest","--headless","--isolated"]}}}
JSON
ROTN=$(cat "$ROT" 2>/dev/null); [ -z "$ROTN" ] && ROTN=0
echo $((ROTN + 1)) > "$ROT"
log "3) 대상 회전 인덱스=$ROTN (게임 목록 mod 게임수)"

# 4) 프롬프트(origin/main) + 이번 실행 파라미터 주입
PROMPT=$(git -C "$WORKDIR" show origin/main:automation/qa-prompt.md 2>/dev/null)
[ -z "$PROMPT" ] && PROMPT=$(cat "$BASE/qa-prompt.md" 2>/dev/null)
[ -z "$PROMPT" ] && { log "✗ 프롬프트 없음 — skip"; exit 0; }
PROMPT="$PROMPT

## 이번 실행 파라미터
- 개발 서버 URL: $URL
- 회전 인덱스: $ROTN (게임 목록에서 이 인덱스 mod 게임수 번째 1개만 테스트)"

# 5) claude 플레이테스트 (Playwright MCP). 원시 출력은 detail 로그로.
log "4) claude 플레이테스트 → 게임 플레이·평가·qa-finding 등록 (상세: $(basename "$DETAIL"))"
claude -p "$PROMPT" \
  --mcp-config "$BASE/pw-mcp.json" \
  --allowedTools "mcp__playwright" Bash Read Glob Grep >>"$DETAIL" 2>&1
rc=$?
log "5) claude 종료 (exit $rc) — 보고 요약:"
tailsum
hr "RUN 종료 (exit $rc)"

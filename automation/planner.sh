#!/bin/zsh
# 기획 tick — launchd가 3분(09~18시)/10분(그 외)마다 실행.
# (1) open qa-finding을 트리아지(명백한 결함 → ready-for-dev 승격)
# (2) open ready-for-dev 백로그가 TARGET 미만이면 부족분만큼 새 이슈 생성
# 둘 다 없으면 claude를 부르지 않는다(비용 절감). 봇 전용 클론에서 읽기만.
# 프롬프트는 automation/planner-prompt.md(origin/main)에서 읽는다 — 단일 소스.
#
# 로그 형식:
#   planner.log         사람용 단계별 타임라인
#   planner.detail.log  git/claude 원시 출력 (실행마다 새로 덮어씀)

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="fwani/harness-game"
TARGET=4  # 한 게임에 집중하므로 백로그 목표 축소(planner-prompt §2와 일치)
BASE="$HOME/Library/Application Support/harness-game-autodev"
WORKDIR="$BASE/repo-planner"
LOG="$BASE/planner.log"
DETAIL="$BASE/planner.detail.log"
mkdir -p "$BASE"
log()  { printf '%s [planner] %s\n' "$(date '+%F %T')" "$*" >>"$LOG"; }
hr()   { printf '%s [planner] ======== %s ========\n' "$(date '+%F %T')" "$*" >>"$LOG"; }
tailsum() { tail -n 8 "$DETAIL" 2>/dev/null | sed "s/^/$(date '+%F %T') [planner]   │ /" >>"$LOG"; }

# 0) 시간대별 간격 게이트 (조용히 종료)
H=$((10#$(date +%H)))
if [ "$H" -ge 9 ] && [ "$H" -lt 18 ]; then REQ=180; else REQ=600; fi
STAMP="$BASE/.planner.laststamp"; NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
[ $((NOW - LAST)) -lt "$REQ" ] && exit 0
echo "$NOW" > "$STAMP"

# 1) 할 일 판단: 백로그 부족 또는 트리아지 대기(qa-finding 미승격)
backlog=$(gh issue list --repo "$REPO" --label ready-for-dev --state open --json number -q 'length' 2>/dev/null)
[ -z "$backlog" ] && { log "✗ gh 이슈 조회 실패 — skip"; exit 0; }
qafind=$(gh issue list --repo "$REPO" --label qa-finding --state open --json number,labels \
  --jq '[.[] | select((.labels|map(.name)|index("ready-for-dev"))|not)] | length' 2>/dev/null)
[ -z "$qafind" ] && qafind=0
if [ "$backlog" -ge "$TARGET" ] && [ "$qafind" -eq 0 ]; then
  log "· skip — 백로그 충분(ready-for-dev=$backlog/$TARGET) & 트리아지 대기 0"
  exit 0
fi

# ── 실제 실행 ──
hr "RUN 시작"
: > "$DETAIL"
log "1) 할 일: 백로그=$backlog/$TARGET, 트리아지 대기 qa-finding=$qafind"

# 2) 전용 클론 최신화
if [ ! -d "$WORKDIR/.git" ]; then
  log "2) 전용 클론 생성: $WORKDIR"
  git clone "https://github.com/fwani/harness-game" "$WORKDIR" >>"$DETAIL" 2>&1
fi
log "2) main 최신화 (fetch origin)"
git -C "$WORKDIR" fetch origin --prune >>"$DETAIL" 2>&1

# 3) 프롬프트 로드
PROMPT=$(git -C "$WORKDIR" show origin/main:automation/planner-prompt.md 2>/dev/null)
[ -z "$PROMPT" ] && PROMPT=$(cat "$BASE/planner-prompt.md" 2>/dev/null)
[ -z "$PROMPT" ] && { log "✗ 프롬프트 없음 — skip"; exit 0; }

# 4) claude 위임 (트리아지 + 이슈 생성). 원시 출력은 detail 로그로.
log "3) claude 위임 → qa-finding 트리아지 + 백로그 충원 (상세: $(basename "$DETAIL"))"
cd "$WORKDIR" || { log "✗ cd 실패: $WORKDIR"; exit 1; }
claude -p "$PROMPT" --allowedTools Bash Read Glob Grep WebSearch WebFetch >>"$DETAIL" 2>&1
rc=$?
log "4) claude 종료 (exit $rc) — 보고 요약:"
tailsum
hr "RUN 종료 (exit $rc)"

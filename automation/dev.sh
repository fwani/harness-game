#!/bin/zsh
# 자동 개발 tick — launchd가 3분(09~18시)/10분(그 외)마다 실행.
# 싼 gh 체크로 처리할 ready-for-dev 이슈가 있을 때만 로컬 claude에게 개발을 시킨다.
# 봇 전용 클론에서 작업하므로 사용자 작업 디렉터리는 건드리지 않는다.
# 프롬프트는 레포의 automation/dev-prompt.md(origin/main)에서 읽는다 — 버전관리 단일 소스.
# AUTODEV_WORKER=N 이면 보조 워커(repo-devN/dev-N.log, actionable>=N, (N-1)*20초 스태거).
#
# 로그 형식:
#   dev[-N].log         사람용 단계별 타임라인 (한 줄/단계)
#   dev[-N].detail.log  npm/git/claude 원시 출력 (실행마다 새로 덮어씀)

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO="fwani/harness-game"
BASE="$HOME/Library/Application Support/harness-game-autodev"
W="${AUTODEV_WORKER:-}"
LABEL="dev${W}"
WORKDIR="$BASE/repo-dev${W}"
LOG="$BASE/dev${W:+-$W}.log"
DETAIL="$BASE/dev${W:+-$W}.detail.log"
mkdir -p "$BASE"
log()  { printf '%s [%s] %s\n' "$(date '+%F %T')" "$LABEL" "$*" >>"$LOG"; }
hr()   { printf '%s [%s] ======== %s ========\n' "$(date '+%F %T')" "$LABEL" "$*" >>"$LOG"; }
tailsum() { tail -n 8 "$DETAIL" 2>/dev/null | sed "s/^/$(date '+%F %T') [$LABEL]   │ /" >>"$LOG"; }

# 0) 시간대별 간격 게이트 (조용히 종료 — 매 깨움마다 로그 남기지 않음)
H=$((10#$(date +%H)))
if [ "$H" -ge 9 ] && [ "$H" -lt 18 ]; then REQ=180; else REQ=600; fi
STAMP="$BASE/.dev${W:+-$W}.laststamp"; NOW=$(date +%s)
LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
[ $((NOW - LAST)) -lt "$REQ" ] && exit 0
echo "$NOW" > "$STAMP"

# 보조 워커는 낮은 번호 워커가 먼저 claim 하도록 번호별 스태거.
[ -n "$W" ] && sleep $(( (10#$W - 1) * 20 ))

# 1) 처리 가능한 이슈 = open + ready-for-dev + (in-progress-ai 없음) + (assignee 없음)
actionable=$(gh issue list --repo "$REPO" --label ready-for-dev --state open \
  --json number,labels,assignees \
  --jq '[.[] | select((.labels|map(.name)|index("in-progress-ai"))|not) | select(.assignees|length==0)] | length' 2>/dev/null)
MIN=1; [ -n "$W" ] && MIN=$((10#$W))
[ -z "$actionable" ] && { log "✗ gh 이슈 조회 실패 — skip"; exit 0; }
[ "$actionable" -lt "$MIN" ] && { log "· skip — 처리 대상 부족 (actionable=$actionable < MIN=$MIN)"; exit 0; }

# ── 여기부터 실제 실행: 헤더 + 상세로그 초기화 ──
hr "RUN 시작"
: > "$DETAIL"
log "1) 처리 대상 확인: actionable=$actionable (MIN=$MIN)"

# 2) 전용 클론 최신화
if [ ! -d "$WORKDIR/.git" ]; then
  log "2) 전용 클론 생성: $WORKDIR"
  git clone "https://github.com/fwani/harness-game" "$WORKDIR" >>"$DETAIL" 2>&1
fi
log "2) main 최신화 (fetch origin)"
git -C "$WORKDIR" fetch origin --prune >>"$DETAIL" 2>&1

# 3) 프롬프트 로드 (origin/main 단일 소스, fallback 사본)
PROMPT=$(git -C "$WORKDIR" show origin/main:automation/dev-prompt.md 2>/dev/null)
[ -z "$PROMPT" ] && PROMPT=$(cat "$BASE/dev-prompt.md" 2>/dev/null)
[ -z "$PROMPT" ] && { log "✗ 프롬프트 없음 — skip"; exit 0; }

# 4) claude 개발 위임 (구현→검증→PR→머지). 원시 출력은 detail 로그로.
log "3) claude 개발 위임 → 구현·검증·PR·머지 (상세: $(basename "$DETAIL"))"
cd "$WORKDIR" || { log "✗ cd 실패: $WORKDIR"; exit 1; }
claude -p "$PROMPT" --allowedTools Bash Read Write Edit Glob Grep >>"$DETAIL" 2>&1
rc=$?
log "4) claude 종료 (exit $rc) — 보고 요약:"
tailsum
hr "RUN 종료 (exit $rc)"

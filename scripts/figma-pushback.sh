#!/bin/bash
# figma-pushback.sh — Post Mantine Architect conflict comments to a Figma file
#
# Usage:
#   ./figma-pushback.sh <FILE_KEY> <FIGMA_LINK> <PUSHBACK_JSON> [--dry-run]
#
# Arguments:
#   FILE_KEY       Figma file key (extracted from Figma URL)
#   FIGMA_LINK     Original Figma URL (used in comment footer)
#   PUSHBACK_JSON  JSON array of conflict objects (see format below)
#   --dry-run      Print comments that would be posted; skip all network calls
#
# PUSHBACK_JSON format:
# [
#   {
#     "node_id":  "83:1773",
#     "severity": "BLOCK",        # BLOCK | ADAPT
#     "category": "A",            # A | B | C | D
#     "summary":  "short title",
#     "detail":   "full explanation"
#   }
# ]
#
# Token resolution (first found wins):
#   1. $FIGMA_ACCESS_TOKEN env var
#   2. claude_desktop_config.json (any env key containing FIGMA and TOKEN)
#
# Idempotency:
#   Before posting, GET existing comments and skip any where the body already
#   contains [MANTINE-ARCHITECT|<node_id>|<summary>].
#
# Exit codes:
#   0  All comments posted (or skipped as duplicates), or dry-run completed
#   1  Fatal error (missing token, API error, bad JSON)

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Args ─────────────────────────────────────────────────────────────────────
FILE_KEY="${1:-}"
FIGMA_LINK="${2:-}"
PUSHBACK_JSON="${3:-}"
DRY_RUN=false

for arg in "$@"; do
  [ "$arg" = "--dry-run" ] && DRY_RUN=true
done

if [ -z "$FILE_KEY" ] || [ -z "$FIGMA_LINK" ] || [ -z "$PUSHBACK_JSON" ]; then
  echo -e "${RED}Usage: $0 <FILE_KEY> <FIGMA_LINK> <PUSHBACK_JSON> [--dry-run]${NC}" >&2
  exit 1
fi

# ─── Validate JSON ────────────────────────────────────────────────────────────
ITEM_COUNT=$(python3 -c "
import json, sys
try:
    d = json.loads(sys.argv[1])
    if not isinstance(d, list): sys.exit(1)
    print(len(d))
except:
    sys.exit(1)
" "$PUSHBACK_JSON" 2>/dev/null) || {
  echo -e "${RED}❌ Invalid PUSHBACK_JSON — must be a JSON array${NC}" >&2
  exit 1
}

if [ "$ITEM_COUNT" = "0" ]; then
  echo -e "${BLUE}ℹ  No pushback items — nothing to post${NC}"
  exit 0
fi

echo -e "${CYAN}💬 Figma Pushback  (${ITEM_COUNT} conflict$([ "$ITEM_COUNT" -ne 1 ] && echo s))${NC}"
$DRY_RUN && echo -e "${YELLOW}   DRY RUN — no network calls will be made${NC}"
echo ""

# ─── Token resolution ─────────────────────────────────────────────────────────
# In dry-run mode the token is not needed — skip resolution entirely.
# Token precedence: $FIGMA_ACCESS_TOKEN env var → claude_desktop_config.json
# If $FIGMA_ACCESS_TOKEN is set (even to empty string) we use it as-is and do
# NOT fall back to the config file, so tests can force "no token" with
#   FIGMA_ACCESS_TOKEN="" ./figma-pushback.sh ...
TOKEN=""
if ! $DRY_RUN; then
  if [ -n "${FIGMA_ACCESS_TOKEN+x}" ]; then
    # Env var is set (may be empty — honour it, don't fall back to config)
    TOKEN="${FIGMA_ACCESS_TOKEN:-}"
  else
    # Env var is unset — try the desktop config
    local_cfg="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    if [ -f "$local_cfg" ]; then
      TOKEN=$(python3 -c "
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    for v in d.get('mcpServers', {}).values():
        for k, val in v.get('env', {}).items():
            if 'FIGMA' in k.upper() and 'TOKEN' in k.upper():
                print(val); sys.exit(0)
except:
    pass
" "$local_cfg" 2>/dev/null)
    fi
  fi

  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No Figma access token found.${NC}" >&2
    echo "   Set FIGMA_ACCESS_TOKEN env var, or add it to ~/Library/Application Support/Claude/claude_desktop_config.json" >&2
    exit 1
  fi
fi

# ─── Fetch existing comments (idempotency — skipped in dry-run) ───────────────
EXISTING_JSON='{"comments":[]}'
if ! $DRY_RUN; then
  RESP=$(curl -s \
    -H "X-Figma-Token: $TOKEN" \
    "https://api.figma.com/v1/files/$FILE_KEY/comments" 2>/dev/null)

  API_ERR=$(echo "$RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('err') or '')
except:
    print('parse-error')
" 2>/dev/null)

  if [ -n "$API_ERR" ]; then
    echo -e "${RED}❌ Figma API error fetching comments: $API_ERR${NC}" >&2
    exit 1
  fi
  EXISTING_JSON="$RESP"
fi

# ─── Build comment body ────────────────────────────────────────────────────────
# Returns the full comment string via stdout (no heredoc — safe to source in tests).
build_comment() {
  local NODE_ID="$1" SEVERITY="$2" CATEGORY="$3" SUMMARY="$4" DETAIL="$5"
  local DATE EMOJI CAT_LABEL IDEM_KEY

  DATE=$(date '+%Y-%m-%d %H:%M')

  case "$SEVERITY" in
    BLOCK) EMOJI="🔴" ;;
    ADAPT) EMOJI="🟡" ;;
    *)     EMOJI="🔵" ;;
  esac

  case "$CATEGORY" in
    A) CAT_LABEL="A — Component Cannibalization" ;;
    B) CAT_LABEL="B — Layout Paradox" ;;
    C) CAT_LABEL="C — Accessibility Tension" ;;
    D) CAT_LABEL="D — Thin Wrapper Docs Gap" ;;
    *) CAT_LABEL="$CATEGORY" ;;
  esac

  IDEM_KEY="[MANTINE-ARCHITECT|${NODE_ID}|${SUMMARY}]"

  printf '%s\n' \
    "🤖 Mantine Architect  ${EMOJI} ${SEVERITY} · ${CAT_LABEL}" \
    "──────────────────────────────────────" \
    "${SUMMARY}" \
    "" \
    "${DETAIL}" \
    "" \
    "Generated: ${DATE}" \
    "Figma: ${FIGMA_LINK}" \
    "${IDEM_KEY}"
}

# ─── Post one comment via REST API ────────────────────────────────────────────
post_comment() {
  local NODE_ID="$1" BODY="$2"

  local PAYLOAD
  # client_meta requires node_id + node_offset — bare node_id is rejected (HTTP 400)
  PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({'message': sys.argv[2], 'client_meta': {'node_id': sys.argv[1], 'node_offset': {'x': 0, 'y': 0}}}))" \
    "$NODE_ID" "$BODY")

  local HTTP_CODE
  HTTP_CODE=$(curl -s -o /tmp/figma-comment-resp.json -w "%{http_code}" \
    -X POST \
    -H "X-Figma-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "https://api.figma.com/v1/files/$FILE_KEY/comments" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    python3 -c "import json; d=json.load(open('/tmp/figma-comment-resp.json')); print(d.get('id','?'))" 2>/dev/null
  else
    local ERR
    ERR=$(python3 -c "import json; d=json.load(open('/tmp/figma-comment-resp.json')); print(d.get('err') or d.get('message','unknown'))" 2>/dev/null)
    echo "ERROR:${HTTP_CODE}:${ERR}"
  fi
}

# ─── Main loop ────────────────────────────────────────────────────────────────
POSTED=0; SKIPPED=0; FAILED=0

while IFS='|' read -r TAG IDX NODE_ID SEVERITY CATEGORY SUMMARY DETAIL IS_DUP; do
  [ "$TAG" != "ITEM" ] && continue

  EMOJI="🔴"
  [ "$SEVERITY" = "ADAPT" ] && EMOJI="🟡"

  if [ "$IS_DUP" = "True" ]; then
    echo -e "  ${BLUE}⏭  [$((IDX+1))/$ITEM_COUNT] ${EMOJI} ${SEVERITY} — ${SUMMARY}${NC}"
    echo -e "     Already posted (skipping)"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  BODY=$(build_comment "$NODE_ID" "$SEVERITY" "$CATEGORY" "$SUMMARY" "$DETAIL")

  if $DRY_RUN; then
    echo -e "  ${YELLOW}[DRY RUN] [$((IDX+1))/$ITEM_COUNT] ${EMOJI} ${SEVERITY} — ${SUMMARY}${NC}"
    echo -e "  ${YELLOW}  Node: $NODE_ID${NC}"
    echo ""
    echo "$BODY" | sed 's/^/     /'
    echo ""
    POSTED=$((POSTED+1))
  else
    echo -e "  ${CYAN}▶  [$((IDX+1))/$ITEM_COUNT] ${EMOJI} ${SEVERITY} — ${SUMMARY}${NC}"
    RESULT=$(post_comment "$NODE_ID" "$BODY")
    if [[ "$RESULT" == ERROR:* ]]; then
      echo -e "     ${RED}❌ Failed: ${RESULT#ERROR:}${NC}"
      FAILED=$((FAILED+1))
    else
      echo -e "     ${GREEN}✅ Posted (id: $RESULT)${NC}"
      POSTED=$((POSTED+1))
    fi
  fi

done < <(python3 -c "
import json, sys
items    = json.loads(sys.argv[1])
existing = json.loads(sys.argv[2]).get('comments', [])
bodies   = [c.get('message','') for c in existing]
for i, item in enumerate(items):
    nid  = item.get('node_id','')
    sev  = item.get('severity','')
    cat  = item.get('category','')
    summ = item.get('summary','')
    det  = item.get('detail','')
    key  = f'[MANTINE-ARCHITECT|{nid}|{summ}]'
    dup  = any(key in b for b in bodies)
    print(f'ITEM|{i}|{nid}|{sev}|{cat}|{summ}|{det}|{dup}')
" "$PUSHBACK_JSON" "$EXISTING_JSON")

# ─── Summary ──────────────────────────────────────────────────────────────────
echo -e "  Posted: ${GREEN}${POSTED}${NC}  Skipped: ${BLUE}${SKIPPED}${NC}  Failed: ${RED}${FAILED}${NC}"

[ "$FAILED" -gt 0 ] && exit 1 || exit 0

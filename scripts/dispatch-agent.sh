#!/bin/bash
# Agent Dispatcher for Component Generation
# Usage: ./dispatch-agent.sh ComponentName FigmaLink [--auto-approve] [--stage2] [--plan=PATH]
#
# Two-invocation architecture:
#   Invocation 1 (Stage 1): Queries Figma, produces a plan document, stops.
#   Invocation 2 (Stage 2+3): Receives plan only — no Figma MCP, no Stage 1 history.
#
# Logs:
#   Stage 1:   logs/generate-{Component}-{ts}.log
#   Plan file: logs/plan-{Component}-{ts}.md
#   Stage 2+3: logs/generate-{Component}-{ts}-stage23.log

set -eo pipefail

# Ensure Herd/NVM node binaries (including claude CLI) are on PATH
export PATH="/Users/alexwood/Library/Application Support/Herd/config/nvm/versions/node/v24.13.1/bin:$PATH"

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ─── Arguments ────────────────────────────────────────────────────────────────
COMPONENT=$1
FIGMA_LINK=$2
AUTO_APPROVE=false
STAGE=1          # default: run Stage 1 only
PLAN_FILE=""     # set by --plan= or auto-discovered for --stage2
PLAN_ONLY=false  # set by --plan-only (batch use: Stage 1 only, no interactive gate)
PROJECT_ROOT="${MANTINE_WORK_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

for arg in "$@"; do
  case "$arg" in
    --auto-approve)
      AUTO_APPROVE=true
      ;;
    --stage2)
      STAGE=23
      ;;
    --plan=*)
      STAGE=23
      PLAN_FILE="${arg#--plan=}"
      ;;
    --plan-only)
      PLAN_ONLY=true
      ;;
  esac
done

# ─── Usage ────────────────────────────────────────────────────────────────────
if [ -z "$COMPONENT" ] || [ -z "$FIGMA_LINK" ]; then
  echo -e "${RED}Usage: $0 ComponentName FigmaLink [flags]${NC}"
  echo ""
  echo "Flags:"
  echo "  --auto-approve    Skip human approval gate (Stage 1 → Stage 2+3 immediately)"
  echo "  --plan-only       Run Stage 1 only, no interactive gate (for batch use)"
  echo "  --stage2          Run Stage 2+3 only (uses most recent plan file for this component)"
  echo "  --plan=PATH       Run Stage 2+3 with a specific plan file"
  echo ""
  echo "Examples:"
  echo "  $0 Button 'https://figma.com/design/...'              # Stage 1, then approval gate"
  echo "  $0 Button 'https://figma.com/design/...' --plan-only  # Stage 1 only (no gate)"
  echo "  $0 Button 'https://figma.com/design/...' --stage2     # Stage 2+3 after approval"
  echo "  $0 Button 'https://figma.com/design/...' --auto-approve  # Full run, no gate"
  echo ""
  exit 1
fi

# ─── Setup ────────────────────────────────────────────────────────────────────
LOGS_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOGS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
SESSION_NAME="generate-$COMPONENT"
LOG_FILE="$LOGS_DIR/generate-$COMPONENT-$TIMESTAMP.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}🚀 Dispatching Agent for Component Generation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Component:${NC} $COMPONENT"
echo -e "${BLUE}Figma Link:${NC} $FIGMA_LINK"
echo -e "${BLUE}Stage:${NC} $([ "$STAGE" = "23" ] && echo "2+3 (Act + Reflect)" || ([ "$PLAN_ONLY" = "true" ] && echo "1 (Plan only — no gate)" || echo "1 (Plan)"))"
echo -e "${BLUE}Auto-approve:${NC} $AUTO_APPROVE"
echo ""

# ─── Check claude CLI ─────────────────────────────────────────────────────────
if ! command -v claude &> /dev/null; then
  echo -e "${RED}Error: Claude Code CLI not found${NC}"
  echo "Install with: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

# ─── Required files check (stage-specific) ────────────────────────────────────
CLAUDE_MD="$PROJECT_ROOT/00-setup/AGENT-CLAUDE.md"
STYLE_GUIDE="$PROJECT_ROOT/00-setup/style_guide.md"
STAGE1_PROMPT="$PROJECT_ROOT/00-setup/stage1-prompt.md"
STAGE23_PROMPT="$PROJECT_ROOT/00-setup/stage23-prompt.md"
LLMS_FILE="$PROJECT_ROOT/00-setup/mantine-llms.txt"

if [ "$STAGE" = "1" ]; then
  REQUIRED_FILES=("$CLAUDE_MD" "$STAGE1_PROMPT" "$STYLE_GUIDE")
else
  REQUIRED_FILES=("$CLAUDE_MD" "$STAGE23_PROMPT" "$STYLE_GUIDE")
fi

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
  [ ! -f "$file" ] && MISSING_FILES+=("$file")
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo -e "${RED}Error: Missing required context files${NC}"
  printf '  %s\n' "${MISSING_FILES[@]}"
  exit 1
fi

# ─── Plan file resolution (Stage 2+3 only) ────────────────────────────────────
if [ "$STAGE" = "23" ]; then
  if [ -z "$PLAN_FILE" ]; then
    # Auto-discover most recent plan file for this component
    PLAN_FILE=$(ls -t "$LOGS_DIR/plan-$COMPONENT-"*.md 2>/dev/null | head -1)
    if [ -z "$PLAN_FILE" ]; then
      echo -e "${RED}Error: No plan file found for '$COMPONENT'${NC}"
      echo ""
      echo "Run Stage 1 first:"
      echo "  $0 $COMPONENT '$FIGMA_LINK'"
      echo ""
      echo "Or specify a plan file explicitly:"
      echo "  $0 $COMPONENT '$FIGMA_LINK' --plan=logs/plan-$COMPONENT-TIMESTAMP.md"
      exit 1
    fi
  elif [ ! -f "$PLAN_FILE" ]; then
    echo -e "${RED}Error: Plan file not found: $PLAN_FILE${NC}"
    exit 1
  fi
  echo -e "${BLUE}Plan file:${NC} $PLAN_FILE"
fi

# ─── MCP config (Stage 1 only — Stage 2+3 intentionally has no Figma access) ──
LOCAL_MCP_CONFIG="$PROJECT_ROOT/.claude/mcp-config.json"
DESKTOP_MCP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$LOCAL_MCP_CONFIG" ]; then
  MCP_CONFIG="$LOCAL_MCP_CONFIG"
else
  MCP_CONFIG="$DESKTOP_MCP_CONFIG"
fi

# ─── Refresh mantine-llms.txt ─────────────────────────────────────────────────
LLMS_URL="https://mantine.dev/llms-full.txt"
ETAG_FILE="$PROJECT_ROOT/00-setup/.mantine-llms-etag"

if [ "${SKIP_LLMS_REFRESH:-}" = "1" ] && [ -f "$LLMS_FILE" ]; then
  echo -e "${GREEN}✅ mantine-llms.txt skipped (fresh <6 h — set by MCP runner)${NC}"
else
echo -e "${BLUE}Refreshing mantine-llms.txt...${NC}"
CURL_ARGS=()
[ -f "$ETAG_FILE" ] && CURL_ARGS+=(--header "If-None-Match: $(cat "$ETAG_FILE")")

HTTP_STATUS=$(curl -s -o /tmp/mantine-llms-fresh.txt -w "%{http_code}" \
  "${CURL_ARGS[@]}" \
  --dump-header /tmp/mantine-llms-headers.txt \
  "$LLMS_URL")

if [ "$HTTP_STATUS" = "200" ]; then
  mv /tmp/mantine-llms-fresh.txt "$LLMS_FILE"
  grep -i "^etag:" /tmp/mantine-llms-headers.txt | awk '{print $2}' | tr -d '\r' > "$ETAG_FILE" || true
  echo -e "${GREEN}✅ mantine-llms.txt updated (HTTP 200)${NC}"
elif [ "$HTTP_STATUS" = "304" ]; then
  echo -e "${GREEN}✅ mantine-llms.txt unchanged (HTTP 304 — using cached copy)${NC}"
elif [ -f "$LLMS_FILE" ]; then
  echo -e "${YELLOW}⚠️  Could not refresh mantine-llms.txt (HTTP $HTTP_STATUS) — using cached copy${NC}"
else
  echo -e "${RED}❌ Could not fetch mantine-llms.txt (HTTP $HTTP_STATUS) and no cached copy exists${NC}"
  echo ""
  echo "Fix the network issue or manually download:"
  echo "  curl -o $LLMS_FILE https://mantine.dev/llms-full.txt"
  exit 1
fi
fi  # end SKIP_LLMS_REFRESH check

# ─── Extract component API section ────────────────────────────────────────────
COMPONENT_API_SECTION=""
if [ -f "$LLMS_FILE" ]; then
  START_LINE=$(grep -n "^### ${COMPONENT}$" "$LLMS_FILE" | head -1 | cut -d: -f1 || true)
  if [ -n "$START_LINE" ]; then
    END_LINE=$(awk "NR>$START_LINE && /^### /{print NR; exit}" "$LLMS_FILE")
    if [ -n "$END_LINE" ]; then
      COMPONENT_API_SECTION=$(sed -n "${START_LINE},$((END_LINE - 1))p" "$LLMS_FILE")
    else
      COMPONENT_API_SECTION=$(sed -n "${START_LINE},\$p" "$LLMS_FILE")
    fi
    echo -e "${BLUE}Mantine API section:${NC} ### ${COMPONENT} (lines ${START_LINE}–${END_LINE:-EOF})"
  else
    echo -e "${YELLOW}⚠️  No '### ${COMPONENT}' section found in mantine-llms.txt${NC}"
  fi
fi

echo ""
echo -e "${YELLOW}⏳ Starting agent...${NC}"
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# FUNCTIONS
# ═════════════════════════════════════════════════════════════════════════════

run_stage1() {
  echo -e "${BLUE}Stage 1 log:${NC} $LOG_FILE"
  echo -e "${BLUE}MCP Config:${NC} $MCP_CONFIG"
  echo ""

  # Build prompt in a temp file so file contents are written with cat (no shell
  # expansion) rather than via an unquoted heredoc (which would expand backticks
  # and $(...) sequences found in AGENT-CLAUDE.md or mantine-llms.txt).
  local PROMPT_FILE
  PROMPT_FILE=$(mktemp /tmp/mantine-stage1-XXXXXX.txt)

  {
    printf '%s\n' \
      "You are a specialized component generation agent running STAGE 1 (PLAN) only." \
      "Do NOT generate any code files. Do NOT write to the filesystem." \
      "" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "PROJECT RULES & GOTCHAS (CLAUDE.md)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$CLAUDE_MD"
    printf '\n%s\n%s\n%s\n' \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "STAGE 1 WORKFLOW (stage1-prompt.md)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$STAGE1_PROMPT"
    printf '\n%s\n%s\n%s\n' \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "STYLE GUIDE (style_guide.md)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$STYLE_GUIDE"
    printf '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    printf 'MANTINE API: %s\n' "$COMPONENT"
    printf '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    printf '%s\n' "$COMPONENT_API_SECTION"
    printf '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    printf '\nComponent to plan:\n'
    printf '- Name: %s\n' "$COMPONENT"
    printf '- Figma: %s\n' "$FIGMA_LINK"
    printf '- Output dir (for Stage 2): %s/02-generated/%s/\n' "$PROJECT_ROOT" "$COMPONENT"
    printf '\nBegin Stage 1 now. Follow the workflow above. End with your plan inside <STAGE1_PLAN> markers.\n'
  } > "$PROMPT_FILE"

  set +e
  claude --print --dangerously-skip-permissions \
    --mcp-config "$MCP_CONFIG" < "$PROMPT_FILE" > "$LOG_FILE" 2>&1
  STAGE1_EXIT=$?
  set -e
  rm -f "$PROMPT_FILE"

  if [ $STAGE1_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Stage 1 agent failed (exit $STAGE1_EXIT)${NC}"
    echo "Log: $LOG_FILE"
    exit $STAGE1_EXIT
  fi
}

extract_plan_from_log() {
  # Verify log was written
  if [ ! -s "$LOG_FILE" ]; then
    echo -e "${RED}Error: Stage 1 log is empty or missing: $LOG_FILE${NC}"
    exit 1
  fi

  # Check for truncated response (opening tag without closing tag)
  OPEN_COUNT=$(grep -c '<STAGE1_PLAN>' "$LOG_FILE" || true)
  CLOSE_COUNT=$(grep -c '</STAGE1_PLAN>' "$LOG_FILE" || true)
  if [ "$OPEN_COUNT" -gt 0 ] && [ "$CLOSE_COUNT" -eq 0 ]; then
    echo -e "${RED}Error: <STAGE1_PLAN> opened but </STAGE1_PLAN> not found — response was truncated${NC}"
    echo ""
    echo "This usually means the context window was exceeded."
    echo "Check the full log: $LOG_FILE"
    echo "Re-run Stage 1: $0 $COMPONENT '$FIGMA_LINK'"
    exit 1
  fi

  # Extract plan content
  PLAN_CONTENT=$(sed -n '/<STAGE1_PLAN>/,/<\/STAGE1_PLAN>/p' "$LOG_FILE" | sed '1d;$d')

  if [ -z "$PLAN_CONTENT" ]; then
    echo -e "${RED}Error: No <STAGE1_PLAN> block found in Stage 1 output${NC}"
    echo ""
    echo "The agent did not follow the output format."
    echo "Check the full log: $LOG_FILE"
    echo ""
    echo "Recovery options:"
    echo "  1. Re-run Stage 1: $0 $COMPONENT '$FIGMA_LINK'"
    echo "  2. Manually create a plan file at:"
    echo "     $PLAN_FILE"
    echo "     Then run: $0 $COMPONENT '$FIGMA_LINK' --plan=$PLAN_FILE"
    exit 1
  fi

  # Warn if plan is suspiciously short
  PLAN_CHARS=$(echo "$PLAN_CONTENT" | wc -c | tr -d ' ')
  if [ "$PLAN_CHARS" -lt 300 ]; then
    echo -e "${YELLOW}⚠️  Plan content is unusually short ($PLAN_CHARS chars) — review carefully${NC}"
  fi

  # Write plan file
  PLAN_FILE="$LOGS_DIR/plan-$COMPONENT-$TIMESTAMP.md"
  {
    echo "# Stage 1 Plan: $COMPONENT"
    echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Figma: $FIGMA_LINK"
    echo "Stage 1 log: $LOG_FILE"
    echo ""
    echo "$PLAN_CONTENT"
  } > "$PLAN_FILE"

  echo ""
  echo -e "${GREEN}✅ Plan extracted:${NC} $PLAN_FILE"
  echo -e "${BLUE}   Plan size:${NC} $PLAN_CHARS chars"
  echo ""

  # ─── Figma Pushback ─────────────────────────────────────────────────────────
  # Extract <PUSHBACK> block from the Stage 1 log and post comments to Figma.
  # Only fires when the agent emitted a non-empty <PUSHBACK> block (🔴 or 🟡 conflicts).
  # 🔵 NOTE items are omitted by the agent — this script just posts what it receives.
  run_figma_pushback
}

run_figma_pushback() {
  local PUSHBACK_RAW
  # tr -d '\n' compacts multi-line JSON; sed trims leading/trailing whitespace.
  # xargs is intentionally avoided — it interprets double-quotes as shell quoting
  # and strips them, turning valid JSON into unparseable garbage on macOS.
  PUSHBACK_RAW=$(sed -n '/<PUSHBACK>/,/<\/PUSHBACK>/p' "$LOG_FILE" 2>/dev/null \
    | sed '1d;$d' | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)

  # Nothing to post if block absent or empty
  if [ -z "$PUSHBACK_RAW" ] || [ "$PUSHBACK_RAW" = "[]" ]; then
    return 0
  fi

  # Validate it's a JSON array before proceeding
  local COUNT
  COUNT=$(python3 -c "
import json, sys
try:
    d = json.loads(sys.argv[1])
    print(len(d) if isinstance(d, list) else 0)
except:
    print(0)
" "$PUSHBACK_RAW" 2>/dev/null)

  if [ "${COUNT:-0}" = "0" ]; then
    echo -e "${YELLOW}⚠️  <PUSHBACK> block found but could not be parsed as JSON — skipping Figma comments${NC}"
    return 0
  fi

  # Extract file key from Figma URL (supports both /file/ and /design/ formats)
  local FILE_KEY
  FILE_KEY=$(echo "$FIGMA_LINK" | python3 -c "
import sys, re
url = sys.stdin.read().strip()
m = re.search(r'figma\.com/(?:file|design)/([A-Za-z0-9_-]+)', url)
print(m.group(1) if m else '')
" 2>/dev/null)

  if [ -z "$FILE_KEY" ]; then
    echo -e "${YELLOW}⚠️  Could not extract Figma file key from URL — skipping pushback${NC}"
    return 0
  fi

  local PUSHBACK_SCRIPT="$PROJECT_ROOT/scripts/figma-pushback.sh"
  if [ ! -f "$PUSHBACK_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  figma-pushback.sh not found — skipping Figma comments${NC}"
    return 0
  fi

  echo -e "${CYAN}💬 Posting ${COUNT} conflict comment$([ "$COUNT" -ne 1 ] && echo s) to Figma...${NC}"
  bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" "$PUSHBACK_RAW" || \
    echo -e "${YELLOW}⚠️  Figma pushback failed (non-fatal — plan was saved successfully)${NC}"
}

show_approval_gate() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${CYAN}Stage 1 complete. Review the plan:${NC}"
  echo ""
  echo -e "  ${BLUE}cat $PLAN_FILE${NC}"
  echo ""

  if [ "$AUTO_APPROVE" = true ]; then
    echo -e "${YELLOW}⚠️  AUTO_APPROVE=true — Stage 1 plan not reviewed by human${NC}"
    echo -e "${YELLOW}   Proceeding to Stage 2+3 automatically${NC}"
    echo ""
    GATE_REPLY="y"
  else
    read -r -p "Proceed to Stage 2+3 (code generation)? (y/n) " -n 1 GATE_REPLY
    echo ""
  fi

  if [[ ! $GATE_REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${CYAN}Stage 1 saved. Resume later with:${NC}"
    echo "  $0 $COMPONENT '$FIGMA_LINK' --stage2"
    echo "  # or specify plan explicitly:"
    echo "  $0 $COMPONENT '$FIGMA_LINK' --plan=$PLAN_FILE"
    echo ""
    exit 0
  fi
}

run_stage23() {
  # New log file and timestamp for Stage 2+3
  TIMESTAMP2=$(date '+%Y%m%d-%H%M%S')
  LOG_FILE_23="$LOGS_DIR/generate-$COMPONENT-${TIMESTAMP2}-stage23.log"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${CYAN}🔨 Launching Stage 2+3 (Act + Reflect)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${BLUE}Stage 2+3 log:${NC} $LOG_FILE_23"
  echo ""
  echo -e "${YELLOW}⏳ This may take 15-20 minutes...${NC}"
  echo ""

  # Build prompt in a temp file — same rationale as run_stage1: avoids shell
  # expansion of file contents (AGENT-CLAUDE.md, stage23-prompt.md, plan file).
  # Also avoids storing the full plan in a shell variable (no size limit risk).
  local PROMPT_FILE
  PROMPT_FILE=$(mktemp /tmp/mantine-stage23-XXXXXX.txt)

  {
    printf '%s\n' \
      "You are a specialized component generation agent running STAGE 2 (ACT) + STAGE 3 (REFLECT)." \
      "The Stage 1 plan below has been approved by a human. Implement it exactly." \
      "" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "PROJECT RULES & GOTCHAS (CLAUDE.md)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$CLAUDE_MD"
    printf '\n%s\n%s\n%s\n' \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "STAGE 2+3 WORKFLOW (stage23-prompt.md)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$STAGE23_PROMPT"
    printf '\n%s\n%s\n%s\n' \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "STYLE GUIDE (style_guide.md)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$STYLE_GUIDE"
    printf '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    printf 'MANTINE API: %s\n' "$COMPONENT"
    printf '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    printf '%s\n' "$COMPONENT_API_SECTION"
    printf '\n%s\n%s\n%s\n' \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
      "STAGE 1 PLAN (approved — implement this)" \
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$PLAN_FILE"
    printf '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    printf '\nComponent:\n'
    printf '- Name: %s\n' "$COMPONENT"
    printf '- Figma: %s (reference only — do NOT call any Figma MCP tools)\n' "$FIGMA_LINK"
    printf '- Output dir: %s/02-generated/%s/\n' "$PROJECT_ROOT" "$COMPONENT"
    printf '\nBegin Stage 2 now. Generate all 4 files, then run all Stage 3 quality gates.\n'
  } > "$PROMPT_FILE"

  set +e
  # Note: --mcp-config intentionally omitted — no Figma access in Stage 2+3
  claude --print --dangerously-skip-permissions < "$PROMPT_FILE" > "$LOG_FILE_23" 2>&1
  STAGE23_EXIT=$?
  set -e
  rm -f "$PROMPT_FILE"

  if [ $STAGE23_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Stage 2+3 agent failed (exit $STAGE23_EXIT)${NC}"
    echo "Log: $LOG_FILE_23"
    exit $STAGE23_EXIT
  fi

  # ─── Completion summary ─────────────────────────────────────────────────────
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${GREEN}✅ Stage 2+3 Complete${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  COMPONENT_DIR="$PROJECT_ROOT/02-generated/$COMPONENT"
  if [ -d "$COMPONENT_DIR" ] && [ "$(ls -A "$COMPONENT_DIR" 2>/dev/null)" ]; then
    echo -e "${GREEN}Generated files:${NC}"
    ls -lh "$COMPONENT_DIR"/ | grep -v '^total' | awk '{print "  " $9 " (" $5 ")"}'
  else
    echo -e "${YELLOW}⚠️  Component directory empty or not created — check log${NC}"
  fi

  echo ""
  echo -e "${BLUE}📄 Stage 2+3 log:${NC} $LOG_FILE_23"
  echo ""
  echo "Next steps:"
  echo "  npm run storybook"
  echo "  npm run test:playwright"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ═════════════════════════════════════════════════════════════════════════════
# MAIN FLOW
# ═════════════════════════════════════════════════════════════════════════════

if [ "$STAGE" = "1" ]; then
  run_stage1
  extract_plan_from_log
  if [ "$PLAN_ONLY" = "true" ]; then
    # Batch mode: stop here, no interactive gate
    echo -e "${GREEN}✅ Stage 1 complete (plan-only mode)${NC}"
    echo -e "${BLUE}   Plan file:${NC} $PLAN_FILE"
    echo ""
    echo "Review and approve:"
    echo "  cat $PLAN_FILE"
    echo "  $0 $COMPONENT '$FIGMA_LINK' --stage2"
    echo ""
  else
    # Interactive mode: approval gate → optionally chain to Stage 2+3
    show_approval_gate
    # If we reach here the human approved (or AUTO_APPROVE=true)
    run_stage23
  fi
else
  # --stage2 or --plan= flag: jump straight to Stage 2+3 with existing plan
  run_stage23
fi

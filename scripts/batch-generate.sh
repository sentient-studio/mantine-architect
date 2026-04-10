#!/bin/bash
# Batch Stage 1 Launcher
# Runs Stage 1 (Plan) for all components in parallel, then prints a review summary.
# Stage 2+3 (Act + Reflect) is NEVER launched by this script — approve each component
# individually after reviewing its plan.
#
# Usage:
#   ./batch-generate.sh components.txt
#   ./batch-generate.sh Button "https://..." TextInput "https://..."

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ============================================
# Signal Extraction
# ============================================
# Parses a Stage 1 plan file and returns pipe-delimited signals:
#   BLOCKS|ADAPTS|NOTES|NODE_TYPE|AMBIGUITIES|PLAN_SIZEk
#
# Severity counts: number of **Severity: <emoji>** lines (excluding "None detected")
# Node type:       "component set" | "single node" | "unknown"
# Ambiguities:     data rows in section 9 table (header row excluded)
# Plan size:       file size in kilobytes

extract_plan_signals() {
  local PLAN="$1"

  # Severity counts — match **Severity:* lines containing each emoji, skip None detected
  local BLOCKS ADAPTS NOTES
  BLOCKS=$(grep '\*\*Severity:.*🔴' "$PLAN" 2>/dev/null | grep -v 'None detected' | wc -l | tr -d ' ')
  ADAPTS=$(grep '\*\*Severity:.*🟡' "$PLAN" 2>/dev/null | grep -v 'None detected' | wc -l | tr -d ' ')
  NOTES=$(grep '\*\*Severity:.*🔵' "$PLAN" 2>/dev/null  | grep -v 'None detected' | wc -l | tr -d ' ')

  # Node type — "not a Component Set" negation beats positive match
  local NODE_TYPE
  if grep -q 'not a Component Set' "$PLAN" 2>/dev/null; then
    NODE_TYPE="single node"
  elif grep -q 'Component Set' "$PLAN" 2>/dev/null; then
    NODE_TYPE="component set"
  else
    NODE_TYPE="unknown"
  fi

  # Ambiguity count — table data rows in the "Ambiguities Resolved" section
  # Use a flag variable (not a range pattern) so the section header line itself
  # doesn't collapse the range when it also matches the end condition.
  # Works regardless of section number (§9 in old plans, §10 in new plans).
  local AMBIGUITIES
  AMBIGUITIES=$(awk '
    /^## [0-9]+\. Ambiguit/ { f=1; next }
    /^## [0-9]+\./          { f=0 }
    f
  ' "$PLAN" 2>/dev/null \
    | grep '^\s*|' | grep -v -- '---' | tail -n +2 | wc -l | tr -d ' ')

  # Plan size in KB
  local PLAN_BYTES PLAN_K
  PLAN_BYTES=$(wc -c < "$PLAN" | tr -d ' ')
  PLAN_K=$((PLAN_BYTES / 1024))

  # Output pipe-delimited (| avoids word-splitting on "single node" / "component set")
  echo "${BLOCKS}|${ADAPTS}|${NOTES}|${NODE_TYPE}|${AMBIGUITIES}|${PLAN_K}K"
}

# ============================================
# Plan Diff Summary
# ============================================
# Compares the two most recent plan files for a component.
# Returns either:
#   new                          — first generation, no previous plan
#   regen|PREV_PATH|+N/-N lines  — regeneration with line delta vs previous plan

diff_plan_summary() {
  local COMPONENT="$1"
  local CURRENT_PLAN="$2"

  # Second-most-recent plan file for this component
  local PREV_PLAN
  PREV_PLAN=$(ls -t "$PROJECT_ROOT/logs/plan-$COMPONENT-"*.md 2>/dev/null | sed -n '2p')

  if [ -z "$PREV_PLAN" ]; then
    echo "new"
    return
  fi

  local ADDED REMOVED
  ADDED=$(diff "$PREV_PLAN" "$CURRENT_PLAN" 2>/dev/null | grep -c '^>' || true)
  REMOVED=$(diff "$PREV_PLAN" "$CURRENT_PLAN" 2>/dev/null | grep -c '^<' || true)

  echo "regen|${PREV_PLAN}|+${ADDED}/-${REMOVED} lines"
}

PROJECT_ROOT=~/Documents/figma-ai-project

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}🗺  Batch Stage 1 Launcher${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# Parse Input & Validate
# ============================================

COMPONENTS=()
FIGMA_LINKS=()
INPUT_FILE=""

if [ $# -eq 1 ] && [ -f "$1" ]; then
  # Input: File with component,link pairs
  INPUT_FILE="$1"

  # Run validation script if available
  VALIDATE_SCRIPT="$PROJECT_ROOT/scripts/validate-batch.sh"
  if [ -f "$VALIDATE_SCRIPT" ]; then
    echo -e "${BLUE}Running validation...${NC}"
    echo ""

    if ! bash "$VALIDATE_SCRIPT" "$INPUT_FILE"; then
      echo ""
      echo -e "${RED}Validation failed. Fix errors and try again.${NC}"
      exit 1
    fi

    echo ""
  else
    echo -e "${YELLOW}⚠️  validate-batch.sh not found (skipping validation)${NC}"
    echo ""
  fi

  echo -e "${BLUE}Reading from file: $INPUT_FILE${NC}"
  echo ""

  while IFS=',' read -r component link; do
    # Skip empty lines and comments
    [[ -z "$component" || "$component" =~ ^[[:space:]]*# ]] && continue

    # Trim whitespace
    component=$(echo "$component" | xargs)
    link=$(echo "$link" | xargs)

    COMPONENTS+=("$component")
    FIGMA_LINKS+=("$link")
  done < "$INPUT_FILE"

elif [ $# -gt 0 ] && [ $((($# % 2))) -eq 0 ]; then
  # Input: Pairs of ComponentName FigmaLink
  echo -e "${BLUE}Reading from command-line arguments${NC}"
  echo ""

  while [ $# -gt 0 ]; do
    COMPONENT="$1"
    LINK="$2"

    # Validate component name (PascalCase)
    if ! [[ "$COMPONENT" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
      echo -e "${RED}Error: Invalid component name: '$COMPONENT'${NC}"
      echo "Component names must be PascalCase (e.g., Button, TextInput)"
      exit 1
    fi

    # Validate Figma link
    if ! [[ "$LINK" =~ ^https://([a-z]+\.)?figma\.com/(file|design)/ ]]; then
      echo -e "${RED}Error: Invalid Figma URL for '$COMPONENT'${NC}"
      echo "Expected: https://figma.com/file/... or https://figma.com/design/..."
      echo "Got: $LINK"
      exit 1
    fi

    COMPONENTS+=("$COMPONENT")
    FIGMA_LINKS+=("$LINK")
    shift 2
  done

else
  echo -e "${RED}Usage:${NC}"
  echo "  $0 components.txt"
  echo "  $0 Button 'https://...' TextInput 'https://...' Card 'https://...'"
  echo ""
  echo "File format (components.txt):"
  echo "  Button,https://figma.com/file/abc/Design?node-id=1"
  echo "  TextInput,https://figma.com/file/abc/Design?node-id=2"
  echo "  Card,https://figma.com/file/abc/Design?node-id=3"
  echo ""
  exit 1
fi

# ============================================
# Display Validated Components
# ============================================

if [ ${#COMPONENTS[@]} -eq 0 ]; then
  echo -e "${RED}Error: No components found${NC}"
  exit 1
fi

echo -e "${CYAN}✓ Validation passed!${NC}"
echo ""
echo -e "${CYAN}Components to plan (${#COMPONENTS[@]}):${NC}"
for i in "${!COMPONENTS[@]}"; do
  echo -e "  ${MAGENTA}$((i+1)).${NC} ${COMPONENTS[$i]}"
done
echo ""
echo -e "${YELLOW}Stage 1 (Plan) will run for all components in parallel.${NC}"
echo -e "${YELLOW}You will review each plan before approving Stage 2+3.${NC}"
echo ""

# Check if dispatch-agent.sh exists
DISPATCH_SCRIPT="$PROJECT_ROOT/scripts/dispatch-agent.sh"
if [ ! -f "$DISPATCH_SCRIPT" ]; then
  echo -e "${RED}Error: dispatch-agent.sh not found${NC}"
  echo "Expected: $DISPATCH_SCRIPT"
  exit 1
fi

# ============================================
# Confirmation
# ============================================

read -p "Launch ${#COMPONENTS[@]} Stage 1 agents in parallel? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Batch cancelled."
  exit 0
fi

echo ""

# ============================================
# Launch Parallel Stage 1 Agents
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}🚀 Launching ${#COMPONENTS[@]} Stage 1 agents...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PIDS=()
LAUNCH_TIMESTAMPS=()

for i in "${!COMPONENTS[@]}"; do
  COMPONENT="${COMPONENTS[$i]}"
  LINK="${FIGMA_LINKS[$i]}"

  echo -e "${MAGENTA}[$((i+1))/${#COMPONENTS[@]}]${NC} Starting Stage 1 for: ${GREEN}$COMPONENT${NC}"

  # Record approximate launch time for plan file discovery
  LAUNCH_TIMESTAMPS+=("$(date '+%Y%m%d-%H%M%S')")

  # Launch Stage 1 in background — --plan-only means no interactive gate
  bash "$DISPATCH_SCRIPT" "$COMPONENT" "$LINK" --plan-only \
    > "$PROJECT_ROOT/logs/batch-stage1-$COMPONENT-$(date '+%Y%m%d-%H%M%S').log" 2>&1 &
  PIDS+=($!)

  # Small delay between launches to avoid contention
  sleep 2
done

echo ""
echo -e "${YELLOW}⏳ All Stage 1 agents launched. Waiting for completion...${NC}"
echo ""
echo -e "${BLUE}Tip: Monitor progress in separate terminals:${NC}"
for COMPONENT in "${COMPONENTS[@]}"; do
  echo "  tail -f $PROJECT_ROOT/logs/generate-$COMPONENT-*.log"
done
echo ""

# ============================================
# Wait for All Agents
# ============================================

FAILED=0
SUCCEEDED=0
RESULTS=()

for i in "${!PIDS[@]}"; do
  PID="${PIDS[$i]}"
  COMPONENT="${COMPONENTS[$i]}"

  echo -e "${BLUE}Waiting for: $COMPONENT (PID: $PID)...${NC}"

  if wait "$PID"; then
    echo -e "${GREEN}✓ $COMPONENT Stage 1 complete${NC}"
    RESULTS+=("ok:$COMPONENT")
    SUCCEEDED=$((SUCCEEDED+1))
  else
    echo -e "${RED}✗ $COMPONENT Stage 1 failed (exit code: $?)${NC}"
    RESULTS+=("fail:$COMPONENT")
    FAILED=$((FAILED+1))
  fi
done

echo ""

# ============================================
# Plan Overview  (all signals at a glance)
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📋 Stage 1 Complete — Plan Overview${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total: ${#COMPONENTS[@]}  Succeeded: $SUCCEEDED  Failed: $FAILED"
echo ""

# Collect reviewable plans while printing the overview
REVIEW_COMPONENTS=()
REVIEW_LINKS=()
REVIEW_PLANS=()
REVIEW_SIGNALS=()      # plain signal string (no ANSI) for later display
REVIEW_BLOCKS=()       # BLOCK conflict count per component
REVIEW_DIFF_STATUS=()  # "new" | "regen|PREV_PATH|+N/-N lines"

for i in "${!RESULTS[@]}"; do
  STATUS="${RESULTS[$i]%%:*}"
  COMPONENT="${RESULTS[$i]#*:}"
  LINK="${FIGMA_LINKS[$i]}"

  if [ "$STATUS" = "ok" ]; then
    PLAN=$(ls -t "$PROJECT_ROOT/logs/plan-$COMPONENT-"*.md 2>/dev/null | head -1)

    if [ -n "$PLAN" ]; then
      IFS='|' read -r SIG_B SIG_A SIG_N SIG_NODE SIG_AMBIG SIG_SIZE \
        <<< "$(extract_plan_signals "$PLAN")"

      DIFF_STATUS=$(diff_plan_summary "$COMPONENT" "$PLAN")
      DIFF_LABEL=""
      if [ "$DIFF_STATUS" != "new" ]; then
        DIFF_DELTA="${DIFF_STATUS##*|}"            # "+N/-N lines"
        DIFF_LABEL="  ${BLUE}[regen ${DIFF_DELTA}]${NC}"
      fi

      SIGNAL="${SIG_B}🔴 ${SIG_A}🟡 ${SIG_N}🔵  ·  ${SIG_NODE}  ·  ${SIG_AMBIG} ambiguities  ·  ${SIG_SIZE}"
      BLOCK_TAG=""
      [ "${SIG_B:-0}" -gt 0 ] 2>/dev/null && BLOCK_TAG="  ${RED}← REVIEW REQUIRED${NC}"

      echo -e "  ${GREEN}✅ $COMPONENT${NC}  ${SIGNAL}${DIFF_LABEL}${BLOCK_TAG}"

      REVIEW_COMPONENTS+=("$COMPONENT")
      REVIEW_LINKS+=("$LINK")
      REVIEW_PLANS+=("$PLAN")
      REVIEW_SIGNALS+=("$SIGNAL")
      REVIEW_BLOCKS+=("${SIG_B:-0}")
      REVIEW_DIFF_STATUS+=("$DIFF_STATUS")

    else
      echo -e "  ${YELLOW}⚠️  $COMPONENT${NC} — Stage 1 exited OK but plan file not found"
      echo "       Check: ls $PROJECT_ROOT/logs/generate-$COMPONENT-*.log"
    fi

  else
    echo -e "  ${RED}❌ $COMPONENT${NC} — Stage 1 failed"
    echo "       Retry: ./scripts/dispatch-agent.sh $COMPONENT '$LINK' --plan-only"
    echo "       Log:   ls -t $PROJECT_ROOT/logs/generate-$COMPONENT-*.log | head -1"
  fi
done

echo ""

# ============================================
# Interactive Review Loop
# ============================================

STAGE2_LAUNCHED=()   # components whose Stage 2 was approved + fired
DEFERRED=()          # "COMPONENT|LINK" pairs that were skipped or quit-past

if [ ${#REVIEW_COMPONENTS[@]} -eq 0 ]; then
  echo -e "${YELLOW}No plans available to review.${NC}"

elif [ ! -t 0 ]; then
  # Non-interactive (piped / CI) — print approve commands only
  echo -e "${YELLOW}Non-interactive session — approve commands:${NC}"
  echo ""
  for i in "${!REVIEW_COMPONENTS[@]}"; do
    echo "  ./scripts/dispatch-agent.sh ${REVIEW_COMPONENTS[$i]} '${REVIEW_LINKS[$i]}' --stage2"
  done

else
  COUNT="${#REVIEW_COMPONENTS[@]}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${CYAN}🔍 Interactive Review  (${COUNT} plan$([ "$COUNT" -ne 1 ] && echo s))${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  QUIT=false

  for i in "${!REVIEW_COMPONENTS[@]}"; do
    COMP="${REVIEW_COMPONENTS[$i]}"
    LINK="${REVIEW_LINKS[$i]}"
    PLAN="${REVIEW_PLANS[$i]}"
    SIGNAL="${REVIEW_SIGNALS[$i]}"
    BLOCKS="${REVIEW_BLOCKS[$i]}"
    DIFF_STATUS="${REVIEW_DIFF_STATUS[$i]}"

    # After 'q': push remaining to deferred without prompting
    if $QUIT; then
      DEFERRED+=("$COMP|$LINK")
      continue
    fi

    # ── Component header ───────────────────────────────────
    BLOCK_TAG=""
    [ "${BLOCKS:-0}" -gt 0 ] 2>/dev/null && BLOCK_TAG="  ${RED}← REVIEW REQUIRED${NC}"

    IS_REGEN=false
    PREV_PLAN=""
    DIFF_LABEL=""
    if [ "$DIFF_STATUS" != "new" ]; then
      IS_REGEN=true
      PREV_PLAN=$(echo "$DIFF_STATUS" | cut -d'|' -f2)
      DIFF_DELTA=$(echo "$DIFF_STATUS" | cut -d'|' -f3)
      DIFF_LABEL="  ${BLUE}[regen ${DIFF_DELTA}]${NC}"
    fi

    echo -e "${MAGENTA}[$((i+1))/$COUNT]${NC}  ${GREEN}${COMP}${NC}  ${SIGNAL}${DIFF_LABEL}${BLOCK_TAG}"
    echo ""

    # ── View diff? (regen only) ────────────────────────────
    if $IS_REGEN; then
      read -r -p "   View diff vs previous? [y/N] " DIFF_RESP < /dev/tty
      DIFF_RESP="${DIFF_RESP:-n}"
      if [[ "$DIFF_RESP" =~ ^[Yy]$ ]]; then
        diff --color=always "$PREV_PLAN" "$PLAN" 2>/dev/null | "${PAGER:-less}" -R < /dev/tty || true
        echo ""
      fi
    fi

    # ── Open full plan in pager? ───────────────────────────
    # Skipped entirely for 0🔴 new components (fast path)
    # Default Y for BLOCK conflicts; default N otherwise
    if [ "${BLOCKS:-0}" -gt 0 ] 2>/dev/null; then
      # BLOCK conflict — always prompt, default open
      read -r -p "   Open full plan? [Y/n] " OPEN_RESP < /dev/tty
      OPEN_RESP="${OPEN_RESP:-y}"
      if [[ "$OPEN_RESP" =~ ^[Yy]$ ]]; then
        "${PAGER:-less}" "$PLAN" < /dev/tty
        echo ""
      fi
    elif $IS_REGEN; then
      # Regen with no BLOCK — offer plan but don't force it
      read -r -p "   Open full plan? [y/N] " OPEN_RESP < /dev/tty
      OPEN_RESP="${OPEN_RESP:-n}"
      if [[ "$OPEN_RESP" =~ ^[Yy]$ ]]; then
        "${PAGER:-less}" "$PLAN" < /dev/tty
        echo ""
      fi
    fi
    # else: 0🔴 new plan — skip pager prompt entirely (fast path)

    # ── Launch Stage 2? ────────────────────────────────────
    read -r -p "   Launch Stage 2? [y/n/q] " APPROVE < /dev/tty
    echo ""

    case "$APPROVE" in
      [Yy]*)
        echo -e "   ${GREEN}▶ Stage 2 launching for ${COMP}${NC}"
        bash "$DISPATCH_SCRIPT" "$COMP" "$LINK" --stage2 &
        STAGE2_LAUNCHED+=("$COMP")
        ;;
      [Qq]*)
        echo -e "   ${YELLOW}Stopping review — remaining plans deferred.${NC}"
        DEFERRED+=("$COMP|$LINK")
        QUIT=true
        ;;
      *)
        echo -e "   ${BLUE}Deferred.${NC}"
        DEFERRED+=("$COMP|$LINK")
        ;;
    esac

    echo ""
  done
fi

# ============================================
# Post-Review Summary
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#STAGE2_LAUNCHED[@]} -gt 0 ]; then
  echo -e "${GREEN}▶ Stage 2 running (${#STAGE2_LAUNCHED[@]}):${NC}"
  for COMP in "${STAGE2_LAUNCHED[@]}"; do
    echo "    $COMP  →  tail -f $PROJECT_ROOT/logs/generate-$COMP-*-stage23.log"
  done
  echo ""
fi

if [ ${#DEFERRED[@]} -gt 0 ]; then
  echo -e "${YELLOW}⏸  Deferred — approve when ready:${NC}"
  for ITEM in "${DEFERRED[@]}"; do
    COMP="${ITEM%%|*}"
    LINK="${ITEM#*|}"
    echo "    ./scripts/dispatch-agent.sh $COMP '$LINK' --stage2"
  done
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================
# Exit Status
# ============================================

if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi

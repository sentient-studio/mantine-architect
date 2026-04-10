#!/bin/bash
# Quality Gate Runner for Mantine Components
# Usage: ./quality-gate.sh ComponentName [--skip-deps]
#
# Output: one line per gate (PASS/FAIL/WARN/SKIP/N/A), details only on failure.

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPONENT=$1
SKIP_DEPS=false
PROJECT_ROOT="${MANTINE_WORK_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BASE_DIR=$PROJECT_ROOT/02-generated/$COMPONENT

if [ "$2" = "--skip-deps" ]; then
  SKIP_DEPS=true
fi

if [ -z "$COMPONENT" ]; then
  echo -e "${RED}Usage: $0 ComponentName [--skip-deps]${NC}"
  exit 1
fi

if [ ! -d "$BASE_DIR" ]; then
  echo -e "${RED}Error: $BASE_DIR not found${NC}"
  exit 1
fi

PASSED=0
FAILED=0
WARNINGS=0

# Helper: print a gate result line
# pass [N] "Label"
# fail [N] "Label" "detail..."
# warn [N] "Label" "detail..."
# skip [N] "Label" "reason"
# na   [N] "Label"

gate_pass() { printf "${GREEN}✅ PASS${NC}  [%2s] %s\n" "$1" "$2"; PASSED=$((PASSED+1)); }
gate_fail() {
  printf "${RED}❌ FAIL${NC}  [%2s] %s\n" "$1" "$2"
  shift 2
  for line in "$@"; do printf "         %s\n" "$line"; done
  FAILED=$((FAILED+1))
}
gate_warn() {
  printf "${YELLOW}⚠️  WARN${NC}  [%2s] %s\n" "$1" "$2"
  shift 2
  for line in "$@"; do printf "         %s\n" "$line"; done
  WARNINGS=$((WARNINGS+1))
}
gate_skip() { printf "${BLUE}⏭️  SKIP${NC}  [%2s] %s — %s\n" "$1" "$2" "$3"; WARNINGS=$((WARNINGS+1)); }
gate_na()   { printf "${BLUE}➖  N/A${NC}   [%2s] %s\n" "$1" "$2"; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Quality Gates: $COMPONENT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1: Token Compliance ────────────────────────────────────────────────────────
CSS_FILE="$BASE_DIR/$COMPONENT.module.css"
if [ ! -f "$CSS_FILE" ]; then
  gate_fail 1 "Token Compliance" "CSS file not found: $CSS_FILE"
else
  VIOLATIONS=$(grep -En '(#[0-9A-Fa-f]{3,6}|rgb\(|rgba\()' "$CSS_FILE" 2>/dev/null || true)
  BARE_PX=$(grep -En '[0-9]+px' "$CSS_FILE" 2>/dev/null | grep -Ev 'rem\([0-9]*\.?[0-9]*px\)' || true)
  ALL=$(printf '%s\n%s' "$VIOLATIONS" "$BARE_PX" | grep -v '^$' | grep -v '^\s*/\*\|^\s*\*\|^\s*//' || true)
  if [ -z "$ALL" ]; then
    gate_pass 1 "Token Compliance"
  else
    LINES=()
    while IFS= read -r l; do LINES+=("$l"); done <<< "$ALL"
    gate_fail 1 "Token Compliance" "${LINES[@]}"
  fi
fi

# ── 2: File Integrity ──────────────────────────────────────────────────────────
MISSING=()
for ext in tsx module.css stories.tsx spec.ts; do
  F="$BASE_DIR/$COMPONENT.$ext"
  [ ! -f "$F" ] && MISSING+=("missing: $COMPONENT.$ext")
  [ -f "$F" ] && [ ! -s "$F" ] && MISSING+=("empty: $COMPONENT.$ext")
done
if [ ${#MISSING[@]} -eq 0 ]; then
  gate_pass 2 "File Integrity"
else
  gate_fail 2 "File Integrity" "${MISSING[@]}"
fi

# ── 3: PostCSS Standard ────────────────────────────────────────────────────────
if [ ! -f "$CSS_FILE" ]; then
  gate_skip 3 "PostCSS Standard" "CSS file not found"
else
  ISSUES=()
  BARE=$(grep -En '[0-9]+px' "$CSS_FILE" | grep -Ev 'rem\([0-9]*\.?[0-9]*px\)' || true)
  [ -n "$BARE" ] && ISSUES+=("bare px (use rem()): $BARE")
  HOVER=$(grep -En ':hover\s*{' "$CSS_FILE" || true)
  [ -n "$HOVER" ] && ISSUES+=("bare :hover (use @mixin hover): $HOVER")
  if [ ${#ISSUES[@]} -eq 0 ]; then
    gate_pass 3 "PostCSS Standard"
  else
    gate_fail 3 "PostCSS Standard" "${ISSUES[@]}"
  fi
fi

# ── 4: Storybook Autodocs ──────────────────────────────────────────────────────
STORIES="$BASE_DIR/$COMPONENT.stories.tsx"
if [ ! -f "$STORIES" ]; then
  gate_fail 4 "Storybook Autodocs" "Stories file not found"
elif grep -q "autodocs" "$STORIES"; then
  gate_pass 4 "Storybook Autodocs"
else
  gate_fail 4 "Storybook Autodocs" "Missing tags: ['autodocs'] in meta"
fi

# ── 5: Tracker Update ─────────────────────────────────────────────────────────
TRACKER="$PROJECT_ROOT/03-figma-links/components.md"
if [ ! -f "$TRACKER" ]; then
  gate_warn 5 "Tracker Update" "Tracker file not found: $TRACKER"
elif grep -qi "$COMPONENT" "$TRACKER"; then
  gate_pass 5 "Tracker Update"
else
  gate_fail 5 "Tracker Update" "$COMPONENT not found in components.md — add a row"
fi

# ── 6: data-* Attributes ──────────────────────────────────────────────────────
TSX="$BASE_DIR/$COMPONENT.tsx"
if [ ! -f "$TSX" ]; then
  gate_skip 6 "data-* Attributes" "TSX file not found"
elif grep -q 'data-' "$TSX"; then
  gate_pass 6 "data-* Attributes"
else
  gate_warn 6 "data-* Attributes" "No data-* attributes found — verify state is passed via data- props"
fi

# ── 7: Size Variant Coverage ──────────────────────────────────────────────────
SPEC="$BASE_DIR/$COMPONENT.spec.ts"
if [ -f "$TSX" ] && grep -qE 'size\??\s*:\s*MantineSize' "$TSX"; then
  ISSUES=()
  grep -q 'data-size' "$TSX" || ISSUES+=("size prop present but data-size attribute missing in TSX")
  [ -f "$STORIES" ] && ! grep -qi 'sizes\|size.*story' "$STORIES" && \
    ISSUES+=("Sizes story may be missing")
  [ -f "$SPEC" ] && ! grep -q 'data-size' "$SPEC" && \
    ISSUES+=("data-size assertion missing in spec")
  if [ ${#ISSUES[@]} -eq 0 ]; then
    gate_pass 7 "Size Variant Coverage"
  elif grep -q 'data-size' "$TSX" 2>/dev/null; then
    gate_warn 7 "Size Variant Coverage" "${ISSUES[@]}"
  else
    gate_fail 7 "Size Variant Coverage" "${ISSUES[@]}"
  fi
else
  gate_na 7 "Size Variant Coverage"
fi

# ── 8: Test Coverage ──────────────────────────────────────────────────────────
if [ ! -f "$SPEC" ]; then
  gate_fail 8 "Test Coverage" "Spec file missing"
else
  COUNT=$(grep -c "test\|it(" "$SPEC" 2>/dev/null || echo 0)
  if [ "$COUNT" -gt 0 ]; then
    gate_pass 8 "Test Coverage ($COUNT cases)"
  else
    gate_warn 8 "Test Coverage" "Spec exists but no test cases detected"
  fi
fi

# ── 9: Dependency Audit ───────────────────────────────────────────────────────
if [ "$SKIP_DEPS" = true ]; then
  gate_skip 9 "Dependency Audit" "--skip-deps"
else
  DEP_SCRIPT="$PROJECT_ROOT/scripts/dependency-audit.sh"
  if [ ! -f "$DEP_SCRIPT" ]; then
    gate_warn 9 "Dependency Audit" "dependency-audit.sh not found"
  else
    chmod +x "$DEP_SCRIPT" 2>/dev/null || true
    if bash "$DEP_SCRIPT" "$COMPONENT" > /tmp/dep-audit-$COMPONENT.log 2>&1; then
      gate_pass 9 "Dependency Audit"
    else
      TAIL=$(tail -5 /tmp/dep-audit-$COMPONENT.log)
      LINES=()
      while IFS= read -r l; do LINES+=("$l"); done <<< "$TAIL"
      gate_fail 9 "Dependency Audit" "${LINES[@]}" "Full log: /tmp/dep-audit-$COMPONENT.log"
    fi
    rm -f /tmp/dep-audit-$COMPONENT.log
  fi
fi

# ── 10: Visual Snapshot ───────────────────────────────────────────────────────
if [ ! -f "$SPEC" ]; then
  gate_skip 10 "Visual Snapshot" "spec file not found"
elif grep -qE 'screenshot|toHaveScreenshot' "$SPEC"; then
  gate_pass 10 "Visual Snapshot"
else
  gate_warn 10 "Visual Snapshot" \
    "No toHaveScreenshot assertion — misspelled CSS tokens render transparent and pass all other gates" \
    "Add: await expect(page).toHaveScreenshot('default.png');" \
    "Then: npx playwright test --update-snapshots"
fi

# ── 11: Portal CSS Variable Scope ─────────────────────────────────────────────
if [ ! -f "$CSS_FILE" ]; then
  gate_skip 11 "Portal CSS Variable Scope" "CSS file not found"
else
  COMPONENT_LC=$(echo "$COMPONENT" | tr '[:upper:]' '[:lower:]')
  ROOT_VARS=$(awk '
    f && /^\.[a-z]/ { f=0 }
    /^\.root/       { f=1 }
    f' "$CSS_FILE" | grep -oE "\-\-${COMPONENT_LC}-[a-z0-9-]+" | sort -u || true)

  PORTAL_VARS=$(awk '
    f && /^\.[a-z]/ { f=0 }
    /^\.dropdown/ || /^\.option/ || /^\.panel/   ||
    /^\.popover/  || /^\.listbox/ || /^\.tooltip/ ||
    /^\.overlay/  || /^\.menu/    { f=1 }
    f' "$CSS_FILE" | grep -oE "\-\-${COMPONENT_LC}-[a-z0-9-]+" | sort -u || true)

  PORTAL_ISSUES=""
  if [ -n "$PORTAL_VARS" ] && [ -n "$ROOT_VARS" ]; then
    while IFS= read -r var; do
      [ -z "$var" ] && continue
      echo "$ROOT_VARS" | grep -qx "$var" && PORTAL_ISSUES="${PORTAL_ISSUES}${var} "
    done <<< "$PORTAL_VARS"
  fi

  if [ -n "$PORTAL_ISSUES" ]; then
    gate_fail 11 "Portal CSS Variable Scope" \
      "Root-scoped vars used in portal classes (portal elements render outside .root):" \
      "$PORTAL_ISSUES" \
      "Fix: use var(--mantine-*) directly in portal classes, or define vars at :root"
  elif [ -n "$PORTAL_VARS" ]; then
    gate_pass 11 "Portal CSS Variable Scope"
  else
    if [ -f "$TSX" ] && grep -E "from '@mantine/core'" "$TSX" 2>/dev/null | grep -qE "(Select|Combobox|DatePicker|MultiSelect|Autocomplete)"; then
      gate_warn 11 "Portal CSS Variable Scope" \
        "Component wraps a portal-rendering input but no portal CSS classes found — verify manually"
    else
      gate_na 11 "Portal CSS Variable Scope"
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASSED + FAILED))
printf "Result: ${GREEN}%d PASS${NC}  ${RED}%d FAIL${NC}  ${YELLOW}%d WARN${NC}  (of %d gates)\n" \
  "$PASSED" "$FAILED" "$WARNINGS" "$TOTAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi

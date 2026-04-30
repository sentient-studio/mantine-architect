#!/usr/bin/env bash
# test-playroom-helpers.sh — E2E test suite for register_playroom_component()
# and register_playroom_story_helpers() in dispatch-agent.sh
#
# Usage:  ./scripts/test-playroom-helpers.sh
# Output: TAP-style pass/fail lines + summary.

set -euo pipefail

DISPATCH_AGENT="$(cd "$(dirname "$0")" && pwd)/dispatch-agent.sh"
PASS=0
FAIL=0

# ── helpers ──────────────────────────────────────────────────────────────────

pass() { echo "ok $((PASS+FAIL+1)) - $1"; PASS=$((PASS+1)); }
fail() { echo "not ok $((PASS+FAIL+1)) - $1"; FAIL=$((FAIL+1)); }

assert_contains()  { grep -qF "$2" "$1" && pass "$3" || fail "$3"; }
assert_missing()   { grep -qF "$2" "$1" && fail "$3" || pass "$3"; }

# Extract and source register_playroom_component() and
# register_playroom_story_helpers() from dispatch-agent.sh.
# Uses the same sed-extraction pattern as test-figma-pushback.sh —
# avoids running dispatch-agent.sh's arg parsing and main flow.
_TMP_FNS=$(mktemp /tmp/playroom_fns_XXXXXX)

for fn_name in register_playroom_component register_playroom_story_helpers; do
  START=$(grep -n "^${fn_name}()" "$DISPATCH_AGENT" | head -1 | cut -d: -f1)
  if [ -n "$START" ]; then
    END=$(awk "NR>$START && /^\}/ {print NR; exit}" "$DISPATCH_AGENT")
    sed -n "${START},${END}p" "$DISPATCH_AGENT" >> "$_TMP_FNS"
    echo "" >> "$_TMP_FNS"
  fi
done

# shellcheck disable=SC1090
source "$_TMP_FNS"

source_fns() {
  export PROJECT_ROOT="$1"
  export COMPONENT="$2"
  # (Re-source so each test gets a clean function scope with updated PROJECT_ROOT/COMPONENT)
  # shellcheck disable=SC1090
  source "$_TMP_FNS"
}

mk_components_js() {
  cat > "$1/playroom/components.js" <<'EOF'
// ─── Generated components ─────────────────────────────────────────────────────
export { Button } from '../02-generated/Button/Button';

// ─── Mantine layout & display primitives ──────────────────────────────────────
export { Box, Stack } from '@mantine/core';

// ─── Story helpers ────────────────────────────────────────────────────────────

// ─── Tabler icons ─────────────────────────────────────────────────────────────
export * from '@tabler/icons-react';
EOF
}

mk_stories_tsx() {
  # $1 = path, $2 = body
  mkdir -p "$(dirname "$1")"
  cat > "$1" <<EOF
import type { Meta, StoryObj } from '@storybook/react';
import { Widget } from './Widget';

const meta: Meta<typeof Widget> = { title: 'Widget', component: Widget };
export default meta;
type Story = StoryObj<typeof Widget>;

$2

export const Default: Story = { args: {} };
EOF
}

# ── Test 1: register_playroom_component — happy path ─────────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
cat > "$T/02-generated/Widget/Widget.tsx" <<'EOF'
export function Widget() { return null; }
EOF
source_fns "$T" "Widget"
register_playroom_component
assert_contains "$T/playroom/components.js" \
  "export { Widget } from '../02-generated/Widget/Widget';" \
  "register_playroom_component inserts export line"
rm -rf "$T"

# ── Test 2: idempotent — second call does not duplicate ───────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
cat > "$T/02-generated/Widget/Widget.tsx" <<'EOF'
export function Widget() { return null; }
EOF
source_fns "$T" "Widget"
register_playroom_component
register_playroom_component   # second call
COUNT=$(grep -c "export { Widget } from '../02-generated/Widget/Widget';" "$T/playroom/components.js")
[ "$COUNT" = "1" ] && pass "register_playroom_component is idempotent" \
                  || fail "register_playroom_component is idempotent"
rm -rf "$T"

# ── Test 3: DataTable export name resolved from TSX ──────────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Table"
mk_components_js "$T"
cat > "$T/02-generated/Table/Table.tsx" <<'EOF'
export function DataTable() { return null; }
EOF
source_fns "$T" "Table"
register_playroom_component
assert_contains "$T/playroom/components.js" \
  "export { DataTable } from '../02-generated/Table/Table';" \
  "register_playroom_component uses TSX export name (DataTable for Table)"
rm -rf "$T"

# ── Test 4: register_playroom_story_helpers — injects unexported helper ───────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "function MyHelper() { return null; }"
source_fns "$T" "Widget"
register_playroom_story_helpers
assert_contains "$T/playroom/components.js" \
  "MyHelper" \
  "register_playroom_story_helpers adds unexported helper to components.js"
rm -rf "$T"

# ── Test 5: adds export keyword to unexported helper in story file ────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "function MyHelper() { return null; }"
source_fns "$T" "Widget"
register_playroom_story_helpers
assert_contains "$T/02-generated/Widget/Widget.stories.tsx" \
  "export function MyHelper" \
  "register_playroom_story_helpers adds export keyword to story helper"
rm -rf "$T"

# ── Test 6: Story-typed exports are skipped ───────────────────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "const Showcase: Story = { args: {} };"
source_fns "$T" "Widget"
register_playroom_story_helpers
assert_missing "$T/playroom/components.js" \
  "Showcase" \
  "Story-typed exports are excluded from story helper registration"
rm -rf "$T"

# ── Test 7: already-exported helper not double-exported ───────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "export function AlreadyExported() { return null; }"
source_fns "$T" "Widget"
register_playroom_story_helpers
# Should appear in components.js exactly once
COUNT=$(grep -c "AlreadyExported" "$T/playroom/components.js")
[ "$COUNT" = "1" ] && pass "already-exported helper appears once in components.js" \
                  || fail "already-exported helper appears once in components.js"
rm -rf "$T"

# ── Test 8: helpers already in components.js are not re-inserted ──────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
# Pre-register MyHelper
echo "export { MyHelper } from '../02-generated/Widget/Widget.stories';" >> "$T/playroom/components.js"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "function MyHelper() { return null; }"
source_fns "$T" "Widget"
register_playroom_story_helpers
COUNT=$(grep -c "MyHelper" "$T/playroom/components.js")
[ "$COUNT" = "1" ] && pass "idempotent: existing helpers not re-inserted" \
                  || fail "idempotent: existing helpers not re-inserted"
rm -rf "$T"

# ── Test 9: missing playroom/components.js exits gracefully ───────────────────
T=$(mktemp -d); mkdir -p "$T/02-generated/Widget"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "function MyHelper() { return null; }"
source_fns "$T" "Widget"
register_playroom_component 2>/dev/null && pass "missing components.js exits 0" \
                                        || fail "missing components.js exits 0"
rm -rf "$T"

# ── Test 10: missing stories file exits gracefully ────────────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
source_fns "$T" "Widget"
register_playroom_story_helpers 2>/dev/null \
  && pass "missing stories file exits 0" \
  || fail "missing stories file exits 0"
rm -rf "$T"

# ── Test 11: const helpers are also registered ────────────────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "const MY_DATA = [1, 2, 3];"
source_fns "$T" "Widget"
register_playroom_story_helpers
assert_contains "$T/playroom/components.js" \
  "MY_DATA" \
  "const helpers are registered in components.js"
rm -rf "$T"

# ── Test 12: insertion placed before Tabler icons section ─────────────────────
T=$(mktemp -d); mkdir -p "$T/playroom" "$T/02-generated/Widget"
mk_components_js "$T"
mk_stories_tsx "$T/02-generated/Widget/Widget.stories.tsx" \
  "function MyHelper() { return null; }"
source_fns "$T" "Widget"
register_playroom_story_helpers
# MyHelper line should appear before the @tabler/icons-react export line
# Use || true so grep's exit-1-on-no-match doesn't trip set -o pipefail
LINE_HELPER=$(grep -n "MyHelper"        "$T/playroom/components.js" | head -1 | cut -d: -f1 || true)
LINE_TABLER=$(grep -n "@tabler"         "$T/playroom/components.js" | head -1 | cut -d: -f1 || true)
[ "${LINE_HELPER:-0}" -gt 0 ] && [ "${LINE_TABLER:-0}" -gt 0 ] \
  && [ "${LINE_HELPER}" -lt "${LINE_TABLER}" ] \
  && pass "story helpers inserted before Tabler icons section" \
  || fail "story helpers inserted before Tabler icons section"
rm -rf "$T"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "1..$((PASS+FAIL))"
echo "# Results: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ] && exit 0 || exit 1

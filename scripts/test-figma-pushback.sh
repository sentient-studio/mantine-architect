#!/bin/bash
# test-figma-pushback.sh — Test suite for figma-pushback.sh and run_figma_pushback()
#
# Usage:
#   ./scripts/test-figma-pushback.sh          # run all tests
#   ./scripts/test-figma-pushback.sh -v       # verbose (show all output on failure)
#
# Exit: 0 = all pass, 1 = any failure

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUSHBACK_SCRIPT="$SCRIPT_DIR/figma-pushback.sh"
DISPATCH_SCRIPT="$SCRIPT_DIR/dispatch-agent.sh"

VERBOSE=false
[[ "${1:-}" == "-v" ]] && VERBOSE=true

PASS=0; FAIL=0

# ─── Helpers ──────────────────────────────────────────────────────────────────

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() {
  echo "  ❌ $1"
  echo "     └─ $2"
  FAIL=$((FAIL+1))
}

assert_exit() {
  local label="$1" expected="$2"; shift 2
  local actual=0
  "$@" >/dev/null 2>&1 || actual=$?
  [ "$actual" = "$expected" ] \
    && ok "$label" \
    || fail "$label" "expected exit $expected, got $actual"
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  [[ "$haystack" == *"$needle"* ]] \
    && ok "$label" \
    || fail "$label" "expected to contain: $(echo "$needle" | head -c 80)"
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  [[ "$haystack" != *"$needle"* ]] \
    && ok "$label" \
    || fail "$label" "should NOT contain: $(echo "$needle" | head -c 80)"
}

# ─── Test fixtures ────────────────────────────────────────────────────────────

FIGMA_LINK="https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=83-1773"
FILE_KEY="8TQSF8TeXMMc9391nYVJ41"

SINGLE_JSON='[{"node_id":"83:1773","severity":"BLOCK","category":"A","summary":"Custom dropdown replaces Mantine Select","detail":"The design shows a custom dropdown that Mantine Select already covers. Replace with Mantine Select and use Styles API for overrides."}]'

ADAPT_JSON='[{"node_id":"83:1773","severity":"ADAPT","category":"B","summary":"Hardcoded pixel positions","detail":"Items use absolute px coordinates. Replace with Mantine Stack, Group, or Grid for responsive flow layout."}]'

MULTI_JSON='[{"node_id":"83:1773","severity":"BLOCK","category":"A","summary":"Custom dropdown replaces Mantine Select","detail":"Detail A."},{"node_id":"83:1774","severity":"ADAPT","category":"B","summary":"Hardcoded pixel positions","detail":"Detail B."}]'

# ─── Section 1: Argument validation ──────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  figma-pushback.sh  +  run_figma_pushback()  tests"
echo "═══════════════════════════════════════════════════"
echo ""
echo "── 1. Argument validation ──────────────────────────"

# T01: No arguments → exit 1
EC=0; bash "$PUSHBACK_SCRIPT" 2>/dev/null || EC=$?
[ "$EC" = "1" ] && ok "T01 no args → exit 1" || fail "T01 no args → exit 1" "got exit $EC"

# T02: Missing PUSHBACK_JSON → exit 1
EC=0; bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" 2>/dev/null || EC=$?
[ "$EC" = "1" ] && ok "T02 missing PUSHBACK_JSON → exit 1" || fail "T02 missing PUSHBACK_JSON → exit 1" "got exit $EC"

# T03: Invalid JSON string → exit 1
EC=0; bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" "not-json" 2>/dev/null || EC=$?
[ "$EC" = "1" ] && ok "T03 invalid JSON → exit 1" || fail "T03 invalid JSON → exit 1" "got exit $EC"

# T04: JSON object (not array) → exit 1
EC=0; bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" '{"foo":"bar"}' 2>/dev/null || EC=$?
[ "$EC" = "1" ] && ok "T04 JSON object not array → exit 1" || fail "T04 JSON object → exit 1" "got exit $EC"

# T05: Empty JSON array → exit 0 with info message
OUT=$(bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" '[]' 2>&1); EC=$?
[ "$EC" = "0" ] && ok "T05 empty array → exit 0" || fail "T05 empty array → exit 0" "got exit $EC"
assert_contains "T05 empty array → 'No pushback items'" "No pushback" "$OUT"

echo ""
echo "── 2. Dry-run output ───────────────────────────────"

# T06: Single-item dry-run → exit 0
OUT=$(FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" \
  "$FILE_KEY" "$FIGMA_LINK" "$SINGLE_JSON" --dry-run 2>&1); EC=$?
[ "$EC" = "0" ] && ok "T06 dry-run single item → exit 0" || fail "T06 dry-run → exit 0" "got exit $EC"

# T07: Header shows "DRY RUN"
assert_contains "T07 header shows DRY RUN" "DRY RUN" "$OUT"

# T08: Body shows BLOCK severity
assert_contains "T08 body shows BLOCK" "BLOCK" "$OUT"

# T09: Body shows summary text
assert_contains "T09 body shows summary" "Custom dropdown replaces Mantine Select" "$OUT"

# T10: Idempotency key embedded in comment body
assert_contains "T10 idem key present" "[MANTINE-ARCHITECT|83:1773|" "$OUT"

# T11: Figma link present in comment body
assert_contains "T11 Figma link in body" "$FIGMA_LINK" "$OUT"

# T12: Single item → singular "conflict" (not "conflicts")
assert_contains     "T12 singular 'conflict'"    "1 conflict)"  "$OUT"
assert_not_contains "T12 no spurious plural"     "1 conflicts)" "$OUT"

# T13: Multi-item dry-run → plural "conflicts"
OUT_MULTI=$(FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" \
  "$FILE_KEY" "$FIGMA_LINK" "$MULTI_JSON" --dry-run 2>&1)
assert_contains "T13 plural 'conflicts'" "2 conflicts)" "$OUT_MULTI"

echo ""
echo "── 3. Comment body formatting ──────────────────────"

# T14: BLOCK → 🔴 emoji in body
assert_contains "T14 BLOCK → 🔴 in body" "🔴" "$OUT"

# T15: ADAPT → 🟡 emoji in body
OUT_ADAPT=$(FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" \
  "$FILE_KEY" "$FIGMA_LINK" "$ADAPT_JSON" --dry-run 2>&1)
assert_contains "T15 ADAPT → 🟡 in body" "🟡" "$OUT_ADAPT"

# T16: Category A → expanded label
assert_contains "T16 category A expands" "Component Cannibalization" "$OUT"

# T17: Category B → expanded label
assert_contains "T17 category B expands" "Layout Paradox" "$OUT_ADAPT"

# T18: Category C → expanded label
OUT_C=$(FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" \
  '[{"node_id":"1:1","severity":"ADAPT","category":"C","summary":"Low contrast text","detail":"Fix contrast."}]' \
  --dry-run 2>&1)
assert_contains "T18 category C expands" "Accessibility Tension" "$OUT_C"

# T19: Category D → expanded label
OUT_D=$(FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" "$FILE_KEY" "$FIGMA_LINK" \
  '[{"node_id":"1:1","severity":"ADAPT","category":"D","summary":"Docs gap","detail":"Fix docs."}]' \
  --dry-run 2>&1)
assert_contains "T19 category D expands" "Thin Wrapper Docs Gap" "$OUT_D"

# T20: Comment header line present
assert_contains "T20 🤖 header present" "🤖 Mantine Architect" "$OUT"

echo ""
echo "── 4. Token handling ───────────────────────────────"

# T21: FIGMA_ACCESS_TOKEN="" (explicitly empty) without dry-run → exit 1
EC=0; FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" \
  "$FILE_KEY" "$FIGMA_LINK" "$SINGLE_JSON" 2>/dev/null || EC=$?
[ "$EC" = "1" ] && ok "T21 empty token (live mode) → exit 1" \
  || fail "T21 empty token → exit 1" "got exit $EC"

# T22: FIGMA_ACCESS_TOKEN="" with --dry-run → exit 0 (token not required)
EC=0; FIGMA_ACCESS_TOKEN="" bash "$PUSHBACK_SCRIPT" \
  "$FILE_KEY" "$FIGMA_LINK" "$SINGLE_JSON" --dry-run 2>/dev/null || EC=$?
[ "$EC" = "0" ] && ok "T22 empty token + dry-run → exit 0" \
  || fail "T22 empty token + dry-run → exit 0" "got exit $EC"

# T23: FIGMA_ACCESS_TOKEN unset + --dry-run → exit 0 (token not required)
EC=0; env -u FIGMA_ACCESS_TOKEN bash "$PUSHBACK_SCRIPT" \
  "$FILE_KEY" "$FIGMA_LINK" "$SINGLE_JSON" --dry-run 2>/dev/null || EC=$?
[ "$EC" = "0" ] && ok "T23 unset token + dry-run → exit 0" \
  || fail "T23 unset token + dry-run → exit 0" "got exit $EC"

# ─── Section 5: run_figma_pushback() ──────────────────────────────────────────
# Strategy: extract function to temp file using line numbers (avoids awk
# regex-escaping issues inside bash -c double-quoted strings).
# Set up a stub figma-pushback.sh under $STUB_DIR/scripts/ that records its
# arguments to a calls.txt file for assertion.

echo ""
echo "── 5. run_figma_pushback() ─────────────────────────"

# Extract function body to a temp file
TMP_FN=$(mktemp /tmp/run_figma_pushback_XXXXXX.sh)
START_LINE=$(grep -n '^run_figma_pushback()' "$DISPATCH_SCRIPT" | head -1 | cut -d: -f1)
END_LINE=$(awk "NR>$START_LINE && /^\}/ {print NR; exit}" "$DISPATCH_SCRIPT")

if [ -z "$START_LINE" ] || [ -z "$END_LINE" ]; then
  echo "  ⚠️  Could not locate run_figma_pushback() in dispatch-agent.sh — skipping Section 5"
else
  sed -n "${START_LINE},${END_LINE}p" "$DISPATCH_SCRIPT" > "$TMP_FN"

  # Create stub directory layout: $STUB_DIR/scripts/figma-pushback.sh
  STUB_DIR=$(mktemp -d)
  mkdir -p "$STUB_DIR/scripts"
  STUB_SCRIPT="$STUB_DIR/scripts/figma-pushback.sh"
  STUB_CALLS="$STUB_DIR/calls.txt"

  # Stub records its args to calls.txt (path baked in via directory-relative)
  cat > "$STUB_SCRIPT" << STUB_EOF
#!/bin/bash
echo "\$@" >> "$STUB_CALLS"
exit 0
STUB_EOF
  chmod +x "$STUB_SCRIPT"

  # Helper: run run_figma_pushback in a subshell with fake log content
  # Args: log_content [figma_link [project_root]]
  run_pfn() {
    local log_content="$1"
    local figma_link="${2:-$FIGMA_LINK}"
    local project_root="${3:-$STUB_DIR}"

    local tmp_log
    tmp_log=$(mktemp)
    printf '%s\n' "$log_content" > "$tmp_log"
    rm -f "$STUB_CALLS"

    local result
    result=$(
      LOG_FILE="$tmp_log"
      FIGMA_LINK="$figma_link"
      PROJECT_ROOT="$project_root"
      RED='' GREEN='' YELLOW='' BLUE='' CYAN='' NC=''
      # shellcheck source=/dev/null
      source "$TMP_FN"
      run_figma_pushback 2>&1
      echo "EXIT:$?"
    )
    rm -f "$tmp_log"
    echo "$result"
  }

  calls_recorded() { [ -f "$STUB_CALLS" ] && cat "$STUB_CALLS" || echo ""; }

  # T24: No <PUSHBACK> block → no-op, no stub call
  OUT24=$(run_pfn "Some log without pushback block")
  EC24=$(echo "$OUT24" | grep '^EXIT:' | cut -d: -f2 | tr -d '\n')
  [ "$EC24" = "0" ] && ok "T24 no PUSHBACK block → exit 0" \
    || fail "T24 no PUSHBACK block → exit 0" "got $EC24"
  [ -z "$(calls_recorded)" ] && ok "T24 no PUSHBACK → stub NOT called" \
    || fail "T24 stub should not be called" "$(calls_recorded)"

  # T25: Empty PUSHBACK block [] → no-op
  OUT25=$(run_pfn "$(printf '<PUSHBACK>\n[]\n</PUSHBACK>')")
  EC25=$(echo "$OUT25" | grep '^EXIT:' | cut -d: -f2 | tr -d '\n')
  [ "$EC25" = "0" ] && ok "T25 PUSHBACK [] → exit 0" \
    || fail "T25 PUSHBACK [] → exit 0" "got $EC25"
  [ -z "$(calls_recorded)" ] && ok "T25 PUSHBACK [] → stub NOT called" \
    || fail "T25 stub should not be called" "$(calls_recorded)"

  # T26: Invalid JSON in PUSHBACK block → warning, no call, non-fatal
  OUT26=$(run_pfn "$(printf '<PUSHBACK>\nnot-valid-json\n</PUSHBACK>')")
  EC26=$(echo "$OUT26" | grep '^EXIT:' | cut -d: -f2 | tr -d '\n')
  [ "$EC26" = "0" ] && ok "T26 invalid PUSHBACK JSON → non-fatal (exit 0)" \
    || fail "T26 invalid JSON → exit 0" "got $EC26"
  [ -z "$(calls_recorded)" ] && ok "T26 invalid JSON → stub NOT called" \
    || fail "T26 stub should not be called" "$(calls_recorded)"

  # T27: Valid PUSHBACK + valid Figma URL → calls stub with FILE_KEY
  LOG27=$(printf '<PUSHBACK>\n%s\n</PUSHBACK>' "$SINGLE_JSON")
  OUT27=$(run_pfn "$LOG27" "$FIGMA_LINK" "$STUB_DIR")
  EC27=$(echo "$OUT27" | grep '^EXIT:' | cut -d: -f2 | tr -d '\n')
  [ "$EC27" = "0" ] && ok "T27 valid PUSHBACK → exit 0" \
    || fail "T27 valid PUSHBACK → exit 0" "got $EC27 | $OUT27"
  CALLS27=$(calls_recorded)
  [ -n "$CALLS27" ] && ok "T27 valid PUSHBACK → stub WAS called" \
    || fail "T27 stub should be called" "no calls recorded"
  assert_contains "T27 stub receives FILE_KEY" "$FILE_KEY" "$CALLS27"
  assert_contains "T27 stub receives FIGMA_LINK" "$FIGMA_LINK" "$CALLS27"

  # T28: Invalid Figma URL → warning, stub NOT called
  LOG28=$(printf '<PUSHBACK>\n%s\n</PUSHBACK>' "$SINGLE_JSON")
  OUT28=$(run_pfn "$LOG28" "https://not-figma.com/foo/bar")
  EC28=$(echo "$OUT28" | grep '^EXIT:' | cut -d: -f2 | tr -d '\n')
  [ "$EC28" = "0" ] && ok "T28 invalid Figma URL → non-fatal (exit 0)" \
    || fail "T28 invalid URL → exit 0" "got $EC28"
  [ -z "$(calls_recorded)" ] && ok "T28 invalid URL → stub NOT called" \
    || fail "T28 stub should not be called" "$(calls_recorded)"

  # T29: figma-pushback.sh missing → warning, non-fatal
  MISSING_DIR=$(mktemp -d)
  mkdir -p "$MISSING_DIR/scripts"
  # Do NOT create figma-pushback.sh in MISSING_DIR/scripts/
  LOG29=$(printf '<PUSHBACK>\n%s\n</PUSHBACK>' "$SINGLE_JSON")
  OUT29=$(run_pfn "$LOG29" "$FIGMA_LINK" "$MISSING_DIR")
  EC29=$(echo "$OUT29" | grep '^EXIT:' | cut -d: -f2 | tr -d '\n')
  [ "$EC29" = "0" ] && ok "T29 missing pushback script → non-fatal (exit 0)" \
    || fail "T29 missing script → exit 0" "got $EC29"
  assert_contains "T29 missing script → 'not found' warning" "not found" "$OUT29"

  # Cleanup
  rm -f "$TMP_FN"
  rm -rf "$STUB_DIR" "$MISSING_DIR"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
printf "  Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m  (total %d)\n" \
  "$PASS" "$FAIL" "$((PASS+FAIL))"
echo "═══════════════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1

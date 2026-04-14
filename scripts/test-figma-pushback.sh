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

  # Also extract helper functions called by run_figma_pushback()
  TMP_VAL_FN=$(mktemp /tmp/validate_pushback_fn_XXXXXX.sh)
  TMP_PROSE_FN=$(mktemp /tmp/rewrite_prose_fn_XXXXXX.sh)
  START_VAL_FN=$(grep -n '^validate_pushback_json()' "$DISPATCH_SCRIPT" | head -1 | cut -d: -f1)
  END_VAL_FN=$(awk "NR>$START_VAL_FN && /^\}/ {print NR; exit}" "$DISPATCH_SCRIPT")
  START_PROSE_FN=$(grep -n '^rewrite_pushback_prose()' "$DISPATCH_SCRIPT" | head -1 | cut -d: -f1)
  END_PROSE_FN=$(awk "NR>$START_PROSE_FN && /^\}/ {print NR; exit}" "$DISPATCH_SCRIPT")
  [ -n "${START_VAL_FN:-}" ] && [ -n "${END_VAL_FN:-}" ] && \
    sed -n "${START_VAL_FN},${END_VAL_FN}p" "$DISPATCH_SCRIPT" > "$TMP_VAL_FN"
  [ -n "${START_PROSE_FN:-}" ] && [ -n "${END_PROSE_FN:-}" ] && \
    sed -n "${START_PROSE_FN},${END_PROSE_FN}p" "$DISPATCH_SCRIPT" > "$TMP_PROSE_FN"

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
      HAIKU_MODEL="claude-haiku-4-5-20251001"
      SKIP_PUSHBACK_PROSE_REWRITE=1
      # shellcheck source=/dev/null
      source "$TMP_VAL_FN"
      # shellcheck source=/dev/null
      source "$TMP_PROSE_FN"
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
  rm -f "$TMP_FN" "$TMP_VAL_FN" "$TMP_PROSE_FN"
  rm -rf "$STUB_DIR" "$MISSING_DIR"
fi

# ─── Section 6: select_stage23_model() ───────────────────────────────────────

echo ""
echo "── 6. select_stage23_model() ───────────────────────"

TMP_SEL=$(mktemp /tmp/select_stage23_model_XXXXXX.sh)
START_SEL=$(grep -n '^select_stage23_model()' "$DISPATCH_SCRIPT" | head -1 | cut -d: -f1)
END_SEL=$(awk "NR>$START_SEL && /^\}/ {print NR; exit}" "$DISPATCH_SCRIPT")

if [ -z "${START_SEL:-}" ] || [ -z "${END_SEL:-}" ]; then
  echo "  ⚠️  Could not locate select_stage23_model() in dispatch-agent.sh — skipping Section 6"
else
  sed -n "${START_SEL},${END_SEL}p" "$DISPATCH_SCRIPT" > "$TMP_SEL"

  SONNET_MODEL="claude-sonnet-4-6"
  HAIKU_MODEL="claude-haiku-4-5-20251001"

  run_sel() {
    local content="$1"
    local tmpf
    tmpf=$(mktemp)
    printf '%s\n' "$content" > "$tmpf"
    local result
    result=$(
      SONNET_MODEL="$SONNET_MODEL"
      HAIKU_MODEL="$HAIKU_MODEL"
      # shellcheck source=/dev/null
      source "$TMP_SEL"
      select_stage23_model "$tmpf"
    )
    rm -f "$tmpf"
    echo "$result"
  }

  # T30: 0 conflicts + small plan → haiku
  MODEL30=$(run_sel "$(printf '# Plan\n**Severity: None detected**\n')")
  [ "$MODEL30" = "$HAIKU_MODEL" ] \
    && ok "T30 0🔴 0🟡 small plan → haiku" \
    || fail "T30 → haiku" "got: $MODEL30"

  # T31: BLOCK conflict → sonnet
  MODEL31=$(run_sel "$(printf '**Severity: 🔴 BLOCK**\n')")
  [ "$MODEL31" = "$SONNET_MODEL" ] \
    && ok "T31 1🔴 → sonnet" \
    || fail "T31 → sonnet" "got: $MODEL31"

  # T32: ADAPT conflict → sonnet
  MODEL32=$(run_sel "$(printf '**Severity: 🟡 ADAPT**\n')")
  [ "$MODEL32" = "$SONNET_MODEL" ] \
    && ok "T32 1🟡 → sonnet" \
    || fail "T32 → sonnet" "got: $MODEL32"

  # T33: 0 conflicts but plan > 12 KB → sonnet
  LARGE_CONTENT=$(python3 -c "print('x ' * 7000)")  # ~14 KB
  MODEL33=$(run_sel "$LARGE_CONTENT")
  [ "$MODEL33" = "$SONNET_MODEL" ] \
    && ok "T33 large plan (>12K) → sonnet" \
    || fail "T33 → sonnet" "got: $MODEL33"

  rm -f "$TMP_SEL"
fi

# ─── Section 7: validate_pushback_json() ─────────────────────────────────────

echo ""
echo "── 7. validate_pushback_json() ─────────────────────"

TMP_VAL=$(mktemp /tmp/validate_pushback_XXXXXX.sh)
START_VAL=$(grep -n '^validate_pushback_json()' "$DISPATCH_SCRIPT" | head -1 | cut -d: -f1)
END_VAL=$(awk "NR>$START_VAL && /^\}/ {print NR; exit}" "$DISPATCH_SCRIPT")

if [ -z "${START_VAL:-}" ] || [ -z "${END_VAL:-}" ]; then
  echo "  ⚠️  Could not locate validate_pushback_json() in dispatch-agent.sh — skipping Section 7"
else
  sed -n "${START_VAL},${END_VAL}p" "$DISPATCH_SCRIPT" > "$TMP_VAL"

  # Capture stdout (cleaned JSON)
  run_val() {
    local json="$1"
    # shellcheck source=/dev/null
    source "$TMP_VAL"
    validate_pushback_json "$json" 2>/dev/null
  }

  # Capture stderr (warnings only)
  run_val_warnings() {
    local json="$1"
    # shellcheck source=/dev/null
    source "$TMP_VAL"
    validate_pushback_json "$json" 2>&1 >/dev/null
  }

  item_count() { python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(len(d))" "$1" 2>/dev/null || echo "-1"; }

  VALID_ITEM='{"node_id":"1:1","severity":"BLOCK","category":"A","summary":"s","detail":"d"}'

  # T34: valid item passes through unchanged
  OUT34=$(run_val "[$VALID_ITEM]")
  [ "$(item_count "$OUT34")" = "1" ] \
    && ok "T34 valid item passes through" \
    || fail "T34 valid item" "got: $OUT34"

  # T35: item missing required field → stripped + warning emitted
  MISSING='{"node_id":"1:1","severity":"BLOCK","category":"A","summary":"s"}'
  OUT35=$(run_val "[$MISSING]")
  WARN35=$(run_val_warnings "[$MISSING]")
  [ "$(item_count "$OUT35")" = "0" ] \
    && ok "T35 missing field → stripped" \
    || fail "T35 missing field" "count=$(item_count "$OUT35")"
  assert_contains "T35 warning emitted" "WARNING" "$WARN35"

  # T36: severity 'NOTE' (not BLOCK|ADAPT) → stripped
  NOTE_ITEM='{"node_id":"1:1","severity":"NOTE","category":"C","summary":"s","detail":"d"}'
  OUT36=$(run_val "[$NOTE_ITEM]")
  [ "$(item_count "$OUT36")" = "0" ] \
    && ok "T36 severity NOTE → stripped" \
    || fail "T36 NOTE stripped" "count=$(item_count "$OUT36")"

  # T37: invalid category 'Z' → stripped
  BAD_CAT='{"node_id":"1:1","severity":"BLOCK","category":"Z","summary":"s","detail":"d"}'
  OUT37=$(run_val "[$BAD_CAT]")
  [ "$(item_count "$OUT37")" = "0" ] \
    && ok "T37 invalid category → stripped" \
    || fail "T37 bad category" "count=$(item_count "$OUT37")"

  # T38: mix of valid + invalid → only valid item kept
  MIX_JSON="[$VALID_ITEM, $NOTE_ITEM]"
  OUT38=$(run_val "$MIX_JSON")
  [ "$(item_count "$OUT38")" = "1" ] \
    && ok "T38 mix → only valid item kept" \
    || fail "T38 mix" "count=$(item_count "$OUT38")"

  # T39: ADAPT severity (valid) → passes through
  ADAPT_ITEM='{"node_id":"1:1","severity":"ADAPT","category":"B","summary":"s","detail":"d"}'
  OUT39=$(run_val "[$ADAPT_ITEM]")
  [ "$(item_count "$OUT39")" = "1" ] \
    && ok "T39 ADAPT severity (valid) → kept" \
    || fail "T39 ADAPT" "count=$(item_count "$OUT39")"

  rm -f "$TMP_VAL"
fi

# ─── Section 8: rewrite_pushback_prose() ─────────────────────────────────────

echo ""
echo "── 8. rewrite_pushback_prose() ─────────────────────"

TMP_PROSE=$(mktemp /tmp/rewrite_pushback_XXXXXX.sh)
START_PROSE=$(grep -n '^rewrite_pushback_prose()' "$DISPATCH_SCRIPT" | head -1 | cut -d: -f1)
END_PROSE=$(awk "NR>$START_PROSE && /^\}/ {print NR; exit}" "$DISPATCH_SCRIPT")

if [ -z "${START_PROSE:-}" ] || [ -z "${END_PROSE:-}" ]; then
  echo "  ⚠️  Could not locate rewrite_pushback_prose() in dispatch-agent.sh — skipping Section 8"
else
  sed -n "${START_PROSE},${END_PROSE}p" "$DISPATCH_SCRIPT" > "$TMP_PROSE"

  PROSE_INPUT='[{"node_id":"1:1","severity":"BLOCK","category":"A","summary":"Test","detail":"Original detail text."}]'

  # T40: SKIP_PUSHBACK_PROSE_REWRITE=1 → returns original JSON unchanged
  OUT40=$(
    SKIP_PUSHBACK_PROSE_REWRITE=1
    HAIKU_MODEL="claude-haiku-4-5-20251001"
    YELLOW='' NC='' CYAN=''
    # shellcheck source=/dev/null
    source "$TMP_PROSE"
    rewrite_pushback_prose "$PROSE_INPUT" 2>/dev/null
  )
  assert_contains "T40 skip → returns original detail" "Original detail text." "$OUT40"

  # T41: SKIP_PUSHBACK_PROSE_REWRITE=1 → exit 0 (non-fatal)
  EC41=0
  (
    SKIP_PUSHBACK_PROSE_REWRITE=1
    HAIKU_MODEL="claude-haiku-4-5-20251001"
    YELLOW='' NC='' CYAN=''
    # shellcheck source=/dev/null
    source "$TMP_PROSE"
    rewrite_pushback_prose "$PROSE_INPUT" >/dev/null 2>&1
  ) || EC41=$?
  [ "$EC41" = "0" ] \
    && ok "T41 skip → exit 0" \
    || fail "T41 exit 0" "got exit $EC41"

  rm -f "$TMP_PROSE"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
printf "  Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m  (total %d)\n" \
  "$PASS" "$FAIL" "$((PASS+FAIL))"
echo "═══════════════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1

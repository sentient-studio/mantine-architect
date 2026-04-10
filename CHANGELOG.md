# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.45.0] — 2026-04-10

### Improved — Stage behavioral contracts and critical-rules placement in agent prompts

**Problem:** Stage 2+3 agents had no explicit behavioral constraints on *scope of action*:
- Stage 2 had no guidance on what to do when context fills mid-generation, risking 4 degraded files that are harder to recover than a clean partial
- Stage 3 had no instruction to leave passing code alone, meaning "helpful" refactoring of working files could introduce new failures

Additionally, the most failure-prone CSS and silent-failure rules in `AGENT-CLAUDE.md` were positioned at lines 186–212 — past the midpoint of a ~300-line document — meaning they appeared in the middle of the assembled Stage 2+3 prompt where attention is weakest.

**Changes:**

`00-setup/stage23-prompt.md` — behavioral contracts added to both stage headers:
- Stage 2: build completely; fix adjacent quality issues noticed during implementation; if context fills before all 4 files are written, complete the current file cleanly and pause with an explicit list of what remains (a clean partial is recoverable; 4 degraded files are not)
- Stage 3: fix precisely; only touch files or tests that failed a quality gate; do not refactor, rename, or improve anything that passed

`00-setup/AGENT-CLAUDE.md` — added "Critical Rules" section immediately after Default Workflow (~line 30), surfacing the 5 CSS rules and 5 highest-risk silent failure patterns before the reference material. These now appear in the first ~60 lines of the assembled prompt instead of past line 200.

`CLAUDE.md` — corrected stale references: directory listing and Default Workflow now name the actual prompt files (`AGENT-CLAUDE.md`, `stage1-prompt.md`, `stage23-prompt.md`) instead of the legacy `golden-prompt.md`.

---

## [0.44.0] — 2026-04-09

### Fixed — Storybook autodocs `unknown` type on inherited Mantine props

Storybook 8 cannot introspect `MantineSize`, `MantineShadow`, or any union type inherited via `extends MantineXxxProps`. Affected props showed `unknown` in the docs table Type column.

**Root cause:** The top-level `type:` field in argTypes does not control the docs table — only `table.type.summary` does.

**Fix applied to all 7 affected components:**

| Component | Props fixed |
|---|---|
| Drawer | `position`, `size`, `shadow`, `padding` |
| Modal | `size`, `shadow`, `padding`, `radius` |
| Select | `size` |
| MultiSelect | `size` |
| Badge | `variant`, `size`, `radius` |
| Checkbox | `size`, `variant`, `labelPosition` |
| Table | `striped`, `captionSide` |

Each argType now uses `table: { type: { summary: 'MantineSize' } }` (or the exact union literal for enum props). Overlay/panel `size` props also document the token→px mapping in `description`.

**Rule added to `CLAUDE.md` Silent Failure Patterns** with the correct fix pattern.

---

## [0.43.0] — 2026-04-09

### Fixed — Drawer `size` argType control type

`Drawer.stories.tsx` had `control: 'number'` for `size`, blocking string tokens like `'md'`. Changed to `control: 'text'` with description documenting the full token→px mapping (xs≈320px … xl≈780px).

---

## [0.42.0] — 2026-04-09

### Removed — stale and redundant files

Project root cleanup. All removed files were superseded by `CLAUDE.md` or active code.

**Deleted:**
- `README.md` / `SETUP-GUIDE.md` — onboarding guides written for a zip-file install flow; no longer reflect the MCP-based workflow
- `docs/` — 5 guide files (AUTOMATION-README, BATCH-GENERATION-GUIDE, CSV-VALIDATION-GUIDE, 2×DEPENDENCY-AUDIT) and `docs/skills/` (3 archived SKILL.md files); all superseded by CLAUDE.md
- `stories/` — default Storybook scaffold (Button.jsx, Header.jsx, Page.jsx); never loaded (Storybook scans `02-generated/**` only)
- `mantine-architect-api/` (95 MB) — abandoned Railway/FastAPI server; pivoted to MCP
- `components-sample.txt` — placeholder batch file
- `FILE-LIST.txt` — stale file nav dump
- `debug-storybook.log` — one-off debug artefact
- `02-generated/_archive/` — superseded component versions
- `.claude/start-storybook.sh` — duplicated by `.claude/launch.json`
- `memory/` (project root) — stale memory from before Claude Code's built-in memory system; active memory lives at `~/.claude/projects/…/memory/`
- Old `logs/` entries — failed April 5 Badge/Checkbox/Select runs and duplicate Modal/Table/Drawer runs; kept only the latest per component

---

## [0.41.0] — 2026-04-09

### Fixed — ContentBox orphaned `onClick` control in Storybook docs

`ContentBox.stories.tsx` argTypes used `action: 'clicked'` (Storybook 7 syntax) for `onClick`, which registers a control entry in SB8 but doesn't wire to anything — leaving an orphaned row in the Controls panel on the docs page.

Changed to `table: { disable: true }` — `onClick` is inherited from `React.HTMLAttributes<HTMLElement>` and doesn't need an explicit control. Verified in Storybook: Controls panel now shows only `variant` and `children`.

**Rule added to `00-setup/golden-prompt.md` and `CLAUDE.md` Silent Failure Patterns** to prevent recurrence across future generated components.

---

## [0.40.0] — 2026-04-09

### Added — ContentBox component

New component at `02-generated/ContentBox/` generated from Figma node `107:1419` (Figma component named "Box" — renamed to avoid collision with Mantine's own `Box` primitive).

- **`ContentBox.tsx`** — two variants: `default` (static `<div>` via Mantine `Box`) and `link` (interactive `<UnstyledButton>`); root element switches based on variant; `data-variant` forwarded for CSS/Playwright targeting; `ContentBox.displayName` set for correct autodocs labelling; `swap` Figma variant omitted (design-tool artefact with underscore-prefixed layer)
- **`ContentBox.module.css`** — flex-centered, full-width, `padding=spacing.md`, `radius=sm`, `gap=0`; default hover: `gray.0`; link hover: `gray.1`; full dark-mode support via `light-dark()`; `@mixin hover` for both variants
- **`ContentBox.stories.tsx`** — 4 stories: `Default`, `Link`, `WithRichContent` (icon + text Group as children), `Showcase` (all variants stacked)
- **`ContentBox.spec.ts`** — 12 Playwright tests: element type (div vs button), `data-variant` attribute, children rendering, click/focus interaction, axe a11y on Default/Link/Showcase, two screenshot snapshots

All 12 tests passing. 9/9 quality gates passing (no warnings).

---

## [0.39.0] — 2026-04-09

### Added — JSDoc component descriptions for Storybook autodocs

Storybook's autodocs page renders the JSDoc comment on the primary exported component function as the component description. Without it the docs page shows a blank header.

**Rule added to `00-setup/golden-prompt.md` and `CLAUDE.md`:** Stage 2 must always write a JSDoc block on the exported component function covering: what Mantine component it wraps, any `data-*` attributes forwarded for CSS/Playwright targeting, and WCAG AA colour decisions. JSDoc is limited to the primary export only — not helpers, sub-components, or type aliases.

**Backfilled existing components** (Badge and Checkbox already had it):

| Component | JSDoc added |
|---|---|
| `Modal.tsx` | gray.0 bg rationale, compound API ARIA note, gray.7 requirement |
| `Drawer.tsx` | position/size defaults, compound API ARIA note, gray.7 requirement |
| `Select.tsx` | Box wrapper rationale, Combobox locator note, red.9 error text |
| `MultiSelect.tsx` | Box wrapper rationale, min-height pill behaviour, red.9 error text |
| `Table.tsx` | sorting cycle, ScrollContainer, WCAG sort icon aria-labels |

---

## [0.38.0] — 2026-04-09

### Changed — MCP server v1.1.0 — 4 performance optimisations

**`mantine-architect-mcp/src/runner.ts`** and **`scripts/dispatch-agent.sh`** updated.

#### Fix 1 — `mantine_generate` skips Stage 1 when a plan exists (~50% token reduction)

Previously `mantine_generate` always called `dispatch-agent.sh --auto-approve`, re-running the full Stage 1 Figma query even when a plan file was already written by `mantine_plan`. Now passes `--plan=<path>` directly to Stage 2+3, cutting generation time from ~30 min to ~15–20 min and eliminating the duplicate Figma MCP calls.

#### Fix 2 — Job state persisted to `logs/mcp-jobs.json`

Job state was held in-memory only — lost on every MCP server restart. Now persisted to disk after every state transition (create, complete, fail). On startup, any job still marked `running` (process died with the server) is automatically downgraded to `failed` so callers don't poll forever.

#### Fix 3 — Plan cache: `mantine_plan` returns instantly on cache hit

If a plan file for the requested component is < 24 h old and its header Figma node-id matches the requested URL, `mantine_plan` returns a synthetic complete job immediately — no subprocess spawned, no Figma API calls made. Invaluable for iterate-on-generate workflows. Pass `force=true` to bypass and re-run Stage 1.

#### Fix 4 — `mantine-llms.txt` network refresh skipped when file is fresh

`dispatch-agent.sh` made a curl request on every run (even with etag, it still did a round-trip). The MCP runner now checks the local file mtime — if < 6 h old, sets `SKIP_LLMS_REFRESH=1` in the child env. The script skips the curl entirely and prints "skipped (fresh <6 h)".

---

## [0.37.0] — 2026-04-09

### Added — Modal component

New component at `02-generated/Modal/` generated from Figma node `106:985`.

- **`Modal.tsx`** — thin wrapper around `MantineModal` with `radius="sm"`, `shadow="xl"`, `padding="md"` defaults; `closeButtonProps` with `aria-label="Close modal"` for a11y; `classNames` forwarded for content, header, and title slots; exposes `Omit<MantineModalProps, 'classNames'>` as its public type with explicit `argTypes` in Storybook meta so Controls panel is not blank
- **`Modal.module.css`** — `gray.0` content + sticky-header background (Figma deviation from Mantine's white default); `gray.9` / `gray.0` title color in light/dark mode; no raw hex, no px outside `rem()`
- **`Modal.stories.tsx`** — 6 stories: `Showcase` (args-based, Controls-compatible), `Open` (pre-opened Playwright fixture with full registration form + confirmPassword validation), `Default` (minimal trigger), `WithoutHeader` (compound `Modal.Root` + `Modal.Content aria-label` for ARIA dialog-name), `Centered`, `Sizes` (xs/sm/md/lg trigger buttons)
- **`Modal.spec.ts`** — 16 Playwright tests: visibility, title, close-button, Escape key, form field presence, form validation (empty, bad email, short password, mismatched passwords), valid submit closes modal, axe a11y on `open` and `without-header` stories, screenshot snapshot

All 16 tests passing. 8/8 quality gates passing (Gate 6 data-* warn expected — thin wrapper has no internal state variants).

---

## [0.36.0] — 2026-04-08

### Added — MultiSelect component

New component at `02-generated/MultiSelect/` generated from Figma node `96:4943`.

- **`MultiSelect.tsx`** — `Box` wrapper + `MantineMultiSelect` via Styles API; `size?: MantineSize` prop (default `'md'`) forwarded to both the Mantine component and a `data-size` attribute on the outer wrapper for CSS cascade
- **`MultiSelect.module.css`** — full variant coverage: default, filled (pills), open dropdown (`data-expanded`), error, disabled; pill background matches Figma (`gray.1` / `dark-5`); `min-height` (not `height`) so the input grows when pills wrap; portal-safe `.dropdown` and `.option` classes use only concrete `var(--mantine-*)` tokens
- **`MultiSelect.stories.tsx`** — 9 stories: Default, Filled, WithDescription, ErrorState, Disabled, Searchable, Clearable, MaxValues, WithGroupedOptions, Sizes (all 5), Showcase
- **`MultiSelect.spec.ts`** — 22 Playwright tests covering rendering, size cascade, pill add/remove, multi-selection, dropdown open/close, keyboard (Escape), searchable filtering, error/disabled states, clearable, and axe a11y on 4 stories

All 22 tests passing. 9/9 applicable quality gates passing (Gate 11 Portal Scope: N/A).

### Fixed — `scripts/dependency-audit.sh` — replaced `jq` with `python3`

Gate 9 (Dependency Audit) was failing on license compatibility check with `jq: command not found`. Replaced the `jq` pipeline with an inline `python3` script that performs the same recursive walk over `npm ls --json` output. No new install required — `python3` is already available in the project environment. Fix applies to all components.

---

## [0.35.0] — 2026-04-07

### Added — Design Pushback (bidirectional Figma ↔ Code loop)

New feature: Stage 1 agents can now post architectural conflict comments directly to Figma nodes via the REST Comments API, closing the loop between AI analysis and design review.

**`scripts/figma-pushback.sh`** (new)
- Posts Mantine Architect conflict comments to a Figma file via `POST /v1/files/:key/comments`
- Comments are anchored to the specific node ID (`client_meta.node_id`)
- Idempotent: before posting, fetches existing comments and skips any with matching `[MANTINE-ARCHITECT|<node_id>|<summary>]` key in the body
- Token resolution: `$FIGMA_ACCESS_TOKEN` env var → `claude_desktop_config.json` MCP env (first match wins); explicitly empty `FIGMA_ACCESS_TOKEN=""` blocks config fallback
- `--dry-run` flag prints all comments that would be posted without making any network calls; token not required in dry-run mode
- Comment format: `🤖 Mantine Architect  🔴 BLOCK · A — Component Cannibalization` header, summary, detail, timestamp, Figma link, idempotency key
- Exit codes: `0` = all posted/skipped or dry-run; `1` = fatal (bad JSON, missing token, API error)

**`scripts/dispatch-agent.sh`** — `run_figma_pushback()` (new function)
- Called automatically after `extract_plan_from_log` writes the plan file
- Extracts `<PUSHBACK>` block from the Stage 1 log, validates JSON, extracts Figma file key from URL, and delegates to `figma-pushback.sh`
- Non-fatal: any failure prints a warning but does not fail the pipeline or Stage 1 exit code
- Guards: empty/absent block, `[]`, invalid JSON, unrecognisable Figma URL, and missing `figma-pushback.sh` all return 0 with a `⚠️` message

**`00-setup/stage1-prompt.md`** — `<PUSHBACK>` block output format
- Stage 1 agents now emit a `<PUSHBACK>` block after `<STAGE1_PLAN>` when any 🔴 BLOCK or 🟡 ADAPT conflict is found
- One entry per triggered category (not per node); `detail` is plain text ≤4 sentences (no markdown — appears verbatim as Figma comment body)
- 🔵 NOTE items are informational only and are omitted from PUSHBACK

**`scripts/test-figma-pushback.sh`** (new)
- 39-test suite covering argument validation, dry-run output, comment body formatting, token handling, and `run_figma_pushback()` integration
- Section 5 uses line-number extraction (`grep -n` + `sed -n Np,Mp`) to isolate the function from `dispatch-agent.sh` — avoids fragile awk regex escaping in `bash -c` subshells
- Uses a stub `figma-pushback.sh` that records its arguments to a `calls.txt` file for assertion

### Fixed — `figma-pushback.sh` — `client_meta` must include `node_offset`
- Figma REST API rejects `client_meta: {node_id}` with HTTP 400; requires `node_id` + `node_offset: {x, y}`
- Added `"node_offset": {"x": 0, "y": 0}` to the `client_meta` payload in `post_comment()`
- Verified end-to-end against the live Table component node (`83:1773`): comment posted (id `1707525775`), idempotency re-run correctly skipped

### Fixed — `run_figma_pushback` JSON corruption (`xargs` → `sed` trim)
- `xargs` (used for leading/trailing whitespace removal) interprets double-quotes as shell quoting on macOS, stripping them from the JSON payload and making it unparseable
- Replaced with `sed 's/^[[:space:]]*//;s/[[:space:]]*$//'` which trims whitespace without any content interpretation

---

## [0.34.0] — 2026-04-07

### Fixed — Drawer component
- **Missing `shadow` + `padding` controls** — both props had defaults in `Drawer.tsx` (`shadow='md'`, `padding='md'`) but no `argTypes` in meta; added `select` controls with descriptions and default values so they appear in the Controls panel and docs page
- **`NoHeader` a11y violation (`aria-dialog-name`)** — the simple `<Drawer>` form spreads HTML props to the outer root div, not the `section[role="dialog"]`; switched the `NoHeader` story to Mantine's compound `Drawer.Root` + `Drawer.Content` API which accepts `aria-label` directly on the content section; added explanatory comment documenting why the compound form is required for this pattern
- **Form validation** — `RegistrationForm` had no validation; replaced with `useForm` from `@mantine/form` with field-level rules (required first/last name, valid email regex, 8-char minimum password, terms checkbox), `withAsterisk` on required fields, and `form.onSubmit` so the drawer only closes on a valid submit

### Added — Drawer spec
- `no-header drawer has aria-label accessible name` — asserts `[role="dialog"]` carries `aria-label="Quick actions"` (was previously masked by disabling the `aria-dialog-name` rule)
- `no-header story has no axe violations` — `aria-dialog-name` rule no longer needs to be disabled; passes clean
- `register button with empty form shows validation errors` — submitting blank form keeps drawer open and shows `data-error` fields
- `register button with invalid email shows email error` — verifies email regex error message
- `register button with password too short shows password error` — verifies 8-char minimum error
- `register button with valid form closes the drawer` — end-to-end happy path closes the drawer on valid submit
- Screenshot baseline updated to reflect new form copy (`withAsterisk`, updated placeholder text)

Total: 9 → 14 passing tests

---

## [0.33.0] — 2026-04-07

### Added
- **Plan diff for regenerations** — `batch-generate.sh` now calls `diff_plan_summary()` per component; overview shows `[regen +N/-N lines]` badge when a previous plan exists
- **Pre-filter by signal** — interactive review loop prompt matrix now varies by conflict level and generation type:
  - `0🔴` new: single `Launch Stage 2?` prompt (fast path — no pager)
  - `0🔴` regen: `View diff?` + `Open plan?` + approve
  - `≥1🔴` new: `Open plan? [Y/n]` (default open) + approve
  - `≥1🔴` regen: `View diff?` + `Open plan? [Y/n]` (default open) + approve
- **`stage1-prompt.md` — Architectural Conflicts moved to §1**: section order is now Conflicts → Variants → Decomposition → Tokens → Props → Size → Deps → Stories → Tests → Ambiguities → WCAG → Improvements; reviewers see the critical BLOCK/ADAPT/NOTE summary before any design detail
- **awk ambiguity fix** — `extract_plan_signals` switched from a range pattern to a flag variable (`f=1`/`f=0`) so the Ambiguities section header no longer collapses the range; extraction now works for both old (§9) and new (§10) section numbering

### Changed
- **`CLAUDE.md`** — Batch Workflow section updated with full prompt matrix table

---

## [0.32.0] — 2026-04-07

### Added
- **Plan signal extraction** — `batch-generate.sh` overview now shows a compact signal line per component extracted from the Stage 1 plan file:
  - `0🔴 1🟡 2🔵` — architectural conflict counts (BLOCK / ADAPT / NOTE)
  - `component set` / `single node` — whether the Figma node has variant children
  - `N ambiguities` — design decisions documented in plan section 9
  - `NNK` — plan file size in kilobytes
  - `← REVIEW REQUIRED` flag when any 🔴 BLOCK is present
  - Signals extracted via `extract_plan_signals()` using grep/awk on plan markdown; pipe-delimited output preserves multi-word node type strings
- **Interactive review loop** — after the overview, prompts per component:
  - `Open plan? [y/N]` — opens plan in `$PAGER` / `less`; default `Y` for BLOCK conflicts
  - `Launch Stage 2? [y/n/q]` — approves and fires `dispatch-agent.sh --stage2` in background, defers with `n`, or exits loop with `q`
  - Remaining components after `q` are auto-deferred
  - Post-review summary lists launched components with log-tail commands and deferred components with approve commands
  - Non-interactive sessions (piped/CI stdin) skip the loop and print approve commands only
- **Arithmetic fix** — `SUCCEEDED` / `FAILED` counters changed from `((VAR++))` to `VAR=$((VAR+1))` to prevent `set -e` killing the script when counters start at 0

### Changed
- **`CLAUDE.md`** — Batch Workflow section updated with signal format and interactive review loop documentation

---

## [0.31.0] — 2026-04-07

### Added
- **Lead Architect persona** — `00-setup/stage1-prompt.md` rewritten with:
  - Constitutional Priority List: Framework Idioms > Accessibility > Semantic HTML > Visual Fidelity
  - Four conflict trigger categories with severity tiers:
    - 🔴 BLOCK — Component Cannibalization (Mantine native component available)
    - 🟡 ADAPT — Layout Paradox (Figma absolute coords → web flow layout)
    - 🔵 NOTE — Accessibility Tension (contrast, tap targets, ARIA)
    - 🔵 NOTE — Thin Wrapper Docs Gap (autodocs blank without explicit argTypes)
  - Heuristic Injection: cross-reference pre-injected Mantine API as a constraint filter
  - Mandatory section 12 `Architectural Conflicts & Recommendations` in every plan — explicit "None detected" required when clean
  - 🔴 BLOCK conflicts produce `STAGE 1 COMPLETE. BLOCKED` instead of normal completion — prevents Stage 2 running without human sign-off
- **`00-setup/stage23-prompt.md`** — added Approved Architectural Conflicts section; Stage 2 implements Framework Solutions for BLOCK conflicts, not the original Figma design
- **Baseline evaluation** — re-ran Stage 1 on Table and Drawer with new persona:
  - Both plans correctly populated all four conflict categories
  - Table B (Layout Paradox): identified Figma column-frame → HTML row semantics translation + double-caption limitation
  - Table D (Docs Gap): caught real defect — `Showcase` story used `render:` not `args:`, Controls panel was dead
  - Drawer A (BLOCK, self-resolved): correctly identified Mantine Drawer covers the design; no custom overlay needed
  - Drawer C: nuanced reasoning on red.6 asterisk — accepted Mantine default rather than over-engineering
  - Plan size overhead: +27% Table, +18% Drawer — reasonable for the added architectural reasoning

### Fixed
- **`Table.stories.tsx`** — `Showcase` story converted from `render:` to `args:` format (caught by Lead Architect D scan); Controls panel now works
- **`Table.stories.tsx`** — `argTypes` expanded: complex array types (`columns`, `data`, `footerData`) hidden with `table: { disable: true }`; boolean/enum/text props now have descriptions and default values

---

## [0.30.0] — 2026-04-06

### Added
- **`Drawer.stories.tsx`** — `Showcase` story using `args:` so Controls panel and docs page interactive knobs work; `argTypes` added for `position`, `size`, `withOverlay`, `withCloseButton`, `title` with control types, descriptions, and default values; `opened`/`onClose` hidden with `table: { disable: true }`

### Added (patterns)
- **Thin wrapper autodocs rule** documented in `00-setup/AGENT-CLAUDE.md` and `00-setup/stage23-prompt.md`
  - When a component prop type is `Omit<MantineFooProps, '...'>` or `extends MantineFooProps`, Storybook cannot introspect the external type — docs page is blank without intervention
  - Rule: add explicit `argTypes` for every meaningful prop + a `Showcase` story using `args:` (not bare `render:`) + hide internal props with `table: { disable: true }`
  - Applies to: Drawer, Modal, Tooltip, Popover, Menu, and any similar wrapper component
  - Will be enforced automatically from next Stage 2+3 run onwards

---

## [0.29.0] — 2026-04-06

### Added
- **`Drawer` component** — styled wrapper around Mantine's `Drawer` compound component from Figma node `74-3634`
  - Pre-configures `position="right"`, `size={400}`, `shadow="md"`, `padding="md"` matching Figma design tokens
  - All Mantine `DrawerProps` forwarded via `...rest` for full configurability
  - Styles applied exclusively via `classNames` targeting portal elements (`.header`, `.title`, `.body`, `.content`, `.close`) — no `.root` CSS variables, avoiding portal scope issue
  - WCAG fix: footer gray text promoted from gray.6 (3.15:1 ❌) to gray.7 (7.45:1 ✅)
  - 6 stories: Open, Default, Positions, NoHeader, NoOverlay, WithScrollContent
  - 9/9 Playwright tests passing; 7/7 quality gates passing
  - Serves as **baseline for "Lead Architect" persona experiment** — clean design with no architectural conflicts flagged (Figma design maps directly to Mantine idioms)

---

## [0.28.0] — 2026-04-06

### Added
- **`Table` component** — data-driven sortable table from Figma node `83-1773`
  - Props: `columns`, `data`, `footerData`, `striped`, `highlightOnHover`, `withTableBorder`, `withColumnBorders`, `withRowBorders`, `caption`, `captionSide`, `minWidth`
  - Client-side sort cycling (`null → asc → desc → null`) with `localeCompare` / numeric comparison
  - `Table.ScrollContainer` with `type="native"` for horizontal scroll on small viewports
  - 7 stories: Default, WithBorders, Striped, HighlightOnHover, Sortable, WithFooter, AllFeatures
  - 12/12 Playwright tests passing
  - 8/8 quality gates passing

### Fixed
- **`scripts/quality-gate.sh`** — Gate 7 (Size Variant Coverage) false positive: tightened grep from bare `size` to `size\??\s*:\s*MantineSize` so tabler icon `size` props no longer trigger the check
- **`scripts/quality-gate.sh`** — Gate 11 (Portal CSS Variable Scope) false positive: portal-rendering component check now greps only the `from '@mantine/core'` import line, so `IconSelector` from `@tabler/icons-react` no longer triggers the warning

---

## [0.27.0] — 2026-04-06

### Changed
- **`00-setup/AGENT-CLAUDE.md`** — new lean agent context file (~60% of CLAUDE.md, est. 2,000–3,000 tokens saved per run)
  - Strips three human-facing sections: Batch Workflow, Generated Components table, Session Transcripts
  - Retains all agent-relevant content: Directory Structure, Default Workflow, Figma MCP, Tech Stack, Storybook Config, Component Patterns, Silent Failure Patterns, CSS Rules, Playwright Spec Patterns, Quality Gates
  - Default Workflow section rewritten for agent context (no "read CLAUDE.md" self-reference)
- **`scripts/dispatch-agent.sh`** — `CLAUDE_MD` variable updated to point at `AGENT-CLAUDE.md` instead of `CLAUDE.md`
- **`scripts/quality-gate.sh`** — output rewritten to machine-readable one-line-per-gate format
  - Each gate: single `✅ PASS / ❌ FAIL / ⚠️ WARN / ⏭️ SKIP / ➖ N/A` line with gate number and name
  - Failure details still printed inline (agent needs them to fix), but success cases produce no additional output
  - Summary line: `Result: N PASS  N FAIL  N WARN  (of N gates)`
  - Est. 1,000–2,000 tokens saved per Stage 3 run (halves gate output volume)
  - Fixed `set -e` + `((VAR++))` arithmetic interaction (post-increment of 0 returned exit code 1; replaced with `VAR=$((VAR+1))`)
- **Points 2–4 audit**: Point 3 (remove redundant inline rules from dispatch heredoc) confirmed already resolved by the Point 1 rewrite — the old monolithic heredoc that contained inline colour-contrast and pointer-events rules was replaced with clean `$(cat ...)` injections; no duplicate rules exist in the stage prompt files

---

## [0.26.0] — 2026-04-06

### Changed
- **Two-invocation architecture** — Stage 1 (Plan) and Stage 2+3 (Act + Reflect) now run as separate `claude --print` invocations with fresh context windows
  - Stage 1 invocation: `--mcp-config` set (Figma MCP access), outputs `<STAGE1_PLAN>` XML block, exits
  - Stage 2+3 invocation: no `--mcp-config`, receives approved plan injected via heredoc — no Stage 1 conversation history, no Figma MCP calls
  - Estimated 40–60% reduction in Stage 2+3 input tokens (eliminates multi-turn context compounding)
- **`scripts/dispatch-agent.sh`** — complete rewrite for two-invocation flow
  - New flags: `--plan-only` (Stage 1 only, no interactive gate — for batch use), `--stage2` (Stage 2+3 with auto-discovered plan), `--plan=PATH` (Stage 2+3 with explicit plan file)
  - `run_stage1()` → `extract_plan_from_log()` → `show_approval_gate()` → `run_stage23()` pipeline
  - Truncation detection: aborts if `<STAGE1_PLAN>` opens but `</STAGE1_PLAN>` never closes
  - Plan file written to `logs/plan-<Component>-<timestamp>.md` with metadata header
  - Stage 1 log: `generate-<Component>-<timestamp>.log`; Stage 2+3 log: `generate-<Component>-<timestamp>-stage23.log`
  - All context files (CLAUDE.md, stage prompts, style guide, Mantine API section) inlined via `$(cat ...)` — agent receives everything in one heredoc, no file-reading tool calls needed
- **`scripts/batch-generate.sh`** — rewritten as Stage 1 batch launcher only
  - Launches all Stage 1 agents in parallel using `--plan-only` (non-interactive, batch-safe)
  - Waits for all to complete, then prints a review summary: plan file path + `--stage2` approve command for each component
  - Stage 2+3 is never launched by batch — always approved per-component after plan review
- **`00-setup/stage1-prompt.md`** — new file; contains Stage 1 workflow (variant discovery, size variants, dependency audit) and enforces `<STAGE1_PLAN>` output format with explicit "Do NOT generate code files" gate
- **`00-setup/stage23-prompt.md`** — new file; opens with `CRITICAL: No Figma MCP calls` guard; contains Stage 2 artifact specs and all 11 Stage 3 quality-gate checks
- **`CLAUDE.md`** — Batch Workflow section rewritten to reflect two-invocation architecture, new log naming, and `--stage2` approve flow; Figma MCP section updated to clarify MCP access is Stage 1 only

---

## [0.25.0] — 2026-04-06

### Changed
- **`00-setup/skills/` removed** — `mantine-component-generator`, `quality-gate-orchestrator`, and `figma-token-mapper` SKILL.md files moved to `docs/skills/`
  - These were never wired into Claude Code's plugin system and were not being called by anything
  - The actual workflow is driven by `dispatch-agent.sh`, `golden-prompt.md`, `CLAUDE.md`, and `scripts/quality-gate.sh`
  - Kept as reference/onboarding material in `docs/` rather than deleted
- **`CLAUDE.md`** — directory structure updated to reflect `docs/skills/` location and clarify these are documentation only

---

## [0.24.0] — 2026-04-06

### Changed
- **`mantine-llms.txt` is no longer a committed asset** — it is now a runtime cache, auto-fetched from `https://mantine.dev/llms-full.txt` at the start of every `dispatch-agent.sh` run
  - ETag cached in `00-setup/.mantine-llms-etag` — re-downloads only when Mantine ships new docs; 304 (no-op) on subsequent runs
  - Both files added to `.gitignore`
  - Four explicit states: 200 (updated), 304 (unchanged), fetch-fail + cache exists (warn + continue), fetch-fail + no cache (hard abort with recovery command)
  - No committed baseline fallback — hard abort on a fresh clone with no network is intentional; fails loudly with a one-liner fix rather than silently generating against missing docs
- **`dispatch-agent.sh` — Mantine API section injected verbatim into agent prompt**
  - Before spawning the agent, the script extracts the `### ComponentName` section from `mantine-llms.txt` using `awk`/`sed` and injects it directly into the heredoc
  - The agent receives the exact props table, CSS variables, and data attributes — it cannot skip or truncate the file read
  - Dispatch log now prints the extracted line range: `Mantine API section: ### Badge (lines 3636–3785)`
- **`00-setup/golden-prompt.md`** — updated to note that `mantine-llms.txt` is always fresh and the relevant section is pre-injected; agents should not re-read the full file
- **`CLAUDE.md`** — directory listing updated to reflect `mantine-llms.txt` is a runtime cache

---

## [0.23.0] — 2026-04-06

### Fixed
- **`Select.spec.ts`** — replaced all `input[role="combobox"]` locators with `.mantine-Select-input`; Mantine v7's Combobox-based Select renders `aria-haspopup="listbox"` on the input, not `role="combobox"`
- **`Select.spec.ts`** — replaced bare `[data-size]` selector with `.mantine-Select-root[data-size]`; Mantine sets `data-size` on the root, wrapper, chevron SVG, and label — bare `.nth()` indices were off by 4×
- **`playwright.config.ts`** — added `testIgnore: ['02-generated/_archive/**']`; archived specs were polluting the test run (18 extra failures)

### Docs
- **`CLAUDE.md`** — added two new Silent Failure Patterns rows:
  - `[data-size]` bare selector matching multiple Mantine internals
  - `input[role="combobox"]` not valid for Mantine v7 Select
- **`CLAUDE.md`** — added "Archive exclusion" example to Playwright Spec Patterns section

---

## [0.22.0] — 2026-04-05

### Added
- **Full regeneration of Badge, Checkbox, and Select** via batch agent workflow (Stage 1 plan → human approval → Stage 2+3)
  - **Badge**: now wraps native `MantineBadge` via Styles API, gaining `circle`, `radius`, `gradient`, `autoContrast` for free; 7 variants; 21 Playwright tests
  - **Checkbox**: thin wrapper with full prop coverage (`labelPosition`, `variant`, `iconColor`, `radius`, `indeterminate`); 9 stories; 13 Playwright tests
  - **Select**: fixes `[data-combobox-selected]` attribute names; correct WCAG tokens; no `pointer-events: none` on section; portal-safe CSS; 16 Playwright tests

### Fixed
- **`Select.spec.ts`** — all `input[role="combobox"]` locators replaced with `.mantine-Select-input`; Mantine v7's Combobox-based Select does not set `role="combobox"` on the input
- **`Select.spec.ts`** — `[data-size]` selector replaced with `.mantine-Select-root[data-size]`; Mantine sets `data-size` on 4+ internal elements per instance, making bare `[data-size].nth()` indices unreliable
- **`playwright.config.ts`** — added `testIgnore: ['02-generated/_archive/**']` to prevent archived specs from running in CI

### Docs
- **`CLAUDE.md`** — added three new Silent Failure Patterns:
  - `[data-size]` matching multiple Mantine internals → use `.mantine-<Component>-root[data-size]`
  - `input[role="combobox"]` not valid for Mantine v7 Select → use `.mantine-Select-input`
  - Archive folder leaking into Playwright run → add `testIgnore` in config
- **`CLAUDE.md`** — added "Archive exclusion" note to Playwright Spec Patterns section

---

## [0.21.0] — 2026-04-05

### Fixed
- **6 WCAG AA `color-contrast` violations across Badge, Checkbox, and Select**
  - `Checkbox.module.css` `.description`: `gray-6` (3.15:1) → `gray-7` (7.45:1) ✅
  - `Checkbox.module.css` `.error`: `--mantine-color-error` (red.6, ~3.5:1) → `red-9` (5.12:1) ✅
  - `Select.module.css` `.description`: `--mantine-color-dimmed` (gray.6, 3.15:1) → `gray-7` (7.45:1) ✅
  - `Select.module.css` `.error`: `red-filled` (red.6) → `red-9` (5.12:1) ✅
  - `Select.module.css` `.input[data-error]` text color: `red-filled` (red.6) → `red-9` (5.12:1) ✅
  - `Badge.stories.tsx` `WithRightSection`: `color="green"` light variant (green.9 = 4.37:1) → `color="teal"` (teal.9 = 4.53:1) ✅
- Added to `CLAUDE.md`: `--mantine-color-error`, `--mantine-color-red-filled`, and `--mantine-color-dimmed` are all low-contrast tokens that must never be used directly for text; documented safe replacements

---

## [0.20.0] — 2026-04-05

### Fixed
- **`Select` — clearable [X] button not responding to clicks**
  - `pointer-events: none` was set on the `.section` class, which Mantine shares between the decorative chevron and the interactive clear button
  - Removed `pointer-events: none` from `.section`; the clear button now fires correctly
  - Added gotcha to CLAUDE.md Silent Failure Patterns: never set `pointer-events: none` on a shared Mantine slot class

---

## [0.19.0] — 2026-04-05

### Added
- **`quality-gate.sh` — Check 10: Visual Snapshot Baseline**
  - Inspects spec file for `screenshot` or `toHaveScreenshot` assertion
  - WARN (not FAIL) if absent, with a ready-to-paste code snippet
  - Motivation: a misspelled `var()` token (e.g. `--mantine-color-bue-8`) resolves to `initial` (transparent), passes Token Compliance (valid CSS syntax), and passes all 9 prior gates — a screenshot baseline is the only automated gate that catches this class of silent failure
- **`quality-gate.sh` — Check 11: Portal CSS Variable Scope**
  - Uses `awk` to extract component-specific CSS variables (`--componentname-*`) defined inside the `.root` block and variables referenced inside portal class blocks (`.dropdown`, `.option`, `.panel`, `.popover`, `.listbox`, `.tooltip`, `.overlay`, `.menu`)
  - FAIL if any variable appears in both sets — it is defined only in `.root` but used in a portal class where the cascade cannot reach it
  - WARN if the component wraps a portal-rendering Mantine input (Select, Combobox, etc.) but no portal CSS classes are found — prompts manual verification
  - Reports affected variable names and three fix options: use a concrete `var(--mantine-*)` token, hoist to `:root`, or use Mantine's `vars` prop
- **`golden-prompt.md` — Stage 2 spec bullet:** `toHaveScreenshot` requirement added to `[ComponentName].spec.ts` generation checklist, with example code and `--update-snapshots` note
- **`golden-prompt.md` — Stage 3 Check 10:** Visual Snapshot Baseline — run `--grep screenshot` Playwright test; document why screenshots catch token typos that syntax checks miss
- **`golden-prompt.md` — Stage 3 Check 11:** Portal CSS Variable Scope — points to `quality-gate.sh`; explains Mantine portal DOM architecture and three fix strategies
- **`golden-prompt.md` — Failure Recovery:** entries for Visual Snapshot (inspect diff image, update baseline if intentional) and Portal CSS Scope (per-variable fix options)
- **`golden-prompt.md` — Exit Condition:** two new lines in the automated-checks summary (`Visual Snapshot`, `Portal Scope`)
- **`quality-gate.sh`** header updated: 9 → 11 automated quality checks

---

## [0.18.0] — 2026-04-03

### Docs
- **`CLAUDE.md` — 2 new Silent Failure Patterns:**
  - `data-active` value — Mantine v7 sets `data-active="true"` (string), not `data-active=""` (present/empty); `toHaveAttribute('data-active', '')` silently fails
  - Sizes story duplicate `landmark-unique` — multiple instances with shared item labels produce duplicate `role="region"` accessible names; fix with a `sizeItems(prefix)` helper
- **`CLAUDE.md` — 3 new Playwright Spec Patterns:**
  - Multi-instance axe scoping — when a story has multiple component instances (e.g. Sizes), scope cannot be a single root; use `.disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])` and scan the full page
  - `page.evaluate()` requires `waitFor()` first — DOM queries return `null` if the component hasn't mounted; always await a stable locator before calling `evaluate()`
  - `getBoundingClientRect()` vs `compareDocumentPosition` — Mantine sometimes renders elements in a DOM order that differs from their visual position (e.g. Accordion chevron is always first in DOM; `chevronPosition` is CSS flex); use bounding rect comparisons to test visual layout
- **`CLAUDE.md` — Generated Components table:** Accordion row added (14/14 tests passing)
- **`style_guide.md` — 3 new Silent Failure Patterns** (numbered 5–7): `data-active` string value, DOM order vs visual order, Sizes story `landmark-unique`
- **`golden-prompt.md` — Stage 2 Sizes story bullet:** warning that panel-bearing components (those with `role="region"`) must use `sizeItems(prefix)` to give each size instance unique labels
- **`golden-prompt.md` — Stage 3 check 8:** added `landmark-unique` axe verification step for components that render `role="region"` landmarks

---

## [0.17.0] — 2026-04-03

### Fixed
- **`Accordion` Sizes story — duplicate `landmark-unique` axe violation** — The `Sizes` story rendered 5 `Accordion` instances all with `defaultValue="item-1"`, producing 5 visible `role="region"` landmarks each labelled "What is Mantine?". Axe flags this as a moderate `landmark-unique` violation ("Landmarks should have a unique role or role/label/title"). Fixed by introducing a `sizeItems(prefix)` helper that prepends the size token (`xs —`, `sm —`, etc.) to each item label, giving all 15 region names a unique accessible name across the page.
- **Regression guard added** — New Playwright test 14: `has no accessibility violations on sizes story (unique landmark names)` loads `sizes` story in Chromium, runs axe with Storybook iframe false-positive rules disabled (`landmark-one-main`, `page-has-heading-one`, `region`), and asserts zero violations. Will catch any future reintroduction of duplicate landmark names.
- Accordion spec: **14/14 tests passing** (was 13)

---

## [0.16.0] — 2026-04-03

### Added
- **`Accordion` component** generated from Figma node `74:5020`
  - `Accordion.tsx` — Mantine `Accordion` base with Styles API (`classNames`) on all slots (`root`, `item`, `control`, `chevron`, `label`, `panel`, `content`); data-driven API via `items: AccordionItem[]`; `size`, `variant` (`default`|`contained`|`filled`|`separated`), `chevronPosition` (`left`|`right`), and `defaultValue` props; `data-size={size}` on the Mantine root for CSS cascade
  - `Accordion.module.css` — `xs`→`xl` size scale via custom property cascade (`--acc-control-height`, `--acc-fz`, `--acc-padding-x`); defaults declared before `[data-size]` selectors; `@mixin hover` on control; `light-dark()` throughout; `rem()` borders; zero hardcoded values
  - `Accordion.stories.tsx` — 6 stories: Default, AllClosed, ChevronLeft, Contained, Showcase, Sizes
  - `Accordion.spec.ts` — 13 Playwright tests: item count, collapsed state, open-by-default, click-to-open, click-to-close, `data-size` default, chevron right position (bounding rect), chevron left position (bounding rect), panel content visibility, 3× axe accessibility checks

### Fixed
- **Chevron position tests** — `compareDocumentPosition` DOM-order approach fails because Mantine always renders the chevron element first in the DOM regardless of `chevronPosition`; visual placement is via CSS flexbox. Replaced with `getBoundingClientRect()` comparison (`chevronLeft > labelLeft` for right, `chevronLeft < labelLeft` for left). Added `.mantine-Accordion-root` `waitFor()` before evaluate to prevent null selectors on page load.
- **`data-active` assertion** — Mantine v7 sets `data-active="true"` (string value) on the open `Accordion.Item`, not `data-active=""` (empty/present). Updated `toHaveAttribute('data-active', '')` → `toHaveAttribute('data-active', 'true')`.

---

## [0.15.0] — 2026-04-02

### Added
- **`Textarea` — `caption` prop** (boolean-equivalent `ReactNode`), matching the Figma `.Error` component's `Caption` property
  - Renders as a `<p class="caption">` sibling **after** the Mantine root div, below the error message — matching Figma's `.Error` component structure
  - `WithCaption` story added; `caption` argType added to Storybook controls; Showcase updated
  - 2 new Playwright tests: DOM position check (caption follows textarea via `compareDocumentPosition`) and "does not render when omitted"
  - 9 → 11 tests, all passing

### Fixed
- **Caption positioned above error (wrong)** — initial implementation used `inputContainer` to inject caption between the textarea and Mantine's error slot; corrected to a sibling div wrapper so caption renders after the full Mantine component, per Figma's `.Error` component structure
- **`WithCaptionAndError` story removed** — redundant; caption+error combination is exercised in the spec and visible via the `ErrorState` + `WithCaption` stories

### Docs
- `golden-prompt.md` — Added **Variant Discovery** pre-check (runs before Complexity check):
  - Calls `get_metadata` on the provided node to detect Component Set vs single Component
  - Calls `get_design_context` individually per variant child node — one targeted call each
  - Full variant table (property names, values, node IDs) added as item 1 of the Stage 1 brief
  - Prevents missing variants (e.g. `filled`, `unstyled`, `error`) that are invisible when only the default node is inspected

---

## [0.14.0] — 2026-04-02

### Docs
- **`golden-prompt.md` — Size Variants pre-check** baked into all three stages:
  - Stage 1: new "Pre-check: Size Variants" block — asks whether the component wraps a Mantine input or renders scalable text; if yes, lists exactly what to plan (`size` prop, `data-size` attribute, CSS cascade, `Sizes` story, `data-size` spec test)
  - Stage 2: each artifact bullet extended with a conditional "if size variants in scope" requirement — TSX prop + attribute + input passthrough, CSS custom property cascade pattern, stories `tags: ['autodocs']` made explicit, spec `data-size` assertion
  - Stage 3: new check 8 "Size Variants" (conditional/N/A) — `preview_snapshot` the `Sizes` story; verify `data-size` Playwright test passes
  - Exit condition: new `✅ Size Variants: PASS … or N/A` line
- **`CLAUDE.md` — "Size variants — when to add" section** added to Component Patterns:
  - Decision rule: add `size` when wrapping a Mantine input or rendering scalable text
  - Full implementation checklist table: prop → root `data-size` attribute → input passthrough → `iconSizes` lookup → CSS custom props → `Sizes` story → spec assertion
  - Complete CSS pattern showing `--comp-fz`/`--comp-lh` custom property cascade from `.root` to descendant, with defaults declared before nested `[data-size]` selectors

---

## [0.13.0] — 2026-04-02

### Added
- **`PasswordStrength` component** generated from Mantine source code (first code-first component, no Figma link)
  - `PasswordStrength.tsx` — `PasswordInput` + 4-segment `Progress` strength meter + `PasswordRequirement` sub-component; controlled/uncontrolled via optional `value`/`onChange`; requirements hidden until user starts typing
  - `PasswordStrength.module.css` — `data-meets` CSS attribute selector for teal/red requirement colours; `transition: none` on Progress section for instant visual feedback; all spacing via `rem()` and `var(--mantine-spacing-*)`
  - `PasswordStrength.stories.tsx` — 5 stories: Default, Weak, Moderate, Strong, Showcase
  - `PasswordStrength.spec.ts` — 11 Playwright tests: render, hidden requirements, typing trigger, 5-item count, weak/moderate/strong `data-strength`, all-met requirements, unmet attribute absence, 2× axe checks

### Fixed
- **`teal.7` contrast failure** — `#0ca678` on white scores 3.11:1, failing WCAG AA. Promoted to `var(--mantine-color-teal-9)` (#087f5b → 4.53:1) for the "met" requirement colour
- **`red.7` contrast failure** — `#f03e3e` on white scores 3.84:1, failing WCAG AA. Promoted to `var(--mantine-color-red-9)` (#c92a2a → 5.12:1) for the "unmet" requirement colour; axe test added for the weak state to catch this class of failure in future
- **Duplicate React instance** — `useInputState` from `@mantine/hooks` resolved to a separate Vite pre-bundle chunk causing `Cannot read properties of null (reading 'useState')`; replaced with plain `useState` from React

---

## [0.12.0] — 2026-04-02

### Added
- **`DragList` — `cards` and `table` variants** (Figma node `6423-127793`, file `F6rpqNSNbjW7SgoSRHPGh2`)
  - `variant` prop extended: `'with-handle' | 'cards' | 'table'`
  - **`cards`** — whole row is the drag activator (`PointerSensor` on card root), no grip icon, `padding-inline: rem(32px)`
  - **`table`** — columnar layout (`Position / Name / Symbol / Mass`) with a fixed-width header row, bottom-border dividers, Y-axis-only row transform, 16px grip icon per row
  - Data model updated: `description: string` → `position: number; mass: number` (enables table columns; description string computed inline for card variants)
  - `DragList.stories.tsx` updated: `Cards`, `Table`, and `Showcase` stories added; `ELEMENTS` array updated to the new data shape
  - `DragList.spec.ts` expanded from 8 → 16 tests across three `describe` blocks (with-handle, cards, table); all tests use pointer drag

### Fixed
- **`aria-prohibited-attr` axe violation** — empty table header grip `<div>` had `aria-label="Reorder"` which is not permitted on a plain `div` with no role; removed (individual handle `<span>` elements retain their own `aria-label="Drag to reorder"`)

---

## [0.11.0] — 2026-04-02

### Added
- **`DragList` component** generated from Figma node `60:339`
  - `DragList.tsx` — `DndContext` + `SortableContext` wrapper with inline `SortableItemRow` and `ItemRow` sub-components; drag handle via `IconGripVertical`; `DragOverlay` renders active item clone with shadow; `onChange` callback fires on drop
  - `DragList.module.css` — `light-dark()` for bg/border/text, `rem()` throughout, `[data-dragging]` opacity 0.4, `[data-overlay]` box-shadow + grabbing cursor, `touch-action: none` on handle
  - `DragList.stories.tsx` — 3 stories: Default, SingleItem, Showcase; periodic-table element sample data
  - `DragList.spec.ts` — 8 Playwright tests: render count, drag handles, content, keyboard focus, pointer drag reorder, single-item, and 2× axe accessibility checks
- **`@dnd-kit/core` ^6.3.1** and **`@dnd-kit/sortable` ^10.0.0** installed (12M+/week each, Claudéric Demers)

### Fixed
- **`.claude/launch.json` — Storybook command** updated to use Herd's node path (`/Users/alexwood/Library/Application Support/Herd/config/nvm/versions/node/v24.13.1/bin`) so `preview_start "Storybook"` can find Node.js 24 without a login shell
- **Description color contrast** — Figma's `--text/dimmed` (`#868e96`, gray.6) scores 3.15:1 on gray.0, failing WCAG AA at 14px. Promoted to `var(--mantine-color-gray-7)` (7.45:1), consistent with the blue.6→blue.8 and Textarea gray.7 precedents

---

## [0.11.0] — 2026-04-01

### Docs
- `golden-prompt.md` — Added **Variant Discovery** pre-check to Stage 1 (runs before Complexity check):
  - Calls `get_metadata` on the provided node to determine if it is a Component Set or single Component
  - If Component Set: iterates child variant node IDs, calls `get_design_context` on each individually to build a complete variant matrix
  - If single Component: asks whether a parent Component Set exists before proceeding
  - All discovered variants documented in a new **Variants** section (item 1) of the Stage 1 brief, with property names, values, and node IDs
  - Prevents missing variants (e.g. `filled`, `unstyled`, `error`) that are invisible when only a single node is inspected

---

## [0.10.0] — 2026-04-01

### Docs
- `golden-prompt.md` — Added **Dependency Audit** pre-check to Stage 1 with supply chain hardening:
  - Identifies any non-Mantine imports the component will need before any code is written
  - Runs `npm ls <package>` for each candidate; lists missing packages as ⚠️
  - For each missing package, fetches npm registry metadata (weekly downloads, last publish date, publisher) and surfaces a risk signal: ✅ Established (>100k/week) | ⚠️ Low traffic | 🚨 New/unknown
  - Waits for human approval of all missing packages before installing
  - Installs with `--ignore-scripts` to block lifecycle script execution (supply chain attack vector)
  - Runs `npm audit` immediately after install; surfaces any CVEs and waits for approval before continuing
  - Prevents silent Vite/Storybook compile failures caused by unresolved imports
  - Exit condition summary updated with `✅ Dependencies` line

---

## [0.9.0] — 2026-04-01

### Added
- **`Textarea` component** generated from Figma node `58:1977`
  - `Textarea.tsx` — Mantine `Textarea` base with Styles API (`classNames`) mapping all slots
  - `Textarea.module.css` — Full `xs`→`xl` size scale via custom property cascade, `light-dark()` for background/text, `rem()` throughout, focus/error/disabled states
  - `Textarea.stories.tsx` — 5 stories: Default, ErrorState, Disabled, Showcase, Sizes
  - `Textarea.spec.ts` — 9 Playwright tests covering render, input, error styles, disabled, font size, and 3× axe accessibility checks
- `.claude/settings.json` — Project-level Claude Code settings; `PreToolUse` hook on `preview_start` kills any existing process on port 6006 so the preview server can always adopt Storybook cleanly

### Fixed
- **Description color contrast** — Figma's `--text/dimmed` (`#868e96`, gray-6) scores 3.32:1 on white, failing WCAG AA at 14px. Promoted to `var(--mantine-color-gray-7)` (7.09:1), consistent with the blue.6→blue.8 precedent
- **Error element selector** — Mantine v7 renders the error as `<p class="mantine-Textarea-error">` with no `role="alert"`; spec updated to use `.mantine-Textarea-error`
- **Red filled token with `primaryShade: 8`** — `--mantine-color-red-filled` resolves to red.8 (`rgb(224, 49, 49)`) not red.6 (`rgb(250, 82, 82)`) when `primaryShade: 8` is set in MantineProvider

---

## [0.8.0] — 2026-03-31

### Docs
- `style_guide.md` — Added "Silent Failure Patterns" section covering four known gotchas: misspelled `var()` tokens, `@mixin` outside PostCSS scope, `data-*` boolean vs string attribute handling, and `tags: ['autodocs']` skeleton elements
- `CLAUDE.md` — Added "Silent Failure Patterns" quick-reference table

---

## [0.7.0] — 2026-03-31

### Fixed
- **Button font size not scaling with size prop** — `--button-fz: rem(16px)` was declared after the nested `[data-size]` selectors in `Button.module.css`. PostCSS compiles nesting to same-specificity rules, so the later root-level declaration silently overwrote every size-specific font size. Fixed by moving the default (`var(--mantine-font-size-md)`) before the nested selectors and removing the stale `rem(16px)` declaration. Applied to both `02-generated/Button` and `01-golden-examples/Button`.

### Docs
- `style_guide.md` — Added "Sizing System — Custom Property Cascade Ordering" section with correct/incorrect examples
- `CLAUDE.md` — Added same cascade ordering rule to the Sizing system section

---

## [0.6.0] — 2026-03-31

### Added
- `CLAUDE.md` — project-level persistent memory file loaded automatically at the start of every Claude Code session; covers directory structure, workflow, tech stack, component patterns, CSS rules, Playwright spec patterns, and component tracker

---

## [0.5.0] — 2026-03-31

### Fixed
- **Playwright strict mode violation** — All 12 generated Button spec tests were failing because `page.locator('button')` matched Storybook's hidden skeleton `<button>Set string</button>` elements (always present in `iframe.html` DOM as loading placeholders). Fixed by switching to `page.locator('button:visible')` throughout all Playwright locators.
- **Story URL helper** — Replaced `BASE_URL` constant + string concatenation with a `story(name)` helper function so `&viewMode=story` is correctly placed after the story slug, not before it.

### Docs
- `style_guide.md` — Added "Playwright Locators in Storybook" section with `button:visible` rule, axe exception, and story URL helper pattern.

---

## [0.4.0] — 2026-03-31

### Added
- `@storybook/addon-a11y` — Accessibility panel in Storybook with live axe-core checks
- `@axe-core/playwright` — Programmatic accessibility gate in all Playwright specs
- `checkA11y()` tests added to golden specs: Button, Card, TextInput
- `checkA11y()` tests added to generated Button spec
- Axe checks scoped to component root (`.include()`) to exclude Storybook iframe false positives

### Fixed
- **WCAG 2 AA contrast violation** — Primary color updated from `blue.6` (#228be6, 3.55:1) to `blue.8` (#1971c2, 4.63:1)
- `primaryShade: 8` set in `.storybook/preview.tsx` MantineProvider theme
- `color-contrast` axe rule re-enabled in Button specs after contrast fix

---

## [0.3.0] — 2026-03-31

### Added
- `size` prop (`xs` | `sm` | `md` | `lg` | `xl`) across all golden examples: Button, Card, TextInput
- `[data-size]` CSS selectors in all golden CSS modules activating size-specific custom properties
- `Sizes` showcase story added to all golden and generated story files
- `size` argType added to all Storybook controls

### Fixed
- **Loader centering bug** — `.loader` class was missing `transform: translate(-50%, -50%)`, causing spinner to appear offset. Fixed in generated `Button.module.css` and golden `Button.module.css`

### Docs
- `style_guide.md` — Added "Absolute Centering" rule with correct/incorrect examples

---

## [0.2.0] — 2026-03-30

### Added
- Generated `Button` component from Figma node `41:492`
  - `Button.tsx` — `UnstyledButton` base, `leftIcon`/`rightIcon` boolean props, `IconPlus` from `@tabler/icons-react`
  - `Button.module.css` — Full size scale, hover/disabled/loading/outline states, zero hardcoded values
  - `Button.stories.tsx` — 8 stories: Default, Outline, WithLeftIcon, WithRightIcon, WithBothIcons, Loading, Disabled, Showcase
  - `Button.spec.ts` — 10 Playwright tests covering all interaction states
- `03-figma-links/components.md` tracker created, Button row added
- `golden-prompt.md` — Stage 3 extended with checks 6 (Storybook) and 7 (Playwright); Next Steps collapsed to single line

---

## [0.1.0] — 2026-03-30

### Added
- `package.json` — React 18, Mantine 7, Storybook 8, Playwright, TypeScript, Vite
- `tsconfig.json` — React JSX, ESNext, bundler module resolution
- `postcss.config.cjs` — `postcss-preset-mantine` + breakpoint variables
- `.storybook/main.ts` — `@storybook/react-vite` framework, scans `02-generated/**/*.stories.*`
- `.storybook/preview.tsx` — Global `MantineProvider` + `styles.css` decorator
- `playwright.config.ts` — Targets `02-generated/**/*.spec.ts` against `localhost:6006`
- `.claude/launch.json` — Storybook (port 6006) and Playwright UI (port 8080) server configs
- Playwright Chromium browser installed

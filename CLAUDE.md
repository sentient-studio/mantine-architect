# Figma → Mantine Component Generation

This project auto-generates production-ready Mantine v7 components from Figma designs using a 3-stage AI workflow (Plan → Act → Reflect), validated by Storybook and Playwright.

---

## Directory Structure

```
00-setup/           — AGENT-CLAUDE.md, stage1-prompt.md, stage23-prompt.md, style_guide.md, mantine-llms.txt (runtime cache — auto-fetched from mantine.dev, gitignored)
01-golden-examples/ — canonical reference components (Button, Card, TextInput)
02-generated/       — AI-generated components (one folder per component)
03-figma-links/     — components.md tracker (Figma URL → status)
.storybook/         — Storybook config (main.js, preview.js)
playroom/           — Playroom sandbox (components.js, FrameComponent.jsx)
scripts/            — dispatch-agent.sh, batch-generate.sh, quality-gate.sh, validate-batch.sh,
                      figma-pushback.sh, test-figma-pushback.sh, test-playroom-helpers.sh
mantine-architect-mcp/ — MCP server wrapping dispatch-agent.sh (Claude Desktop integration)
  src/index.ts      — stdio MCP server entry point (v1.1.0)
  src/runner.ts     — job manager: spawns dispatch-agent.sh, persists state, plan cache, llms freshness
  src/tools.ts      — 5 MCP tool definitions: mantine_plan, mantine_generate, mantine_status,
                      mantine_get_plan, mantine_get_files
  dist/             — compiled JS (gitignored, run `npm run build`)
logs/               — per-run logs and plan files; mcp-jobs.json (MCP server job state)
components.txt      — batch input file (ComponentName,FigmaURL per line)
playwright.config.ts
postcss.config.cjs
CHANGELOG.md
CLAUDE.md
```

Each generated component lives at `02-generated/<Name>/` and contains:
- `<Name>.tsx`
- `<Name>.module.css`
- `<Name>.stories.tsx`
- `<Name>.spec.ts`

---

## Default Workflow

When generating components:
1. Read this file (CLAUDE.md)
2. `dispatch-agent.sh` injects `AGENT-CLAUDE.md` + `stage1-prompt.md` (Stage 1) or `stage23-prompt.md` (Stage 2+3)
3. Follow 3-stage process (Plan → Act → Reflect)
4. Run all quality gates

## Figma MCP

`dispatch-agent.sh` passes `--mcp-config` **only to Stage 1**. This gives the Stage 1 agent access to:
- `get_metadata` — inspect node type, children, variant properties
- `get_design_context` — extract exact tokens (font-weight, color, spacing, radius) per node

Stage 2+3 receives the approved plan document only — no Figma MCP access. This is intentional: it prevents Stage 2+3 from re-querying Figma (wasted tokens) and keeps context lean.

Without `--mcp-config` in Stage 1, agents infer from the Mantine API docs only and produce UI drift (wrong font-weight, misaligned labels, etc.).

**Requirement:** `FIGMA_ACCESS_TOKEN` must be set in the MCP config. Rotate the token at `figma.com/settings` if it ever appears in logs.

---

## Design Pushback (Figma ↔ Code loop)

Stage 1 automatically posts architectural conflict comments back to Figma when the agent emits a `<PUSHBACK>` block. This closes the review loop so designers see BLOCK/ADAPT conflicts annotated directly on the relevant node.

**How it works:**
1. Stage 1 agent emits `<PUSHBACK>[…]</PUSHBACK>` after `<STAGE1_PLAN>` for any 🔴 or 🟡 conflict
2. `dispatch-agent.sh::run_figma_pushback()` extracts the block, then runs two Haiku utility passes:
   - **Validation** (`validate_pushback_json()`): strips items with missing fields, invalid severity (must be `BLOCK`/`ADAPT`), or invalid category (must be A–E); warns inline
   - **Prose rewrite** (`rewrite_pushback_prose()`): Haiku rewrites each `detail` field into assertive architect voice — constraint-led, active voice; falls back to original on any failure; skip with `SKIP_PUSHBACK_PROSE_REWRITE=1`
3. `figma-pushback.sh` posts a REST comment to `POST /v1/files/:key/comments` anchored to the node

**`<PUSHBACK>` block format** (emitted by Stage 1 agents):
```json
[
  {
    "node_id":  "83:1773",
    "severity": "BLOCK",
    "category": "A",
    "summary":  "One-line title (≤80 chars)",
    "detail":   "2–4 plain-text sentences — appears verbatim as Figma comment body"
  }
]
```
Rules: 🔴 BLOCK and 🟡 ADAPT only; 🔵 NOTE omitted; empty block omitted entirely.

**Conflict categories (A–E):**

| Category | Severity | Triggers |
|---|---|---|
| A — Component Cannibalization | 🔴 BLOCK | Figma designs a custom widget Mantine already covers |
| B — Layout Paradox | 🟡 ADAPT | Figma uses absolute/fixed positions that must become flow layout |
| C — Accessibility Tension | 🔵 NOTE | WCAG contrast failures, missing focus rings, tap targets |
| D — Thin Wrapper Docs Gap | 🔵 NOTE | `extends MantineXxxProps` — Storybook autodocs will be blank |
| E — Design Omissions & Visual Deviations | 🟡 ADAPT | Any Figma variant/prop/value that is changed or omitted in code |

**Severity boundary (Category E especially):**
- 🟡 ADAPT — anything the designer explicitly specified that the code does differently or omits. False positives (extra Figma notifications) are less harmful than silent deviations.
- 🔵 NOTE — informational only; nothing the designer specified is lost (e.g. choosing Box over Paper, documenting a WCAG override, noting a design-tool artefact with no production meaning).

**Idempotency:** each comment embeds `[MANTINE-ARCHITECT|<node_id>|<summary>]`; re-running Stage 1 skips comments that already exist.

**Token:** same `FIGMA_ACCESS_TOKEN` used by the MCP server. Set explicitly in env or leave unset to fall back to `claude_desktop_config.json`.

**Dry-run (testing/CI):**
```bash
FIGMA_ACCESS_TOKEN="" ./scripts/figma-pushback.sh FILE_KEY FIGMA_URL '[{...}]' --dry-run
```

**Test suite:**
```bash
./scripts/test-figma-pushback.sh   # 52 tests, 8 sections
```

---

## MCP Server (`mantine-architect-mcp`)

An MCP server that wraps `dispatch-agent.sh` so the entire Plan → Generate pipeline can be driven conversationally from Claude Desktop. The user brings their own Anthropic API key — no separate billing infrastructure required.

### Tools

| Tool | Description |
|---|---|
| `mantine_plan` | Stage 1 — queries Figma, produces architectural plan. Returns instantly on cache hit (<24 h same node-id). Pass `force=true` to bypass. |
| `mantine_generate` | Stage 2+3 — writes TSX/CSS/stories/spec. Uses `--plan=<path>` if a plan exists (skips Stage 1). |
| `mantine_status` | Poll running job — returns state, timestamps, recent log tail. |
| `mantine_get_plan` | Read the full plan markdown after `mantine_plan` completes. |
| `mantine_get_files` | Read all 4 generated files after `mantine_generate` completes. |

### Performance optimisations (v1.2.0)

| # | Optimisation | Saving |
|---|---|---|
| 1 | `mantine_generate` passes `--plan=<path>` — Stage 1 never re-runs | ~50% token reduction, ~10 min faster |
| 2 | Job state persisted to `logs/mcp-jobs.json` | Survives MCP server restarts |
| 3 | `mantine_plan` returns cached plan when < 24 h old and same node-id | Stage 1 skipped entirely on repeat calls |
| 4 | `SKIP_LLMS_REFRESH=1` set when `mantine-llms.txt` is < 6 h old | Eliminates curl round-trip |
| 5 | Stage 2+3 routed to Haiku for 0-conflict plans < 12 KB (`select_stage23_model()`) | ~60–70% token cost reduction on simple components |

### Escalation (manual escape hatch)

When the normal 3-iteration self-healing cycle fails, use `--escalate`:

```bash
./scripts/dispatch-agent.sh Modal 'https://figma.com/design/...' --escalate
```

Two steps, only advancing if the previous fails:

1. **Step 1 — Fresh Sonnet run** (`claude-sonnet-4-6`): a clean-slate Stage 2+3 invocation. Most non-deterministic failures resolve here.
2. **Step 2 — Opus run** (`claude-opus-4-5`): break-glass only. ~15× more expensive than Haiku.

If both steps fail the script prints a diagnostic block (review logs / re-plan / simplify design).

One-off model override without escalation:

```bash
./scripts/dispatch-agent.sh Modal 'https://figma.com/design/...' --model=claude-opus-4-5
```

**When to escalate vs re-plan:** Escalate when Stage 2+3 itself crashes (exit ≠ 0, tool timeout, context overflow) but the plan is sound. Re-run Stage 1 when the plan has unresolvable conflicts or the Figma design has changed.

### Setup

```bash
cd mantine-architect-mcp && npm install && npm run build
```

Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
"mantine-architect": {
  "command": "node",
  "args": ["/path/to/mantine-architect-mcp/dist/index.js"],
  "env": {
    "MANTINE_SCRIPTS_DIR": "/path/to/figma-ai-project/scripts",
    "MANTINE_WORK_DIR":    "/path/to/figma-ai-project",
    "FIGMA_ACCESS_TOKEN":  "...",
    "ANTHROPIC_API_KEY":   "..."
  }
}
```

Required env vars: `MANTINE_SCRIPTS_DIR`, `MANTINE_WORK_DIR`, `FIGMA_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`.

### Relationship to shell workflow

The MCP server and shell scripts are complementary — both call the same `dispatch-agent.sh`.
Use the MCP server for conversational single-component generation from Claude Desktop.
Use `batch-generate.sh` for parallel multi-component runs and CI.

---

## Batch Workflow

```bash
# Edit components.txt (ComponentName,FigmaURL per line)
./scripts/batch-generate.sh components.txt
```

`batch-generate.sh` is a **Stage 1 batch launcher only**. It runs Stage 1 (Plan) for all components in parallel, waits for all to finish, then prints a signal-annotated review summary.

**Stage 2+3 is never launched by batch** — always approve per-component:

```bash
# After batch completes, review each plan then run:
./scripts/dispatch-agent.sh ComponentName FigmaURL --stage2
```

**Review summary signal line** (one per component):
```
✅ Table   0🔴 1🟡 2🔵  ·  component set  ·  5 ambiguities  ·  14K
✅ Drawer  1🔴 1🟡 2🔵  ·  single node    ·  10 ambiguities · 16K  ← REVIEW REQUIRED (BLOCK conflict)
```

| Signal | Meaning |
|---|---|
| `0🔴 1🟡 2🔵` | Architectural conflict counts: BLOCK / ADAPT / NOTE |
| `component set` / `single node` | Whether the Figma node has variant children |
| `N ambiguities` | Design decisions documented in Section 9 of the plan |
| `NNK` | Plan file size in kilobytes (larger = more complex) |
| `← REVIEW REQUIRED` | Any 🔴 BLOCK — must read plan before Stage 2 |

After the overview, an **interactive review loop** prompts per component.
Prompt set varies by conflict level and generation type:

```
[1/3]  Table  0🔴 1🟡 2🔵  ·  component set  ·  5 ambiguities  ·  14K

   Launch Stage 2? [y/n/q]       ← 0🔴 new: fast path, single prompt

[2/3]  Drawer  1🔴 1🟡 2🔵  ·  single node  ·  10 ambiguities  ·  16K  ← REVIEW REQUIRED

   Open full plan? [Y/n]          ← 🔴 BLOCK: pager opens by default
   Launch Stage 2? [y/n/q]

[3/3]  Badge  0🔴 0🟡 1🔵  ·  single node  ·  3 ambiguities  ·  11K  [regen +12/-8 lines]

   View diff vs previous? [y/N]   ← regen: diff offered first
   Open full plan? [y/N]
   Launch Stage 2? [y/n/q]
```

**Prompt matrix:**

| Condition | View diff? | Open plan? | Approve? |
|---|---|---|---|
| `0🔴` new | — | — | ✅ |
| `0🔴` regen | `[y/N]` | `[y/N]` | ✅ |
| `≥1🔴` new | — | `[Y/n]` default open | ✅ |
| `≥1🔴` regen | `[y/N]` | `[Y/n]` default open | ✅ |

- `y` approves and fires Stage 2 in the background immediately
- `n` defers — the approve command is reprinted in the post-review summary
- `q` exits the loop; all remaining components auto-deferred
- Non-interactive sessions (piped/CI) skip the loop and print approve commands only

- Stage 1 agents run in parallel with `--plan-only` (no interactive gate, non-blocking)
- Each plan is saved to `logs/plan-<Component>-<timestamp>.md`
- A human must review each plan (variants, token mappings, ambiguities) before running Stage 2+3
- `--auto-approve` flag exists on `dispatch-agent.sh` but is **not used by batch** — only for single-component runs where you have pre-reviewed the Stage 1 plan

**Log files:**
- Stage 1:   `logs/generate-<Component>-<timestamp>.log`
- Plan file: `logs/plan-<Component>-<timestamp>.md`
- Stage 2+3: `logs/generate-<Component>-<timestamp>-stage23.log`

Figma URLs: both `figma.com/file/` and `figma.com/design/` formats accepted.

---

## Tech Stack

| Layer | Package | Version |
|---|---|---|
| UI library | `@mantine/core` | ^7.17.2 |
| Icons | `@tabler/icons-react` | ^3.31.0 |
| Storybook | `@storybook/react-vite` | ^8.6.12 |
| A11y addon | `@storybook/addon-a11y` | ^8.6.18 (pinned — v10 requires SB 10) |
| Testing | `@playwright/test` | ^1.51.1 |
| A11y testing | `@axe-core/playwright` | ^4.11.1 |
| CSS pipeline | `postcss-preset-mantine` + `postcss-simple-vars` | — |

**Dev servers**
- Storybook: `npm run storybook` → `http://localhost:6006`
- Playwright UI: `npm run test:playwright:ui` → `http://localhost:8080`
- Tests: `npm run test:playwright`

---

## Playroom

A standalone JSX sandbox at `http://localhost:9000` — completely separate from Storybook (no addon bridge). Start both together with `npm run dev`, or Playroom alone with `npm run playroom`.

**Design philosophy: keep them apart.**
The Storybook adapter (`storybook-addon-playroom`) was removed because the Vite↔webpack integration surface caused persistent rendering failures in both tools. Playroom is intentionally isolated: it has its own webpack dev server, its own components scope, and zero shared config with Storybook.

### Config files

| File | Purpose |
|---|---|
| `playroom.config.js` | Entry point — components, frame, widths, webpack overrides, displayName fix |
| `playroom/FrameComponent.jsx` | Wraps every frame in `<MantineProvider theme={{ primaryShade: 8 }}>` |
| `playroom/components.js` | Scope: generated components + Mantine layout primitives + story helpers + Tabler icons |

### Webpack fixes (in `playroom.config.js` only — no Storybook config changes)

**TypeScript + JSX** — Playroom's internal Babel loader uses `include: includePaths` scoped to its own source, so our `.tsx`/`.ts`/`.jsx` files (components, `FrameComponent.jsx`) receive no loader without an explicit rule. Added a `babel-loader` rule with `@babel/preset-env + @babel/preset-react (runtime: automatic) + @babel/preset-typescript`. All three presets ship with Playroom's dependencies and are resolved via `require.resolve`.

**CSS modules** — components import `.module.css` files that need PostCSS for `rem()` transforms. Added a `style-loader + css-loader (modules: true) + postcss-loader` rule for `.module.css`.

**Codemirror double-processing** — Playroom's internal webpack processes its own CSS (codemirror themes, etc.). Without a guard, our plain-CSS rule also ran on those files and errored. Fixed with `issuer: { not: /node_modules\/playroom/ }` on the plain-CSS rule — prevents it from firing for CSS imported by Playroom's own code.

**Mantine `displayName`** — all Mantine components carry `displayName: '@mantine/core/ComponentName'`, which produces invalid JSX in the code panel. Fixed via `reactElementToJSXStringOptions.displayName` in `playroom.config.js` — strips the `@scope/package/` prefix.

### Auto-registration after Stage 2+3

`dispatch-agent.sh` calls two functions after a successful Stage 2+3 run:

1. **`register_playroom_component()`** — adds `export { ComponentName } from '../02-generated/...'` to `playroom/components.js` before the Mantine layout section. Resolves the exported function name from the TSX file (handles `DataTable` for the `Table` component). Idempotent.

2. **`register_playroom_story_helpers()`** — parses the story file for top-level helpers (functions and consts that are NOT Story/StoryObj/Meta typed), adds `export` keyword if missing, adds the helper name to `excludeStories` in the meta object (so Storybook ignores it), and inserts a named re-export line into `playroom/components.js` before the Tabler icons section. Idempotent.

**Test suite:** `./scripts/test-playroom-helpers.sh` — 12 tests covering registration, idempotency, DataTable name resolution, Story-type exclusion, missing-file graceful skip, and section ordering.

### Scope in `playroom/components.js`

- Generated components (explicit named imports — one per component)
- Mantine layout/display primitives that don't collide with our components (Box, Stack, Group, Text, etc.). Components we wrap (Badge, Checkbox, Modal, Drawer, Select, MultiSelect) are intentionally omitted — use our custom versions.
- Aliased Mantine primitives: `MantineButton`, `MantineTable`, `MantineMenu`, etc.
- Story-local helpers (explicit named imports — avoids `export *` collision across story files)
- `export * from '@tabler/icons-react'`

---

## Storybook Config

- Scans `02-generated/**/*.stories.*` only
- Global `MantineProvider` with `theme={{ primaryShade: 8 }}` in `.storybook/preview.js`
- Addons: `addon-essentials`, `addon-interactions`, `addon-a11y`
- **Do NOT add per-story `MantineProvider` decorators** — they reset the theme and lose `primaryShade: 8`
- **Component description on the autodocs page** comes from the JSDoc comment on the primary exported component function in `<Name>.tsx` — without it the description area is blank. See Component Patterns → JSDoc section.

**Why `primaryShade: 8`?** `blue.6` (#228be6) fails WCAG 2 AA contrast (3.55:1). `blue.8` (#1971c2) passes at 4.63:1.

**Mantine color contrast quick-reference** (on white, normal weight 14px — must be ≥ 4.5:1):

| Color | Shade | Hex | Ratio | Pass? |
|---|---|---|---|---|
| blue | 6 | #228be6 | 3.55 | ❌ |
| blue | 8 | #1971c2 | 4.63 | ✅ |
| gray | 6 | #868e96 | 3.15 | ❌ |
| gray | 7 | #495057 | 7.45 | ✅ |
| teal | 7 | #0ca678 | 3.11 | ❌ |
| teal | 9 | #087f5b | 4.53 | ✅ |
| red | 6 | #fa5252 | ~3.5 | ❌ |
| red | 7 | #f03e3e | 3.84 | ❌ |
| red | 9 | #c92a2a | 5.12 | ✅ |
| green | 9 | #2b8a3e | 4.37 | ❌ |
| teal | 9 | #087f5b | 4.53 | ✅ |

Rule of thumb: **use shade 8–9 for semantic colours at small sizes**; shade 4–5 for dark mode equivalents.
**Green, yellow, and orange cannot reach 4.5:1 with white text at any Mantine shade** — omit from filled-variant demos or use `light`/`outline` variants instead.
**`--mantine-color-error` and `--mantine-color-red-filled` both resolve to red.6 (~3.5:1) — never use them for text**; use `light-dark(var(--mantine-color-red-9), var(--mantine-color-red-4))` instead.
**`--mantine-color-dimmed` resolves to gray.6 (3.15:1) — never use it for body text**; use `light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))` instead.

---

## Component Patterns

### JSDoc on the exported component function
Storybook autodocs renders the JSDoc comment on the primary export as the component description. Without it the docs page description is blank.

```ts
/**
 * Modal — thin wrapper around Mantine's Modal with project-standard defaults.
 *
 * Wraps MantineModal via the Styles API (classNames for content/header/title).
 * Defaults: radius="sm", shadow="xl", padding="md".
 *
 * For header-less dialogs use the compound API (Modal.Root + Modal.Content)
 * so aria-label lands on the dialog section, not the outer root div.
 *
 * WCAG AA: primaryShade:8 covers blue (4.63:1). Gray footer text must use
 * gray.7 (7.45:1); gray.6 (#868e96) fails at 3.15:1.
 */
export function Modal(...) {
```

Rules:
- **One JSDoc block per component file** — on the primary exported function only
- Do NOT add JSDoc to helper functions, sub-components, or type aliases
- Keep it 4–8 lines: what it wraps, any data-* forwarding, WCAG decisions
- **Never name a Mantine-internal prop in the JSDoc** — Storybook renders the description verbatim, so mentioning e.g. `withBorder`, `keepMounted`, `withOverlay` makes it look like a controllable prop on your component. Describe the *behaviour* instead: "zone dividers are applied natively" not "withBorder defaults apply".

### Base component (`UnstyledButton`)
```tsx
<UnstyledButton
  className={classes.root}
  data-variant={variant}
  data-size={size}
  data-loading={loading || undefined}
  data-disabled={disabled || undefined}
  disabled={disabled || loading}
>
```
- Never use Mantine's `Button` — always `UnstyledButton` + manual CSS
- Pass state as `data-*` attributes so CSS can target them
- Use `data-foo={value || undefined}` so the attribute is absent (not `"false"`) when inactive

### Sizing system
Custom property cascade via `[data-size]` selectors:
```css
.root {
  --button-height: var(--button-height-md); /* default */
  height: var(--button-height);
}
&:where([data-size='xs']) { --button-height: var(--button-height-xs); }
&:where([data-size='sm']) { --button-height: var(--button-height-sm); }
/* ... lg, xl */
```

### Sizing system — cascade ordering rule
Declare all default custom property values **before** the nested `[data-size]` selectors. PostCSS compiles nesting to same-specificity rules; a default declared after the nested selectors will always win and kill the size scale.

```css
/* ✅ CORRECT */
.root {
  --button-fz: var(--mantine-font-size-md);   /* default first */
  &:where([data-size='sm']) { --button-fz: var(--mantine-font-size-sm); }
}

/* ❌ WRONG — default after nested overrides kills the scale */
.root {
  &:where([data-size='sm']) { --button-fz: var(--mantine-font-size-sm); }
  --button-fz: rem(16px);   /* always wins */
}
```

### Size variants — when to add

Add a `size` prop whenever the component:
- wraps a Mantine input (`PasswordInput`, `TextInput`, `Select`, `Textarea`, …), **or**
- renders scalable text (labels, descriptions, requirement lists, captions)

**Implementation checklist:**

| Item | Detail |
|---|---|
| Prop | `size?: MantineSize` (default `'md'`) |
| Root attribute | `data-size={size}` on the outermost div |
| Input passthrough | `size={size}` forwarded to every Mantine input child |
| Icon sizing | `const iconSizes: Record<MantineSize, number> = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18 }` |
| CSS custom props | Declare defaults on `.root` **before** nested `[data-size]` selectors |
| Story | `Sizes` story showing all 5 sizes stacked, pre-filled with a representative value |
| Story meta | `size` argType with `select` control + options `['xs','sm','md','lg','xl']` |
| Spec | `expect(root).toHaveAttribute('data-size', 'md')` for the default |

### Radius prop

`radius` is **always independent of `size`** — shape and density are orthogonal. Add it to every button-like component; it's optional on input wrappers.

**Implementation pattern:**

```tsx
const MANTINE_SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const toRadiusVar = (r: MantineRadius): string =>
  typeof r === 'number' ? `${r}px` : MANTINE_SIZES.has(r) ? `var(--mantine-radius-${r})` : (r as string);

// In the component:
radius?: MantineRadius;
// Passed as inline style only when set (undefined → CSS fallback):
style={radius !== undefined ? { '--btn-radius': toRadiusVar(radius) } as React.CSSProperties : undefined}
data-radius={radius}
```

```css
/* CSS uses the variable with a sensible fallback */
.root { border-radius: var(--btn-radius, var(--mantine-radius-sm)); }
```

**Checklist:**

| Item | Detail |
|---|---|
| Prop | `radius?: MantineRadius` (no default — undefined defers to CSS fallback) |
| Root attribute | `data-radius={radius}` (absent when undefined, so CSS fallback kicks in) |
| Inline style | `--btn-radius` / `--button-radius` only set when `radius !== undefined` |
| CSS variable | `var(--btn-radius, var(--mantine-radius-sm))` on `.root` |
| Story | `Radii` story showing xs / sm / md / lg / xl / 0 stacked |
| Story meta | `radius` argType with `select` control + `table.type.summary: 'MantineRadius'` |
| Spec | `expect(trigger).not.toHaveAttribute('data-radius')` when prop unset; attribute value test for a named size |

### Hover, dark mode
```css
@mixin hover { background-color: var(--mantine-color-blue-9); }
@mixin where-dark { color: var(--mantine-color-white); }
```

### Absolute centering (loaders)
```css
/* ✅ CORRECT */
.loader { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
/* ❌ WRONG — element appears in wrong quadrant */
.loader { position: absolute; left: 50%; top: 50%; }
```

---

## Silent Failure Patterns

These produce no errors — the only signal is a broken visual or wrong value.

| Pattern | Symptom | Rule |
|---|---|---|
| Misspelled `var(--mantine-*)` token | Property falls back to `initial` (transparent/0) | Cross-check token names; Stage 3 visual catches it |
| `@mixin` outside PostCSS scope | Hover/dark styles silently absent | Only use `@mixin` in `.module.css` files processed by Vite |
| `data-*` boolean vs string | CSS selector fails to match | Use `value \|\| undefined` for booleans; pass string props directly |
| `tags: ['autodocs']` in story meta | Hidden skeleton `<button>Set string</button>` elements in DOM | Always use `button:visible` in Playwright locators |
| Mantine `data-active` value | `toHaveAttribute('data-active', '')` fails — Mantine sets `"true"` not `""` | Assert `toHaveAttribute('data-active', 'true')` |
| Sizes story duplicate landmark names | Multiple instances with same item labels → `landmark-unique` axe violation | Use a `sizeItems(prefix)` helper to make each label unique per instance |
| Per-story `MantineProvider` without theme | Resets `primaryShade` to 6 → WCAG AA contrast failures | Never add `<MantineProvider>` in story decorators; global preview.js handles it |
| Filled badge/chip with mid-range color | `color-contrast` a11y violation — e.g. green.7 (#2f9e44) on white = 3.44:1 | `primaryShade: 8` only affects the primary color (blue). Other colors use their filled shade regardless. Fix: override `--badge-color` inline with the passing shade (e.g. `style={{ '--badge-color': 'var(--mantine-color-green-9)' }}`). Yellow and orange cannot pass 4.5:1 with white text at any shade — omit from filled-variant demos. |
| `pointer-events: none` on a shared Mantine slot | Interactive children (e.g. clear button) silently non-functional — no error, no visual change | Mantine's `section` / `rightSection` slot is shared between decorative icons and interactive buttons (e.g. clearable X). Never set `pointer-events: none` on the slot class; let individual decorative children set it on themselves if needed. |
| `[data-size]` locator in multi-element components | Playwright `.nth()` indices off by 4× — Mantine sets `data-size` on root, wrapper, chevron, etc. | Use `.mantine-<Component>-root[data-size]` for a stable 1-per-instance selector instead of the bare `[data-size]` attribute. |
| `input[role="combobox"]` for Mantine v7 Select | Element not found — Mantine v7's Combobox-based Select renders `aria-haspopup="listbox"` on the input, not `role="combobox"` | Use `.mantine-Select-input` as the locator. `data-error="true"` and `disabled` are also set directly on this element. |
| `aria-label` on simple `<Drawer>` for header-less dialog | `aria-dialog-name` a11y violation — the simple `Drawer` form spreads HTML props to the outer root div, not the `section[role="dialog"]` | For header-less drawers, use Mantine's compound API: `<MantineDrawer.Root>` + `<MantineDrawer.Content aria-label="…">`. The compound `Content` component accepts HTML attributes directly on the dialog section. |
| `color-contrast` axe violation on disabled state | False positive — axe flags dim text in disabled inputs even though WCAG 1.4.3 explicitly exempts "inactive user interface components" from contrast requirements | In stories that render a disabled variant (including `Showcase`), add `parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } }` with a WCAG comment. In Playwright specs, add `.disableRules(['color-contrast'])` to axe scans of the disabled story. Never change the CSS — the low contrast is intentional. |
| Missing JSDoc on component function | Storybook autodocs page shows blank description — no error, no warning, just empty | Add a JSDoc block on the primary exported function in `<Name>.tsx`. See Component Patterns → JSDoc section. |
| `Menu.Dropdown` without `keepMounted` | axe `aria-valid-attr-value` incomplete — trigger button's `aria-controls` references a portal element that doesn't exist in the DOM when the menu is closed | Add `keepMounted` to `<Menu.Dropdown>` so the portal element is always present for axe to verify. |
| `Menu` Open story `aria-required-children` violation | Mantine v7 injects `<div tabindex="-1" data-autofocus>` as the first child of `role="menu"` for focus management — axe flags it because `menu` only permits `menuitem`/`menuitemcheckbox`/`menuitemradio` children | Suppress `aria-required-children` in the Open story's `parameters.a11y.config.rules` with a comment explaining it's a Mantine internal. Do not suppress globally — only the Open (pre-opened) fixture story triggers it. |
| `Anchor` inside text block without permanent underline | axe `link-in-text-block` violation — Mantine `Anchor` defaults to `underline="hover"` (underline only on hover), so axe flags the link as indistinguishable from surrounding text without colour alone | Use `underline="always"` on any `<Anchor>` embedded in a text sentence (inside `<Text>`, `<p>`, `<li>`, etc.). Reserve `underline="hover"` for standalone links with no surrounding prose. |
| `Menu` item font size not inheriting `size` prop | Dropdown items stay at Mantine's default `md` font size regardless of the trigger's `size` — passes all quality gates but looks proportionally wrong (e.g. 30px `xs` button with full-size text in dropdown) | Pass `styles={{ item: { fontSize: \`var(--mantine-font-size-${size})\` } }}` to `<Menu>`. Mantine's Styles API forwards it to every `Menu.Item` with no extra wrapper. |
| `action: 'clicked'` in argTypes | Orphaned control in SB8 Controls panel — registers the entry but doesn't wire to anything; `action:` key is SB7 syntax | Use `table: { disable: true }` for event props inherited from HTML attributes (e.g. `onClick`). For props you want to spy on, pass `fn()` from `@storybook/test` directly in story `args`. |
| Inherited Mantine prop type shows `unknown` in autodocs | Storybook cannot introspect `MantineSize`, `MantineShadow`, or any other Mantine union type inherited via `extends MantineXxxProps` — type column shows `unknown` | Add `table: { type: { summary: 'MantineSize' } }` (or the exact union literal) alongside `table: { defaultValue: ... }`. The top-level `type:` field does NOT control the docs table — only `table.type.summary` does. For `size` on overlay/panel components also document token→px in `description`: `xs≈320px, sm≈380px, md≈500px, lg≈620px, xl≈780px`. |
| `AppShell` (and similar Mantine layout components) ignores `padding` / zone-dimension prop changes after mount | Mantine injects layout CSS variables (`--app-shell-padding`, `--app-shell-navbar-width`, etc.) into a `:root` `<style>` tag once on initial mount. Subsequent React re-renders do not re-inject the rule, so changing `padding`, `headerHeight`, `navbarWidth`, etc. via Storybook Controls appears to have no effect. No error, no warning — the layout simply stays at the initial values. | Add `key={[layout-critical props joined]}` to the component in the story's `render` function: `key={\`\${args.padding}-\${args.headerHeight}-\${args.footerHeight}-\${args.navbarWidth}-\${args.asideWidth}\`}`. When the key changes React fully unmounts and remounts, re-triggering Mantine's CSS injection with the new values. |
| `color="blue.9"` on NavLink (and similar) does not set label text colour | Mantine resolves `--nl-color` to `blue.6` regardless of the shade qualifier — `color="blue.9"` correctly derives the active background from blue.9 but the foreground text stays at `#228be6` (blue.6, 3.08:1 on the light background). No error, no warning. | Override the CSS variable directly: `style={{ '--nl-color': 'var(--mantine-color-blue-9)' } as React.CSSProperties}`. This gives `#1864ab` on `#e8f0f7` ≈ 4.83:1 (WCAG AA ✅). The same pattern applies to any Mantine component that exposes a `--*-color` CSS variable for theming. |

---

## CSS Rules (enforced in Stage 3)

- **No hex codes / raw RGB** — use `var(--mantine-color-*)` or `light-dark()`
- **No raw px** — use `rem()` or `var(--mantine-spacing-*)` (`rem(22px)` is valid — px inside `rem()` is correct PostCSS)
- **No `!important`** — use `:where()` for low specificity or the Styles API
- **No inline styles** — only for values unknown at build time
- `:where()` on all `[data-*]` selectors to keep specificity at `0-1-0`

---

## Playwright Spec Patterns

### Archive exclusion
`playwright.config.ts` must exclude the `_archive` folder or old specs will pollute the run:
```ts
testMatch: ['02-generated/**/*.spec.ts'],
testIgnore: ['02-generated/_archive/**'],
```

### Story URL helper
```ts
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-button--${name}&viewMode=story`;
```
**Never** put `&viewMode=story` inside `BASE_URL` and then concatenate `--storyname` — it produces `&viewMode=story--storyname`.

### Locators — always use `:visible`
Storybook's `iframe.html` always contains 3 hidden `<button>Set string</button>` skeleton elements in the DOM. `page.locator('button')` matches them and triggers a strict mode violation.

```ts
// ✅ CORRECT
const button = page.locator('button:visible');

// ❌ WRONG — strict mode violation: resolves to 3+ elements
const button = page.locator('button');
```

### Axe-core — use plain CSS selector
`:visible` is a Playwright extension, not valid CSS. Axe-core skips hidden elements internally.
```ts
// ✅ CORRECT
const results = await new AxeBuilder({ page }).include('button').analyze();

// ❌ WRONG — axe doesn't understand :visible
const results = await new AxeBuilder({ page }).include('button:visible').analyze();
```

### Axe scoping
Always scope to the component root to avoid Storybook iframe false positives (`landmark-one-main`, `page-has-heading-one`):
```ts
await new AxeBuilder({ page }).include('button').analyze();
await new AxeBuilder({ page }).include('.mantine-Card-root').analyze();
await new AxeBuilder({ page }).include('.mantine-TextInput-root').analyze();
```

For multi-instance stories (e.g. `Sizes`) where `landmark-unique` must be checked, disable the iframe false-positive rules and scan the full page:
```ts
const results = await new AxeBuilder({ page })
  .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
  .analyze();
```

### `page.evaluate()` — always `waitFor()` first
```ts
// ✅ CORRECT
await page.locator('.mantine-Accordion-root').waitFor();
const positions = await page.evaluate(() => {
  const el = document.querySelector('.mantine-Accordion-label');
  return el ? el.getBoundingClientRect().left : null;
});
```

### Testing visual layout — use `getBoundingClientRect()`, not DOM order
```ts
// ✅ CORRECT — tests where the element actually appears on screen
const rects = await page.evaluate(() => ({
  labelLeft: document.querySelector('.mantine-Accordion-label')!.getBoundingClientRect().left,
  chevronLeft: document.querySelector('.mantine-Accordion-chevron')!.getBoundingClientRect().left,
}));
expect(rects.chevronLeft).toBeGreaterThan(rects.labelLeft);
```

---

## Quality Gates (11 Total)

Run via `./scripts/quality-gate.sh <ComponentName> [--skip-deps]`

1. Token Compliance — no hex/rgb/bare-px (px inside `rem()` is valid)
2. File Integrity — all 4 files exist and non-empty
3. PostCSS Standard — rem(), @mixin hover, no bare :hover
4. Storybook Autodocs — `tags: ['autodocs']` present
5. Tracker Update — component in components.md
6. data-* Attributes — state passed via data- props
7. Size Variant Coverage — data-size present when size prop used
8. Test Coverage — spec file has test cases
9. Dependency Audit — `./scripts/dependency-audit.sh <Component>`
10. Visual Snapshot — `toHaveScreenshot` assertion present in spec (catches misspelled CSS tokens that render transparent and pass all other gates)
11. Portal CSS Variable Scope — component-scoped CSS vars defined on `.root` not referenced inside portal-rendered classes (`.dropdown`, `.option`, `.panel`, etc.)

---

## Generated Components

| Component | Figma | Status |
|---|---|---|
| Button | [node-id=41-492](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=41-492) | ✅ 12/12 tests passing |
| Textarea | [node-id=58-1977](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=58-1977) | ✅ 11/11 tests passing |
| DragList | [node-id=60-339](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=60-339) | ✅ 16/16 tests passing |
| PasswordStrength | source code (Mantine demo) | ✅ 11/11 tests passing |
| Accordion | [node-id=74-5020](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=74-5020) | ✅ 14/14 tests passing |
| Badge | [node-id=78-692](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=78-692) | ✅ 8/8 quality gates |
| Checkbox | [node-id=78-695](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=78-695) | ✅ 8/8 quality gates |
| Select | [node-id=78-1313](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=78-1313) | ✅ 8/8 quality gates |
| MultiSelect | [node-id=96-4943](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=96-4943) | ✅ 22/22 tests passing |
| Modal | [node-id=106-985](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=106-985) | ✅ 16/16 tests passing |
| ContentBox | [node-id=107-1419](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=107-1419) | ✅ 12/12 tests passing |
| ButtonMenu | [node-id=116-1726](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=116-1726) | ✅ 9/9 quality gates |
| Appshell | [node-id=133-1095](https://www.figma.com/design/8TQSF8TeXMMc9391nYVJ41/Test?node-id=133-1095) | ✅ 11/11 tests passing |

---

## Session Transcripts

Full session JSONL files live at:
```
~/.claude/projects/-Users-alexwood-Documents-figma-ai-project/<session-id>.jsonl
```
Point Claude at a specific file to recover decisions or code from before a compaction.

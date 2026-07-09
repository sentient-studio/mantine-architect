---
name: component-qa
description: Stage 4 QA and documentation skill. Triggered by an engineering implementation PR. Checks out the PR branch, validates the implementation against all 4 themes with axe, writes MDX docs, adds interaction play functions, generates a Figma Code Connect mapping, updates the manifest to 'supported', posts a QA report as a comment on the engineering PR, and opens a separate docs PR.
---

# Component QA (Stage 4)

## Purpose

Post-implementation quality gate and documentation for a completed component in the Prometric shared component library. Triggered by an engineering implementation PR — QA runs against the PR branch before it merges.

Produces two outputs (plus an optional third, non-blocking one):
1. **A comment on the engineering PR** — axe results × 4 themes, screenshots, API audit, pass/fail verdict
2. **A docs PR** — MDX documentation, interaction play functions, manifest `governance-approved → supported`
3. **A Figma Code Connect mapping** (when a Figma reference exists and the user approves) — links the Figma node to the real component so Dev Mode shows the sealed-API wrapper instead of raw Mantine JSX

## Inputs

Collect before starting — ask if not provided:

| Input | Description | Default |
|---|---|---|
| `EngPRNumber` | Engineering implementation PR number, e.g. `42` | — |
| `RepoPath` | Absolute path to the local engineering repo checkout | — |
| `StorybookURL` | Base URL of the running Storybook | `http://localhost:6006` |

`ComponentName` and the branch name are derived automatically from the PR in Step 0.  
`GitHubRepo` (org/repo slug) is derived from `git remote get-url origin` if not provided.

---

## Step 0 — Resolve PR and check out branch

```bash
# Derive GitHub repo slug from remote if needed
cd "{RepoPath}"
GITHUB_REPO=$(git remote get-url origin | sed 's/.*github\.com[:/]//;s/\.git$//')

# Fetch PR metadata
gh pr view {EngPRNumber} --repo "$GITHUB_REPO" \
  --json title,headRefName,body,labels,author
```

From the PR title derive `ComponentName`:
- `feat(component): Checkbox wrapper` → `Checkbox`
- `chore: add select component` → `Select`
- When ambiguous, ask the user to confirm before proceeding

Check out the PR branch so all subsequent file reads and Storybook runs use the implementation under review:

```bash
cd "{RepoPath}"
git fetch origin
git checkout {headRefName}
```

Verify the component files exist on this branch before continuing:
```bash
ls prometric-component-library/src/components/<kebab-name>/
```

---

## Engineering repo structure (reference)

```
{RepoPath}/
  prometric-component-library/
    src/
      components/<kebab-name>/
        <Name>.tsx              ← component wrapper (read)
        <Name>.stories.tsx      ← stories (read + modify: add play functions)
        index.ts                ← barrel export (read)
        <Name>.docs.mdx         ← WRITE this file
        <Name>.figma.ts         ← WRITE this file (Step 8, only if a Figma reference exists)
      manifest/
        component-support.ts    ← UPDATE status governance-approved → supported
      index.ts                  ← barrel exports (verify component is exported)
    .storybook/
      preview.tsx               ← 4 themes: light, dark, celpip, legacy
    package.json
```

---

## Step 1 — Read implementation files

Read all of the following from the checked-out PR branch:

1. `{RepoPath}/prometric-component-library/src/components/<kebab-name>/<Name>.tsx`
2. `{RepoPath}/prometric-component-library/src/components/<kebab-name>/<Name>.stories.tsx`
3. `{RepoPath}/prometric-component-library/src/manifest/component-support.ts`
4. `{RepoPath}/prometric-component-library/src/index.ts`

Extract from the component file:
- Public prop interface (`<Name>Props`)
- Variant type (`Ds<Name>Variant`) if present
- Sealed prop omissions — look for comments like "intentionally NOT forwarded"
- Whether `forwardRef` is present
- What Mantine component(s) it wraps

Extract from the stories file:
- All story export names and any `name:` overrides
- Meta `title:` — needed to derive Storybook story IDs
- Any `play` functions already present (don't duplicate)

---

## Step 2 — Look up Stage 1 plan

```bash
ls /Users/alexwood/Documents/figma-ai-project/logs/plan-{ComponentName}-*.md 2>/dev/null \
  | sort -r | head -1
```

If found, read it and extract:
- Approved variant vocabulary
- WCAG decisions and any pre-approved axe suppressions
- BLOCK or ADAPT conflicts engineering was expected to resolve
- Token decisions (DTCG tokens → component props)

If not found, note in the QA comment: "No Stage 1 plan found — QA is implementation-only."

---

## Step 3 — API audit (static, no browser)

Check against the sealed API contract from `copilot-instructions.md`.

**Forbidden props** — must NOT appear in the public `<Name>Props` interface:
`style`, `styles`, `classNames`, `sx`, `unstyled`, `color`, `c`, `bg`, `radius`
(Exception: Stage 1 plan explicitly approved it — note but don't flag.)

**Required structural checks:**
- [ ] `forwardRef` present (or function with ref param)
- [ ] `<Name>.displayName` set to `'<Name>'`
- [ ] Variant vocabulary: action components use `primary/secondary/tertiary`; verify against plan
- [ ] `VARIANT_MAP` or equivalent present for adapted wrappers

**Story coverage checks:**
- [ ] `tags: ['autodocs']` in meta
- [ ] Default story present
- [ ] All approved variants covered
- [ ] Disabled state story (if applicable)
- [ ] Loading state story (if applicable)
- [ ] Focus/keyboard behaviour story

**Reference/prototype capability cross-check** — if a richer reference or prototype copy of this component exists anywhere in the repo tree (e.g. an earlier build under a `-main`/`-prototype`-suffixed directory), check whether it documents a prop, state, or behaviour the shipped component's prop interface doesn't have, or whether its docs contradict the shipped component's own JSDoc (e.g. a reference claiming a capability "is not supported" when the shipped component's JSDoc explicitly documents support for it). **Flag this as a finding — never silently fabricate docs for a capability the shipped component doesn't have, and never silently resolve a contradiction one way or the other.** The team decides whether the gap is real future scope or the reference is simply stale; Stage 4 QA's job is to surface the discrepancy, not adjudicate it.

Gaps are findings — they go in the QA comment but do NOT block the PR.

---

## Step 4 — Axe scan × 4 themes

### Start Storybook from the PR branch

Storybook must run from the checked-out PR branch so it serves the implementation under review:

```bash
cd "{RepoPath}/prometric-component-library" && yarn storybook &
```

Wait for `{StorybookURL}` to respond before scanning.

### Story ID format

Storybook derives IDs from `title` and export names:
- `title: 'Components/Button'` + export `AllVariants` → `components-button--all-variants`

Derive all story IDs from the stories file. Export names convert to kebab-case.

### Detect execution environment

Check which browser tools are available and use the first matching path:

- **Path A — Claude Code desktop app**: `mcp__Claude_Preview__preview_start` is available
- **Path B — VS Code + Chrome extension**: `mcp__Claude_in_Chrome__navigate` is available
- **Path C — CLI / neither**: Playwright via Bash

---

### Path A — Preview tools (Claude Code desktop app)

For each story × each theme (`light`, `dark`, `celpip`, `legacy`):

```
{StorybookURL}/iframe.html?id={story-id}&viewMode=story&globals=dsTheme:{theme}
```

1. `preview_start` if no server is running
2. `preview_eval`: `window.location.href = '<url>'`
3. `preview_snapshot` to confirm render
4. Run axe via `preview_eval`:
```js
const axe = await import('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js');
const results = await axe.default.run(
  document.querySelector('#storybook-root') || document.body,
  { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] }
);
return results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
```
5. `preview_screenshot` for the Default story in each theme

---

### Path B — Chrome MCP (VS Code + Chrome extension)

For each story × each theme:

1. `mcp__Claude_in_Chrome__navigate` to the iframe URL
2. `mcp__Claude_in_Chrome__get_page_text` to confirm render
3. Run axe via `mcp__Claude_in_Chrome__javascript_tool`:
```js
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
document.head.appendChild(script);
await new Promise(r => script.onload = r);
const results = await axe.run(
  document.querySelector('#storybook-root') || document.body,
  { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] }
);
return results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
```
4. `mcp__Claude_in_Chrome__read_page` or screenshot for the Default story in each theme

---

### Path C — Playwright via Bash (fallback)

```bash
cd /tmp && npm init -y && npm install @playwright/test @axe-core/playwright \
  && npx playwright install chromium --with-deps 2>&1 | tail -5
```

```bash
cat > /tmp/axe-scan.mjs << 'EOF'
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const [BASE, STORY] = process.argv.slice(2);
const THEMES = ['light', 'dark', 'celpip', 'legacy'];
const browser = await chromium.launch();
const results = {};

for (const theme of THEMES) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/iframe.html?id=${STORY}&viewMode=story&globals=dsTheme:${theme}`);
  await page.waitForSelector('#storybook-root', { timeout: 10000 });
  const r = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze();
  results[theme] = r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
EOF

node /tmp/axe-scan.mjs {StorybookURL} {story-id}
```

Run once per story. Screenshots via `mcp__computer-use__screenshot` if available, otherwise note "screenshots unavailable (CLI mode)".

---

### Results table

Build a matrix after scanning all stories × 4 themes:

| Story | light | dark | celpip | legacy |
|---|---|---|---|---|
| Default | ✅ | ✅ | ⚠️ `color-contrast` | ✅ |
| AllVariants | ✅ | ✅ | ✅ | ✅ |
| … | | | | |

- `critical` / `serious` violations → **QA Findings** section, block verdict
- `moderate` / `minor` → note, don't block
- Violations matching Stage 1 pre-approved suppressions → `[expected — see plan]`

---

## Step 5 — Write MDX documentation

**Check for a writing/content style guide first.** Look for a content-standards page in the target repo's Storybook tree — commonly under a path like `src/stories/content/` (introduction/voice-and-tone, UI text, empty states) — before drafting any prose. If one exists, apply its voice/tone rules and labelling conventions (e.g. verb-first, sentence-case) to "When to use" and any other prose in this file. If no such guide exists in this repo, note in the QA comment that prose tone is unstandardized rather than silently inventing a voice.

Create `{RepoPath}/prometric-component-library/src/components/<kebab-name>/<Name>.docs.mdx`:

```mdx
import { Meta, Canvas, Controls } from '@storybook/blocks';
import * as <Name>Stories from './<name>.stories';

<Meta of={<Name>Stories} />

# <Name>

<brief description — what it is, what Mantine component it wraps, what its purpose is>

## When to use

- Use `<Name>` when…
- Prefer `<X>` when…

## Variants

| Variant | Mantine mapping | Use for |
|---|---|---|
| `primary` | `filled` | Primary actions |
| `secondary` | `outline` | Secondary actions |
| `tertiary` | `transparent` | Tertiary / destructive actions |

(Adapt or omit if component has no variant prop.)

## Usage

<Canvas of={<Name>Stories.Default} />
<Controls of={<Name>Stories.Default} />

## All variants

<Canvas of={<Name>Stories.AllVariants} />

## States

<Canvas of={<Name>Stories.Disabled} />

## Do's and don'ts

(Optional — only when a genuinely clear, real misuse pattern exists for this component. 1-3
pairs is normal; do not invent a pair just to have one.) If the target repo already ships a
Do/Don't demonstration component (check its Storybook helpers directory — e.g.
`.storybook/components/`), reuse it rather than hand-rolling a comparison table. Good sources for
genuine pairs: an existing house rule already documented elsewhere that's never been visualized;
a real, observed misuse the component's own JSDoc already warns against. Do not add a pair for
something the component doesn't actually support either way.

## Accessibility

### Keyboard interaction
- Describe keyboard interaction (real `<table>` if there's more than one key/behaviour pair)

### Screen reader behaviour
- Native semantics (e.g. "renders as a native `<button>` — no `role` override needed")
- Where the accessible label/name comes from
- How each state (disabled/loading/error/etc.) is announced — not just visually indicated

### Requirements
- **Focus ring:** driven by `color.focus.ring` DTCG token; visible in all 4 themes
- **WCAG AA:** note contrast decisions (quote ratios from Stage 1 plan if available)
- Any capability that is explicitly *not* supported — verify against the component's own
  JSDoc/props first, don't assume
- **Sealed props:** `color`, `radius`, `style` intentionally omitted — styling is token-driven

## Token decisions

| Token | Purpose |
|---|---|
| `component.<name>.primary.*` | Primary variant colors |
| `component.<name>.secondary.*` | Secondary variant colors |

(Populate from Stage 1 plan; infer from source if no plan exists.)

## Sealed API

These Mantine props are not forwarded to consumers:

`color` · `c` · `bg` · `radius` · `style` · `styles` · `classNames` · `sx` · `unstyled`

All visual decisions flow through the DTCG token system via `DsProvider`.
```

Keep the file under ~100 lines. No raw hex values. Screenshots are not committed.

---

## Step 6 — Add play functions to stories

Add `play` functions to `FocusBehaviour` and `Disabled` stories only. Add the import at the top of the stories file if not already present:

```tsx
import { expect, userEvent, within } from '@storybook/test';
```

**FocusBehaviour:**
```tsx
export const FocusBehaviour: Story = {
  // ... keep existing render/args
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const focused = document.activeElement;
    expect(focused).not.toBeNull();
    expect(focused?.tagName.toLowerCase()).toMatch(/^(button|input|a|select|textarea)$/);
  },
};
```

**Disabled:**
```tsx
export const Disabled: Story = {
  // ... keep existing render/args
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled());
  },
};
```

Rules:
- Only add to stories without existing `play` functions
- Do NOT add to Default or AllVariants
- Keep each play function to one assertion

---

## Step 7 — Update manifest

In `component-support.ts`, flip the entry from `governance-approved` → `supported`:

```ts
// Before
{ name: 'Checkbox', status: 'governance-approved', classification: 'pass-through', phase: 2,
  notes: 'Stage 1 approved 2026-06-26: 0🔴 1🟡 0🔵 · 8K plan' },

// After
{ name: 'Checkbox', status: 'supported', classification: 'pass-through', phase: 2,
  notes: 'Stage 4 QA passed 2026-06-26. pass-through wrapper; disabled color-contrast suppressed per WCAG 1.4.3.' },
```

Verify barrel export in `src/index.ts` — add if missing:
```ts
export { <Name> } from './components/<kebab-name>';
export type { <Name>Props, Ds<Name>Variant, Ds<Name>Size } from './components/<kebab-name>';
```

Only export types that actually exist in the component file.

---

## Step 8 — Figma Code Connect

Non-blocking throughout: any failure or missing Figma reference is noted in the QA comment, never fails the verdict.

### 8a — Resolve `fileKey` + `nodeId`

Prefer the Stage 1 plan already read in Step 2 — it records the Figma URL and node id in its preamble, though exact label wording varies (`**Figma:**`/`**Node:**` in `figma-ai-project`-generated plans, `**Figma URL:**`/`**Figma node:**` in component-local `<kebab-name>.plan.md` files). Don't match on the label text — extract `fileKey` + `nodeId` from whichever `figma.com/design/...?node-id=` URL appears in the preamble.

If no Stage 1 plan was found, fall back to the tracker:
```bash
grep -A1 "| ComponentName |" /Users/alexwood/Documents/figma-ai-project/03-figma-links/components.md
```
and extract `fileKey` + `nodeId` from the URL's `?node-id=` query param.

If neither source has a Figma reference (e.g. hand-authored components like `PasswordStrength`), skip the rest of Step 8 and note in the QA comment: `"Code Connect skipped — no Figma reference found"`.

### 8b — Read the Figma-provided skill first

Before generating any template, read `skill://figma/figma-code-connect/SKILL.md` via `mcp__figma__read_skill_uri` (or invoke `/figma-code-connect` if available as a local skill). Do not hand-roll `figma.connect()` syntax — defer to Figma's own authoring conventions so this step stays correct as Code Connect's API evolves.

### 8c — Discover the resolved component, and only that component

```
mcp__figma__get_code_connect_suggestions(nodeId, fileKey, excludeMappingPrompt: true)
```

This returns **every unmapped published component nested inside the selected node**, not just the one being QA'd — for a composite like MultiSelect that includes unrelated children (Checkbox, Radio button, Button, Search, text field, etc.) that happen to live inside the same design. **Filter the response down to the single entry whose `mainComponentNodeId` matches the `nodeId` resolved in 8a** (it may differ from the plan's raw node id if the plan pointed at an instance rather than the main component — always prefer the resolved id from this call for every subsequent step). Ignore every other entry in the response; those belong to their own components' Stage 4 QA runs, not this one.

Handle the two documented non-list responses per the Figma skill's own Step 2 guidance:
- `"No published components found in this selection"` → skip the rest of Step 8, note `"Code Connect skipped — component not published to a team library"`.
- `"All component instances in this selection are already connected"` → treat as already mapped; proceed to 8d anyway (still non-blocking to regenerate).

### 8d — Check for an existing mapping

```
mcp__figma__get_code_connect_map(nodeId, fileKey)
```

using the **resolved** `nodeId` from 8c. Unlike `<PUSHBACK>`'s skip-on-duplicate behaviour, an existing mapping is **not** a reason to skip. Component APIs change over time, so this step always regenerates and overwrites — treat the check as informational, not a gate.

### 8e — Fetch property context

```
mcp__figma__get_context_for_code_connect(nodeId, fileKey)
```

using the resolved `nodeId`. Returns the component's own top-level property definitions plus its full descendant tree.

**Don't expect a rich property surface by default.** Many Figma components expose only one or two top-level VARIANT/BOOLEAN properties even when the underlying code component has many props — the rest often live as `State`/`Show *` properties on *descendant* instances (e.g. a nested `text field`'s own `State` property), which the Code Connect skill explicitly says not to hoist into the parent template. A thin mapping (source link + a minimal, prop-free example) is a legitimate, correct outcome — it is not a sign the step did something wrong.

### 8f — Build the template

Follow `skill://figma/figma-code-connect/SKILL.md` (read in 8b) exactly for syntax — it authors **`.figma.ts` template files** (`import figma from 'figma'`, `figma.selectedInstance`, `instance.getEnum()` / `.getBoolean()` / `.getString()`, `export default { example, id, imports, metadata }`), **not** the `figma.connect()` parser API. Combine:

- The property definitions from 8e — map each to the corresponding wrapper prop using `getEnum`/`getBoolean`/`getString` per the skill's property-mapping table. Cross-check every mapped prop against Step 3's forbidden-props list (`style`, `styles`, `classNames`, `sx`, `unstyled`, `color`, `c`, `bg`, `radius`) and never map one of those.
- If a Figma property has no corresponding code prop (e.g. a `Type` variant the wrapper doesn't implement — see multi-select's `Radio group` vs `Checkboxes`), **omit it** per the skill's own rule — don't invent a prop, and don't fix/force a value silently; leave a one-line comment explaining why it's omitted.
- The header comment block: `// url=`, `// source=` (GitHub blob URL pointed at `main`, **not** the PR branch — it gets deleted post-merge), `// component=`.

### 8g — Write the template for review

Write the generated file to `{RepoPath}/prometric-component-library/src/components/<kebab-name>/<Name>.figma.ts` — a git-tracked, human-reviewable artifact, same as every other Figma-facing output in this pipeline. Add it to the `git add` list in Step 9b.

### 8h — Confirm before publishing

Show the user the generated mapping (node id, component name, which properties were mapped vs. intentionally omitted) and ask: **"Publish this Code Connect mapping to Figma now?"** — mirrors the existing `<PUSHBACK>` confirm-then-post pattern.

- **Yes** → publish via the **CLI**, not the MCP tools (see below for why). Requires `@figma/code-connect` as a dev dependency and a `figma.config.json` (`{"codeConnect": {"parser": "react", "include": ["<glob matching your *.figma.ts files>"]}}`) in the target project — one-time setup per repo. Run from the target project's own package directory, not via a raw `node node_modules/.bin/...` path (unreliable if node_modules is hoisted or the repo nests the actual package one level deeper than the checkout root):
  ```bash
  cd "<path to the package containing node_modules>" && yarn figma connect publish -t "$FIGMA_ACCESS_TOKEN" --skip-update-check
  ```
  `yarn <bin>` resolves `figma` from the local `node_modules/.bin` automatically — don't hardcode a `node_modules/.bin/figma` path. Read `FIGMA_ACCESS_TOKEN` from wherever the `figma` MCP server's own config sources it — never print or log the token value. A successful run prints `Successfully uploaded to Figma, for Code: -> <Name> <url>`; a failed run prints a clear error (e.g. a 403) and exits non-zero — check the exit code, don't just check for the absence of a crash.
  - `mcp__figma__send_code_connect_mappings`/`add_code_connect_map` **do not reliably persist the template** (see 8i) — don't use them as the publish step. They're still useful read-only for 8c/8d (discovery, existing-mapping check).
- **No** → still commit the `.figma.ts` file to the docs PR so the work isn't lost. Note `"Code Connect: drafted, not published"` in the QA comment.

### 8i — Verify the template actually persisted

Two distinct failure modes here — don't conflate them in the QA comment:

**A. The CLI publish command itself fails** (non-zero exit, e.g. a 403). Nothing new was written — any existing mapping is unchanged. **Root cause confirmed 2026-07-09:** this means `FIGMA_ACCESS_TOKEN` is missing the **Code Connect Write** scope (and/or File Read) — the error text says so directly (`"Invalid scope(s): ... File Read scope and the Code Connect Write scope"`). Stop here, don't fall back to the MCP publish tools to "make it work" (see below), and note `"Code Connect: ❌ publish failed — <error>, check FIGMA_ACCESS_TOKEN scope"` in the QA comment.

**B. The CLI publish command succeeds** (exit 0, "Successfully uploaded..."), but a follow-up read still shows no template. This would be a genuinely new/unexpected failure mode — the CLI path is what actually produced `hasTemplate: true` on `prometric-component-library`'s `Button`, so a clean CLI success not persisting would need fresh investigation, not just re-applying this same root cause. Re-check with:
```
mcp__figma__get_code_connect_map(nodeId, fileKey)
```
- `"hasTemplate": true` → note `"Code Connect: ✅ published (with template)"` in the QA comment.
- `"hasTemplate": false` despite a clean CLI success → note `"Code Connect: ⚠️ CLI reported success but hasTemplate still false — needs investigation"` and flag it to the user rather than assuming the known token-scope cause applies.

**Never use `mcp__figma__send_code_connect_mappings`/`add_code_connect_map` as a workaround for a failed or unconfirmed CLI publish** — those tools silently accept an under-scoped token and write a source-link-only record with no error, which looks like success but isn't (this is exactly the confusion that produced the original `hasTemplate: false` reports before the CLI was used to root-cause it). If you ever do fall back to them deliberately (e.g. CLI genuinely unusable in this environment), note `"Code Connect: ⚠️ published source-link only via MCP fallback — template not attempted"` — don't call it a plain publish success.

---

## Figma Code Connect notes

- **Source URL always targets `main`**, never the PR branch — PR branches are deleted post-merge and the link would 404.
- **Non-blocking** — a missing Figma reference, an unpublished component, a thin/property-poor mapping, a declined publish, or a template that fails to persist (8i) never fails the QA verdict.
- **Idempotent by overwrite, not skip** — unlike `<PUSHBACK>`, Step 8 always regenerates the mapping when one already exists rather than skipping. Component props drift over time; a stale mapping is worse than a duplicate comment.
- **One node returns many components** — `get_code_connect_suggestions` surfaces every unmapped nested component, not just the one under review. Always filter to the resolved `mainComponentNodeId`; never bulk-map the rest opportunistically from inside a single component's Stage 4 run.
- **Publish via the CLI (`figma connect publish`), not the MCP tools** — `send_code_connect_mappings`/`add_code_connect_map` will accept a request and write a source-link-only record even when the token lacks the Code Connect Write scope, with no error. The CLI correctly 403s instead, which is the failure you actually want. Confirmed 2026-07-09 on `prometric-component-library`'s `Button` — see 8h/8i.
- **A publish call succeeding is not the same as the template persisting** — see 8i. Always verify with a follow-up `get_code_connect_map` read before reporting success.
- **Requires Figma Dev Mode + Code Connect to be enabled on the org/file, and a token with the Code Connect Write scope** — the former is a Figma plan/permission this repo doesn't control; the latter is fixable by regenerating the token. Treat a CLI publish failure as informational/actionable (check the error message — scope vs. plan vs. something else), not a skill bug.

---

## Step 9 — Post QA comment + open docs PR

Two separate outputs. Do them in this order.

### 9a — Comment on the engineering PR

```bash
gh pr comment {EngPRNumber} --repo "$GITHUB_REPO" --body "$(cat << 'COMMENT'
## Stage 4 QA — <Name>

**Verdict: ✅ PASS** (or **❌ FAIL — see QA Findings below**)

### Axe results (all stories × 4 themes)

| Story | light | dark | celpip | legacy |
|---|---|---|---|---|
<!-- results table -->

### Screenshots — Default story
<!-- light / dark / celpip / legacy -->

### API audit
<!-- findings or "None" -->

### Stage 1 plan alignment
<!-- ADAPT decisions carried through, or "No Stage 1 plan found" -->

### Figma Code Connect
<!-- "✅ published (with template) — node <id>", "⚠️ published source-link only — template did not persist", "drafted, not published", or "skipped — no Figma reference found" -->

### QA findings
<!-- critical/serious violations, API deviations, story gaps — or "None" -->

---
Docs PR incoming: `docs/qa/<kebab-name>` · Stage 4 · <date>
COMMENT
)"
```

If there are `critical` or `serious` axe violations, set the verdict to **❌ FAIL** and list them explicitly. Engineering should address them before merging. The docs PR still gets opened so the work isn't lost.

### 9b — Open docs PR

```bash
cd "{RepoPath}"
git checkout -b docs/qa/<kebab-name>
git add prometric-component-library/src/components/<kebab-name>/<Name>.docs.mdx
git add prometric-component-library/src/components/<kebab-name>/<Name>.stories.tsx
git add prometric-component-library/src/manifest/component-support.ts
git add prometric-component-library/src/index.ts  # only if modified
git add prometric-component-library/src/components/<kebab-name>/<Name>.figma.ts  # only if generated (Step 8)
git commit -m "docs(qa): <Name> — Stage 4 documentation and interaction tests"
git push -u origin docs/qa/<kebab-name>

gh pr create \
  --repo "$GITHUB_REPO" \
  --title "docs(qa): <Name> — Stage 4 documentation" \
  --body "Companion to engineering PR #{EngPRNumber}.

Adds MDX documentation, interaction play functions (FocusBehaviour + Disabled stories), and flips manifest status to \`supported\`.

Merge after the engineering implementation PR lands on main.

QA results: see comment on #{EngPRNumber}."
```

The docs PR should not be merged until the engineering implementation PR is merged first.

---

## Checklist

- [ ] PR branch checked out; component files present
- [ ] `<Name>.docs.mdx` written with all required sections
- [ ] Play functions added (no duplicates)
- [ ] Manifest flipped `governance-approved` → `supported`
- [ ] Barrel export in `src/index.ts` verified
- [ ] Figma Code Connect mapping generated (or explicitly skipped), and if published, `hasTemplate` verified via `get_code_connect_map`
- [ ] Axe results table populated for all stories × 4 themes
- [ ] QA comment posted on engineering PR with verdict
- [ ] Docs PR opened and linked to engineering PR

---

## Known suppressions

- **`color-contrast` on disabled state** — WCAG 1.4.3 exempts inactive UI components; suppress in disabled story scans. Note as `[expected — WCAG 1.4.3]`.
- **`landmark-one-main` / `page-has-heading-one` / `region`** — Storybook iframe false positives. Scope axe to `#storybook-root` or suppress these three rules. Note as `[expected — Storybook iframe]`.

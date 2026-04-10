# Golden Prompt: Figma-to-Mantine Production Workflow (Optimized)

I need a [Component Name] based on Figma Node [Link].

## 🧠 CONTEXT & CONVENTIONS
- **Reference Docs:** `~/Documents/figma-ai-project/00-setup/mantine-llms.txt` for API definitions — this file is fetched fresh from `https://mantine.dev/llms-full.txt` each time `dispatch-agent.sh` runs (ETag-cached, so no re-download when unchanged). The relevant component section is injected directly into this prompt — do not re-read the full file.
- **Style Guide:** `~/Documents/figma-ai-project/00-setup/style_guide.md` for PostCSS rules and naming
- **Golden Patterns:** `~/Documents/figma-ai-project/01-golden-examples/` for architecture and testing logic

─────────────────────────────────────────
STAGE 1 — PLAN (Output before any code)
─────────────────────────────────────────

Pre-check: Variant Discovery
- Call `get_metadata` on the provided node ID to inspect its type and children
- If the node is a **Component Set** (contains variant children):
  → List all variant property names and values (e.g. State=Filled, State=Unstyled, Status=Error)
  → For each distinct variant, call `get_design_context` on that child node ID individually
  → Compile the full variant matrix before writing the brief
- If the node is a **single Component** (not a set):
  → Ask: "Is there a parent Component Set node with more variants to include?"
  → If yes: repeat the above from the Component Set node
  → If no: proceed with the single node's context
- Document all discovered variants under **"Variants"** in the Stage 1 brief

Pre-check: Component Complexity
- Use the variant discovery results to count total children and nesting depth
- If >10 children OR >3 levels deep:
  → Propose sub-component strategy (e.g., "Header.tsx + Body.tsx")
  → WAIT FOR APPROVAL before decomposing

Pre-check: Size Variants
Ask: "Does this component wrap a Mantine input (`PasswordInput`, `TextInput`, `Select`, etc.) or render scalable text (labels, descriptions, requirements)?"
- **Yes** → `size` prop is in scope. Plan for:
  - `size?: MantineSize` prop (default `'md'`)
  - `data-size={size}` on the root element
  - CSS custom property cascade on `.root` (defaults **before** nested `[data-size]` selectors)
  - Pass `size` through to any Mantine input child
  - `Sizes` story showing all 5 variants (`xs` → `xl`) pre-filled with a representative value
  - Playwright test: `expect(root).toHaveAttribute('data-size', 'md')` (default) + one per override if behaviour differs
- **No** → omit `size` prop; proceed without it

Pre-check: Dependency Audit (OPTIMIZED FOR BATCH APPROVALS)
- Identify every non-Mantine import the component will need (e.g. `@dnd-kit/core`, `react-beautiful-dnd`, `framer-motion`)
- For each, run:
  ```bash
  npm ls <package-name>
  ```
- If any packages are missing from `package.json`:
  
  **→ BATCH COLLECTION PHASE:**
  → Collect ALL missing packages into a single list
  → For each missing package, fetch npm registry metadata in parallel:
    - Weekly downloads (from https://api.npmjs.org/downloads/point/last-week/<package>)
    - Last publish date and publisher (from https://registry.npmjs.org/<package>/latest)
    - License type (from https://registry.npmjs.org/<package>/latest)
    - A risk signal: ✅ Established (>100k weekly downloads) | ⚠️ Moderate (10k-100k) | 🚨 Low traffic (<10k)
  
  **→ PRESENT ALL AT ONCE:**
  → Display a **single approval table** with ALL missing packages:
  
  ```markdown
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📦 DEPENDENCY APPROVAL REQUIRED
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  This component needs the following additional packages:
  
  | Package | Version | Weekly Downloads | Last Published | License | Risk |
  |---------|---------|------------------|----------------|---------|------|
  | react-beautiful-dnd | 13.1.1 | 1,234,567 | 2024-03-15 | Apache-2.0 | ✅ Established |
  | @dnd-kit/core | 6.0.8 | 456,789 | 2024-04-01 | MIT | ✅ Established |
  | framer-motion | 11.0.3 | 2,100,000 | 2024-03-28 | MIT | ✅ Established |
  
  Total packages: 3
  Estimated install time: ~15 seconds
  
  Install all 3 packages? (y/n)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```
  
  **→ SINGLE APPROVAL GATE:**
  → WAIT FOR APPROVAL (single y/n for all packages)
  → If approved, install ALL at once:
    ```bash
    npm install <package1> <package2> <package3> --ignore-scripts
    ```
  → Run single `npm audit` on all new packages
  → If vulnerabilities found, present them ALL in one report:
  
  ```markdown
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  SECURITY VULNERABILITIES DETECTED
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  npm audit found vulnerabilities in newly installed packages:
  
  Critical: 0
  High: 1
    - react-beautiful-dnd: Prototype pollution in v13.1.0 (fixed in 13.1.1)
  Moderate: 2
    - @dnd-kit/core: XSS vulnerability (fix available)
  
  Recommended actions:
  1. npm audit fix (auto-fix available issues)
  2. Review remaining issues manually
  
  Proceed with these packages? (y/n)
  Or run: npm audit fix (f)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```
  
  **→ APPROVAL OPTIONS:**
  → y = Continue with packages as-is
  → n = Cancel and suggest alternatives
  → f = Run `npm audit fix` first, then re-check
  
  **→ If `--ignore-scripts` causes build failure:**
  → Report the specific error
  → Ask permission to retry without `--ignore-scripts`
  → WAIT FOR APPROVAL before re-running
  
- If all dependencies are present: proceed silently (no output needed)

**KEY OPTIMIZATION:**
- One approval for N packages (not N approvals)
- All metadata fetched in parallel (faster)
- Single install command (faster, more reliable)
- Single npm audit (comprehensive report)
- Clear risk summary (easy to scan)

Output a structured brief containing:

1. **Variants:** List every variant discovered via `get_metadata` + `get_design_context`
   — table of property names, values, and the node ID used for each
   (e.g. State: Default | Filled | Unstyled | Error)

2. **Component Decomposition:** Map Figma layers to Mantine slots
   (e.g. Card container → <Card>, input → <TextInput>)

3. **Token Mappings:** List Figma Variables vs Mantine CSS variables
   (e.g. brand/primary → var(--mantine-primary-color-filled))

4. **Dependencies:** List any packages required beyond `@mantine/core` and `@tabler/icons-react`
   — mark each as ✅ installed or ⚠️ missing, with weekly downloads and last publish date for any ⚠️ missing ones
   — if approval was granted: note "✅ Approved and installed" with version numbers

5. **Ambiguities:** Propose 2-3 options for any design elements with no clear mapping

> **STOP:** WAIT FOR HUMAN DECISION/APPROVAL before proceeding to Stage 2.
> This includes approval of any missing dependencies (as a batch) and any `npm audit` findings.

─────────────────────────────────────────
STAGE 2 — ACT (Generate Artifacts)
─────────────────────────────────────────

Only after Stage 1 is approved, generate these artifacts in:
`~/Documents/figma-ai-project/02-generated/[ComponentName]/`

1. **[ComponentName].tsx**:
   - Uses `classNames={{ ...classes }}` Styles API
   - Passes state as `data-` attributes
   - If size variants in scope: `size?: MantineSize` prop, `data-size={size}` on root, `size` forwarded to Mantine input child(ren)
   - **JSDoc on the exported component function** (Storybook autodocs renders this as the component description on the docs page — without it the description is blank):
     ```ts
     /**
      * [ComponentName] — [one-line description of what it wraps / its role].
      *
      * [Sentence on which Mantine component(s) it wraps and how (thin wrapper /
      * Styles API / compound API / UnstyledButton etc.).]
      *
      * [Any data-* attributes forwarded for CSS/Playwright targeting, if applicable.]
      *
      * WCAG AA note: [colour contrast decisions — primaryShade:8, any inline
      * overrides required, colours to avoid in filled demos.]
      */
     export function [ComponentName](...) {
     ```
     Keep it factual and brief (4–8 lines). Do NOT add JSDoc to helper functions, sub-components, or types — only the primary exported component function.

2. **[ComponentName].module.css**:
   - All spacing: `rem()`
   - Hover states: `@mixin hover`
   - Theme colors: `light-dark()`
   - ZERO hardcoded hex/rgb/px values
   - If size variants in scope: CSS custom property cascade on `.root` — declare defaults **before** nested `[data-size]` selectors (cascade ordering rule)

3. **[ComponentName].stories.tsx**:
   - CSF 3 format
   - Wrapped in `MantineProvider`
   - Includes `Default` and `Showcase` variants
   - `tags: ['autodocs']` in meta (required for the docs page)
   - If size variants in scope: `Sizes` story rendering all 5 sizes (`xs`→`xl`) stacked, pre-filled with a representative value; `size` argType with `select` control
   - If the component renders `role="region"` landmarks (e.g. panel-based components like Accordion), use a `sizeItems(prefix)` helper to give each size instance unique item labels — duplicate labels across 5 instances triggers axe `landmark-unique`
   - **Never use `action: 'clicked'` in argTypes** — this is Storybook 7 syntax and creates an orphaned control in SB8. For event props inherited from HTML attributes (e.g. `onClick`), use `table: { disable: true }`. For props you want to spy on in interaction tests, pass `fn()` from `@storybook/test` in story `args`.
   - **Always add `table: { type: { summary: '...' } }` for any prop inherited from a Mantine type** — Storybook cannot introspect `MantineSize`, `MantineShadow`, or any union from `extends MantineXxxProps`. Without it the Type column shows `unknown`. Use the exact type string (e.g. `'MantineSize'`, `"'left' | 'right'"`, `'MantineSize | number'`). The top-level `type:` field does NOT affect the docs table — only `table.type.summary` does. For `size` on overlay/panel components (Modal, Drawer), include the token→px mapping in `description`: `xs≈320px, sm≈380px, md≈500px, lg≈620px, xl≈780px`.

4. **[ComponentName].spec.ts**:
   - Playwright tests targeting Storybook iframe
   - All interaction states covered
   - If size variants in scope: test that root element carries `data-size="md"` by default
   - **Visual snapshot:** one `toHaveScreenshot` test on the Default story — catches silent token failures (a misspelled `var()` name renders transparent/zero and passes every other gate):
     ```ts
     test('default story screenshot', async ({ page }) => {
       await page.goto(story('default'));
       await page.locator('[data-variant], .mantine-ComponentName-root').first().waitFor();
       await expect(page).toHaveScreenshot('default.png');
     });
     ```
     Run `npx playwright test --update-snapshots` once to create the baseline.

5. **Tracker Update:** Append row to `components.md` (format below)

─────────────────────────────────────────
STAGE 3 — REFLECT (Automated Quality Gate)
─────────────────────────────────────────

Use the **shell** tool to run these automated checks:

**1. [ ] Token Compliance (Automated)**

Run this command:
```bash
grep -E '(#[0-9A-Fa-f]{3,6}|rgb|[0-9]+px)' \
  ~/Documents/figma-ai-project/02-generated/[ComponentName]/[ComponentName].module.css
```

Expected output: (empty)
Actual output: [paste output here]

- If output contains matches: **FAIL** → List violations and REGENERATE CSS
- If output is empty: **PASS** ✅

**2. [ ] File Integrity (Automated)**

Run this command:
```bash
ls -la ~/Documents/figma-ai-project/02-generated/[ComponentName]/
```

Verify:
- All 4 files exist (.tsx, .module.css, .stories.tsx, .spec.ts)
- All files have non-zero size

If any missing/empty: **FAIL** → Generate missing file(s) and re-check

**3. [ ] PostCSS Standard (Manual)**

Open [ComponentName].module.css and verify:

✅ All spacing uses `rem()`:
   - Correct: `padding: rem(12px);`
   - Wrong: `padding: 12px;`

✅ Hover states use `@mixin hover`:
   - Correct: `@mixin hover { background: ...; }`
   - Wrong: `.root:hover { background: ...; }`

✅ Theme-aware colors use `light-dark()`:
   - Correct: `color: light-dark(var(--mantine-color-gray-9), ...);`
   - Wrong: `color: var(--mantine-color-gray-9);`

If any pattern wrong: **FAIL** → Regenerate CSS

**4. [ ] Prop Validity (Manual)**

Verify all props exist in `mantine-llms.txt` for the component used.

**5. [ ] Tracker Update (Automated)**

Append this row to `~/Documents/figma-ai-project/03-figma-links/components.md`:
```
| [ComponentName] | [Figma Link] | ✅ Generated | YYYY-MM-DD HH:MM | Passed all checks |
```

Verify it was added:
```bash
tail -1 ~/Documents/figma-ai-project/03-figma-links/components.md
```

**6. [ ] Storybook (Automated)**

Call `preview_start "Storybook"` to start (or reuse) the Storybook server.

Navigate to the story iframe to confirm the component renders without errors:
```
http://localhost:6006/iframe.html?id=components-[componentname]--default&viewMode=story
```

- Check `preview_console_logs` for errors → if any: **FAIL** → fix component and re-check
- Check `preview_snapshot` confirms the component is visible → **PASS** ✅

**7. [ ] Playwright Tests (Automated)**

Run this command:
```bash
npm run test:playwright
```

- If any tests fail: **FAIL** → read the failure output, fix the spec or component, re-run
- If all tests pass: **PASS** ✅

**8. [ ] Size Variants (Conditional — skip if size prop not in scope)**

Verify in the running Storybook:
- Navigate to the `Sizes` story iframe and call `preview_snapshot` — confirm all 5 variants render at visually distinct scales
- Check `preview_console_logs` for errors — if any: **FAIL** → fix and re-check
- Verify the Playwright `data-size` test(s) pass in the run above
- If the component renders `role="region"` landmarks: verify the `landmark-unique` axe test passes (add one if missing, scoped with `.disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])`)

**9. [ ] Dependency Audit (Automated)**

Run this command:
```bash
~/Documents/figma-ai-project/scripts/dependency-audit.sh [ComponentName]
```

- If exit code 0: **PASS** → All dependencies secure
- If exit code 1: **FAIL** → Review output for missing packages or vulnerabilities
- If missing packages found: regenerate or install manually
- If vulnerabilities found: run `npm audit fix` or update packages

**10. [ ] Visual Snapshot Baseline (Automated)**

Run this command:
```bash
npm run test:playwright -- --grep "screenshot"
```

First run requires creating the baseline:
```bash
npx playwright test --update-snapshots
```

- If snapshot exists and matches: **PASS** ✅
- If no snapshot test in spec: **WARN** → add `toHaveScreenshot` test (see Stage 2 step 4)
- If snapshot diff: **FAIL** → a CSS token changed visually; inspect the diff image in `test-results/`

> **Why:** A misspelled `var(--mantine-color-bue-8)` resolves to `initial` (transparent), passes Token Compliance (valid CSS syntax), passes all other gates, and only shows up as a blank/wrong-color component. Screenshots are the only automated gate that catches this class of silent failure.

**11. [ ] Portal CSS Variable Scope (Automated)**

Run this command:
```bash
~/Documents/figma-ai-project/scripts/quality-gate.sh [ComponentName] --skip-deps
```

Check 11 runs as part of the full gate script. Review its output specifically.

- If **PASS** or **N/A**: no portal scoping issues ✅
- If **FAIL**: component-specific CSS variables defined in `.root` are used inside portal-rendered classes (`.dropdown`, `.option`, `.panel`, etc.)

> **Why:** Mantine renders Select dropdowns, tooltips, and popovers into a DOM portal outside the component's root element. CSS custom properties defined on `.root` do not cascade into the portal — the fallback value always fires, so size-scaling tokens silently have no effect.

Fix options (pick the simplest):
1. Replace the component-specific variable with a concrete Mantine token directly in the portal class: `font-size: var(--mantine-font-size-sm)` instead of `var(--comp-fz, ...)`
2. Define the variable on `:root` so it cascades everywhere
3. Use Mantine's `vars` prop to inject values into specific slots at render time

─────────────────────────────────────────
FAILURE RECOVERY PROTOCOL
─────────────────────────────────────────

If Token Compliance fails:
  1. Output: "❌ FAIL: Token Compliance - Found N violations"
  2. List each with line number
  3. Regenerate CSS file only
  4. Re-run grep check

If File Integrity fails:
  1. Output: "❌ FAIL: File Integrity - Missing [filename]"
  2. Generate missing file(s) only
  3. Re-run ls check

If PostCSS/Prop fails:
  1. Output: "❌ FAIL: [specific issue]"
  2. Regenerate affected file(s)
  3. Re-run all checks

If Dependency Audit fails:
  1. Output: "❌ FAIL: Dependency Audit - [specific issue]"
  2. If missing packages: list them and suggest installation
  3. If vulnerabilities: run `npm audit fix` and re-check
  4. Re-run dependency-audit.sh

If Visual Snapshot fails:
  1. Output: "❌ FAIL: Visual Snapshot - screenshot diff detected"
  2. Open the diff image in `test-results/` to identify the visual change
  3. If the change is intentional: run `npx playwright test --update-snapshots` to update baseline
  4. If unintentional: trace to the CSS change that caused it (token rename, value drift, misspelling)
  5. Re-run the snapshot test

If Portal CSS Scope fails:
  1. Output: "❌ FAIL: Portal CSS Variable Scope - [variable names]"
  2. For each flagged variable, choose a fix:
     a. Replace with a concrete `var(--mantine-*)` token in the portal class (simplest)
     b. Hoist the definition to `:root` level in the CSS file
     c. Use Mantine's `vars` prop to inject the value at render time
  3. Re-run quality-gate.sh to verify fix

Max iterations: 3
If still failing → Output "BLOCKED: Needs human review" + attempted fixes

─────────────────────────────────────────
EXIT CONDITION
─────────────────────────────────────────

All checks ✅ → Output this format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPONENT GENERATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: [ComponentName]
Generated: YYYY-MM-DD HH:MM

Files Created:
  ✅ [ComponentName].tsx (XXX lines)
  ✅ [ComponentName].module.css (XX lines, 0 hardcoded values)
  ✅ [ComponentName].stories.tsx (X variants)
  ✅ [ComponentName].spec.ts (XX test cases)

Automated Checks:
  ✅ Dependencies: PASS (all packages present / N installed)
  ✅ Token Compliance: PASS (grep returned empty)
  ✅ File Integrity: PASS (all 4 files exist, non-zero size)
  ✅ PostCSS Standard: PASS (rem/mixin/light-dark all correct)
  ✅ Prop Validity: PASS (all props in mantine-llms.txt)
  ✅ Tracker Updated: PASS (row added to components.md)
  ✅ Storybook: PASS (component renders, no console errors)
  ✅ Playwright: PASS (all tests passed)
  ✅ Size Variants: PASS (Sizes story renders, data-size attribute verified) — or N/A if size not in scope
  ✅ Dependency Audit: PASS (all dependencies secure)
  ✅ Visual Snapshot: PASS (screenshot baseline captured, no diff)
  ✅ Portal Scope: PASS (no component vars leak from .root to portal classes) — or N/A if no portal classes

Location: ~/Documents/figma-ai-project/02-generated/[ComponentName]/

Next Step:
  → Move to production codebase

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Stage 2+3 Prompt: Figma-to-Mantine — Act + Reflect

You are running **Stage 2 (Act) + Stage 3 (Reflect)**. The Stage 1 plan has been approved by a human and is injected into this prompt.

## CRITICAL: No Figma MCP calls
Do NOT call `get_metadata`, `get_design_context`, or any other Figma MCP tool.
All design context — variants, token mappings, WCAG decisions — is documented in the Stage 1 plan below.
If the plan is missing information you need, output:
  `BLOCKED: plan missing [specific field]`
and stop. Do not infer or guess missing design decisions.

## CRITICAL: Approved Architectural Conflicts
The Stage 1 plan may contain an `Architectural Conflicts & Recommendations` section.
Any conflicts listed there have been **reviewed and approved by a human**.

- 🔴 BLOCK conflicts: implement the **Framework Solution** as described — NOT the original Figma design
- 🟡 ADAPT conflicts: implement the flow-layout alternative described — document the delta from Figma in a comment
- 🔵 NOTE conflicts: apply the recommended token override or pattern — the Figma aesthetic was intentionally overridden

If the plan contains `AWAITING APPROVAL` on a BLOCK conflict and you were not given explicit
go-ahead, output `BLOCKED: unresolved architectural conflict — [conflict name]` and stop.

## 🧠 CONTEXT & CONVENTIONS
- **Style Guide:** Injected into this prompt (PostCSS rules, naming conventions)
- **Mantine API:** The relevant component section is injected into this prompt — do not re-read mantine-llms.txt
- **Golden Patterns:** `~/Documents/figma-ai-project/01-golden-examples/` for architecture and testing logic
- **Rules + Gotchas:** Injected via CLAUDE.md — read all Silent Failure Patterns before writing CSS or specs

─────────────────────────────────────────
STAGE 2 — ACT (Generate Artifacts)
─────────────────────────────────────────

**Behavioral contract for this stage:**
Build completely. Implement all 4 files in full. Fix adjacent quality issues you notice during implementation (a misplaced token, a missing `:visible` locator qualifier) — these are in scope. Do not ask for confirmation on decisions already covered by the approved plan.

If context is becoming long and you have not yet written all 4 files: complete the current file cleanly and pause — output exactly which files remain and what each needs. A clean partial output is recoverable. All 4 files in a degraded state is not.

Generate these artifacts in:
`~/Documents/figma-ai-project/02-generated/[ComponentName]/`

1. **[ComponentName].tsx**:
   - Uses `classNames={{ ...classes }}` Styles API
   - Passes state as `data-` attributes
   - If size variants in scope: `size?: MantineSize` prop, `data-size={size}` on root, `size` forwarded to Mantine input child(ren)

2. **[ComponentName].module.css**:
   - All spacing: `rem()`
   - Hover states: `@mixin hover`
   - Theme colors: `light-dark()`
   - ZERO hardcoded hex/rgb/px values
   - If size variants in scope: CSS custom property cascade on `.root` — declare defaults **before** nested `[data-size]` selectors (cascade ordering rule)

3. **[ComponentName].stories.tsx**:
   - CSF 3 format
   - No per-story `MantineProvider` decorators — global preview.tsx handles `primaryShade: 8`
   - Includes `Default` and `Showcase` variants
   - `tags: ['autodocs']` in meta (required for the docs page)
   - If size variants in scope: `Sizes` story rendering all 5 sizes (`xs`→`xl`) stacked, pre-filled with a representative value; `size` argType with `select` control
   - If the component renders `role="region"` landmarks, use a `sizeItems(prefix)` helper to give each size instance unique item labels
   - **Playwright fixture stories:** If a story needs to start in a specific pre-loaded state for Playwright (e.g. drawer open, form in error state), add `parameters: { docs: { disable: true } }` to hide it from the docs page. Place it after docs-visible stories in the file so `Showcase` or `Default` is the docs page primary. The story remains accessible at its direct iframe URL for Playwright.
   - **Thin wrapper rule:** If the component is a thin wrapper around a Mantine component (props are mostly `...rest` spread into a Mantine component), autodocs will be sparse because Storybook cannot introspect external library types. You MUST add explicit `argTypes` in meta for every meaningful prop (control type, description, defaultValue). You MUST include a `Showcase` story that uses `args:` (not a bare `render:` function) so the Controls panel and docs page interactive knobs work. Hide internal/required props (`opened`, `onClose`, callbacks) with `table: { disable: true }`. This applies to: Drawer, Modal, Tooltip, Popover, Menu, and any component whose prop type is `Omit<MantineFooProps, '...'>` or `extends MantineFooProps`.

4. **[ComponentName].spec.ts**:
   - Playwright tests targeting Storybook iframe
   - All interaction states covered
   - Use `.mantine-[Component]-input` (not `input[role="combobox"]`) for Combobox-based inputs
   - Use `.mantine-[Component]-root[data-size]` (not bare `[data-size]`) for size assertions
   - If size variants in scope: test that root element carries `data-size="md"` by default
   - **Visual snapshot:** one `toHaveScreenshot` test on the Default story:
     ```ts
     test('default story screenshot', async ({ page }) => {
       await page.goto(story('default'));
       await page.locator('.mantine-ComponentName-root').first().waitFor();
       await expect(page).toHaveScreenshot('default.png');
     });
     ```

5. **Tracker Update:** Append row to `~/Documents/figma-ai-project/03-figma-links/components.md`

─────────────────────────────────────────
STAGE 3 — REFLECT (Automated Quality Gate)
─────────────────────────────────────────

**Behavioral contract for this stage:**
Fix precisely. Only touch files or tests that failed a quality gate. Do not refactor, rename, restructure, or "improve" anything that passed. A Stage 3 that changes passing code introduces new failure risk rather than reducing it.

Use the **shell** tool to run these automated checks:

**1. [ ] Token Compliance (Automated)**
```bash
grep -E '(#[0-9A-Fa-f]{3,6}|rgb|[0-9]+px)' \
  ~/Documents/figma-ai-project/02-generated/[ComponentName]/[ComponentName].module.css
```
Expected output: (empty). If matches found: **FAIL** → list violations, regenerate CSS.

**2. [ ] File Integrity (Automated)**
```bash
ls -la ~/Documents/figma-ai-project/02-generated/[ComponentName]/
```
Verify: 4 files exist (.tsx, .module.css, .stories.tsx, .spec.ts), all non-zero size.

**3. [ ] PostCSS Standard (Manual)**
Verify in [ComponentName].module.css:
- All spacing uses `rem()` ✅
- Hover states use `@mixin hover` ✅
- Theme-aware colors use `light-dark()` ✅

**4. [ ] Prop Validity (Manual)**
Verify all props exist in the Mantine API section injected into this prompt.

**5. [ ] Tracker Update (Automated)**
```bash
tail -1 ~/Documents/figma-ai-project/03-figma-links/components.md
```
Verify the row was added.

**6. [ ] Storybook (Automated)**
Navigate to the story iframe and confirm the component renders without errors:
```
http://localhost:6006/iframe.html?id=components-[componentname]--default&viewMode=story
```
Check `preview_console_logs` for errors → if any: **FAIL** → fix and re-check.

**7. [ ] Playwright Tests (Automated)**
```bash
npm run test:playwright -- 02-generated/[ComponentName]/[ComponentName].spec.ts
```
If any tests fail: **FAIL** → read the failure output, fix the spec or component, re-run.

**8. [ ] Size Variants (Conditional — skip if size prop not in scope)**
- Navigate to the `Sizes` story and call `preview_snapshot` — confirm all 5 variants render
- Verify the Playwright `data-size` test(s) pass

**9. [ ] Dependency Audit (Automated)**
```bash
~/Documents/figma-ai-project/scripts/dependency-audit.sh [ComponentName]
```
If exit code 0: **PASS**. If exit code 1: **FAIL** → review output.

**10. [ ] Visual Snapshot Baseline (Automated)**
```bash
npx playwright test 02-generated/[ComponentName]/[ComponentName].spec.ts --update-snapshots
```
Creates the baseline on first run.

**11. [ ] Portal CSS Variable Scope (Automated)**
```bash
~/Documents/figma-ai-project/scripts/quality-gate.sh [ComponentName] --skip-deps
```
If **FAIL**: component-specific CSS variables defined in `.root` are used inside portal-rendered classes.
Fix: replace with a concrete `var(--mantine-*)` token directly in the portal class.

─────────────────────────────────────────
FAILURE RECOVERY PROTOCOL
─────────────────────────────────────────

- Token/PostCSS failures → regenerate CSS file only, re-run check
- File integrity failures → generate missing file(s) only
- Playwright failures → read failure output, fix spec or component, re-run
- Dependency audit failures → install missing packages or run `npm audit fix`
- Visual snapshot diff → inspect diff in `test-results/`, update baseline if intentional

Max iterations: 3 per check.
If still failing after 3 attempts → Output `BLOCKED: Needs human review` + list of attempted fixes.

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
  ✅ [ComponentName].stories.tsx (X stories)
  ✅ [ComponentName].spec.ts (XX test cases)

Automated Checks:
  ✅ Token Compliance: PASS
  ✅ File Integrity: PASS
  ✅ PostCSS Standard: PASS
  ✅ Prop Validity: PASS
  ✅ Tracker Updated: PASS
  ✅ Storybook: PASS
  ✅ Playwright: PASS
  ✅ Size Variants: PASS (or N/A)
  ✅ Dependency Audit: PASS
  ✅ Visual Snapshot: PASS
  ✅ Portal Scope: PASS (or N/A)

Location: ~/Documents/figma-ai-project/02-generated/[ComponentName]/

Next Step: → Run Storybook + Playwright: npm run storybook && npm run test:playwright
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

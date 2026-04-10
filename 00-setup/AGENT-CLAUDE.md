# Figma → Mantine Component Generation

This project auto-generates production-ready Mantine v7 components from Figma designs using a 3-stage AI workflow (Plan → Act → Reflect), validated by Storybook and Playwright.

---

## Directory Structure

```
00-setup/           — stage1-prompt.md, stage23-prompt.md, style_guide.md, mantine-llms.txt (runtime cache)
01-golden-examples/ — canonical reference components (Button, Card, TextInput)
02-generated/       — AI-generated components (one folder per component)
03-figma-links/     — components.md tracker (Figma URL → status)
.storybook/         — Storybook config (main.js, preview.js)
scripts/            — dispatch-agent.sh, quality-gate.sh
```

Each generated component lives at `02-generated/<Name>/` and contains:
- `<Name>.tsx`
- `<Name>.module.css`
- `<Name>.stories.tsx`
- `<Name>.spec.ts`

---

## Default Workflow

1. Follow the stage prompt injected into this session (Stage 1 or Stage 2+3)
2. Apply all rules in this file
3. Run all quality gates (Stage 3)

---

## Critical Rules — enforce before writing any code

**CSS (Stage 3 will reject violations):**
- No hex codes / raw RGB → use `var(--mantine-color-*)` or `light-dark()`
- No raw px → use `rem()` or `var(--mantine-spacing-*)` (px *inside* `rem()` is valid: `rem(12px)`)
- No `!important` → use `:where()` or the Styles API
- `:where()` on all `[data-*]` selectors → keeps specificity at `0-1-0`
- Declare default CSS custom properties **before** nested `[data-size]` selectors — PostCSS compiles nesting to equal specificity, so declaration order is the tiebreaker

**Silent failures most likely to slip through:**
- Misspelled `var(--mantine-*)` token → falls back to `initial` (transparent/0), passes every text gate; only the visual snapshot catches it
- `page.locator('button')` without `:visible` → strict mode violation (3 hidden skeleton buttons always present in Storybook iframe)
- `data-foo={false}` instead of `data-foo={value || undefined}` → attribute is always present as `"false"`, CSS `:where([data-foo])` always fires
- `--mantine-color-dimmed`, `--mantine-color-error`, `--mantine-color-red-filled` for visible text → all resolve to shades that fail WCAG AA contrast
- CSS custom properties defined on `.root` referenced in portal classes (`.dropdown`, `.option`, `.panel`) → Mantine renders portals outside the component's DOM subtree; the cascade does not reach them

---

## Figma MCP

Stage 1 only has access to:
- `get_metadata` — inspect node type, children, variant properties
- `get_design_context` — extract exact tokens (font-weight, color, spacing, radius) per node

Stage 2+3 has **no Figma MCP access** — work from the approved plan only. If the plan is missing required information output `BLOCKED: plan missing [field]` and stop.

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
- Tests: `npm run test:playwright`

---

## Storybook Config

- Scans `02-generated/**/*.stories.*` only
- Global `MantineProvider` with `theme={{ primaryShade: 8 }}` in `.storybook/preview.js`
- Addons: `addon-essentials`, `addon-interactions`, `addon-a11y`
- **Do NOT add per-story `MantineProvider` decorators** — they reset the theme and lose `primaryShade: 8`

**Playwright fixture stories:**
If a story needs to start in a specific state for Playwright tests (e.g. a modal/drawer pre-opened, a component pre-filled), hide it from the docs page with `parameters: { docs: { disable: true } }`. The story remains accessible at its iframe URL. Keep it named clearly (e.g. `Open`) and place it after the docs-visible stories in the file so `Showcase` or `Default` is the docs page primary. This prevents a pre-opened drawer or pre-errored form from appearing as the component's "normal" state in documentation.

**Thin wrapper components — autodocs rule:**
If the component prop type is `Omit<MantineFooProps, '...'>` or `extends MantineFooProps` (i.e. the component is a thin wrapper), Storybook cannot introspect the external type — the docs page will be blank. You MUST:
1. Add explicit `argTypes` in meta for every meaningful prop (control, description, defaultValue)
2. Hide internal/required props with `table: { disable: true }` (e.g. `opened`, `onClose`)
3. Include a `Showcase` story using `args:` (not a bare `render:` function) so Controls work

This applies to: Drawer, Modal, Tooltip, Popover, Menu, and any similar wrapper.

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
10. Visual Snapshot — `toHaveScreenshot` assertion present in spec
11. Portal CSS Variable Scope — component vars in `.root` not used in portal classes

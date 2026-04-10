# Mantine Style Guide

## PostCSS Conventions

### Spacing — always use `rem()`
```css
/* ✅ Correct — px inside rem() is valid PostCSS */
padding: rem(12px);
border: rem(1px) solid var(--mantine-color-gray-3);

/* ❌ Wrong — bare px */
padding: 12px;
border: 1px solid var(--mantine-color-gray-3);
```

### Hover states — always use `@mixin hover`
```css
/* ✅ Correct */
.root {
  @mixin hover { background-color: var(--mantine-color-blue-9); }
}

/* ❌ Wrong */
.root:hover { background-color: var(--mantine-color-blue-9); }
```

### Theme-aware colors — always use `light-dark()`
```css
/* ✅ Correct */
color: light-dark(var(--mantine-color-gray-9), var(--mantine-color-gray-0));

/* ❌ Wrong — breaks dark mode */
color: var(--mantine-color-gray-9);
```

### No hex / rgb — use `var(--mantine-color-*)`
```css
/* ✅ Correct */
background: var(--mantine-color-blue-8);

/* ❌ Wrong */
background: #1971c2;
background: rgb(25, 113, 194);
```

---

## Sizing System — Custom Property Cascade

### Rule: declare defaults BEFORE nested `[data-size]` selectors
PostCSS compiles nesting to same-specificity rules. A default declared
*after* nested selectors always wins and kills the size scale silently.

```css
/* ✅ CORRECT — default first */
.root {
  --comp-fz: var(--mantine-font-size-md);
  --comp-lh: rem(22px);

  &:where([data-size='sm']) { --comp-fz: var(--mantine-font-size-sm); --comp-lh: rem(18px); }
  &:where([data-size='lg']) { --comp-fz: var(--mantine-font-size-lg); --comp-lh: rem(26px); }
}

/* ❌ WRONG — default after nested selectors; always wins */
.root {
  &:where([data-size='sm']) { --comp-fz: var(--mantine-font-size-sm); }
  --comp-fz: rem(16px);   /* overrides every size, silently */
}
```

### Use `:where()` on all `[data-*]` selectors
Keeps specificity at `0-1-0` so Styles API and inline overrides always win:
```css
/* ✅ */
&:where([data-variant='filled']) { ... }
&:where([data-size='sm']) { ... }
```

### Absolute centering (loaders, overlays)
```css
/* ✅ CORRECT — both translate offsets required */
.loader { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }

/* ❌ WRONG — element appears in wrong quadrant */
.loader { position: absolute; left: 50%; top: 50%; }
```

---

## Color Contrast (WCAG AA — 4.5:1 at 12–14px normal weight)

`primaryShade: 8` in MantineProvider only affects the **primary color (blue)**.
All other colors use their built-in filled shade — many fail 4.5:1 on white.

| Color | Failing shade | Passing shade | Notes |
|-------|--------------|---------------|-------|
| blue  | 6 → 3.55:1 ❌ | 8 → 4.63:1 ✅ | handled by `primaryShade: 8` |
| gray  | 6 → 3.15:1 ❌ | 7 → 7.45:1 ✅ | use for descriptions/dimmed text |
| teal  | 7 → 3.11:1 ❌ | 9 → 4.53:1 ✅ | |
| red   | 7 → 3.84:1 ❌ | 9 → 5.12:1 ✅ | |
| green | 7 → 3.44:1 ❌ | 9 ✅           | |
| grape | 7 ✅ (~7:1)   | —             | dark enough at default filled shade |
| indigo| 6 ❌          | 8 ✅           | |
| yellow| all shades ❌ | none          | cannot reach 4.5:1 with white text |
| orange| all shades ❌ | none          | cannot reach 4.5:1 with white text |

**Fix pattern** — override `--badge-color` (or equivalent token) inline:
```tsx
<Badge
  color="green"
  style={{ '--badge-color': 'var(--mantine-color-green-9)' } as React.CSSProperties}
>
  Green
</Badge>
```

**Description / dimmed text** — Figma's `--text/dimmed` (#868e96, gray.6) is 3.15:1 on white.
Always promote to `var(--mantine-color-gray-7)` (7.45:1).

---

## Component Patterns

### Base component — use `UnstyledButton`, never Mantine `Button`
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
- Pass state as `data-*` attributes so CSS can target them
- Use `data-foo={value || undefined}` — attribute is absent (not `"false"`) when inactive

### `data-active` — Mantine sets `"true"`, not `""`
```ts
/* ✅ CORRECT */
expect(item).toHaveAttribute('data-active', 'true');

/* ❌ WRONG — Mantine v7 never sets data-active="" */
expect(item).toHaveAttribute('data-active', '');
```

---

## File Structure

Each component lives at `02-generated/<Name>/` with exactly 4 files:

| File | Purpose |
|------|---------|
| `<Name>.tsx` | Component logic — `UnstyledButton`/`Box` base, `data-*` attrs, `classNames` Styles API |
| `<Name>.module.css` | Styles — `rem()`, `@mixin hover`, `light-dark()`, `:where([data-*])` |
| `<Name>.stories.tsx` | CSF 3, `tags: ['autodocs']`, no per-story `MantineProvider` |
| `<Name>.spec.ts` | Playwright — `button:visible`, axe scoped to component root |

---

## Silent Failure Patterns

No compile errors, no runtime warnings — only wrong visuals or test failures.

### 1. Misspelled `var(--mantine-*)` token
Property falls back to `initial` (transparent / 0). Cross-check every token name against `mantine-llms.txt`. Stage 3 visual snapshot is the only catch.

### 2. `@mixin` outside PostCSS scope
Hover/dark styles silently absent. Only works in `.module.css` files processed by Vite + `postcss-preset-mantine`.

### 3. `data-*` boolean vs string
```tsx
/* ✅ Attribute absent when false */
data-loading={loading || undefined}

/* ❌ Renders data-loading="false" — CSS selector [data-loading] still matches */
data-loading={loading}
```

### 4. `tags: ['autodocs']` skeleton elements
Storybook always injects 3 hidden `<button>Set string</button>` elements into `iframe.html`. `page.locator('button')` triggers strict mode violation (3+ matches).
```ts
/* ✅ */ const btn = page.locator('button:visible');
/* ❌ */ const btn = page.locator('button');
```

### 5. `data-active` is a string, not presence
Mantine v7 sets `data-active="true"` on active items (e.g. open Accordion). `toHaveAttribute('data-active', '')` silently fails.

### 6. DOM order ≠ visual order
Mantine renders some elements (e.g. Accordion chevron) first in the DOM regardless of the `chevronPosition` prop — flex CSS handles visual placement. Use `getBoundingClientRect()` comparisons, not `compareDocumentPosition`.

### 7. Sizes story `landmark-unique` violation
Five stacked instances of a panel-based component (`role="region"`) with identical item labels produce duplicate accessible names. Axe flags this as a moderate violation.
Fix: use a `sizeItems(prefix)` helper that prepends the size token to each label:
```ts
const sizeItems = (prefix: string) => [
  { value: 'item-1', label: `${prefix} — First item`, content: '...' },
  { value: 'item-2', label: `${prefix} — Second item`, content: '...' },
];
// Usage in Sizes story:
<Accordion items={sizeItems('xs')} size="xs" />
<Accordion items={sizeItems('sm')} size="sm" />
```

---

## Playwright Spec Patterns

### Story URL helper
```ts
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-${componentSlug}--${name}&viewMode=story`;
// Never embed &viewMode=story in BASE_URL — it produces malformed URLs when concatenated
```

### Axe scoping — single instance
Scope to the component root to exclude Storybook iframe false positives:
```ts
const results = await new AxeBuilder({ page }).include('.mantine-Badge-root').analyze();
// Excludes: landmark-one-main, page-has-heading-one
```

### Axe scoping — multi-instance story (Sizes)
Cannot scope to a single root when multiple instances are present:
```ts
const results = await new AxeBuilder({ page })
  .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
  .analyze();
expect(results.violations).toEqual([]);
```

### `page.evaluate()` — always `waitFor()` first
DOM queries return `null` if the component hasn't mounted:
```ts
/* ✅ CORRECT */
await page.locator('.mantine-Accordion-root').waitFor();
const left = await page.evaluate(() =>
  document.querySelector('.mantine-Accordion-label')?.getBoundingClientRect().left
);

/* ❌ WRONG — may return null */
const left = await page.evaluate(() => document.querySelector(...)?.getBoundingClientRect().left);
```

### Visual layout — `getBoundingClientRect()`, not DOM order
```ts
/* ✅ CORRECT — tests visual placement */
const rects = await page.evaluate(() => ({
  labelLeft: document.querySelector('.mantine-Accordion-label')!.getBoundingClientRect().left,
  chevronLeft: document.querySelector('.mantine-Accordion-chevron')!.getBoundingClientRect().left,
}));
expect(rects.chevronLeft).toBeGreaterThan(rects.labelLeft);

/* ❌ WRONG — DOM order ≠ visual order with CSS flex */
const isAfter = !!(label.compareDocumentPosition(chevron) & Node.DOCUMENT_POSITION_FOLLOWING);
```

### Axe — plain CSS selectors only
`:visible` is Playwright-only. Axe handles hidden elements internally:
```ts
/* ✅ */ .include('button')
/* ❌ */ .include('button:visible')
```

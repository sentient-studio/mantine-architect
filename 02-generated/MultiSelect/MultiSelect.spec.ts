import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-multiselect--${name}&viewMode=story`;

test.describe('MultiSelect', () => {
  // ─── Visual snapshot ───────────────────────────────────────────────────────
  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-MultiSelect-root').first().waitFor();
    await expect(page).toHaveScreenshot('default.png');
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────
  test('renders with placeholder when empty', async ({ page }) => {
    await page.goto(story('default'));
    const input = page.locator('.mantine-MultiSelect-input').first();
    await expect(input).toBeVisible();
  });

  test('renders label text', async ({ page }) => {
    await page.goto(story('default'));
    const label = page.locator('.mantine-MultiSelect-label');
    await expect(label).toBeVisible();
    await expect(label).toContainText('Favourite fruits');
  });

  // ─── Size variants ─────────────────────────────────────────────────────────
  test('carries data-size="md" by default', async ({ page }) => {
    await page.goto(story('default'));
    // .mantine-MultiSelect-root[data-size] — stable 1-per-instance selector
    const root = page.locator('.mantine-MultiSelect-root[data-size]').first();
    await expect(root).toHaveAttribute('data-size', 'md');
  });

  test('carries correct data-size for each size in Sizes story', async ({ page }) => {
    await page.goto(story('sizes'));
    const roots = page.locator('.mantine-MultiSelect-root[data-size]');
    await expect(roots.nth(0)).toHaveAttribute('data-size', 'xs');
    await expect(roots.nth(1)).toHaveAttribute('data-size', 'sm');
    await expect(roots.nth(2)).toHaveAttribute('data-size', 'md');
    await expect(roots.nth(3)).toHaveAttribute('data-size', 'lg');
    await expect(roots.nth(4)).toHaveAttribute('data-size', 'xl');
  });

  // ─── Pills ─────────────────────────────────────────────────────────────────
  test('shows pills for pre-selected values', async ({ page }) => {
    await page.goto(story('filled'));
    await page.locator('.mantine-MultiSelect-root').first().waitFor();
    // Each selected value renders one pill (the "delete" button is inside the pill)
    const pills = page.locator('.mantine-MultiSelect-pill:visible');
    await expect(pills).toHaveCount(2);
  });

  test('pills have remove buttons', async ({ page }) => {
    await page.goto(story('filled'));
    await page.locator('.mantine-MultiSelect-pill:visible').first().waitFor();
    const removeBtns = page.locator('.mantine-Pill-remove:visible');
    await expect(removeBtns).toHaveCount(2);
  });

  test('clicking remove button removes the pill', async ({ page }) => {
    await page.goto(story('filled'));
    await page.locator('.mantine-MultiSelect-pill:visible').first().waitFor();
    const firstRemove = page.locator('.mantine-Pill-remove:visible').first();
    await firstRemove.click();
    const pills = page.locator('.mantine-MultiSelect-pill:visible');
    await expect(pills).toHaveCount(1);
  });

  // ─── Dropdown interaction ──────────────────────────────────────────────────
  test('opens dropdown on click and shows options', async ({ page }) => {
    await page.goto(story('default'));
    const input = page.locator('.mantine-MultiSelect-input:visible').first();
    await input.click();
    const dropdown = page.locator('.mantine-MultiSelect-dropdown');
    await expect(dropdown).toBeVisible();
    const options = page.locator('.mantine-MultiSelect-option');
    await expect(options.first()).toBeVisible();
  });

  test('selecting an option adds a pill', async ({ page }) => {
    await page.goto(story('default'));
    const input = page.locator('.mantine-MultiSelect-input:visible').first();
    await input.click();
    const option = page.locator('.mantine-MultiSelect-option', { hasText: 'Apple' });
    await option.waitFor();
    await option.click();
    const pills = page.locator('.mantine-MultiSelect-pill:visible');
    await expect(pills).toHaveCount(1);
  });

  test('selecting multiple options adds multiple pills', async ({ page }) => {
    await page.goto(story('default'));
    const input = page.locator('.mantine-MultiSelect-input:visible').first();
    await input.click();
    // Mantine MultiSelect keeps the dropdown open after each selection
    await page.locator('.mantine-MultiSelect-option', { hasText: 'Apple' }).click();
    // Banana option is still visible in the open dropdown — no need to re-click input
    const bananaOption = page.locator('.mantine-MultiSelect-option:visible', { hasText: 'Banana' });
    await bananaOption.waitFor();
    await bananaOption.click();
    const pills = page.locator('.mantine-MultiSelect-pill:visible');
    await expect(pills).toHaveCount(2);
  });

  test('closes dropdown with Escape key', async ({ page }) => {
    await page.goto(story('default'));
    const input = page.locator('.mantine-MultiSelect-input:visible').first();
    await input.click();
    await expect(page.locator('.mantine-MultiSelect-dropdown')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mantine-MultiSelect-dropdown')).not.toBeVisible();
  });

  // ─── Searchable ────────────────────────────────────────────────────────────
  test('filters options when searchable', async ({ page }) => {
    await page.goto(story('searchable'));
    const inputField = page.locator('.mantine-MultiSelect-inputField:visible').first();
    await inputField.click();
    await inputField.fill('Ban');
    const options = page.locator('.mantine-MultiSelect-option:visible');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('Banana');
  });

  // ─── States ────────────────────────────────────────────────────────────────
  test('displays error message', async ({ page }) => {
    await page.goto(story('error-state'));
    await page.locator('.mantine-MultiSelect-root').first().waitFor();
    const error = page.locator('.mantine-MultiSelect-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Please select at least one fruit');
  });

  test('error state marks input with data-error', async ({ page }) => {
    await page.goto(story('error-state'));
    const input = page.locator('.mantine-MultiSelect-input').first();
    await expect(input).toHaveAttribute('data-error', 'true');
  });

  test('disabled state — input has data-disabled', async ({ page }) => {
    await page.goto(story('disabled'));
    await page.locator('.mantine-MultiSelect-root').first().waitFor();
    const input = page.locator('.mantine-MultiSelect-input').first();
    await expect(input).toHaveAttribute('data-disabled');
  });

  test('disabled state — dropdown does not open on click', async ({ page }) => {
    await page.goto(story('disabled'));
    const input = page.locator('.mantine-MultiSelect-input').first();
    await input.click({ force: true });
    const dropdown = page.locator('.mantine-MultiSelect-dropdown');
    await expect(dropdown).not.toBeVisible();
  });

  // ─── Clearable ─────────────────────────────────────────────────────────────
  test('clear button is visible when clearable and value present', async ({ page }) => {
    await page.goto(story('clearable'));
    await page.locator('.mantine-MultiSelect-root').first().waitFor();
    // Mantine renders the clear button inside the right section
    const clearBtn = page.locator('.mantine-MultiSelect-section button:visible').first();
    await expect(clearBtn).toBeVisible();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────
  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-MultiSelect-input').waitFor();
    const results = await new AxeBuilder({ page })
      .include('.mantine-MultiSelect-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on filled story', async ({ page }) => {
    await page.goto(story('filled'));
    await page.locator('.mantine-MultiSelect-input').waitFor();
    const results = await new AxeBuilder({ page })
      .include('.mantine-MultiSelect-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on error story', async ({ page }) => {
    await page.goto(story('error-state'));
    await page.locator('.mantine-MultiSelect-input').waitFor();
    const results = await new AxeBuilder({ page })
      .include('.mantine-MultiSelect-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on disabled story', async ({ page }) => {
    await page.goto(story('disabled'));
    await page.locator('.mantine-MultiSelect-input').waitFor();
    // WCAG 1.4.3 explicitly exempts inactive UI components from contrast requirements.
    // color-contrast is disabled here intentionally — it is not a real violation.
    const results = await new AxeBuilder({ page })
      .include('.mantine-MultiSelect-root')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on Sizes story', async ({ page }) => {
    await page.goto(story('sizes'));
    await page.locator('.mantine-MultiSelect-input').first().waitFor();
    // Multi-instance story — disable iframe structural false positives
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

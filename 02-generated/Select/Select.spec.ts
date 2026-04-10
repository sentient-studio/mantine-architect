import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-select--${name}&viewMode=story`;

test.describe('Select', () => {
  // ─── Visual snapshot ───────────────────────────────────────────────────────
  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Select-root').first().waitFor();
    await expect(page).toHaveScreenshot('default.png');
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────
  test('renders combobox input with placeholder', async ({ page }) => {
    await page.goto(story('default'));

    // Mantine v7 Select input: no role="combobox", uses aria-haspopup="listbox"
    const input = page.locator('.mantine-Select-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Pick a fruit');
  });

  // ─── Size variants ─────────────────────────────────────────────────────────
  test('carries data-size="md" by default', async ({ page }) => {
    await page.goto(story('default'));

    // data-size is on .mantine-Select-root (Mantine sets it when size prop is passed)
    const root = page.locator('.mantine-Select-root[data-size]').first();
    await expect(root).toHaveAttribute('data-size', 'md');
  });

  test('carries correct data-size for each size in Sizes story', async ({ page }) => {
    await page.goto(story('sizes'));

    // One .mantine-Select-root per size instance — stable 1-per-instance selector
    const roots = page.locator('.mantine-Select-root[data-size]');
    await expect(roots.nth(0)).toHaveAttribute('data-size', 'xs');
    await expect(roots.nth(1)).toHaveAttribute('data-size', 'sm');
    await expect(roots.nth(2)).toHaveAttribute('data-size', 'md');
    await expect(roots.nth(3)).toHaveAttribute('data-size', 'lg');
    await expect(roots.nth(4)).toHaveAttribute('data-size', 'xl');
  });

  // ─── Interaction ───────────────────────────────────────────────────────────
  test('opens dropdown on click and shows options', async ({ page }) => {
    await page.goto(story('default'));

    const input = page.locator('.mantine-Select-input').first();
    await input.click();

    const dropdown = page.locator('.mantine-Select-dropdown');
    await expect(dropdown).toBeVisible();

    const options = page.locator('.mantine-Select-option');
    await expect(options.first()).toBeVisible();
  });

  test('selects an option and updates input value', async ({ page }) => {
    await page.goto(story('default'));

    const input = page.locator('.mantine-Select-input').first();
    await input.click();

    const option = page.locator('.mantine-Select-option', { hasText: 'Apple' });
    await option.click();

    await expect(input).toHaveValue('Apple');
  });

  test('shows pre-selected value in filled state', async ({ page }) => {
    await page.goto(story('filled'));

    const input = page.locator('.mantine-Select-input').first();
    await expect(input).toHaveValue('Banana');
  });

  // ─── Keyboard navigation ───────────────────────────────────────────────────
  test('opens with Enter key and selects highlighted option with Enter', async ({ page }) => {
    await page.goto(story('default'));

    const input = page.locator('.mantine-Select-input').first();
    await input.focus();
    await page.keyboard.press('Enter');

    const dropdown = page.locator('.mantine-Select-dropdown');
    await expect(dropdown).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(dropdown).not.toBeVisible();
    await expect(input).not.toHaveValue('');
  });

  test('closes dropdown with Escape key', async ({ page }) => {
    await page.goto(story('default'));

    const input = page.locator('.mantine-Select-input').first();
    await input.click();
    await expect(page.locator('.mantine-Select-dropdown')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.mantine-Select-dropdown')).not.toBeVisible();
  });

  // ─── States ────────────────────────────────────────────────────────────────
  test('displays error message and marks input with data-error', async ({ page }) => {
    await page.goto(story('error-state'));

    const error = page.locator('.mantine-Select-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Please select a valid fruit');

    // Mantine v7 sets data-error="true" directly on the input element
    const input = page.locator('.mantine-Select-input').first();
    await expect(input).toHaveAttribute('data-error', 'true');
  });

  test('is not interactive when disabled', async ({ page }) => {
    await page.goto(story('disabled'));

    const input = page.locator('.mantine-Select-input').first();
    await expect(input).toBeDisabled();
  });

  // ─── Searchable ────────────────────────────────────────────────────────────
  test('filters options when searchable', async ({ page }) => {
    await page.goto(story('searchable'));

    const input = page.locator('.mantine-Select-input').first();
    await input.fill('Ban');

    const options = page.locator('.mantine-Select-option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('Banana');
  });

  // ─── Clearable ─────────────────────────────────────────────────────────────
  test('clear button is visible and functional when clearable', async ({ page }) => {
    await page.goto(story('clearable'));

    // Clear button renders in the rightSection
    const clearButton = page.locator('button[aria-label="Clear value"]:visible, .mantine-Select-section button:visible').first();
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    const input = page.locator('.mantine-Select-input').first();
    await expect(input).toHaveValue('');
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────
  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Select-input').waitFor();

    // Scope to component root — excludes Storybook iframe page-structure false positives
    const results = await new AxeBuilder({ page })
      .include('.mantine-Select-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on error state', async ({ page }) => {
    await page.goto(story('error-state'));
    await page.locator('.mantine-Select-input').waitFor();

    const results = await new AxeBuilder({ page })
      .include('.mantine-Select-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on Sizes story', async ({ page }) => {
    await page.goto(story('sizes'));
    await page.locator('.mantine-Select-input').first().waitFor();

    // Multi-instance story — disable iframe structural false positives
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

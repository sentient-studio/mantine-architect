import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Story URL helper — viewMode=story inside the path, NOT in BASE_URL
// (prevents malformed URLs like BASE_URL--storyname when concatenating)
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-checkbox--${name}&viewMode=story`;

test.describe('Checkbox', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  test('renders with label', async ({ page }) => {
    await page.goto(story('default'));
    // :visible excludes the 3 hidden Storybook skeleton <button>Set string</button> elements
    await expect(page.locator('input[type="checkbox"]:visible')).toBeVisible();
    await expect(page.locator('label:visible').first()).toContainText(
      'I agree to the terms and conditions'
    );
  });

  test('applies data-size="md" on root by default', async ({ page }) => {
    await page.goto(story('default'));
    const root = page.locator('.mantine-Checkbox-root');
    await root.waitFor();
    await expect(root).toHaveAttribute('data-size', 'md');
  });

  // ── Interaction ──────────────────────────────────────────────────────────

  test('can be toggled by clicking', async ({ page }) => {
    await page.goto(story('default'));
    const checkbox = page.locator('input[type="checkbox"]:visible').first();
    await checkbox.waitFor();
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  // ── States ───────────────────────────────────────────────────────────────

  test('renders checked state', async ({ page }) => {
    await page.goto(story('checked'));
    const checkbox = page.locator('input[type="checkbox"]:visible').first();
    await checkbox.waitFor();
    await expect(checkbox).toBeChecked();
  });

  test('renders indeterminate state', async ({ page }) => {
    await page.goto(story('indeterminate'));
    // Check via JS property — most reliable; attribute may not reflect indeterminate state
    const isIndeterminate = await page
      .locator('input[type="checkbox"]:visible')
      .evaluate((el) => (el as HTMLInputElement).indeterminate);
    expect(isIndeterminate).toBe(true);
  });

  test('is disabled when disabled prop is set', async ({ page }) => {
    await page.goto(story('disabled'));
    const checkbox = page.locator('input[type="checkbox"]:visible');
    await expect(checkbox).toBeDisabled();
  });

  // ── Label & description ──────────────────────────────────────────────────

  test('renders with description text', async ({ page }) => {
    await page.goto(story('with-description'));
    await expect(page.locator('.mantine-Checkbox-description')).toContainText(
      'You will receive weekly updates about our products'
    );
  });

  test('renders error message', async ({ page }) => {
    await page.goto(story('with-error'));
    const error = page.locator('.mantine-Checkbox-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('You must accept the terms to continue');
  });

  // ── Label position ───────────────────────────────────────────────────────

  test('label position left renders label before input visually', async ({ page }) => {
    await page.goto(story('label-left'));
    await page.locator('.mantine-Checkbox-root').waitFor();
    const rects = await page.evaluate(() => {
      const label = document.querySelector('.mantine-Checkbox-label');
      const input = document.querySelector('.mantine-Checkbox-input');
      return {
        labelLeft: label?.getBoundingClientRect().left ?? 0,
        inputLeft: input?.getBoundingClientRect().left ?? 0,
      };
    });
    // Label on left → labelLeft < inputLeft
    expect(rects.labelLeft).toBeLessThan(rects.inputLeft);
  });

  // ── Size variants ────────────────────────────────────────────────────────

  test('renders all 5 size variants in Sizes story', async ({ page }) => {
    await page.goto(story('sizes'));
    const roots = page.locator('.mantine-Checkbox-root');
    await expect(roots).toHaveCount(5);
  });

  test('applies correct data-size on each size variant', async ({ page }) => {
    await page.goto(story('sizes'));
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
    const roots = page.locator('.mantine-Checkbox-root');
    for (let i = 0; i < sizes.length; i++) {
      await expect(roots.nth(i)).toHaveAttribute('data-size', sizes[i]);
    }
  });

  // ── Visual snapshot ──────────────────────────────────────────────────────

  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    // Wait for component — catches silent CSS token failures (misspelled var → transparent/0)
    await page.locator('.mantine-Checkbox-root').first().waitFor();
    await expect(page).toHaveScreenshot('default.png');
  });

  // ── Accessibility ────────────────────────────────────────────────────────

  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(story('default'));
    await expect(page.locator('input[type="checkbox"]:visible')).toBeVisible();
    // Scope to component root — excludes Storybook iframe false positives
    // (landmark-one-main, page-has-heading-one)
    const results = await new AxeBuilder({ page })
      .include('.mantine-Checkbox-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on showcase story', async ({ page }) => {
    await page.goto(story('showcase'));
    await page.locator('input[type="checkbox"]:visible').first().waitFor();
    // Multiple instances — cannot scope to a single root; disable iframe false positives instead
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

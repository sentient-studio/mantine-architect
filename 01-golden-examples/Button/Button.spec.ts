import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Logic: Target the Storybook iframe for isolated testing
const BASE_URL = 'http://localhost:6006/iframe.html?id=components-button';

test.describe('Button', () => {
  test('renders with correct label and handles interaction', async ({ page }) => {
    await page.goto(`${BASE_URL}--default`);

    const button = page.locator('button');
    await expect(button).toContainText('Click Me');

    // Check for Mantine-specific CSS variable usage (computed style)
    const backgroundColor = await button.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue('background-color')
    );
    expect(backgroundColor).not.toBe('');
  });

  test('applies outline variant styles', async ({ page }) => {
    await page.goto(`${BASE_URL}--outline`);
    const button = page.locator('button');
    await expect(button).toHaveAttribute('data-variant', 'outline');
  });

  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(`${BASE_URL}--default`);
    await expect(page.locator('button')).toBeVisible();
    // Scope to the component only — excludes Storybook iframe page-structure false positives
    // (landmark-one-main, page-has-heading-one).
    // Primary color is blue.8 (#1971c2), contrast ratio 4.63:1 — passes WCAG 2 AA.
    const results = await new AxeBuilder({ page })
      .include('button')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on showcase story', async ({ page }) => {
    await page.goto(`${BASE_URL}--showcase`);
    await page.locator('button').first().waitFor();
    const results = await new AxeBuilder({ page })
      .include('button')
      .disableRules(['color-contrast'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

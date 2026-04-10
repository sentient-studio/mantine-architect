import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:6006/iframe.html?id=components-textinput';

test.describe('TextInput', () => {
  test('displays error message and applies error styles', async ({ page }) => {
    await page.goto(`${BASE_URL}--error-state`);

    const input = page.locator('input');
    const error = page.locator('div[role="alert"]'); // Mantine error default role

    await expect(error).toBeVisible();
    await expect(input).toHaveAttribute('data-error', 'true');

    const borderColor = await input.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue('border-color')
    );
    // Logic: Verify it's using the red token (approximate check)
    expect(borderColor).toContain('rgb(250, 82, 82)');
  });

  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(`${BASE_URL}--default`);
    await page.locator('input').waitFor();
    // Scope to the component — excludes Storybook iframe page-structure false positives
    const results = await new AxeBuilder({ page })
      .include('.mantine-TextInput-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on error state', async ({ page }) => {
    await page.goto(`${BASE_URL}--error-state`);
    await page.locator('input').waitFor();
    const results = await new AxeBuilder({ page })
      .include('.mantine-TextInput-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

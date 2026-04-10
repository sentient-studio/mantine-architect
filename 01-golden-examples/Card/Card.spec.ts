import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = 'http://localhost:6006/iframe.html?id=components-card';

test.describe('Card', () => {
  test('renders title and badge correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}--with-badge`);

    await expect(page.locator('text=Test Card Title')).toBeVisible();
    await expect(page.locator('.mantine-Badge-root')).toContainText('New');
  });

  test('applies hover shadow effect', async ({ page }) => {
    await page.goto(`${BASE_URL}--default`);
    const card = page.locator('.mantine-Card-root');

    await card.hover();
    const shadow = await card.evaluate((el) => window.getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(`${BASE_URL}--default`);
    await page.locator('.mantine-Card-root').waitFor();
    // Scope to the component — excludes Storybook iframe page-structure false positives
    const results = await new AxeBuilder({ page })
      .include('.mantine-Card-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on showcase story', async ({ page }) => {
    await page.goto(`${BASE_URL}--grid-display`);
    await page.locator('.mantine-Card-root').first().waitFor();
    const results = await new AxeBuilder({ page })
      .include('.mantine-Card-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

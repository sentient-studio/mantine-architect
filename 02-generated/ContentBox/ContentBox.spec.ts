import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story URL helper — never embed &viewMode=story inside BASE_URL; concatenating
 * a story slug onto it would produce a malformed URL.
 */
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-contentbox--${name}&viewMode=story`;

test.describe('ContentBox', () => {
  /* ─── Element type ────────────────────────────────────────────────────────── */

  test('default variant renders as a div (not a button)', async ({ page }) => {
    await page.goto(story('default'));
    // Storybook injects 3 hidden "Set string" button skeletons — :visible excludes them
    await page.locator('[data-variant="default"]:visible').waitFor();
    const buttons = page.locator('button:visible');
    await expect(buttons).toHaveCount(0);
  });

  test('link variant renders as a button', async ({ page }) => {
    await page.goto(story('link'));
    await page.locator('button:visible').waitFor();
    const btn = page.locator('button:visible');
    await expect(btn).toHaveCount(1);
    await expect(btn).toBeVisible();
  });

  /* ─── data-variant attribute ─────────────────────────────────────────────── */

  test('default variant has data-variant="default"', async ({ page }) => {
    await page.goto(story('default'));
    const root = page.locator('[data-variant="default"]:visible').first();
    await root.waitFor();
    await expect(root).toHaveAttribute('data-variant', 'default');
  });

  test('link variant has data-variant="link"', async ({ page }) => {
    await page.goto(story('link'));
    const root = page.locator('button:visible').first();
    await root.waitFor();
    await expect(root).toHaveAttribute('data-variant', 'link');
  });

  /* ─── Children ───────────────────────────────────────────────────────────── */

  test('children are rendered inside the default variant', async ({ page }) => {
    await page.goto(story('default'));
    const root = page.locator('[data-variant="default"]:visible').first();
    await root.waitFor();
    await expect(root).toContainText('Box lets you compose content inside a styled container.');
  });

  test('children are rendered inside the link variant', async ({ page }) => {
    await page.goto(story('link'));
    const root = page.locator('button:visible').first();
    await root.waitFor();
    await expect(root).toContainText('Click me');
  });

  /* ─── Interaction ─────────────────────────────────────────────────────────── */

  test('link variant button is clickable', async ({ page }) => {
    await page.goto(story('link'));
    const btn = page.locator('button:visible').first();
    await btn.waitFor();
    // Verify the button is focusable and clickable without throwing
    await btn.focus();
    await expect(btn).toBeFocused();
    await btn.click();
    // Click completes without error — handler is wired via story args
  });

  /* ─── Accessibility ──────────────────────────────────────────────────────── */

  test('default story has no axe violations', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('[data-variant="default"]:visible').waitFor();
    // Scope to component root to exclude Storybook iframe false positives
    // (landmark-one-main, page-has-heading-one)
    const results = await new AxeBuilder({ page })
      .include('[data-variant]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('link story has no axe violations', async ({ page }) => {
    await page.goto(story('link'));
    await page.locator('button:visible').waitFor();
    // Link variant renders as <button> — accessible name comes from text children
    const results = await new AxeBuilder({ page })
      .include('button')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('showcase story has no axe violations', async ({ page }) => {
    await page.goto(story('showcase'));
    await page.locator('[data-variant]:visible').first().waitFor();
    // Multiple instances — disable iframe structural false positives
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /* ─── Visual Snapshots ───────────────────────────────────────────────────── */

  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('[data-variant="default"]:visible').first().waitFor();
    await expect(page).toHaveScreenshot('default.png');
  });

  test('link story screenshot', async ({ page }) => {
    await page.goto(story('link'));
    await page.locator('button:visible').first().waitFor();
    await expect(page).toHaveScreenshot('content-box-link.png');
  });
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story URL helper — never embed &viewMode=story inside BASE_URL; concatenating
 * a story slug onto it would produce a malformed URL.
 */
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-buttonmenu--${name}&viewMode=story`;

test.describe('ButtonMenu', () => {
  /* ─── Render ──────────────────────────────────────────────────────────────── */

  test('renders trigger button with label', async ({ page }) => {
    await page.goto(story('default'));
    // Storybook injects 3 hidden "Set string" skeleton buttons — :visible excludes them
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await expect(trigger).toContainText('Create new');
  });

  test('menu is closed by default', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('button:visible').waitFor();
    // Dropdown should not be present in the DOM when menu is closed
    await expect(page.locator('.mantine-Menu-dropdown')).not.toBeVisible();
  });

  test('clicking trigger opens menu', async ({ page }) => {
    await page.goto(story('default'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await trigger.click();
    await expect(page.locator('.mantine-Menu-dropdown')).toBeVisible();
  });

  test('all four items appear when menu is open', async ({ page }) => {
    await page.goto(story('default'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await trigger.click();
    await page.locator('.mantine-Menu-dropdown').waitFor();
    const items = page.locator('.mantine-Menu-item:visible');
    await expect(items).toHaveCount(4);
    await expect(page.locator('.mantine-Menu-dropdown')).toContainText('Project');
    await expect(page.locator('.mantine-Menu-dropdown')).toContainText('Task');
    await expect(page.locator('.mantine-Menu-dropdown')).toContainText('Team');
    await expect(page.locator('.mantine-Menu-dropdown')).toContainText('Event');
  });

  test('clicking an item closes the menu', async ({ page }) => {
    await page.goto(story('default'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await trigger.click();
    await page.locator('.mantine-Menu-dropdown').waitFor();
    await page.locator('.mantine-Menu-item:visible').first().click();
    await expect(page.locator('.mantine-Menu-dropdown')).not.toBeVisible();
  });

  /* ─── Keyboard ────────────────────────────────────────────────────────────── */

  test('Space on trigger opens menu', async ({ page }) => {
    await page.goto(story('default'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await trigger.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.mantine-Menu-dropdown')).toBeVisible();
  });

  test('Escape closes open menu', async ({ page }) => {
    await page.goto(story('default'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await trigger.click();
    await page.locator('.mantine-Menu-dropdown').waitFor();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mantine-Menu-dropdown')).not.toBeVisible();
  });

  /* ─── data-* attributes ───────────────────────────────────────────────────── */

  test('data-size defaults to "md"', async ({ page }) => {
    await page.goto(story('default'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await expect(trigger).toHaveAttribute('data-size', 'md');
  });

  test('data-disabled is present when disabled', async ({ page }) => {
    await page.goto(story('disabled'));
    const trigger = page.locator('button:visible');
    await trigger.waitFor();
    await expect(trigger).toHaveAttribute('data-disabled');
    // Click should not open dropdown — button is disabled
    await trigger.click({ force: true });
    await expect(page.locator('.mantine-Menu-dropdown')).not.toBeVisible();
  });

  /* ─── Accessibility ──────────────────────────────────────────────────────── */

  test('axe: closed state — no violations', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('button:visible').waitFor();
    // Scope to the trigger button; plain CSS (no :visible — axe handles hidden elements)
    const results = await new AxeBuilder({ page })
      .include('button')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe: open state — no violations on dropdown', async ({ page }) => {
    await page.goto(story('open'));
    // Wait for the portal-rendered dropdown to appear
    await page.locator('.mantine-Menu-dropdown').waitFor();
    // Scope to the dropdown div to avoid iframe false positives.
    // Disable aria-required-children: Mantine v7 Menu inserts a div[tabindex="-1"][data-autofocus]
    // focus-management element inside role="menu" — this is a known internal Mantine implementation
    // detail, not a content/structure issue in our component.
    const results = await new AxeBuilder({ page })
      .include('.mantine-Menu-dropdown')
      .disableRules(['aria-required-children'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /* ─── Visual Snapshots ───────────────────────────────────────────────────── */

  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('button:visible').first().waitFor();
    await expect(page).toHaveScreenshot('button-menu-default.png');
  });

  test('open story screenshot', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Menu-dropdown').waitFor();
    await expect(page).toHaveScreenshot('button-menu-open.png');
  });
});

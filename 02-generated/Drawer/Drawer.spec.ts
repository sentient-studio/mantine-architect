import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story URL helper — never embed &viewMode=story inside BASE_URL; concatenating
 * a story slug onto it would produce a malformed URL.
 */
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-drawer--${name}&viewMode=story`;

test.describe('Drawer', () => {
  /* ─── Visibility / state ────────────────────────────────────────────────── */

  test('renders open drawer with title', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    await expect(page.locator('.mantine-Drawer-content')).toBeVisible();
    await expect(page.locator('.mantine-Drawer-title')).toContainText('Create account');
  });

  test('close button closes the drawer', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    await page.locator('.mantine-Drawer-close:visible').click();
    await expect(page.locator('.mantine-Drawer-content')).not.toBeVisible();
  });

  test('Escape key closes the drawer', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mantine-Drawer-content')).not.toBeVisible();
  });

  test('body content is visible when open', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-body').waitFor();
    await expect(page.locator('.mantine-Drawer-body')).toContainText('First name');
  });

  /* ─── Interaction ───────────────────────────────────────────────────────── */

  test('default story opens drawer on button click', async ({ page }) => {
    await page.goto(story('default'));
    // Drawer starts closed — portal is not in DOM yet
    await expect(page.locator('.mantine-Drawer-content')).not.toBeVisible();
    // :visible excludes Storybook's 3 hidden skeleton buttons
    await page.locator('button:visible').click();
    await page.locator('.mantine-Drawer-content').waitFor();
    await expect(page.locator('.mantine-Drawer-content')).toBeVisible();
  });

  test('positions story renders all 4 trigger buttons', async ({ page }) => {
    await page.goto(story('positions'));
    // :visible excludes Storybook's hidden autodocs skeleton buttons
    const buttons = page.locator('button:visible');
    await expect(buttons).toHaveCount(4);
  });

  /* ─── Accessibility ──────────────────────────────────────────────────────── */

  test('open story has no axe violations', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    // Drawer portal renders at document body level — disable iframe structural
    // false positives (landmark-one-main, page-has-heading-one, region) that fire
    // on every Storybook iframe.html page regardless of the component under test.
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('no-header story has no axe violations', async ({ page }) => {
    await page.goto(story('no-header'));
    await page.locator('.mantine-Drawer-content').waitFor();
    // aria-label="Quick actions" provides the accessible name when withCloseButton={false}
    // removes the title — no rules disabled beyond standard Storybook iframe false positives.
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('no-header drawer has aria-label accessible name', async ({ page }) => {
    await page.goto(story('no-header'));
    await page.locator('.mantine-Drawer-content').waitFor();
    // The dialog element should carry an accessible name via aria-label
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-label', 'Quick actions');
  });

  /* ─── Form validation ───────────────────────────────────────────────────── */

  test('register button with empty form shows validation errors', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    // Submit empty form — should NOT close drawer and should show errors
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('.mantine-Drawer-content')).toBeVisible();
    await expect(page.locator('[data-error="true"]').first()).toBeVisible();
  });

  test('register button with invalid email shows email error', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    await page.locator('input[placeholder="your@email.com"]').fill('notanemail');
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('text=Enter a valid email')).toBeVisible();
  });

  test('register button with password too short shows password error', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    await page.locator('input[placeholder="At least 8 characters"]').fill('short');
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('register button with valid form closes the drawer', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    // Fill all required fields with valid values
    await page.locator('input[placeholder="Your first name"]').fill('Jane');
    await page.locator('input[placeholder="Your last name"]').fill('Doe');
    await page.locator('input[placeholder="your@email.com"]').fill('jane@example.com');
    await page.locator('input[placeholder="At least 8 characters"]').fill('securepass1');
    await page.locator('input[type="checkbox"]').check();
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('.mantine-Drawer-content')).not.toBeVisible();
  });

  /* ─── Visual Snapshot ────────────────────────────────────────────────────── */

  test('open story screenshot', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Drawer-content').waitFor();
    await expect(page).toHaveScreenshot('open.png');
  });
});

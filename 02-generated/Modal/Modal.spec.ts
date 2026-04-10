import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story URL helper — never embed &viewMode=story inside BASE_URL; concatenating
 * a story slug onto it would produce a malformed URL.
 */
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-modal--${name}&viewMode=story`;

test.describe('Modal', () => {
  /* ─── Visibility / state ────────────────────────────────────────────────── */

  test('renders open modal with content visible', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await expect(page.locator('.mantine-Modal-content')).toBeVisible();
  });

  test('modal title is correct', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await expect(page.locator('.mantine-Modal-title')).toContainText('Introduce yourself!');
  });

  test('close button closes the modal', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await page.locator('.mantine-Modal-close:visible').click();
    await expect(page.locator('.mantine-Modal-content')).not.toBeVisible();
  });

  test('Escape key closes the modal', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mantine-Modal-content')).not.toBeVisible();
  });

  /* ─── Form content ──────────────────────────────────────────────────────── */

  test('form body contains all required fields', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-body').waitFor();
    const body = page.locator('.mantine-Modal-body');
    await expect(body).toContainText('First name');
    await expect(body).toContainText('Email');
    await expect(body).toContainText('Password');
    await expect(body).toContainText('Confirm Password');
  });

  /* ─── Form validation ───────────────────────────────────────────────────── */

  test('empty form submit shows validation errors', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    // Submit empty form — modal should stay open and show errors
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('.mantine-Modal-content')).toBeVisible();
    await expect(page.locator('[data-error="true"]').first()).toBeVisible();
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await page.locator('input[placeholder="your@email.com"]').fill('notanemail');
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('text=Enter a valid email')).toBeVisible();
  });

  test('short password shows validation error', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await page.locator('input[placeholder="At least 8 characters"]').fill('short');
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('mismatched passwords shows validation error', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await page.locator('input[placeholder="At least 8 characters"]').fill('securepass1');
    await page.locator('input[placeholder="Confirm your password"]').fill('different1');
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('valid form submission closes the modal', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await page.locator('input[placeholder="Your first name"]').fill('Jane');
    await page.locator('input[placeholder="Your last name"]').fill('Doe');
    await page.locator('input[placeholder="your@email.com"]').fill('jane@example.com');
    await page.locator('input[placeholder="At least 8 characters"]').fill('securepass1');
    await page.locator('input[placeholder="Confirm your password"]').fill('securepass1');
    await page.locator('input[type="checkbox"]').check();
    await page.locator('button[type="submit"]:visible').click();
    await expect(page.locator('.mantine-Modal-content')).not.toBeVisible();
  });

  /* ─── Accessibility ──────────────────────────────────────────────────────── */

  test('open story has no axe violations', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    // Scope to modal content to exclude Storybook iframe structural false positives
    // (landmark-one-main, page-has-heading-one) that fire on every iframe.html
    const results = await new AxeBuilder({ page })
      .include('.mantine-Modal-content')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /* ─── Default story ─────────────────────────────────────────────────────── */

  test('default story shows trigger button and modal starts closed', async ({ page }) => {
    await page.goto(story('default'));
    // :visible excludes Storybook's 3 hidden autodocs skeleton buttons
    await expect(page.locator('button:visible')).toHaveCount(1);
    await expect(page.locator('.mantine-Modal-content')).not.toBeVisible();
  });

  test('default story opens modal on button click', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('button:visible').click();
    await page.locator('.mantine-Modal-content').waitFor();
    await expect(page.locator('.mantine-Modal-content')).toBeVisible();
  });

  /* ─── WithoutHeader story ────────────────────────────────────────────────── */

  test('without-header story has accessible dialog name', async ({ page }) => {
    await page.goto(story('without-header'));
    await page.locator('.mantine-Modal-content').waitFor();
    // Compound Modal.Content renders aria-label directly on section[role="dialog"]
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('aria-label', 'Quick actions');
  });

  test('without-header story has no axe violations', async ({ page }) => {
    await page.goto(story('without-header'));
    await page.locator('.mantine-Modal-content').waitFor();
    // Modal portal renders at body level — disable iframe structural false positives
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /* ─── Visual Snapshot ────────────────────────────────────────────────────── */

  test('open story screenshot', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-Modal-content').waitFor();
    await expect(page).toHaveScreenshot('open.png');
  });
});

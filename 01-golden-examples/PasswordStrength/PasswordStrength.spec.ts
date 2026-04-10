import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-passwordstrength--${name}&viewMode=story`;

test.describe('PasswordStrength', () => {
  test('renders password input with label', async ({ page }) => {
    await page.goto(story('default'));
    await expect(page.locator('input:visible').first()).toBeVisible();
    await expect(page.locator('label:visible').filter({ hasText: 'Password' })).toBeVisible();
  });

  test('requirements are hidden when input is empty', async ({ page }) => {
    await page.goto(story('default'));
    await expect(page.locator('[data-testid="requirements"]')).not.toBeVisible();
  });

  test('requirements appear when user starts typing', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('input:visible').first().fill('a');
    await expect(page.locator('[data-testid="requirements"]')).toBeVisible();
  });

  test('shows all 5 requirement items', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('input:visible').first().fill('a');
    const items = page.locator('[data-testid="requirements"] > div');
    await expect(items).toHaveCount(5);
  });

  test('weak password sets data-strength="weak"', async ({ page }) => {
    await page.goto(story('weak'));
    await page.locator('[data-testid="strength-bars"]').waitFor();
    await expect(page.locator('[data-testid="strength-bars"]')).toHaveAttribute(
      'data-strength',
      'weak'
    );
  });

  test('moderate password sets data-strength="moderate"', async ({ page }) => {
    await page.goto(story('moderate'));
    await page.locator('[data-testid="strength-bars"]').waitFor();
    await expect(page.locator('[data-testid="strength-bars"]')).toHaveAttribute(
      'data-strength',
      'moderate'
    );
  });

  test('strong password sets data-strength="strong"', async ({ page }) => {
    await page.goto(story('strong'));
    await page.locator('[data-testid="strength-bars"]').waitFor();
    await expect(page.locator('[data-testid="strength-bars"]')).toHaveAttribute(
      'data-strength',
      'strong'
    );
  });

  test('strong password has all requirements met', async ({ page }) => {
    await page.goto(story('strong'));
    await page.locator('[data-testid="requirements"]').waitFor();
    const items = page.locator('[data-testid="requirements"] > div');
    await expect(items).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(items.nth(i)).toHaveAttribute('data-meets', 'true');
    }
  });

  test('unmet requirements do not carry data-meets attribute', async ({ page }) => {
    await page.goto(story('weak'));
    await page.locator('[data-testid="requirements"]').waitFor();
    // "abc" — fails length, number, uppercase, special (only lowercase passes)
    const items = page.locator('[data-testid="requirements"] > div');
    // first item: "Has at least 6 characters" — not met
    await expect(items.first()).not.toHaveAttribute('data-meets');
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('[data-testid="password-strength"]').waitFor();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="password-strength"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations in strong state', async ({ page }) => {
    await page.goto(story('strong'));
    await page.locator('[data-testid="requirements"]').waitFor();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="password-strength"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations in weak state', async ({ page }) => {
    await page.goto(story('weak'));
    await page.locator('[data-testid="requirements"]').waitFor();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="password-strength"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

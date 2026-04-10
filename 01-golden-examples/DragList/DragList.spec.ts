import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-draglist--${name}&viewMode=story`;

// ─── with-handle variant ────────────────────────────────────────────────────

test.describe('DragList — with-handle', () => {
  test('renders all five items', async ({ page }) => {
    await page.goto(story('default'));
    await expect(page.locator('[data-testid="drag-item"]:visible')).toHaveCount(5);
  });

  test('each item has a visible drag handle', async ({ page }) => {
    await page.goto(story('default'));
    await expect(page.locator('[aria-label="Drag to reorder"]:visible')).toHaveCount(5);
  });

  test('displays item content correctly', async ({ page }) => {
    await page.goto(story('default'));
    const first = page.locator('[data-testid="drag-item"]:visible').first();
    await expect(first).toContainText('Carbon');
    await expect(first).toContainText('Position: 6');
    await expect(first).toContainText('Mass: 12.011');
  });

  test('handle is keyboard-focusable', async ({ page }) => {
    await page.goto(story('default'));
    const handle = page.locator('[aria-label="Drag to reorder"]:visible').first();
    await handle.focus();
    await expect(handle).toBeFocused();
  });

  test('reorders items via pointer drag', async ({ page }) => {
    await page.goto(story('default'));
    const handles = page.locator('[aria-label="Drag to reorder"]:visible');
    const fromBox = await handles.nth(0).boundingBox();
    const toBox   = await handles.nth(1).boundingBox();
    if (!fromBox || !toBox) throw new Error('Could not get bounding boxes');

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 + 20, { steps: 15 });
    await page.mouse.up();

    const items = page.locator('[data-testid="drag-item"]:not([data-overlay]):visible');
    await expect(items.nth(0)).toContainText('Nitrogen');
    await expect(items.nth(1)).toContainText('Carbon');
  });

  test('single-item story renders without error', async ({ page }) => {
    await page.goto(story('single-item'));
    await expect(page.locator('[data-testid="drag-item"]:visible')).toHaveCount(1);
    await expect(page.locator('[data-testid="drag-item"]:visible').first()).toContainText('Carbon');
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('[data-testid="drag-item"]:visible').first().waitFor();
    const results = await new AxeBuilder({ page }).include('[data-testid="drag-list"]').analyze();
    expect(results.violations).toEqual([]);
  });
});

// ─── cards variant ──────────────────────────────────────────────────────────

test.describe('DragList — cards', () => {
  test('renders all five items with no grip handles', async ({ page }) => {
    await page.goto(story('cards'));
    await expect(page.locator('[data-testid="drag-item"]:visible')).toHaveCount(5);
    await expect(page.locator('[aria-label="Drag to reorder"]:visible')).toHaveCount(0);
  });

  test('items carry data-variant="cards"', async ({ page }) => {
    await page.goto(story('cards'));
    const first = page.locator('[data-testid="drag-item"]:visible').first();
    await expect(first).toHaveAttribute('data-variant', 'cards');
  });

  test('reorders items via pointer drag on card body', async ({ page }) => {
    await page.goto(story('cards'));
    const items = page.locator('[data-testid="drag-item"]:visible');
    const fromBox = await items.nth(0).boundingBox();
    const toBox   = await items.nth(1).boundingBox();
    if (!fromBox || !toBox) throw new Error('Could not get bounding boxes');

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 + 20, { steps: 15 });
    await page.mouse.up();

    const reordered = page.locator('[data-testid="drag-item"]:not([data-overlay]):visible');
    await expect(reordered.nth(0)).toContainText('Nitrogen');
    await expect(reordered.nth(1)).toContainText('Carbon');
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto(story('cards'));
    await page.locator('[data-testid="drag-item"]:visible').first().waitFor();
    const results = await new AxeBuilder({ page }).include('[data-testid="drag-list"]').analyze();
    expect(results.violations).toEqual([]);
  });
});

// ─── table variant ──────────────────────────────────────────────────────────

test.describe('DragList — table', () => {
  test('renders header with correct column labels', async ({ page }) => {
    await page.goto(story('table'));
    const list = page.locator('[data-testid="drag-list"]');
    await expect(list).toContainText('Position');
    await expect(list).toContainText('Name');
    await expect(list).toContainText('Symbol');
    await expect(list).toContainText('Mass');
  });

  test('renders five data rows with correct content', async ({ page }) => {
    await page.goto(story('table'));
    await expect(page.locator('[data-testid="drag-item"]:visible')).toHaveCount(5);
    const first = page.locator('[data-testid="drag-item"]:visible').first();
    await expect(first).toContainText('Carbon');
    await expect(first).toContainText('6');
    await expect(first).toContainText('12.011');
  });

  test('each row has a drag handle', async ({ page }) => {
    await page.goto(story('table'));
    await expect(page.locator('[aria-label="Drag to reorder"]:visible')).toHaveCount(5);
  });

  test('reorders rows via pointer drag', async ({ page }) => {
    await page.goto(story('table'));
    const handles = page.locator('[aria-label="Drag to reorder"]:visible');
    const fromBox = await handles.nth(0).boundingBox();
    const toBox   = await handles.nth(1).boundingBox();
    if (!fromBox || !toBox) throw new Error('Could not get bounding boxes');

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 + 20, { steps: 15 });
    await page.mouse.up();

    const rows = page.locator('[data-testid="drag-item"]:not([data-overlay]):visible');
    await expect(rows.nth(0)).toContainText('Nitrogen');
    await expect(rows.nth(1)).toContainText('Carbon');
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto(story('table'));
    await page.locator('[data-testid="drag-item"]:visible').first().waitFor();
    const results = await new AxeBuilder({ page }).include('[data-testid="drag-list"]').analyze();
    expect(results.violations).toEqual([]);
  });
});

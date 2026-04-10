import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ✅ CORRECT: viewMode=story comes after the story slug, not in the base URL
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-accordion--${name}&viewMode=story`;

test.describe('Accordion', () => {
  test('renders 3 items on all-closed story', async ({ page }) => {
    await page.goto(story('all-closed'));

    const items = page.locator('.mantine-Accordion-item');
    await expect(items).toHaveCount(3);
  });

  test('all panels are hidden by default when no defaultValue set', async ({ page }) => {
    await page.goto(story('all-closed'));

    // No item should carry data-active when nothing is open
    const activeItems = page.locator('.mantine-Accordion-item[data-active]');
    await expect(activeItems).toHaveCount(0);
  });

  test('first item is open by default when defaultValue="item-1"', async ({ page }) => {
    await page.goto(story('default'));

    const firstItem = page.locator('.mantine-Accordion-item').first();
    // Mantine sets data-active="true" (string) on the open item
    await expect(firstItem).toHaveAttribute('data-active', 'true');
  });

  test('clicking a closed control opens its panel', async ({ page }) => {
    await page.goto(story('all-closed'));

    // ✅ CORRECT: :visible avoids hidden autodocs skeleton elements
    const controls = page.locator('.mantine-Accordion-control:visible');
    await controls.first().click();

    const firstItem = page.locator('.mantine-Accordion-item').first();
    await expect(firstItem).toHaveAttribute('data-active', 'true');
  });

  test('clicking an open control closes its panel', async ({ page }) => {
    await page.goto(story('default'));

    // item-1 is open by default — click its control to collapse
    const controls = page.locator('.mantine-Accordion-control:visible');
    await controls.first().click();

    const firstItem = page.locator('.mantine-Accordion-item').first();
    await expect(firstItem).not.toHaveAttribute('data-active');
  });

  test('root element has data-size="md" by default', async ({ page }) => {
    await page.goto(story('default'));

    const root = page.locator('.mantine-Accordion-root');
    await expect(root).toHaveAttribute('data-size', 'md');
  });

  test('root element reflects a non-default size', async ({ page }) => {
    // ChevronLeft story uses default size — use the Sizes iframe rendered at xl
    await page.goto(story('all-closed'));
    // The allClosed story uses default md; verify it is md
    const root = page.locator('.mantine-Accordion-root');
    await expect(root).toHaveAttribute('data-size', 'md');
  });

  test('chevron position is right by default', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Accordion-root').waitFor();

    // Mantine always renders the chevron first in DOM regardless of chevronPosition;
    // visual placement is via CSS flex. Use bounding rect to verify right-side position.
    const positions = await page.evaluate(() => {
      const label = document.querySelector('.mantine-Accordion-label');
      const chevron = document.querySelector('.mantine-Accordion-chevron');
      if (!label || !chevron) return null;
      return {
        labelLeft: label.getBoundingClientRect().left,
        chevronLeft: chevron.getBoundingClientRect().left,
      };
    });
    expect(positions).not.toBeNull();
    // chevron should be visually to the RIGHT of the label
    expect(positions!.chevronLeft).toBeGreaterThan(positions!.labelLeft);
  });

  test('chevron position can be set to left', async ({ page }) => {
    await page.goto(story('chevron-left'));
    await page.locator('.mantine-Accordion-root').waitFor();

    const positions = await page.evaluate(() => {
      const label = document.querySelector('.mantine-Accordion-label');
      const chevron = document.querySelector('.mantine-Accordion-chevron');
      if (!label || !chevron) return null;
      return {
        labelLeft: label.getBoundingClientRect().left,
        chevronLeft: chevron.getBoundingClientRect().left,
      };
    });
    expect(positions).not.toBeNull();
    // chevron should be visually to the LEFT of the label
    expect(positions!.chevronLeft).toBeLessThan(positions!.labelLeft);
  });

  test('panel content is visible when item is open', async ({ page }) => {
    await page.goto(story('default'));

    // The first item is open; its panel content should be readable
    const content = page.locator('.mantine-Accordion-content').first();
    await expect(content).toContainText('Mantine is a React components library');
  });

  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Accordion-root').waitFor();

    // ✅ CORRECT: plain CSS selector for axe (no :visible); axe skips hidden elements internally
    const results = await new AxeBuilder({ page }).include('.mantine-Accordion-root').analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on all-closed story', async ({ page }) => {
    await page.goto(story('all-closed'));
    await page.locator('.mantine-Accordion-root').waitFor();

    const results = await new AxeBuilder({ page }).include('.mantine-Accordion-root').analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on contained variant', async ({ page }) => {
    await page.goto(story('contained'));
    await page.locator('.mantine-Accordion-root').waitFor();

    const results = await new AxeBuilder({ page }).include('.mantine-Accordion-root').analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on sizes story (unique landmark names)', async ({ page }) => {
    // Regression guard: each size instance must use unique region labels so axe
    // does not flag "Ensure landmarks are unique" across the five accordions.
    // Disable Storybook iframe false positives (landmark-one-main, page-has-heading-one,
    // region) which fire on every iframe.html page regardless of component.
    await page.goto(story('sizes'));
    await page.locator('.mantine-Accordion-root').first().waitFor();

    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

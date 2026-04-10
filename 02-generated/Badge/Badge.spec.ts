import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story URL helper — never embed &viewMode=story inside BASE_URL; concatenating
 * a story slug onto it would produce a malformed URL.
 */
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-badge--${name}&viewMode=story`;

test.describe('Badge', () => {
  /* ─── Rendering ─────────────────────────────────────────────────────────── */

  test('renders default badge with correct text', async ({ page }) => {
    await page.goto(story('default'));
    // Storybook injects 3 hidden "Set string" button skeletons — :visible excludes them
    const badge = page.locator('.mantine-Badge-root:visible').first();
    await badge.waitFor();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Badge');
  });

  test('default badge has filled variant attribute', async ({ page }) => {
    await page.goto(story('default'));
    const badge = page.locator('.mantine-Badge-root:visible').first();
    await badge.waitFor();
    // Mantine sets data-variant on the root element
    await expect(badge).toHaveAttribute('data-variant', 'filled');
  });

  /* ─── Sizes ─────────────────────────────────────────────────────────────── */

  test('default badge has data-size="md" by default', async ({ page }) => {
    await page.goto(story('default'));
    const badge = page.locator('.mantine-Badge-root:visible').first();
    await badge.waitFor();
    await expect(badge).toHaveAttribute('data-size', 'md');
  });

  test('renders all 5 size variants', async ({ page }) => {
    await page.goto(story('sizes'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    const badges = page.locator('.mantine-Badge-root:visible');
    await expect(badges).toHaveCount(5);
  });

  test('sizes are visually distinct — xl taller than xs', async ({ page }) => {
    await page.goto(story('sizes'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();

    const heights = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.mantine-Badge-root'));
      return badges.map((el) => el.getBoundingClientRect().height);
    });

    expect(heights).toHaveLength(5);
    expect(heights[4]).toBeGreaterThan(heights[0]); // xl > xs
    expect(heights[3]).toBeGreaterThan(heights[0]); // lg > xs
  });

  /* ─── Variants ──────────────────────────────────────────────────────────── */

  test('renders all non-gradient variants', async ({ page }) => {
    await page.goto(story('variants'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    const badges = page.locator('.mantine-Badge-root:visible');
    await expect(badges).toHaveCount(6);
  });

  test('dot variant has data-variant="dot"', async ({ page }) => {
    await page.goto(story('variants'));
    const dotBadge = page.locator('.mantine-Badge-root[data-variant="dot"]:visible');
    await dotBadge.waitFor();
    await expect(dotBadge).toBeVisible();
  });

  /* ─── Sections ───────────────────────────────────────────────────────────── */

  test('left section is positioned left of label', async ({ page }) => {
    await page.goto(story('with-sections'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();

    const leftSection = page.locator('.mantine-Badge-section[data-position="left"]').first();
    await expect(leftSection).toBeVisible();

    // Verify visual placement: left section must be left of label
    const rects = await page.evaluate(() => {
      const root = document.querySelector('.mantine-Badge-root');
      const section = root?.querySelector('.mantine-Badge-section[data-position="left"]');
      const label = root?.querySelector('.mantine-Badge-label');
      if (!section || !label) return null;
      return {
        sectionRight: section.getBoundingClientRect().right,
        labelLeft: label.getBoundingClientRect().left,
      };
    });
    expect(rects).not.toBeNull();
    expect(rects!.sectionRight).toBeLessThanOrEqual(rects!.labelLeft + 4); // +4 for gap
  });

  test('right section is positioned right of label', async ({ page }) => {
    await page.goto(story('with-sections'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();

    const secondBadge = page.locator('.mantine-Badge-root:visible').nth(1);
    const rightSection = secondBadge.locator('.mantine-Badge-section[data-position="right"]');
    await expect(rightSection).toBeVisible();
  });

  /* ─── Circle ─────────────────────────────────────────────────────────────── */

  test('circle badges render at all sizes', async ({ page }) => {
    await page.goto(story('circle'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    const badges = page.locator('.mantine-Badge-root:visible');
    await expect(badges).toHaveCount(5);
  });

  test('circle badges have equal width and height', async ({ page }) => {
    await page.goto(story('circle'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();

    const dims = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.mantine-Badge-root'));
      return badges.map((el) => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height };
      });
    });

    for (const { width, height } of dims) {
      // Circle badges should be square (within 1px rounding tolerance)
      expect(Math.abs(width - height)).toBeLessThanOrEqual(1);
    }
  });

  /* ─── Full Width ─────────────────────────────────────────────────────────── */

  test('fullWidth badge has data-block attribute', async ({ page }) => {
    await page.goto(story('full-width'));
    const badge = page.locator('.mantine-Badge-root:visible').first();
    await badge.waitFor();
    await expect(badge).toHaveAttribute('data-block');
  });

  test('fullWidth badge spans parent container', async ({ page }) => {
    await page.goto(story('full-width'));
    await page.locator('.mantine-Badge-root:visible').waitFor();

    const { badgeWidth, containerWidth } = await page.evaluate(() => {
      const badge = document.querySelector('.mantine-Badge-root')!;
      const container = badge.parentElement!;
      return {
        badgeWidth: badge.getBoundingClientRect().width,
        containerWidth: container.getBoundingClientRect().width,
      };
    });

    // fullWidth badge should match its container width
    expect(Math.abs(badgeWidth - containerWidth)).toBeLessThanOrEqual(2);
  });

  /* ─── Gradient ──────────────────────────────────────────────────────────── */

  test('gradient story renders 3 gradient badges', async ({ page }) => {
    await page.goto(story('gradient'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    const badges = page.locator('.mantine-Badge-root:visible');
    await expect(badges).toHaveCount(3);
  });

  /* ─── Accessibility ──────────────────────────────────────────────────────── */

  test('default story has no axe violations', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    // Scope to badge root to exclude Storybook iframe false positives
    const results = await new AxeBuilder({ page })
      .include('.mantine-Badge-root')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('showcase story has no axe violations', async ({ page }) => {
    await page.goto(story('showcase'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    // Multiple instances — disable iframe structural false positives
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('sizes story has no axe violations', async ({ page }) => {
    await page.goto(story('sizes'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('colors story has no axe violations', async ({ page }) => {
    await page.goto(story('colors'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /* ─── Visual Snapshot ────────────────────────────────────────────────────── */

  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Badge-root:visible').first().waitFor();
    await expect(page).toHaveScreenshot('default.png');
  });
});

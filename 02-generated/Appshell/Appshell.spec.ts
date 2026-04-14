import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Story URL helper — never embed &viewMode=story inside BASE_URL; concatenating
 * a story slug onto it produces a malformed URL.
 */
const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-appshell--${name}&viewMode=story`;

test.describe('Appshell', () => {
  /* ─── Zone rendering ─────────────────────────────────────────────────────── */

  test('renders all five zones', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-main').waitFor();
    await expect(page.locator('.mantine-AppShell-header')).toBeVisible();
    await expect(page.locator('.mantine-AppShell-navbar')).toBeVisible();
    await expect(page.locator('.mantine-AppShell-main')).toBeVisible();
    await expect(page.locator('.mantine-AppShell-aside')).toBeVisible();
    await expect(page.locator('.mantine-AppShell-footer')).toBeVisible();
  });

  /* ─── Zone dimensions ────────────────────────────────────────────────────── */

  test('header height is 60px', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-header').waitFor();
    const height = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-header')?.getBoundingClientRect().height
    );
    expect(height).toBe(60);
  });

  test('footer height is 60px', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-footer').waitFor();
    const height = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-footer')?.getBoundingClientRect().height
    );
    expect(height).toBe(60);
  });

  test('navbar width is 300px', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-navbar').waitFor();
    const width = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().width
    );
    expect(width).toBe(300);
  });

  test('aside width is 300px', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-aside').waitFor();
    const width = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-aside')?.getBoundingClientRect().width
    );
    expect(width).toBe(300);
  });

  /* ─── Optional zone visibility ───────────────────────────────────────────── */

  test('WithoutAside story: aside zone is absent', async ({ page }) => {
    await page.goto(story('without-aside'));
    await page.locator('.mantine-AppShell-main').waitFor();
    await expect(page.locator('.mantine-AppShell-aside')).toHaveCount(0);
  });

  test('WithoutNavbar story: navbar zone is absent', async ({ page }) => {
    await page.goto(story('without-navbar'));
    await page.locator('.mantine-AppShell-main').waitFor();
    await expect(page.locator('.mantine-AppShell-navbar')).toHaveCount(0);
  });

  test('Minimal story: both navbar and aside are absent', async ({ page }) => {
    await page.goto(story('minimal'));
    await page.locator('.mantine-AppShell-main').waitFor();
    await expect(page.locator('.mantine-AppShell-navbar')).toHaveCount(0);
    await expect(page.locator('.mantine-AppShell-aside')).toHaveCount(0);
  });

  /* ─── Styling ────────────────────────────────────────────────────────────── */

  test('main area has gray.0 background (rgb 248 249 250)', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-main').waitFor();
    const bgColor = await page.evaluate(() => {
      const el = document.querySelector('.mantine-AppShell-main');
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    expect(bgColor).toBe('rgb(248, 249, 250)');
  });

  /* ─── Accessibility ───────────────────────────────────────────────────────── */

  test('axe: no violations on open story', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-main').waitFor();
    // Multiple landmark zones (header, nav, main, aside, footer) are present —
    // full-page scan with iframe false-positive rules disabled.
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /* ─── Responsive zone sizes ─────────────────────────────────────────────── */

  test('responsive navbar: 200px at 600px viewport width', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(story('responsive-zones'));
    await page.locator('.mantine-AppShell-navbar').waitFor();
    const width = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().width
    );
    expect(width).toBe(200);
  });

  test('responsive navbar: 300px at 1280px viewport width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(story('responsive-zones'));
    await page.locator('.mantine-AppShell-navbar').waitFor();
    const width = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().width
    );
    expect(width).toBe(300);
  });

  test('responsive header: 50px at 600px viewport width', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(story('responsive-zones'));
    await page.locator('.mantine-AppShell-header').waitFor();
    const height = await page.evaluate(() =>
      document.querySelector('.mantine-AppShell-header')?.getBoundingClientRect().height
    );
    expect(height).toBe(50);
  });

  /* ─── Visual snapshot ────────────────────────────────────────────────────── */

  test('default story screenshot', async ({ page }) => {
    await page.goto(story('open'));
    await page.locator('.mantine-AppShell-main').waitFor();
    await expect(page).toHaveScreenshot('appshell-default.png');
  });
});

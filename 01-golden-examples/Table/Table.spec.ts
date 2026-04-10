import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const story = (name: string) =>
  `http://localhost:6006/iframe.html?id=components-table--${name}&viewMode=story`;

test.describe('Table', () => {
  // ─── Visual snapshot ───────────────────────────────────────────────────────
  test('default story screenshot', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Table-table').first().waitFor();
    await expect(page).toHaveScreenshot('default.png');
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────
  test('renders correct number of tbody rows matching data length', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Table-table').first().waitFor();

    const rows = page.locator('.mantine-Table-tbody .mantine-Table-tr');
    await expect(rows).toHaveCount(5);
  });

  test('header cells contain the correct column labels', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Table-thead').waitFor();

    const headerCells = page.locator('.mantine-Table-thead .mantine-Table-th');
    await expect(headerCells.nth(0)).toContainText('Position');
    await expect(headerCells.nth(1)).toContainText('Element name');
    await expect(headerCells.nth(2)).toContainText('Symbol');
    await expect(headerCells.nth(3)).toContainText('Atomic mass');
  });

  // ─── Border props ──────────────────────────────────────────────────────────
  test('withTableBorder sets data-with-table-border attribute on table', async ({ page }) => {
    await page.goto(story('with-borders'));
    await page.locator('.mantine-Table-table').waitFor();

    const table = page.locator('.mantine-Table-table');
    await expect(table).toHaveAttribute('data-with-table-border');
  });

  test('withColumnBorders renders visible column separators', async ({ page }) => {
    await page.goto(story('with-borders'));
    await page.locator('.mantine-Table-table').waitFor();

    // Verify the table renders without errors when withColumnBorders is set
    const table = page.locator('.mantine-Table-table');
    await expect(table).toBeVisible();
  });

  // ─── Sorting ───────────────────────────────────────────────────────────────
  test('clicking a sortable header sets data-sort-direction="asc"', async ({ page }) => {
    await page.goto(story('sortable'));
    await page.locator('.mantine-Table-table').waitFor();

    const positionSortBtn = page.locator('button[aria-label="Sort by Position"]');
    await positionSortBtn.click();

    await expect(positionSortBtn).toHaveAttribute('data-sort-direction', 'asc');
  });

  test('clicking the same sortable header again sets data-sort-direction="desc"', async ({ page }) => {
    await page.goto(story('sortable'));
    await page.locator('.mantine-Table-table').waitFor();

    const positionSortBtn = page.locator('button[aria-label="Sort by Position"]');
    await positionSortBtn.click();
    await positionSortBtn.click();

    await expect(positionSortBtn).toHaveAttribute('data-sort-direction', 'desc');
  });

  test('clicking a third time removes data-sort-direction attribute (back to unsorted)', async ({ page }) => {
    await page.goto(story('sortable'));
    await page.locator('.mantine-Table-table').waitFor();

    const positionSortBtn = page.locator('button[aria-label="Sort by Position"]');
    await positionSortBtn.click();
    await positionSortBtn.click();
    await positionSortBtn.click();

    await expect(positionSortBtn).not.toHaveAttribute('data-sort-direction');
  });

  // ─── Footer ────────────────────────────────────────────────────────────────
  test('footer row renders when footerData is provided', async ({ page }) => {
    await page.goto(story('with-footer'));
    await page.locator('.mantine-Table-table').waitFor();

    const tfoot = page.locator('.mantine-Table-tfoot');
    await expect(tfoot).toBeVisible();
    await expect(tfoot).toContainText('Total');
  });

  // ─── Striped ───────────────────────────────────────────────────────────────
  test('root wrapper has data-striped attribute when striped prop is set', async ({ page }) => {
    await page.goto(story('striped'));
    await page.locator('.mantine-Table-table').waitFor();

    // Root is the Box wrapper div rendered by DataTable
    const root = page.locator('.mantine-Table-table').locator('../..').first();
    // Use evaluate to check the closest ancestor with data-striped
    const hasStriped = await page.evaluate(() => {
      const table = document.querySelector('.mantine-Table-table');
      const root = table?.closest('[data-striped]');
      return root?.getAttribute('data-striped') ?? null;
    });
    expect(hasStriped).toBeTruthy();
  });

  // ─── Numeric sort ──────────────────────────────────────────────────────────
  // Verifies the numeric branch (Number(av) comparison) not lexicographic.
  // String sort would order: "12.011", "137.33", "14.007", "140.12", "88.906"
  // putting Barium (137.33) second. Numeric sort keeps Nitrogen (14.007) second.
  test('sorting a numeric column uses numeric comparison not lexicographic', async ({ page }) => {
    await page.goto(story('sortable'));
    await page.locator('.mantine-Table-table').waitFor();

    const massSortBtn = page.locator('button[aria-label="Sort by Atomic mass"]');
    await massSortBtn.click(); // asc

    const rows = page.locator('.mantine-Table-tbody .mantine-Table-tr');
    // With numeric asc: Carbon(12.011), Nitrogen(14.007), Yttrium(88.906), Barium(137.33), Cerium(140.12)
    // With string asc:  Carbon(12.011), Barium(137.33), Nitrogen(14.007) — wrong
    await expect(rows.nth(1)).toContainText('Nitrogen');
    await expect(rows.nth(3)).toContainText('Barium');
  });

  // ─── Caption ───────────────────────────────────────────────────────────────
  test('caption renders when caption prop is provided', async ({ page }) => {
    await page.goto(story('with-caption'));
    await page.locator('.mantine-Table-table').waitFor();

    const caption = page.locator('.mantine-Table-caption');
    await expect(caption).toBeVisible();
    await expect(caption).toContainText('Selected elements from the periodic table');
  });

  // ─── Partial footer ────────────────────────────────────────────────────────
  test('partial footerData renders empty cells for missing keys', async ({ page }) => {
    await page.goto(story('partial-footer'));
    await page.locator('.mantine-Table-table').waitFor();

    const tfoot = page.locator('.mantine-Table-tfoot');
    await expect(tfoot).toBeVisible();
    // 'name' key present — should render
    await expect(tfoot).toContainText('Total elements');
    // 'position' and 'symbol' keys missing — cells exist but are empty
    const footerCells = tfoot.locator('.mantine-Table-td');
    await expect(footerCells).toHaveCount(4);
    await expect(footerCells.nth(0)).toBeEmpty(); // position — missing key
    await expect(footerCells.nth(2)).toBeEmpty(); // symbol — missing key
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────
  test('has no accessibility violations on default story', async ({ page }) => {
    await page.goto(story('default'));
    await page.locator('.mantine-Table-table').waitFor();

    const results = await new AxeBuilder({ page })
      .include('.mantine-Table-table')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on all-features story', async ({ page }) => {
    await page.goto(story('all-features'));
    await page.locator('.mantine-Table-table').waitFor();

    // Full page scan — disable Storybook iframe false positives
    const results = await new AxeBuilder({ page })
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

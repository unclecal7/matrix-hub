import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers/wait-for-hydration';

test.describe('Keyboard Shortcuts', () => {
  test('arrow key navigation selects a cell', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-grid-container').click();
    await page.keyboard.press('ArrowRight');

    const selectedCells = page.locator('.mh-cell.selected');
    await expect(selectedCells).toHaveCount(1);
  });

  test('enter key routes selected cell', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-grid-container').click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const activeCells = page.locator('.mh-cell.active');
    const activeCount = await activeCells.count();
    expect(activeCount).toBeGreaterThanOrEqual(1);
  });

  test('escape clears selection', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-grid-container').click();
    await page.keyboard.press('ArrowRight');

    // Confirm a cell is selected first
    await expect(page.locator('.mh-cell.selected')).toHaveCount(1);

    await page.keyboard.press('Escape');

    const selectedCells = page.locator('.mh-cell.selected');
    await expect(selectedCells).toHaveCount(0);
  });

  test('slash key focuses search input', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-grid-container').click();
    await page.keyboard.press('/');

    const searchFocused = await page.locator('input[placeholder*="Filter"]').evaluate(
      (el) => el === document.activeElement
    );
    expect(searchFocused).toBe(true);
  });
});

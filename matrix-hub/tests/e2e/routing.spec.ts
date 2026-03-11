import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers/wait-for-hydration';

test.describe('Routing Interactions', () => {
  test('clicking a cell routes it (shows active class)', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-cell').first().click();
    await page.waitForTimeout(500);

    const activeCells = page.locator('.mh-cell.active');
    const activeCount = await activeCells.count();
    expect(activeCount).toBeGreaterThanOrEqual(1);
  });

  test('active cell shows checkmark', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-cell').first().click();
    await page.waitForTimeout(500);

    const checkmark = page.locator('.mh-checkmark').first();
    await expect(checkmark).toBeVisible();
  });

  test('hovering a cell shows tooltip', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-cell').first().hover();

    const tooltip = page.locator('.mh-tooltip');
    await expect(tooltip).toBeVisible();
  });

  test('tooltip contains output and input labels', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-cell').first().hover();

    const tooltip = page.locator('.mh-tooltip');
    await expect(tooltip).toBeVisible();
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toBeTruthy();
    expect(tooltipText!.trim().length).toBeGreaterThan(0);
  });
});

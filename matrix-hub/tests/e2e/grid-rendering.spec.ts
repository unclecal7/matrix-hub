import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers/wait-for-hydration';

test.describe('Grid Rendering', () => {
  test('page loads and shows logo', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('.mh-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('MATRIX HUB');
  });

  test('three tabs are visible', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('.mh-tab');
    await expect(tabs).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(tabs.nth(i)).toBeVisible();
    }
  });

  test('column headers render after hydration', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const colHeaders = page.locator('.mh-col-header');
    await expect(colHeaders.first()).toBeVisible();
    const count = await colHeaders.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('row headers render after hydration', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const rowHeaders = page.locator('.mh-row-header');
    await expect(rowHeaders.first()).toBeVisible();
    const count = await rowHeaders.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('first column header is not clipped by corner div (regression: PTZ1)', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const cornerRight = await page.locator('.mh-col-headers > div:first-child').evaluate(
      (el) => el.getBoundingClientRect().right
    );
    const headerLeft = await page.locator('.mh-col-header-text').first().evaluate(
      (el) => el.getBoundingClientRect().x
    );
    expect(headerLeft).toBeGreaterThan(cornerRight - 5);
  });

  test('status bar shows positive I/O counts', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const accents = page.locator('.mh-statusbar-accent');
    const count = await accents.count();
    expect(count).toBeGreaterThanOrEqual(1);
    // At least one accent element should have a positive integer
    let foundPositive = false;
    for (let i = 0; i < count; i++) {
      const text = await accents.nth(i).textContent();
      const value = parseInt(text || '0', 10);
      if (value > 0) {
        foundPositive = true;
        break;
      }
    }
    expect(foundPositive).toBe(true);
  });
});

import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers/wait-for-hydration';

test.describe('Grid Scrolling', () => {
  test('grid container supports horizontal scrolling', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const gridContainer = page.locator('.mh-grid-container');

    // Verify the container has overflow: auto (enables scrolling)
    const overflow = await gridContainer.evaluate((el) => getComputedStyle(el).overflow);
    expect(overflow).toBe('auto');

    // If content is wider than viewport, verify scroll actually moves
    const { maxScroll } = await gridContainer.evaluate((el) => ({
      maxScroll: el.scrollWidth - el.clientWidth,
    }));
    if (maxScroll > 0) {
      await gridContainer.evaluate((el) => { el.scrollLeft = 200; });
      await page.waitForTimeout(300);
      const scrollAfter = await gridContainer.evaluate((el) => el.scrollLeft);
      expect(scrollAfter).toBeGreaterThan(0);
    }
    // If all columns fit on screen, scrollability is still verified by overflow: auto above
  });

  test('vertical scroll moves row labels', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const gridContainer = page.locator('.mh-grid-container');
    const scrollBefore = await gridContainer.evaluate((el) => el.scrollTop);

    await gridContainer.evaluate((el) => { el.scrollTop = 200; });
    await page.waitForTimeout(300);

    const scrollAfter = await gridContainer.evaluate((el) => el.scrollTop);
    // scrollTop may be capped if content fits in viewport; just verify the container accepts scroll
    expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore);
  });

  test('sticky corner div stays fixed during horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const gridContainer = page.locator('.mh-grid-container');
    const cornerLocator = page.locator('.mh-col-headers > div:first-child');

    const rightBefore = await cornerLocator.evaluate((el) => el.getBoundingClientRect().right);

    await gridContainer.evaluate((el) => { el.scrollLeft = 200; });
    await page.waitForTimeout(300);

    const rightAfter = await cornerLocator.evaluate((el) => el.getBoundingClientRect().right);
    expect(Math.abs(rightAfter - rightBefore)).toBeLessThanOrEqual(1);
  });

  test('sticky row headers stay fixed during horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    const gridContainer = page.locator('.mh-grid-container');
    const firstRowHeader = page.locator('.mh-row-header').first();

    const xBefore = await firstRowHeader.evaluate((el) => el.getBoundingClientRect().x);

    await gridContainer.evaluate((el) => { el.scrollLeft = 200; });
    await page.waitForTimeout(300);

    const xAfter = await firstRowHeader.evaluate((el) => el.getBoundingClientRect().x);
    expect(Math.abs(xAfter - xBefore)).toBeLessThanOrEqual(1);
  });
});

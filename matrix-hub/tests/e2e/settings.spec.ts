import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers/wait-for-hydration';

test.describe('Settings Tab', () => {
  test('clicking Settings tab shows settings content', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-tab').filter({ hasText: 'Settings' }).click();

    // The routing grid should not be visible in settings view
    await expect(page.locator('.mh-grid-container')).not.toBeVisible();

    // The settings content shows "Device Management" as its heading
    const heading = page.locator('h2').filter({ hasText: 'Device Management' });
    await expect(heading).toBeVisible();
  });

  test('settings tab shows device list', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-tab').filter({ hasText: 'Settings' }).click();

    // The device list renders device entries with an Edit button per device,
    // or a "No devices configured" message. In simulator mode there should be
    // at least one device (the videohub simulator).
    const deviceEntries = page.locator('button').filter({ hasText: 'Edit' });
    const count = await deviceEntries.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('companion bridge form fields are present', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    await page.locator('.mh-tab').filter({ hasText: 'Settings' }).click();

    // Companion IP input has placeholder "127.0.0.1"
    const companionIpInput = page.locator('input[placeholder="127.0.0.1"]');
    await expect(companionIpInput).toBeVisible();

    // OSC Port input has placeholder "12321"
    const oscPortInput = page.locator('input[placeholder="12321"]');
    await expect(oscPortInput).toBeVisible();
  });

  test('clicking back to Videohub tab shows grid', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);

    // Navigate to Settings
    await page.locator('.mh-tab').filter({ hasText: 'Settings' }).click();
    await expect(page.locator('.mh-grid-container')).not.toBeVisible();

    // Navigate back to Videohub Routing
    await page.locator('.mh-tab').filter({ hasText: 'Videohub Routing' }).click();

    await expect(page.locator('.mh-grid-container')).toBeVisible();
  });
});

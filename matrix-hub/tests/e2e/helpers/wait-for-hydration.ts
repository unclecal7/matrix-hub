import type { Page } from '@playwright/test';

export async function waitForHydration(page: Page) {
  await page.waitForSelector('.mh-statusbar-accent', { state: 'visible' });
  await page.waitForFunction(() => {
    const el = document.querySelector('.mh-statusbar-accent');
    return el && parseInt(el.textContent || '0', 10) > 0;
  });
}

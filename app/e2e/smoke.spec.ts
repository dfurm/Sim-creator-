import { expect, test } from '@playwright/test';

test('headless Chromium opens a blank page', async ({ page }) => {
  await page.goto('about:blank');
  expect(page.url()).toBe('about:blank');
  expect(await page.evaluate(() => 1 + 1)).toBe(2);
});

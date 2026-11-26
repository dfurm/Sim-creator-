import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

// Requires `npm run build:file` first (test:e2e does this).
const built = resolve(import.meta.dirname, '../../dist/file/index.html');

test('single-file S02 build runs from file:// with no console errors and no network requests', async ({ page }) => {
  expect(existsSync(built), `missing ${built}; run npm run build:file`).toBe(true);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(pathToFileURL(built).href);
  await expect(page.getByTestId('out-v2')).toHaveText('2.04');
  await expect(page.getByTestId('out-v1')).toHaveText('0.509');
  await expect(page.locator('.katex').first()).toBeVisible();          // KaTeX bundled locally
  await expect(page.locator('[data-anchor="S02/throat_area"]')).toHaveCount(1);
  // interact once so the model path runs under file://
  const d2 = page.locator('[data-input="D2"] input.num');
  await d2.fill('50');
  await d2.press('Enter');
  await expect(page.getByTestId('out-v2')).toHaveText('0.509');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

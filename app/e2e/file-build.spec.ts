import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

// Requires `npm run build:file` first (test:e2e does this).
const built = resolve(import.meta.dirname, '../../dist/file/index.html');

test('single-file build runs from file://', async ({ page }) => {
  expect(existsSync(built), `missing ${built}; run npm run build:file`).toBe(true);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(built).href);
  await expect(page.locator('#app')).toHaveText('toolchain-ok');
  expect(errors).toEqual([]);
});

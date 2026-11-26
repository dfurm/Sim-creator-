/**
 * In-app navigation without query strings (Run 2B1 fix for phones that ignore location.search
 * on local files). Every page is reached by clicking or tapping visible links only.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { devices, expect, test, type Page } from '@playwright/test';

const built = resolve(import.meta.dirname, '../../dist/file/index.html');
const fileUrl = () => pathToFileURL(built).href;

type Activate = (page: Page, name: string | RegExp) => Promise<void>;
const click: Activate = async (page, name) => { await page.getByRole('link', { name, exact: typeof name === 'string' }).first().click(); };
const tap: Activate = async (page, name) => { await page.getByRole('link', { name, exact: typeof name === 'string' }).first().tap(); };

function watch(page: Page) {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url()) && !r.url().startsWith('http://localhost:4173/')) external.push(r.url()); });
  return { errors, external };
}

/** Visit every page from the home page and the in-page navigation; assert each page rendered. */
async function tour(page: Page, go: Activate) {
  const home = () => go(page, 'Library home');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText('Pipe-flow lesson sequence');
  // Mark the document: if any link caused a reload, this marker disappears.
  await page.evaluate(() => { (window as unknown as { __noReload: number }).__noReload = 1; });

  await go(page, 'S02 · Continuity through a contraction');
  await expect(h1).toHaveText('S02 · Continuity through a contraction');
  await expect(page.getByTestId('out-v2')).toHaveText('2.04');
  await go(page, 'Guided investigation: halve D₂');
  await expect(page.getByTestId('out-v2')).toHaveText('hidden until prediction');
  await go(page, 'Explore and design');
  await expect(page.getByTestId('out-v2')).toHaveText('2.04');
  await home();
  await expect(h1).toHaveText('Pipe-flow lesson sequence');

  await go(page, 'S02 · Guided investigation: halve D₂');
  await expect(page.getByTestId('out-v2')).toHaveText('hidden until prediction');
  await home();

  await go(page, /Pipe lesson · Contraction and straight run/);
  await expect(h1).toHaveText('Pipe lesson · contraction and straight run');
  await expect(page.getByTestId('out-p3')).toHaveText('82110');
  await expect(page.getByTestId('task-panel')).toHaveCount(0);
  for (const [k, title] of [['a', 'Level contraction at fixed flow'], ['b', 'Ideal and lossy predictions for the same pipe'], ['c', 'Push the model to an applicability limit']] as const) {
    await go(page, `Task (${k})`);
    await expect(page.locator('#task-title')).toHaveText(`Task (${k}): ${title}`);
  }
  await go(page, 'Explore');
  await expect(page.getByTestId('task-panel')).toHaveCount(0);
  await home();

  for (const [label, k] of [[/^Task \(a\)/, 'a'], [/^Task \(b\)/, 'b'], [/^Task \(c\)/, 'c']] as const) {
    await go(page, label);
    await expect(page.locator('#task-title')).toContainText(`Task (${k})`);
    await home();
  }
  expect(await page.evaluate(() => (window as unknown as { __noReload?: number }).__noReload)).toBe(1);
}

test.describe('in-app navigation, web build (dist/app on :4173)', () => {
  test('click through every page from the home page; no query strings, no reloads, no console errors', async ({ page }) => {
    const w = watch(page);
    await page.goto('./');
    await tour(page, click);
    expect(page.url()).not.toContain('?');
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });

  test('hash deep links and the Back button work', async ({ page }) => {
    await page.goto('./#/pipe/c');
    await expect(page.locator('#task-title')).toContainText('Task (c)');
    await page.reload();
    await expect(page.locator('#task-title')).toContainText('Task (c)');
    await click(page, 'Task (a)');
    expect(new URL(page.url()).hash).toBe('#/pipe/a');
    await page.goBack();
    await expect(page.locator('#task-title')).toContainText('Task (c)');
    await page.goto('./#/S02/investigate');
    await expect(page.getByTestId('out-v2')).toHaveText('hidden until prediction');
  });

  test('legacy ?sim= links still open the right page (extra, not required)', async ({ page }) => {
    await page.goto('./?sim=pipe&task=b');
    await expect(page.locator('#task-title')).toContainText('Task (b)');
    await click(page, 'Library home');
    await expect(page.locator('h1')).toHaveText('Pipe-flow lesson sequence');
  });

  test('navigation still works when the browser refuses URL changes (local-file viewers)', async ({ page }) => {
    await page.addInitScript(() => {
      History.prototype.pushState = () => { throw new DOMException('blocked', 'SecurityError'); };
    });
    const w = watch(page);
    await page.goto('./');
    await tour(page, click);
    expect(new URL(page.url()).hash).toBe('');   // URL never changed
    expect(w.errors).toEqual([]);
  });

  test('keyboard: links are reachable and activated with Enter; focus moves to the new heading', async ({ page }) => {
    await page.goto('./');
    const link = page.getByRole('link', { name: 'Task (b) · Ideal vs lossy: account for the difference' });
    await link.focus();
    await link.press('Enter');
    await expect(page.locator('#task-title')).toContainText('Task (b)');
    await expect(page.locator('h1')).toBeFocused();
  });
});

test.describe('in-app navigation, single-file build (file://)', () => {
  test('desktop: every page reached by clicking, no console errors, no network', async ({ page }) => {
    expect(existsSync(built), 'run npm run build:file').toBe(true);
    const w = watch(page);
    await page.goto(fileUrl());
    await tour(page, click);
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });

  test('desktop file:// with URL writes blocked: still navigates', async ({ page }) => {
    await page.addInitScript(() => { History.prototype.pushState = () => { throw new Error('blocked'); }; });
    const w = watch(page);
    await page.goto(fileUrl());
    await tour(page, click);
    expect(w.errors).toEqual([]);
  });
});

test.describe('in-app navigation, single file on an emulated Android phone (Pixel 7, touch)', () => {
  const { defaultBrowserType: _b, ...pixel7 } = devices['Pixel 7'];
  test.use(pixel7);
  test('tap through every page, with URL writes blocked; no console errors; no horizontal scroll', async ({ page }) => {
    await page.addInitScript(() => { History.prototype.pushState = () => { throw new Error('blocked'); }; });
    const w = watch(page);
    await page.goto(fileUrl());
    await tour(page, tap);
    await tap(page, /^Task \(c\)/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });
});

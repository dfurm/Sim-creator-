import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const num = (page: Page, id: string) => page.locator(`[data-input="${id}"] input.num`);
const slider = (page: Page, id: string) => page.locator(`[data-input="${id}"] input[type="range"]`);

test.describe('S02 standalone page', () => {
  test('defaults reproduce the spec fixture; status shown by icon and text', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('out-v1')).toHaveText('0.509');
    await expect(page.getByTestId('out-v2')).toHaveText('2.04');
    await expect(page.getByTestId('out-mdot')).toHaveText('1.00');
    await expect(page.locator('[data-output="v2"] .mono')).toHaveText('2.0371832715762603');
    const banner = page.getByTestId('status-banner');
    await expect(banner).toContainText('✓');
    await expect(banner).toContainText('Within documented applicability');
    await expect(banner).toContainText('Not modelled');
  });

  test('keyboard-only: numeric entry, slider arrows and coarse steps', async ({ page }) => {
    await page.goto('./');
    await num(page, 'D2').focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('50');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('out-v2')).toHaveText('0.509');     // equal diameters, equal speeds
    await slider(page, 'D2').focus();
    await page.keyboard.press('ArrowLeft');                            // 50 → 49 mm
    await expect(num(page, 'D2')).toHaveValue('49');
    await page.keyboard.press('PageDown');                             // ×10 step: 49 → 39 mm
    await expect(num(page, 'D2')).toHaveValue('39');
    await expect(page.getByTestId('live')).toContainText('v̄₂');
    // Q = 0 gives zero at both stations
    await num(page, 'Q').fill('0');
    await num(page, 'Q').press('Enter');
    await expect(page.getByTestId('out-v1')).toHaveText('0');
    await expect(page.getByTestId('out-v2')).toHaveText('0');
  });

  test('invalid entries are rejected with clear messages and the last result kept', async ({ page }) => {
    await page.goto('./');
    await num(page, 'Q').fill('abc');
    await num(page, 'Q').press('Enter');
    await expect(page.locator('[data-input="Q"] .field-error')).toContainText('is not a number');
    await num(page, 'D2').fill('-5');
    await num(page, 'D2').press('Enter');
    await expect(page.locator('[data-input="D2"] .field-error')).toContainText('greater than 0');
    await num(page, 'D1').fill('500');
    await num(page, 'D1').press('Enter');
    await expect(page.locator('[data-input="D1"] .field-error')).toContainText('between 0.01 and 0.1 m');
    await num(page, 'Q').fill('Infinity');
    await num(page, 'Q').press('Enter');
    await expect(page.locator('[data-input="Q"] .field-error')).toContainText('finite');
    await expect(page.getByTestId('out-v2')).toHaveText('2.04');
    await expect(page.locator('[data-input="Q"] input.num')).toHaveAttribute('aria-invalid', 'true');
  });

  test('display units switch without changing SI values', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel('SI (m³/s, m)').check();
    await expect(num(page, 'Q')).toHaveValue('0.001');
    await expect(num(page, 'D2')).toHaveValue('0.025');
    await page.getByLabel('L/min and mm').check();
    await expect(num(page, 'Q')).toHaveValue('60');
    await expect(page.locator('[data-output="v2"] .mono')).toHaveText('2.0371832715762603');
  });

  test('bore design: D_min, feasible bores, forward check and infeasible case', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel(/Bore design/).check();
    await expect(page.getByTestId('dmin')).toHaveText('25.23 mm');
    await expect(page.getByTestId('selected-bore')).toHaveText('26 mm');
    await expect(num(page, 'D2')).toBeDisabled();
    await num(page, 'vmax').fill('0.25');
    await num(page, 'vmax').press('Enter');
    await num(page, 'Q').fill('180');
    await num(page, 'Q').press('Enter');
    await expect(page.getByTestId('design-panel')).toContainText('No bore in the 10–100 mm teaching range');
    await expect(page.getByTestId('out-v2')).toHaveText('—');
    await expect(page.getByTestId('status-banner')).toContainText('⛔');
  });

  test('guided investigation: prediction before reveal, feedback, completion', async ({ page }) => {
    await page.goto('./?scenario=investigate');
    await expect(page.getByTestId('out-v2')).toHaveText('hidden until prediction');
    await expect(num(page, 'Q')).toBeDisabled();
    await page.getByLabel(/by what factor/).fill('2');
    await page.getByRole('button', { name: 'Record prediction' }).click();
    await expect(page.getByTestId('out-v2')).toHaveText('0.509');
    await page.getByRole('button', { name: /Halve D₂/ }).click();
    await expect(page.getByTestId('out-v2')).toHaveText('2.04');
    await expect(page.getByTestId('pred-feedback')).toContainText('×4.000');
    await expect(page.getByTestId('pred-feedback')).toContainText('misses the square');
    await page.getByLabel(/Explain the factor/).fill('Area goes with D squared, so v goes up four times.');
    await page.getByRole('button', { name: 'Record explanation' }).click();
    await expect(page.locator('.criteria li')).toHaveText([/Done: predict-halve-D2 recorded/, /Done: v2 = 2\.03718/, /Done: explain-halve-D2 recorded/]);
  });

  test('save in browser, change, restore: identical outputs', async ({ page }) => {
    await page.goto('./');
    await num(page, 'D2').fill('17');
    await num(page, 'D2').press('Enter');
    const saved = await page.locator('[data-output="v2"] .mono').textContent();
    await page.getByRole('button', { name: 'Save in this browser' }).click();
    await expect(page.getByTestId('notice')).toContainText('Saved revision');
    await num(page, 'D2').fill('80');
    await num(page, 'D2').press('Enter');
    await expect(page.locator('[data-output="v2"] .mono')).not.toHaveText(saved!);
    await page.getByRole('button', { name: 'Restore browser save' }).click();
    await expect(page.locator('[data-output="v2"] .mono')).toHaveText(saved!);
    await expect(num(page, 'D2')).toHaveValue('17');
  });

  test('CSV export contains SI values with unit, status, origin and model version', async ({ page }) => {
    await page.goto('./');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
    const text = await (await import('node:fs')).promises.readFile((await dl.path())!, 'utf8');
    expect(text).toMatch(/output,v2,2\.0371832715762603,m\/s,within,calculated,.*,S02,0\.2\.0,1/);
  });

  test('semantic anchors link the diagram to table and equation', async ({ page }) => {
    await page.goto('./');
    await page.locator('[data-anchor="S02/throat_area"]').focus();
    await expect(page.locator('[data-output="area2"]')).toHaveClass(/is-active/);
    await expect(page.locator('[data-eq="A2"]')).toHaveClass(/is-active/);
    await expect(page.locator('[data-anchor="S02/throat_area"]')).toHaveAttribute('aria-label', /Section 2: diameter 25\.0 millimetres/);
  });

  test('reduced motion: parcel motion starts paused', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await expect(page.getByTestId('motion-toggle')).toHaveText(/Play parcel motion/);
    await expect(page.getByTestId('motion-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  test('reflows at 320 px without horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('./');
    await expect(page.getByTestId('out-v2')).toHaveText('2.04');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test('automated accessibility scan (axe, WCAG 2.x A/AA rules)', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('out-v2')).toHaveText('2.04');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const summary = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`);
    expect(summary).toEqual([]);
  });
});

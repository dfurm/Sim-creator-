/**
 * Pipe lesson: the three tasks driven by keyboard only (focus + typing + Space/Enter, no mouse
 * clicks), exported data containing the logged predictions, unsupported states, and axe scans.
 */
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const press = async (l: Locator, key = 'Enter') => { await l.focus(); await l.press(key); };
const typeInto = async (l: Locator, text: string) => { await l.focus(); await l.press('ControlOrMeta+a'); await l.pressSequentially(text); };
const choose = (page: Page, item: string, value: string) => press(page.locator(`input[name="item-${item}"][value="${value}"]`), 'Space');
const check = (page: Page, item: string) => press(page.getByRole('button', { name: `Check ${item}` }));

async function exportJson(page: Page) {
  const [dl] = await Promise.all([page.waitForEvent('download'), press(page.getByRole('button', { name: 'Export JSON' }))]);
  return JSON.parse(await readFile((await dl.path())!, 'utf8')) as { learning: Record<string, Record<string, unknown>>; outputs: Record<string, { value: unknown }> };
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) e.g. ${v.nodes[0]?.target.join(' ')}`);
}

test.describe('pipe lesson', () => {
  test('explore defaults match the independent fixture; quantities labelled input/fixed; ideal vs lossy side by side', async ({ page }) => {
    await page.goto('./?sim=pipe&task=explore');
    await expect(page.getByTestId('out-Re2')).toHaveText('50930');
    await expect(page.getByTestId('out-darcy_f')).toHaveText('0.0208');
    await expect(page.getByTestId('out-p3')).toHaveText('82110');
    await expect(page.getByTestId('out-p3_ideal')).toHaveText('99380');
    await expect(page.locator('.tag-input').first()).toBeVisible();
    await expect(page.locator('.fixed-list')).toContainText('Gravitational acceleration g = 9.80665');
    await expect(page.locator('[data-station="3"]')).toContainText('82.110');
    await expect(page.locator('[data-station="3"]')).toContainText('99.380');
    expect(await axe(page)).toEqual([]);
  });

  test('task (a), keyboard only: prediction hidden-then-revealed, items with feedback, prediction exported', async ({ page }) => {
    await page.goto('./?sim=pipe&task=a');
    await expect(page.getByTestId('out-v2')).toHaveText('hidden until prediction');
    await expect(page.locator('[data-station="2"]')).toContainText('hidden');
    await expect(page.locator('[data-input="Q"] input.num')).toBeDisabled();
    await typeInto(page.locator('[data-pred="v2"]'), '1.5');
    await typeInto(page.locator('[data-pred="dp"]'), '500');
    await press(page.getByRole('button', { name: 'Record prediction' }));
    await expect(page.getByTestId('prediction-recorded')).toBeVisible();
    await expect(page.getByTestId('out-v2')).toHaveText('2.04');
    await expect(page.getByTestId('comparison')).toContainText('v̄₂ = 2.037 m/s (yours 1.5)');
    await expect(page.getByTestId('comparison')).toContainText('p₂ − p₁ = -1945 Pa (yours 500)');
    await choose(page, 'A1', 'a'); await check(page, 'A1');
    await expect(page.getByTestId('feedback-A1')).toContainText('Not quite.');
    await expect(page.getByTestId('feedback-A1')).toContainText('area scales with D²');
    await choose(page, 'A1', 'b'); await check(page, 'A1');
    await expect(page.getByTestId('feedback-A1')).toContainText('Correct.');
    await choose(page, 'A2', 'b'); await check(page, 'A2');
    await expect(page.getByTestId('feedback-A2')).toContainText('needs a pressure fall');
    await typeInto(page.locator('[data-item="A3"] input[type="text"]'), '1945'); await check(page, 'A3');
    await expect(page.getByTestId('feedback-A3')).toContainText('Correct');
    await typeInto(page.locator('#expl'), 'Area quarters so velocity quadruples; the velocity head rises, so the pressure head falls.');
    await press(page.getByRole('button', { name: 'Record explanation' }));
    await expect(page.locator('.criteria li')).toHaveText([/Done: predict-a/, /Done: p2_ideal = 99379\.6/, /Done: explain-a/]);
    const json = await exportJson(page);
    expect(json.learning['predict-a']).toMatchObject({ v2: 1.5, dp: 500, units: { v2: 'm/s', dp: 'Pa' } });
    expect(json.learning['item-A1']).toMatchObject({ response: 'b', correct: true });
    expect(json.learning['item-A2']).toMatchObject({ response: 'b', correct: false });
    expect(String(json.learning['explain-a']!['text'])).toContain('quadruples');
    expect(await axe(page)).toEqual([]);
  });

  test('task (b), keyboard only: ideal vs lossy, head balance accounts for the difference', async ({ page }) => {
    await page.goto('./?sim=pipe&task=b');
    await expect(page.getByTestId('out-p3')).toHaveText('hidden until prediction');
    await expect(page.getByTestId('out-p3_ideal')).toHaveText('99380');
    await typeInto(page.locator('[data-pred="dh"]'), '0.5');
    await press(page.locator('input[name="pred-larger"][value="contraction loss h_K"]'), 'Space');
    await press(page.getByRole('button', { name: 'Record prediction' }));
    await expect(page.getByTestId('out-p3')).toHaveText('81488');
    await expect(page.getByTestId('comparison')).toContainText('ρg(h_K + h_f) = 1.824 m of head');
    await expect(page.getByTestId('budget')).toContainText('1.76 m');
    await choose(page, 'B1', 'b'); await check(page, 'B1');
    await expect(page.getByTestId('feedback-B1')).toContainText('is also dissipated');
    await choose(page, 'B2', 'a'); await check(page, 'B2');
    await expect(page.getByTestId('feedback-B2')).toContainText('Correct.');
    await typeInto(page.locator('[data-item="B3"] input[type="text"]'), '1.83'); await check(page, 'B3');
    await expect(page.getByTestId('feedback-B3')).toContainText('Correct');
    await typeInto(page.locator('#expl'), 'The ideal case omits h_K and h_f; friction dominates over 10 m.');
    await press(page.getByRole('button', { name: 'Record explanation' }));
    const json = await exportJson(page);
    expect(json.learning['predict-b']).toMatchObject({ dh: 0.5, larger: 'contraction loss h_K' });
    expect(json.learning['item-B3']).toMatchObject({ correct: true });
    expect(await axe(page)).toEqual([]);
  });

  test('task (c), keyboard only: push Q to the transition band; friction prediction withdrawn and logged', async ({ page }) => {
    await page.goto('./?sim=pipe&task=c');
    await typeInto(page.locator('[data-pred="Q4000"]'), '10');
    await press(page.getByRole('button', { name: 'Record prediction' }));
    await expect(page.getByTestId('comparison')).toContainText('Q = 4.712 L/min');
    const q = page.locator('[data-input="Q"] input[type="range"]');
    await q.focus();
    for (let i = 0; i < 9; i++) await q.press('PageDown');      // 60 → 6 L/min
    await expect(page.locator('[data-input="Q"] input.num')).toHaveValue('6');
    await expect(page.getByTestId('out-regime')).toHaveText('turbulent');
    for (let i = 0; i < 3; i++) await q.press('ArrowLeft');     // 6 → 4.2 L/min: Re₂ ≈ 3565
    await expect(page.getByTestId('out-regime')).toHaveText('transitional');
    await expect(page.getByTestId('out-Re2')).toHaveText('3565');
    for (const id of ['darcy_f', 'h_f', 'p3', 'H3', 'residual']) await expect(page.getByTestId(`out-${id}`)).toHaveText('—');
    await expect(page.locator('[data-output="p3"]')).toContainText('Outside documented applicability');
    await expect(page.getByTestId('status-banner')).toContainText('⛔');
    await expect(page.getByTestId('budget')).toContainText('not available');
    await expect(page.locator('[data-station="3"]')).toContainText('—');
    await expect(page.getByTestId('limit-reached')).toContainText('transitional');
    await choose(page, 'C1', 'c'); await check(page, 'C1');
    await expect(page.getByTestId('feedback-C1')).toContainText('a solution is not the same as validity');
    await choose(page, 'C2', 'a'); await check(page, 'C2');
    await expect(page.getByTestId('feedback-C2')).toContainText('Correct.');
    await typeInto(page.locator('[data-item="C3"] input[type="text"]'), '4.71'); await check(page, 'C3');
    await expect(page.getByTestId('feedback-C3')).toContainText('Correct');
    await typeInto(page.locator('#expl'), 'Need measured dp vs Q on this pipe with calibration, or a validated transition model.');
    await press(page.getByRole('button', { name: 'Record explanation' }));
    const json = await exportJson(page);
    expect(json.learning['predict-c']).toMatchObject({ Q4000: 10, units: { Q4000: 'L/min' } });
    expect(json.learning['limit-reached']).toMatchObject({ regime: 'transitional' });
    expect(json.outputs['p3']!.value).toBeNull();
    expect(await axe(page)).toEqual([]);
  });

  test('invalid entries are rejected with messages; |z₃| ≤ L enforced', async ({ page }) => {
    await page.goto('./?sim=pipe&task=explore');
    await typeInto(page.locator('[data-input="mu"] input.num'), '0');
    await page.locator('[data-input="mu"] input.num').press('Enter');
    await expect(page.locator('[data-input="mu"] .field-error')).toContainText('greater than 0');
    await typeInto(page.locator('[data-input="L"] input.num'), '1');
    await page.locator('[data-input="L"] input.num').press('Enter');
    await typeInto(page.locator('[data-input="dz"] input.num'), '1.5');
    await page.locator('[data-input="dz"] input.num').press('Enter');
    await expect(page.getByRole('alert').filter({ hasText: 'cannot exceed the run length' })).toBeVisible();
    await expect(page.getByTestId('out-Re2')).toHaveText('50930');
  });

  test('anchors link scene, table and equation; reflow at 320 px', async ({ page }) => {
    await page.goto('./?sim=pipe&task=explore');
    await page.locator('[data-anchor="S08/friction_point"]').focus();
    await expect(page.locator('[data-output="darcy_f"]')).toHaveClass(/is-active/);
    await expect(page.locator('[data-eq="f"]')).toHaveClass(/is-active/);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await expect(page.getByTestId('out-Re2')).toHaveText('50930');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});

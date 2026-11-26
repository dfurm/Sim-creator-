import { describe, expect, it } from 'vitest';
import { continuity, continuityDimensional, designBore, minimumBore } from '../src/sims/S02/model';
import { createS02Block, S02_SCENARIOS, S02_MANIFEST } from '../src/sims/S02/definition';
import { BlockError } from '../src/core/block';

describe('continuity closure', () => {
  const grid: [number, number, number][] = [];
  for (const Q of [0, 1e-5, 0.0005, 0.001, 0.003]) for (const D1 of [0.01, 0.033, 0.1]) for (const D2 of [0.01, 0.025, 0.1]) grid.push([Q, D1, D2]);
  it.each(grid)('Q=%s D1=%s D2=%s: A1·v1 = A2·v2 = Q and ṁ = ρ·A·v', (Q, D1, D2) => {
    const o = continuity({ Q, D1, D2 });
    const tol = 1e-8 * Math.max(Q, 1e-12);  // balance residual < 1e-8 of transported amount
    expect(Math.abs(o.area1 * o.v1 - Q)).toBeLessThanOrEqual(tol);
    expect(Math.abs(o.area2 * o.v2 - Q)).toBeLessThanOrEqual(tol);
    expect(Math.abs(o.mdot - 1000 * o.area2 * o.v2)).toBeLessThanOrEqual(1000 * tol);
  });
  it('velocity ratio equals (D1/D2)² (halving D2 gives ×4)', () => {
    const a = continuity({ Q: 0.001, D1: 0.05, D2: 0.05 });
    const b = continuity({ Q: 0.001, D1: 0.05, D2: 0.025 });
    expect(b.v2 / a.v2).toBeCloseTo(4, 12);
  });
});

describe('dimensions', () => {
  it('each output has the manifest unit dimension', () => {
    const d = continuityDimensional({ Q: 0.001, D1: 0.05, D2: 0.025 });
    for (const o of S02_MANIFEST.outputs) {
      expect(d[o.id as keyof typeof d].hasUnit(o.unit), `${o.id} in ${o.unit}`).toBe(true);
    }
  });
  it('dimensional twin gives the same numbers as the model', () => {
    const i = { Q: 0.0017, D1: 0.042, D2: 0.019 };
    const d = continuityDimensional(i);
    const o = continuity(i);
    for (const k of Object.keys(o) as (keyof typeof o)[]) expect(d[k].value).toBe(o[k]);
  });
});

describe('bore design', () => {
  it('D_min formula matches spec §D example', () => {
    expect(minimumBore(0.001, 2)).toBeCloseTo(0.0252313, 7);
  });
  it('selected bore is the smallest grid bore ≥ D_min, and the one below fails the cap', () => {
    const d = designBore(0.001, 2);
    expect(d.selected).toBe(0.026);
    expect(0.001 / ((Math.PI * 0.025 ** 2) / 4)).toBeGreaterThan(2);
  });
});

describe('invalid inputs are rejected atomically with clear messages', () => {
  const bad: [string, Record<string, unknown>, RegExp][] = [
    ['NaN flow', { Q: Number.NaN }, /finite/],
    ['Infinity diameter', { D1: Number.POSITIVE_INFINITY }, /finite/],
    ['negative flow', { Q: -0.001 }, /between 0 and 0\.003/],
    ['zero diameter', { D2: 0 }, /greater than 0/],
    ['negative diameter', { D1: -0.05 }, /greater than 0/],
    ['too large diameter', { D2: 0.2 }, /between 0\.01 and 0\.1/],
    ['string value', { Q: '0.001' }, /must be a number/],
    ['unknown input', { rho: 900 }, /Unknown input/],
    ['unknown mode', { mode: 'turbulent' }, /one of/],
    ['velocity cap locked in fixed-throughput', { vmax: 3 }, /locked/],
  ];
  it.each(bad)('%s', async (_n, patch, msg) => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    const before = b.getInputParameters();
    const rev = b.getRevision();
    await expect(b.setInputParameters({ D1: 0.04, ...patch } as never)).rejects.toThrow(msg);
    expect(b.getInputParameters()).toEqual(before);   // no partial update (D1 unchanged)
    expect(b.getRevision()).toBe(rev);
  });
  it('error carries a code', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    try { await b.setInputParameters({ Q: Number.NaN }); } catch (e) {
      expect(e).toBeInstanceOf(BlockError);
      expect((e as BlockError).code).toBe('BAD_INPUT');
    }
  });
  it('D2 is locked (derived) in bore-design mode', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    await b.setInputParameters({ mode: 'boreDesign' });
    await expect(b.setInputParameters({ D2: 0.03 })).rejects.toMatchObject({ code: 'LOCKED' });
  });
});

describe('applicability', () => {
  it('outputs within under stipulated assumptions; pressure listed as indeterminate, not modelled', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    const r = b.getOutputs();
    for (const q of Object.values(r.outputs)) expect(q.status).toBe('within');
    expect(r.checks.find((c) => c.ruleId === 'S02.I1.pressure-not-modelled')?.status).toBe('unknown');
    expect(r.overall).toBe('within');
  });
  it('infeasible bore design suppresses v2 and area2 with a reason', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    await b.setInputParameters({ mode: 'boreDesign' });
    await b.setInputParameters({ Q: 0.003, vmax: 0.25 });
    const r = await b.calculate();
    expect(r.outputs['v2']!.value).toBeNull();
    expect(r.outputs['area2']!.value).toBeNull();
    expect(r.outputs['v1']!.value).not.toBeNull();
    expect(r.overall).toBe('outside');
    const csv = await (await b.exportData('csv')).text();
    const v2row = csv.split('\r\n').find((l) => l.startsWith('output,v2,'))!;
    expect(v2row).toMatch(/^output,v2,,m\/s,outside,calculated,/);
    expect(v2row).toContain('S02.D1.no-feasible-bore');
    expect(v2row).toContain('No bore in the 10–100 mm teaching range');
  });
});

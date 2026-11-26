/**
 * S02 fixtures through the public block API:
 * (1) the spec's own reference fixture (spec/verification/reference_results.json),
 * (2) spec §M worked values, (3) independent mpmath fixtures from
 * app/fixtures/generate_s02_fixtures.py (not derived from the TypeScript).
 */
import { describe, expect, it } from 'vitest';
import referenceResults from '../../../spec/verification/reference_results.json';
import fixtures from './S02.fixtures.json';
import { createS02Block, S02_SCENARIOS } from '../../src/sims/S02/definition';

type Out = 'area1' | 'area2' | 'v1' | 'v2' | 'mdot';
const RTOL = fixtures.tolerance.rtol;

function close(actual: number, expected: number, scale: number): boolean {
  return Math.abs(actual - expected) <= Math.max(1e-15 * scale, RTOL * Math.abs(expected));
}

async function run(inputs: Record<string, number | string>) {
  const b = createS02Block();
  await b.initialise(S02_SCENARIOS['default']!);
  await b.setInputParameters(inputs);
  return { block: b, result: await b.calculate() };
}

describe('spec reference fixture (verification/reference_results.json)', () => {
  const entries = referenceResults.filter((r) => r.sim === 'S02');
  it('has exactly one S02 entry', () => expect(entries).toHaveLength(1));
  for (const e of entries) {
    it(`${e.quantity} = ${e.expected} ± ${e.absolute_tolerance} at spec defaults`, async () => {
      const { result } = await run({});
      const v2 = result.outputs['v2']!.value as number;
      expect(Math.abs(v2 - e.expected)).toBeLessThanOrEqual(e.absolute_tolerance);
      // and agrees with the spec's unrounded computed value
      expect(Math.abs(v2 - e.value)).toBeLessThanOrEqual(1e-12 * e.value);
    });
  }
});

describe('spec §M worked values', () => {
  it('defaults: v1 = .509296, v2 = 2.03718 m/s, ṁ = 1 kg/s', async () => {
    const { result } = await run({});
    expect(Math.abs((result.outputs['v1']!.value as number) - 0.509296)).toBeLessThanOrEqual(5e-7);
    expect(Math.abs((result.outputs['v2']!.value as number) - 2.03718)).toBeLessThanOrEqual(5e-6);
    expect(Math.abs((result.outputs['mdot']!.value as number) - 1)).toBeLessThanOrEqual(1e-12);
  });
  it('bore design default: D_min = .0252313 m', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    await b.setInputParameters({ mode: 'boreDesign' });
    const r = await b.calculate();
    const d = (r.extras['design'] as { Dmin: number });
    expect(Math.abs(d.Dmin - 0.0252313)).toBeLessThanOrEqual(5e-8);
  });
});

describe('independent mpmath fixtures: forward continuity', () => {
  for (const c of fixtures.forward) {
    it(c.name, async () => {
      const { result } = await run(c.inputs);
      for (const k of ['area1', 'area2', 'v1', 'v2', 'mdot'] as Out[]) {
        const exp = c.outputs[k].float;
        const act = result.outputs[k]!.value as number;
        const scale = k.startsWith('area') ? 1e-2 : k === 'mdot' ? 1 : 1;
        expect(close(act, exp, scale), `${k}: ${act} vs ${exp}`).toBe(true);
      }
    });
  }
});

describe('independent mpmath fixtures: bore design', () => {
  for (const d of fixtures.design) {
    it(d.name, async () => {
      const b = createS02Block();
      await b.initialise(S02_SCENARIOS['default']!);
      await b.setInputParameters({ mode: 'boreDesign' });
      await b.setInputParameters({ Q: d.inputs.Q, vmax: d.inputs.vmax });
      const r = await b.calculate();
      const des = r.extras['design'] as { Dmin: number; feasible: number[]; selected: number | null; vAtSelected: number | null; status: string };
      expect(close(des.Dmin, d.Dmin!.float, 1e-2)).toBe(true);
      expect(des.feasible.map((x) => Math.round(x * 1000))).toEqual(d.feasible_mm);
      expect(des.selected === null ? null : Math.round(des.selected * 1000)).toBe(d.selected_mm);
      expect(des.status).toBe(d.status);
      if (d.vAtSelected) {
        expect(close(des.vAtSelected!, d.vAtSelected.float, 1)).toBe(true);
        // forward substitution: selected bore meets the cap
        expect(des.vAtSelected!).toBeLessThanOrEqual(d.inputs.vmax);
        expect(close(r.outputs['v2']!.value as number, d.vAtSelected.float, 1)).toBe(true);
      } else {
        expect(r.outputs['v2']!.value).toBeNull();
        expect(r.outputs['v2']!.status).toBe('outside');
      }
    });
  }
});

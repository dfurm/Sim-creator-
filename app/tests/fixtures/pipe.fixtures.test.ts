/**
 * S07/S04/S08/composite fixtures through the public block API: spec reference values
 * (reference_results.json and §M worked values) and independent mpmath fixtures from
 * app/fixtures/generate_pipe_fixtures.py (Colebrook solved differently; fluids cross-check).
 */
import { describe, expect, it } from 'vitest';
import referenceResults from '../../../spec/verification/reference_results.json';
import fx from './pipe.fixtures.json';
import { createS07Block, S07_DEFAULT_SCENARIO } from '../../src/sims/S07/definition';
import { createS04Block, S04_DEFAULT_SCENARIO } from '../../src/sims/S04/definition';
import { createS08Block, S08_DEFAULT_SCENARIO } from '../../src/sims/S08/definition';
import { createPipeBlock, PIPE_SCENARIOS } from '../../src/sims/pipe/definition';
import { colebrook } from '../../src/sims/S08/model';

const ref = (sim: string) => referenceResults.find((r) => r.sim === sim)!;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
type Patch = Record<string, number | string>;
async function run<T extends { initialise: (s: never) => Promise<void> }>(make: () => T, sc: unknown, patch: Patch) {
  const b = make() as unknown as ReturnType<typeof createPipeBlock>;
  await b.initialise(sc as never);
  if (Object.keys(patch).length) await b.setInputParameters(patch);
  return b.calculate();
}

describe('S07 spec fixtures', () => {
  it(`reference_results: Pipe Reynolds = ${ref('S07').expected} ± ${ref('S07').absolute_tolerance}`, async () => {
    const r = await run(createS07Block, S07_DEFAULT_SCENARIO, {});
    expect(Math.abs((r.outputs['Re']!.value as number) - ref('S07').expected)).toBeLessThanOrEqual(ref('S07').absolute_tolerance);
  });
  it('double D at fixed v gives 4000; double D at fixed Q halves Re (mpmath values)', async () => {
    const a = await run(createS07Block, S07_DEFAULT_SCENARIO, { D: 0.04 });
    expect(rel(a.outputs['Re']!.value as number, fx.s07.double_D_fixed_speed.float)).toBeLessThan(1e-12);
    const q1 = await run(createS07Block, S07_DEFAULT_SCENARIO, { mode: 'fixedFlow' });
    const b = createS07Block(); await b.initialise(S07_DEFAULT_SCENARIO); await b.setInputParameters({ mode: 'fixedFlow' }); await b.setInputParameters({ D: 0.04 });
    const q2 = await b.calculate();
    expect(rel(q1.outputs['Re']!.value as number, fx.s07.fixed_flow_D.float)).toBeLessThan(1e-12);
    expect(rel(q2.outputs['Re']!.value as number, fx.s07.fixed_flow_2D.float)).toBeLessThan(1e-12);
    expect((q2.outputs['Re']!.value as number) / (q1.outputs['Re']!.value as number)).toBeCloseTo(0.5, 12);
  });
  it('Re = 0 is stationary', async () => {
    const r = await run(createS07Block, S07_DEFAULT_SCENARIO, { v: 0 });
    expect(r.outputs['Re']!.value).toBe(0);
    expect(r.outputs['regime_screen']!.value).toMatch(/stationary/);
  });
});

describe('S04 spec fixtures', () => {
  it(`reference_results: Δp = ${ref('S04').expected} ± ${ref('S04').absolute_tolerance} Pa`, async () => {
    const r = await run(createS04Block, S04_DEFAULT_SCENARIO, {});
    const dp = (r.outputs['p2']!.value as number) - 101325;
    expect(Math.abs(dp - ref('S04').expected)).toBeLessThanOrEqual(ref('S04').absolute_tolerance);
    expect(rel(dp, ref('S04').value)).toBeLessThan(1e-10);
  });
  it('equal areas, elevations and zero losses give Δp = 0; +1 m pump head adds 9806.65 Pa; h_p for 101325 Pa ≈ .19837 m', async () => {
    const eq = await run(createS04Block, S04_DEFAULT_SCENARIO, { D2: 0.05 });
    expect(eq.outputs['p2']!.value).toBe(101325);
    const b = createS04Block(); await b.initialise(S04_DEFAULT_SCENARIO); await b.setInputParameters({ mode: 'addedHead' });
    const r0 = await b.calculate(); await b.setInputParameters({ hp: 1 }); const r1 = await b.calculate();
    expect((r1.outputs['p2']!.value as number) - (r0.outputs['p2']!.value as number)).toBeCloseTo(9806.65, 8);
    expect(Math.abs((r0.extras['hpRequired'] as number) - 0.19837)).toBeLessThan(5e-6);
    expect(rel(r0.extras['hpRequired'] as number, fx.s04_hp_required.float)).toBeLessThan(1e-10);
  });
  for (const c of fx.s04) {
    it(`mpmath case ${c.name}`, async () => {
      const mode = c.inputs.hp ? 'addedHead' : c.inputs.K ? 'losses' : 'ideal';
      const b = createS04Block(); await b.initialise(S04_DEFAULT_SCENARIO); await b.setInputParameters({ mode });
      const { hp, K, ...rest } = c.inputs;
      await b.setInputParameters({ ...rest, ...(mode !== 'ideal' ? { K } : {}), ...(mode === 'addedHead' ? { hp } : {}) });
      const r = await b.calculate();
      for (const [k, v] of Object.entries(c.outputs)) {
        const a = r.outputs[k]!.value as number;
        expect(Math.abs(a - v.float) <= Math.max(1e-12 * Math.abs(v.float), 1e-12), `${k}: ${a} vs ${v.float}`).toBe(true);
      }
    });
  }
});

describe('S08 spec fixtures', () => {
  it('Re = 1000 gives f = .064 (laminar)', async () => {
    // Re = 1000 with water: Q = Re π D μ /(4ρ)
    const Q = (1000 * Math.PI * 0.05 * 0.001) / 4000;
    const b = createS08Block(); await b.initialise(S08_DEFAULT_SCENARIO);
    // Q step grid does not matter to the API (range only); set directly
    await b.setInputParameters({ Q });
    const r = await b.calculate();
    expect(r.outputs['Re']!.value as number).toBeCloseTo(1000, 9);
    expect(Math.abs((r.outputs['darcy_factor']!.value as number) - 0.064)).toBeLessThan(1e-12);
  });
  it(`reference_results: smooth f at Re = 1e5 = ${ref('S08').expected} ± ${ref('S08').absolute_tolerance}`, () => {
    const s = colebrook(1e5, 0);
    expect(Math.abs(s.f - ref('S08').expected)).toBeLessThanOrEqual(ref('S08').absolute_tolerance);
    expect(rel(s.f, ref('S08').value)).toBeLessThan(1e-9);
    expect(rel(s.f, fx.s08_spec.smooth_Re1e5.float)).toBeLessThan(1e-9);
    expect(Math.abs(s.residual)).toBeLessThan(1e-10);
  });
  it('halving L halves Δp; Fanning = Darcy/4', async () => {
    const a = await run(createS08Block, S08_DEFAULT_SCENARIO, {});
    const h = await run(createS08Block, S08_DEFAULT_SCENARIO, { L: 5 });
    expect((h.outputs['delta_p']!.value as number) / (a.outputs['delta_p']!.value as number)).toBeCloseTo(0.5, 12);
    expect(a.extras['fanning'] as number).toBe((a.outputs['darcy_factor']!.value as number) / 4);
  });
  it('Q = 0: Δp = 0 and f undefined', async () => {
    const r = await run(createS08Block, S08_DEFAULT_SCENARIO, { Q: 0 });
    expect(r.outputs['delta_p']!.value).toBe(0);
    expect(r.outputs['darcy_factor']!.value).toBeNull();
    expect(r.outputs['darcy_factor']!.status).toBe('unknown');
  });
  it.each(fx.s08_colebrook.map((p) => [p.Re, p.rr, p.f.float, p.fluids]))('Colebrook Re=%s ε/D=%s matches mpmath and fluids', (Re, rr, fm, ff) => {
    const s = colebrook(Re as number, rr as number);
    expect(rel(s.f, fm as number)).toBeLessThan(1e-9);
    expect(rel(s.f, ff as number)).toBeLessThan(1e-9);
    expect(Math.abs(s.residual)).toBeLessThan(1e-10);
  });
});

describe('composite pipe lesson: independent mpmath fixtures', () => {
  const OUT = ['v1', 'v2', 'Re1', 'Re2', 'h_K', 'h_f', 'p2', 'p3', 'p2_ideal', 'p3_ideal', 'H1', 'H2', 'H3'] as const;
  for (const c of fx.pipe) {
    it(c.name, async () => {
      const r = await run(createPipeBlock, PIPE_SCENARIOS['explore'], c.inputs);
      expect(r.outputs['regime']!.value).toBe(c.outputs.regime);
      const fOut = r.outputs['darcy_f']!.value;
      const fExp = c.outputs.f as { float: number } | null;
      if (fExp === null) expect(fOut).toBeNull(); else expect(rel(fOut as number, fExp.float)).toBeLessThan(1e-9);
      if (c.fluids_f !== null) expect(rel(fOut as number, c.fluids_f)).toBeLessThan(1e-9);
      for (const k of OUT) {
        const e = c.outputs[k] as { float: number } | null;
        const a = r.outputs[k]!.value;
        if (e === null) { expect(a, `${k} should be suppressed`).toBeNull(); continue; }
        expect(a, `${k} unexpectedly null`).not.toBeNull();
        const tol = ['h_f', 'p3', 'H3'].includes(k) ? 1e-9 : 1e-12;
        expect(Math.abs((a as number) - e.float) <= Math.max(tol * Math.abs(e.float), 1e-9), `${k}: ${String(a)} vs ${e.float}`).toBe(true);
      }
    });
  }
});

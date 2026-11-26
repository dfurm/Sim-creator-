import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../spec/contracts/block';
import { createPipeBlock, PIPE_ANCHORS, PIPE_SCENARIOS } from '../src/sims/pipe/definition';
import { evaluatePipe, pipeDimensional, type PipeInputs } from '../src/sims/pipe/model';
import { colebrook, frictionFactor } from '../src/sims/S08/model';
import { pipeRegime, s07ScreenLabel } from '../src/sims/S07/model';
import { validateSchema } from '../src/core/schemas';

const D: PipeInputs = { Q: 0.001, D1: 0.05, D2: 0.025, dz: 0, L: 10, eps: 0, rho: 1000, mu: 0.001, p1: 101325, K: 0 };
const QforRe = (Re: number, d = D) => (Re * Math.PI * d.D2 * d.mu) / (4 * d.rho);

async function block(patch: Partial<PipeInputs> = {}, sc = 'explore') {
  const b = createPipeBlock();
  await b.initialise(PIPE_SCENARIOS[sc]!);
  if (Object.keys(patch).length) await b.setInputParameters(patch);
  return { b, r: await b.calculate() };
}

describe('continuity and head balance', () => {
  const cases: Partial<PipeInputs>[] = [{}, { K: 2.5 }, { dz: 1.5 }, { dz: -2 }, { mu: 0.05 }, { eps: 0.0004 }, { rho: 1450, mu: 0.0007 }, { D1: 0.03, D2: 0.09 }, { L: 0.5, dz: 0.4, K: 1 }];
  it.each(cases.map((c) => [JSON.stringify(c), c]))('%s: A·v = Q at every station; H₁ − H₃ − h_K − h_f ≈ 0', (_n, c) => {
    const i = { ...D, ...c };
    const r = evaluatePipe(i);
    expect(Math.abs((Math.PI * i.D1 ** 2 / 4) * r.v1 - i.Q)).toBeLessThanOrEqual(1e-8 * i.Q);
    expect(Math.abs((Math.PI * i.D2 ** 2 / 4) * r.v2 - i.Q)).toBeLessThanOrEqual(1e-8 * i.Q);
    expect(r.v3).toBe(r.v2);
    expect(r.residual).not.toBeNull();
    expect(Math.abs(r.residual!)).toBeLessThanOrEqual(1e-12 * r.lossy[0].totalHead!);
    // station-by-station: H₁ − H₂ = h_K; H₂ − H₃ = h_f
    expect(r.lossy[0].totalHead! - r.lossy[1].totalHead!).toBeCloseTo(r.hK, 10);
    expect(r.lossy[1].totalHead! - r.lossy[2].totalHead!).toBeCloseTo(r.hf!, 10);
    // pressure budget closes
    const b = r.budget;
    expect(b.elevation + b.kinetic + b.contraction + b.friction!).toBeCloseTo(b.total!, 9);
    // lossy − ideal = −ρg(h_K + h_f)
    expect(r.p3! - r.p3Ideal!).toBeCloseTo(-i.rho * 9.80665 * (r.hK + r.hf!), 6);
  });
  it('ideal total head is the same at all three stations', () => {
    const r = evaluatePipe({ ...D, dz: 1.2, K: 3 });
    for (const s of r.ideal) expect(s.totalHead!).toBeCloseTo(r.ideal[0].totalHead!, 11);
  });
});

describe('zero-loss recovery', () => {
  it.each([[{}], [{ dz: 0 }], [{ mu: 0.015 }], [{ eps: 0.001, D2: 0.015 }], [{ Q: 0 }], [{ rho: 600, mu: 0.04 }]])('K = 0 and L = 0 reproduce ideal Bernoulli exactly %s', (c) => {
    const r = evaluatePipe({ ...D, ...c, K: 0, L: 0, dz: 0 });
    expect(r.p2).toBe(r.p2Ideal);
    expect(r.p3).toBe(r.p3Ideal);
    expect(r.lossy[2].totalHead).toBe(r.ideal[2].totalHead);
    expect(r.hf).toBe(0);
  });
});

describe('dimensions', () => {
  it('v [L/T], Re [1], h_K [L], p₂ [Pa], h_f [L]', () => {
    const d = pipeDimensional({ ...D, K: 0.5 });
    expect(d.v2.hasUnit('m/s')).toBe(true);
    expect(d.Re2.hasUnit('1')).toBe(true);
    expect(d.hK.hasUnit('m')).toBe(true);
    expect(d.p2.hasUnit('Pa')).toBe(true);
    expect(d.hf.hasUnit('m')).toBe(true);
  });
});

describe('regime boundaries (kernel): just below, at and just above', () => {
  const eps = 1e-9;
  const row = (Re: number) => { const f = frictionFactor(Re, 0); return [pipeRegime(Re), f.status, f.f === null ? null : 'f']; };
  it('2000 (laminar approach buffer)', () => {
    expect(row(2000 * (1 - eps))).toEqual(['laminar', 'within', 'f']);
    expect(row(2000)).toEqual(['laminar', 'approaching', 'f']);
    expect(row(2000 * (1 + eps))).toEqual(['laminar', 'approaching', 'f']);
  });
  it('2300 (laminar upper)', () => {
    expect(row(2300 * (1 - eps))).toEqual(['laminar', 'approaching', 'f']);
    expect(row(2300)).toEqual(['transitional', 'outside', null]);
    expect(row(2300 * (1 + eps))).toEqual(['transitional', 'outside', null]);
  });
  it('4000 (turbulent lower; S08 ≥ 4000 convention)', () => {
    expect(row(4000 * (1 - eps))).toEqual(['transitional', 'outside', null]);
    expect(row(4000)).toEqual(['turbulent', 'approaching', 'f']);
    expect(row(4000 * (1 + eps))).toEqual(['turbulent', 'approaching', 'f']);
    expect(s07ScreenLabel(4000)).toMatch(/transitional/);   // S07's own screen differs (SI-16)
  });
  it('4500 (turbulent approach buffer end)', () => {
    expect(row(4500 * (1 - eps))).toEqual(['turbulent', 'approaching', 'f']);
    expect(row(4500)).toEqual(['turbulent', 'within', 'f']);
    expect(row(4500 * (1 + eps))).toEqual(['turbulent', 'within', 'f']);
  });
  it('1e7 (teaching envelope)', () => {
    expect(row(1e7 * (1 - eps))).toEqual(['turbulent', 'within', 'f']);
    expect(row(1e7)).toEqual(['turbulent', 'within', 'f']);
    expect(row(1e7 * (1 + eps))).toEqual(['beyond-envelope', 'outside', null]);
  });
  it('ε/D = 0.05 (teaching envelope)', () => {
    expect(frictionFactor(1e5, 0.05 * (1 - eps)).status).toBe('within');
    expect(frictionFactor(1e5, 0.05).status).toBe('within');
    expect(frictionFactor(1e5, 0.05 * (1 + eps))).toMatchObject({ status: 'outside', f: null });
    expect(frictionFactor(1000, 0.2).f).toBe(0.064);     // laminar: roughness absent from 64/Re
  });
  it('Colebrook solver acceptance: residual < 1e-10 and bracket width ≤ 1e-8 relative', () => {
    for (const [Re, rr] of [[4000, 0], [4000, 0.05], [1e7, 0], [1e7, 0.05], [5e4, 1e-3]] as const) {
      const s = colebrook(Re, rr);
      expect(Math.abs(s.residual)).toBeLessThan(1e-10);
      expect(s.bracketWidth / s.s).toBeLessThanOrEqual(1e-8);
      expect(s.iterations).toBeLessThan(100);
    }
  });
});

describe('regime boundaries through the composite block (Q set for Re₂ ± 1e-6)', () => {
  const cases: [number, string, boolean][] = [
    [2300 * (1 - 1e-6), 'laminar', true], [2300 * (1 + 1e-6), 'transitional', false],
    [4000 * (1 - 1e-6), 'transitional', false], [4000 * (1 + 1e-6), 'turbulent', true],
  ];
  it.each(cases)('Re₂ ≈ %s → %s, friction shown: %s', async (Re, regime, shown) => {
    const { r } = await block({ Q: QforRe(Re) });
    expect(r.outputs['regime']!.value).toBe(regime);
    expect(r.outputs['Re2']!.value as number).toBeCloseTo(Re, 3);
    for (const id of ['darcy_f', 'h_f', 'p3', 'H3', 'residual']) {
      if (shown) expect(r.outputs[id]!.value).not.toBeNull();
      else { expect(r.outputs[id]!.value).toBeNull(); expect(r.outputs[id]!.status).toBe('outside'); }
    }
    expect(r.outputs['p3_ideal']!.value).not.toBeNull();   // ideal prediction does not use friction
  });
});

describe('unsupported conditions never display a valid-looking result', () => {
  const bad: [string, Partial<PipeInputs>][] = [
    ['transitional', { mu: 0.015 }], ['too rough', { eps: 0.001, D2: 0.015 }],
    ['negative p3', { Q: 0.002, D2: 0.015, L: 100, p1: 80000 }], ['negative p2', { Q: 0.002, D2: 0.015, K: 10, p1: 80000 }],
  ];
  it.each(bad)('%s: every non-null output is within/approaching; every outside output is null with a reason', async (_n, patch) => {
    const { b, r } = await block(patch);
    let outside = 0;
    for (const [id, q] of Object.entries(r.outputs)) {
      if (q.status === 'outside') { outside += 1; expect(q.value, id).toBeNull(); }
      if (q.value !== null) expect(['within', 'approaching', 'unknown'], id).toContain(q.status);
    }
    expect(outside).toBeGreaterThan(0);
    expect(r.overall).toBe('outside');
    const csv = await (await b.exportData('csv')).text();
    for (const line of csv.split('\r\n').filter((l) => l.startsWith('output,') && l.includes(',outside,'))) {
      const cols = line.split(',');
      expect(cols[2], line).toBe('');                     // no value
      expect(line.split(',').slice(7).join(',').length).toBeGreaterThan(10);   // a reason is given
    }
  });
  it('Q = 0: f undefined (null, indeterminate), h_f = 0, pressures valid', async () => {
    const { r } = await block({ Q: 0 });
    expect(r.outputs['darcy_f']!.value).toBeNull();
    expect(r.outputs['darcy_f']!.status).toBe('unknown');
    expect(r.outputs['h_f']!.value).toBe(0);
    expect(r.outputs['p3']!.value).toBe(101325);
  });
  it('transitional with L = 0: no friction run, so p₃ is valid (h_f = 0) while f is withheld', async () => {
    const { r } = await block({ mu: 0.015, L: 0 });
    expect(r.outputs['darcy_f']!.value).toBeNull();
    expect(r.outputs['h_f']!.value).toBe(0);
    expect(r.outputs['p3']!.value).not.toBeNull();
  });
});

describe('invalid inputs', () => {
  const bad: [string, Record<string, unknown>, RegExp][] = [
    ['NaN flow', { Q: Number.NaN }, /finite/], ['infinite length', { L: Number.POSITIVE_INFINITY }, /finite/],
    ['negative flow', { Q: -1e-4 }, /between 0 and 0\.002/], ['zero viscosity', { mu: 0 }, /greater than 0/],
    ['viscosity too high', { mu: 0.1 }, /between 0\.0005 and 0\.05/], ['density too low', { rho: 100 }, /between 500 and 1500/],
    ['negative roughness', { eps: -1e-5 }, /between 0 and 0\.001/], ['K too large', { K: 11 }, /between 0 and 10/],
    ['rise longer than pipe', { L: 1, dz: 1.5 }, /cannot exceed the run length/], ['rise with L = 0', { L: 0, dz: 0.1 }, /cannot exceed/],
    ['p1 too low', { p1: 50000 }, /between 80000 and 200000/], ['string', { Q: 'lots' }, /must be a number/],
  ];
  it.each(bad)('%s is rejected atomically', async (_n, patch, msg) => {
    const { b } = await block();
    const before = b.getInputParameters();
    await expect(b.setInputParameters(patch as never)).rejects.toThrow(msg);
    expect(b.getInputParameters()).toEqual(before);
  });
  it('task scenarios lock their fixed inputs', async () => {
    const { b } = await block({}, 'a');
    await expect(b.setInputParameters({ Q: 0.0005 })).rejects.toMatchObject({ code: 'LOCKED' });
    const c = await block({}, 'c');
    await c.b.setInputParameters({ Q: 0.00007 });
    await expect(c.b.setInputParameters({ D2: 0.03 })).rejects.toMatchObject({ code: 'LOCKED' });
  });
});

describe('snapshot, scenarios, anchors', () => {
  it('all four scenarios are schema-valid and initialise', async () => {
    for (const [k, s] of Object.entries(PIPE_SCENARIOS)) {
      expect(validateSchema('scenario', s), k).toEqual({ valid: true, errors: [] });
      await block({}, k);
    }
  });
  it('round trip with a prediction logged: identical outputs, learning record in snapshot and export', async () => {
    const { b } = await block({ Q: 0.0013, K: 1.2, L: 37.5, dz: 1.1, eps: 0.0002, mu: 0.0018 });
    b.recordLearning('predict-b', { headDifference: 1.9, revision: b.getRevision() });
    const snap = JSON.parse(JSON.stringify(b.saveState())) as Snapshot;
    expect(validateSchema('snapshot', snap).valid).toBe(true);
    const c = createPipeBlock();
    await c.restoreState(snap);
    expect(c.getOutputs().outputs).toEqual(b.getOutputs().outputs);
    expect(c.getOutputs().extras).toEqual(b.getOutputs().extras);
    expect(c.getLearning()).toEqual({ 'predict-b': { headDifference: 1.9, revision: b.getRevision() } });
    const json = JSON.parse(await (await c.exportData('json')).text());
    expect(json.learning['predict-b'].headDifference).toBe(1.9);
    const csv = await (await c.exportData('csv')).text();
    expect(csv).toMatch(/^learning,predict-b,/m);
  });
  it('anchors span S04, S07 and S08 member blocks; foreign prefixes rejected', () => {
    expect(PIPE_ANCHORS.all().map((a) => a.id.split('/')[0])).toEqual(expect.arrayContaining(['S04', 'S07', 'S08']));
  });
});

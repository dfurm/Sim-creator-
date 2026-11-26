import { describe, expect, it } from 'vitest';
import type { BlockEvent, Scenario } from '../../spec/contracts/block';
import { createS02Block, S02_SCENARIOS } from '../src/sims/S02/definition';

const scenario = S02_SCENARIOS['default']!;

describe('block lifecycle (contracts/block.ts)', () => {
  it('new → ready on initialise, with events', async () => {
    const b = createS02Block();
    const events: BlockEvent[] = [];
    b.subscribe((e) => events.push(e));
    expect(b.getPhase()).toBe('new');
    await expect(b.calculate()).rejects.toMatchObject({ code: 'NOT_INITIALISED' });
    await b.initialise(scenario);
    expect(b.getPhase()).toBe('ready');
    expect(events.map((e) => e.type)).toEqual(['simulation.stateChanged', 'calculation.completed']);
  });
  it('set/get inputs with revision and optimistic concurrency', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    const r0 = b.getRevision();
    const r1 = await b.setInputParameters({ Q: 0.002 }, r0);
    expect(r1).toBe(r0 + 1);
    expect(b.getInputParameters()['Q']).toBe(0.002);
    await expect(b.setInputParameters({ Q: 0.001 }, r0)).rejects.toMatchObject({ code: 'STALE_REVISION' });
    const res = await b.calculate();
    expect(res.revision).toBe(r1);
  });
  it('parameter.changed carries prior and new values', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    const events: BlockEvent[] = [];
    b.subscribe((e) => events.push(e));
    await b.setInputParameters({ D2: 0.03 });
    expect(events[0]!.type).toBe('parameter.changed');
    expect(events[0]!.payload).toMatchObject({ changed: ['D2'], prior: { D2: 0.025 }, next: { D2: 0.03 } });
  });
  it('validity.changed fires when overall status changes', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    await b.setInputParameters({ mode: 'boreDesign' });
    await b.calculate();
    const events: BlockEvent[] = [];
    b.subscribe((e) => events.push(e));
    await b.setInputParameters({ Q: 0.003, vmax: 0.25 });
    await b.calculate();
    expect(events.some((e) => e.type === 'validity.changed' && e.payload['next'] === 'outside')).toBe(true);
  });
  it('algebraic block rejects start/pause/advance with UNSUPPORTED', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    await expect(b.start()).rejects.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(b.pause()).rejects.toMatchObject({ code: 'UNSUPPORTED' });
    await expect(b.advanceTimestep(0.1)).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });
  it('reset restores scenario defaults and begins a new run', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    const run = b.getRunId();
    await b.setInputParameters({ Q: 0.0025, D2: 0.04 });
    await b.reset();
    expect(b.getInputParameters()).toEqual(scenario.initialInputs);
    expect(b.getRunId()).not.toBe(run);
    expect(b.getOutputs().outputs['v2']!.value).toBeCloseTo(2.0371832715762603, 12);
  });
  it('dispose is idempotent and later operations reject with DISPOSED', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    b.dispose();
    b.dispose();
    expect(b.getPhase()).toBe('disposed');
    await expect(b.calculate()).rejects.toMatchObject({ code: 'DISPOSED' });
    expect(() => b.saveState()).toThrow(/disposed/);
  });
  it('scenario locks and restricted ranges are enforced', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['investigate']!);
    await expect(b.setInputParameters({ Q: 0.002 })).rejects.toMatchObject({ code: 'LOCKED' });
    await b.setInputParameters({ D2: 0.025 });
    const s: Scenario = { ...scenario, restrictedRanges: { D2: { min: 0.02, max: 0.03 } } };
    const c = createS02Block();
    await c.initialise(s);
    await expect(c.setInputParameters({ D2: 0.05 })).rejects.toThrow(/between 0\.02 and 0\.03/);
  });
  it('rejects incompatible or malformed scenarios', async () => {
    const b = createS02Block();
    await expect(b.initialise({ ...scenario, modelVersion: '9.9.9' })).rejects.toMatchObject({ code: 'INCOMPATIBLE_VERSION' });
    await expect(b.initialise({ ...scenario, simulationId: 'S11' })).rejects.toMatchObject({ code: 'INVALID_SCENARIO' });
    await expect(b.initialise({ ...scenario, visibleOutputs: ['pressure'] })).rejects.toThrow(/unknown output/);
    await expect(b.initialise({ ...scenario, initialInputs: { ...scenario.initialInputs, Q: 5 } })).rejects.toThrow(/between/);
    const bad = { ...scenario } as Partial<Scenario>;
    delete bad.criteria;
    await expect(b.initialise(bad as Scenario)).rejects.toMatchObject({ code: 'INVALID_SCENARIO' });
  });
  it('exports CSV and JSON with units, origin, model version and validity', async () => {
    const b = createS02Block();
    await b.initialise(scenario);
    const events: BlockEvent[] = [];
    b.subscribe((e) => events.push(e));
    const csv = await (await b.exportData('csv')).text();
    expect(csv.split('\r\n')[0]).toBe('kind,id,value_SI,unit,status,origin,rules,reason,model,model_version,revision');
    expect(csv).toMatch(/^output,v2,2\.03718327157626\d*,m\/s,within,calculated,/m);
    const json = JSON.parse(await (await b.exportData('json')).text());
    expect(json.modelVersion).toBe('0.2.0');
    expect(json.outputs.mdot).toMatchObject({ unit: 'kg/s', status: 'within', origin: 'calculated' });
    expect(events.filter((e) => e.type === 'data.exported')).toHaveLength(2);
  });
});

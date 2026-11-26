import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../spec/contracts/block';
import { createS02Block, S02_SCENARIOS } from '../src/sims/S02/definition';
import { validateSchema } from '../src/core/schemas';

describe('snapshot save/restore', () => {
  it('saved snapshot validates against contracts/snapshot.schema.json', async () => {
    const b = createS02Block();
    await b.initialise(S02_SCENARIOS['default']!);
    expect(validateSchema('snapshot', b.saveState())).toEqual({ valid: true, errors: [] });
  });
  it('round trip: save, restore in a new instance, identical outputs and revision', async () => {
    const a = createS02Block();
    await a.initialise(S02_SCENARIOS['default']!);
    await a.setInputParameters({ Q: 0.00237, D1: 0.071, D2: 0.013 });
    await a.calculate();
    a.recordLearning('predict-halve-D2', { factor: 2, at: 'rev3' });
    const outA = a.getOutputs();
    const snap = JSON.parse(JSON.stringify(a.saveState())) as Snapshot;   // via JSON, as a file would
    const b = createS02Block();
    await b.restoreState(snap);
    const outB = b.getOutputs();
    expect(outB.outputs).toEqual(outA.outputs);       // bit-identical values
    expect(outB.revision).toBe(outA.revision);
    expect(b.getInputParameters()).toEqual(a.getInputParameters());
    expect(b.getLearning()).toEqual(a.getLearning());
    expect(b.getRunId()).toBe(a.getRunId());
    // and save again gives the same snapshot apart from history
    const again = b.saveState();
    expect({ ...again, history: [] }).toEqual({ ...snap, history: [] });
  });
  it('round trip in bore-design mode', async () => {
    const a = createS02Block();
    await a.initialise(S02_SCENARIOS['default']!);
    await a.setInputParameters({ mode: 'boreDesign' });
    await a.setInputParameters({ Q: 0.0021, vmax: 1.35 });
    await a.calculate();
    const b = createS02Block();
    await b.restoreState(a.saveState());
    expect(b.getOutputs().outputs).toEqual(a.getOutputs().outputs);
    expect(b.getOutputs().extras['design']).toEqual(a.getOutputs().extras['design']);
  });
  it('rejects invalid snapshots without changing state', async () => {
    const a = createS02Block();
    await a.initialise(S02_SCENARIOS['default']!);
    const good = a.saveState();
    const before = a.getInputParameters();
    await expect(a.restoreState({ ...good, modelVersion: '0.1.0' })).rejects.toMatchObject({ code: 'INCOMPATIBLE_VERSION' });
    await expect(a.restoreState({ ...good, inputs: { ...good.inputs, Q: Number.NaN } })).rejects.toMatchObject({ code: 'INVALID_SNAPSHOT' });
    await expect(a.restoreState({ ...good, inputs: { ...good.inputs, D2: 0.5 } })).rejects.toThrow(/between/);
    await expect(a.restoreState({ ...good, rng: { algorithm: 'x', state: 0 } })).rejects.toMatchObject({ code: 'INVALID_SNAPSHOT' });
    const { Q: _q, ...missing } = good.inputs;
    await expect(a.restoreState({ ...good, inputs: missing })).rejects.toThrow(/missing inputs: Q/);
    expect(a.getInputParameters()).toEqual(before);
  });
});

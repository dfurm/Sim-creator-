/** S07 block: Reynolds number (modes fixedSpeed, fixedFlow; plate mode not implemented, SPEC_ISSUES SI-18). */
import type { Inputs, Scenario } from '../../../../spec/contracts/block';
import manifest from '../../../../spec/manifests/S07.json';
import { AlgebraicBlock, type BlockDefinition, type Evaluation } from '../../core/block';
import { manifestInputs } from '../../core/manifest';
import type { ApplicabilityRule } from '../../core/applicability';
import { S07_MODEL_VERSION, kinematicViscosity, pipeRegime, reynolds, s07ScreenLabel, velocityFromFlow } from './model';

const n = (i: Inputs, k: string) => i[k] as number;

function evaluate(i: Inputs): Evaluation {
  const mode = i['mode'] as string;
  const D = n(i, 'D');
  const velocity = mode === 'fixedFlow' ? velocityFromFlow(n(i, 'Q'), D) : n(i, 'v');
  const throughput = mode === 'fixedFlow' ? n(i, 'Q') : (velocity * Math.PI * D * D) / 4;
  const Re = reynolds(n(i, 'rho'), velocity, D, n(i, 'mu'));
  const regime = pipeRegime(Re);
  const rules: ApplicabilityRule[] = [{
    ruleId: 'S07.R1.pipe-screen', kind: 'empirical-domain', basis: 'assumed', facts: { Re },
    status: regime === 'transitional' ? 'approaching' : 'within', action: 'show', affected: ['regime_screen'],
    reason: 'Pipe screen: Re < 2300 laminar, 2300–4000 transitional, > 4000 commonly turbulent, for developed Newtonian flow. These are conventions; disturbance can shift the onset. Not valid for plates, impellers or beds.',
    source: 'S07 §I',
  }];
  const q = (value: number, unit: string) => ({ value, unit, origin: 'calculated' as const });
  return {
    outputs: {
      Re: q(Re, '1'), nu: q(kinematicViscosity(n(i, 'rho'), n(i, 'mu')), 'm²/s'), velocity: q(velocity, 'm/s'),
      throughput: q(throughput, 'm³/s'), regime_screen: { value: s07ScreenLabel(Re), unit: 'text', origin: 'calculated' },
    },
    rules, extras: { mode, regime },
  };
}

export const S07_DEFINITION: BlockDefinition = {
  simulationId: 'S07', modelVersion: S07_MODEL_VERSION, variant: manifest.variant, snapshotSchemaVersion: '1.0.0',
  solverVersion: 'closed-form-0.2.0',
  inputs: [
    { kind: 'category', id: 'mode', label: 'Mode', options: ['fixedSpeed', 'fixedFlow'], default: 'fixedSpeed', source: 'app-extension' },
    ...manifestInputs(manifest.inputs, { D: { exclusiveMin: 0 }, rho: { exclusiveMin: 0 }, mu: { exclusiveMin: 0 } }),
  ],
  outputs: manifest.outputs,
  lockedByMode: (i) => (i['mode'] === 'fixedFlow' ? ['v'] : ['Q']),
  crossValidate: () => [],
  evaluate,
  assetVersions: { manifest: `spec/manifests/S07.json@${manifest.version}`, correlations: 'none' },
};

export const S07_DEFAULT_SCENARIO: Scenario = {
  schemaVersion: '1.0.0', scenarioId: 'S07.builtin.defaults', scenarioVersion: '0.2.0', simulationId: 'S07',
  modelVersion: S07_MODEL_VERSION, variant: manifest.variant,
  initialInputs: { mode: 'fixedSpeed', rho: 1000, v: 0.1, D: 0.02, mu: 0.001, Q: 3.1416e-5 },
  visibleInputs: ['mode', 'rho', 'v', 'D', 'mu', 'Q'], lockedInputs: [], restrictedRanges: {},
  visibleOutputs: manifest.outputs.map((o) => o.id), hiddenUntil: {}, objectives: ['Compute Re and screen the pipe regime.'],
  overlays: [], predictions: [], tasks: [], criteria: [], capture: ['inputs', 'outputs'],
};

export const createS07Block = (id?: string) => new AlgebraicBlock(S07_DEFINITION, id);

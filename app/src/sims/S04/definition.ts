/** S04 block: Bernoulli and the mechanical energy balance (modes ideal, losses, addedHead). */
import type { Inputs, Scenario } from '../../../../spec/contracts/block';
import manifest from '../../../../spec/manifests/S04.json';
import { AlgebraicBlock, type BlockDefinition, type Evaluation } from '../../core/block';
import { manifestInputs } from '../../core/manifest';
import type { ApplicabilityRule } from '../../core/applicability';
import { RHO_S04, S04_MODEL_VERSION, energyBalance, requiredPumpHead } from './model';

const n = (i: Inputs, k: string) => i[k] as number;

function evaluate(i: Inputs): Evaluation {
  const mode = i['mode'] as string;
  const K = mode === 'ideal' ? 0 : n(i, 'K');
  const hp = mode === 'addedHead' ? n(i, 'hp') : 0;
  const base = { Q: n(i, 'Q'), D1: n(i, 'D1'), D2: n(i, 'D2'), dz: n(i, 'dz'), p1: n(i, 'p1'), K };
  const o = energyBalance({ ...base, hp });
  const rules: ApplicabilityRule[] = [
    { ruleId: 'S04.A1.steady-incompressible', status: 'within', kind: 'stipulated-assumption', basis: 'assumed', facts: { rho: RHO_S04, alpha: 1 },
      action: 'qualify', affected: ['p2', 'total_head_2'], reason: 'Steady incompressible single-phase flow, section-average with α = 1; K is lumped and referenced to station 2.', source: 'S04 §C, §I' },
    { ruleId: 'S04.I1.cavitation-margin-unknown', status: 'indeterminate', kind: 'missing-evidence', basis: 'assumed', facts: {},
      action: 'show', affected: [], reason: 'Cavitation margin unknown: no vapour-pressure record or temperature.', source: 'S04 §I, §N' },
  ];
  if (o.p2 <= 0) {
    rules.push({ ruleId: 'S04.P1.p2-nonpositive', status: 'outside', kind: 'physical-constraint', basis: 'evidence', facts: { p2: o.p2 },
      action: 'suppress', affected: ['p2', 'total_head_2'], reason: 'Calculated absolute p₂ ≤ 0 Pa: not physically possible for a liquid.', source: 'physical constraint' });
  }
  const q = (value: number, unit: string) => ({ value, unit, origin: 'calculated' as const });
  return {
    outputs: { p2: q(o.p2, 'Pa'), v1: q(o.v1, 'm/s'), v2: q(o.v2, 'm/s'), loss_head: q(o.loss_head, 'm'),
      total_head_1: q(o.total_head_1, 'm'), total_head_2: q(o.total_head_2, 'm') },
    rules,
    extras: { mode, KUsed: K, hpUsed: hp, deltaP: o.p2 - base.p1, hpRequired: requiredPumpHead(base, n(i, 'p2target')) },
  };
}

export const S04_DEFINITION: BlockDefinition = {
  simulationId: 'S04', modelVersion: S04_MODEL_VERSION, variant: manifest.variant, snapshotSchemaVersion: '1.0.0',
  solverVersion: 'closed-form-0.2.0',
  inputs: [
    { kind: 'category', id: 'mode', label: 'Mode', options: ['ideal', 'losses', 'addedHead'], default: 'ideal', source: 'app-extension' },
    ...manifestInputs(manifest.inputs, { D1: { exclusiveMin: 0 }, D2: { exclusiveMin: 0 } }),
    { kind: 'number', id: 'p2target', label: 'Target outlet pressure p₂', unit: 'Pa', min: 80000, max: 180000, default: 101325, step: 100, alternative: 'kPa', source: 'app-extension' },
  ],
  outputs: manifest.outputs,
  lockedByMode: (i) => (i['mode'] === 'ideal' ? ['K', 'hp'] : i['mode'] === 'losses' ? ['hp'] : []),
  crossValidate: () => [],
  evaluate,
  assetVersions: { manifest: `spec/manifests/S04.json@${manifest.version}`, properties: 'rho=1000 (S04 §C)' },
};

export const S04_DEFAULT_SCENARIO: Scenario = {
  schemaVersion: '1.0.0', scenarioId: 'S04.builtin.defaults', scenarioVersion: '0.2.0', simulationId: 'S04',
  modelVersion: S04_MODEL_VERSION, variant: manifest.variant,
  initialInputs: { mode: 'ideal', Q: 0.001, D1: 0.05, D2: 0.025, dz: 0, p1: 101325, K: 0, hp: 0, p2target: 101325 },
  visibleInputs: ['mode', 'Q', 'D1', 'D2', 'dz', 'p1', 'K', 'hp', 'p2target'], lockedInputs: [], restrictedRanges: {},
  visibleOutputs: manifest.outputs.map((o) => o.id), hiddenUntil: {}, objectives: ['Apply the mechanical energy balance between two stations.'],
  overlays: [], predictions: [], tasks: [], criteria: [], capture: ['inputs', 'outputs'],
};

export const createS04Block = (id?: string) => new AlgebraicBlock(S04_DEFINITION, id);

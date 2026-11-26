/** S08 block: friction factor and pressure loss (modes automaticRegime, fixedDarcy; inverseLoss not implemented, SI-18). */
import type { Inputs, Scenario } from '../../../../spec/contracts/block';
import manifest from '../../../../spec/manifests/S08.json';
import { AlgebraicBlock, type BlockDefinition, type Evaluation } from '../../core/block';
import { manifestInputs } from '../../core/manifest';
import type { ApplicabilityRule } from '../../core/applicability';
import { G } from '../S04/model';
import { reynolds, velocityFromFlow } from '../S07/model';
import { S08_MODEL_VERSION, COLEBROOK_SOLVER, fanningFromDarcy, frictionFactor } from './model';

export const S08_RHO = 1000;   // S08 §C
export const S08_MU = 0.001;   // S08 §C
const n = (i: Inputs, k: string) => i[k] as number;

function evaluate(i: Inputs): Evaluation {
  const mode = i['mode'] as string;
  const Q = n(i, 'Q'), D = n(i, 'D'), L = n(i, 'L'), eps = n(i, 'eps');
  const v = velocityFromFlow(Q, D);
  const Re = reynolds(S08_RHO, v, D, S08_MU);
  const rr = eps / D;
  const fr = frictionFactor(Re, rr);
  const fixed = mode === 'fixedDarcy';
  const f = fixed ? n(i, 'fD') : fr.f;
  const dp = Q === 0 ? 0 : f === null ? null : f * (L / D) * S08_RHO * v * v / 2;
  const rules: ApplicabilityRule[] = [fixed
    ? { ruleId: 'S08.F1.fixed-darcy', status: 'within', kind: 'stipulated-assumption', basis: 'assumed', facts: { fD: f ?? 0, Re },
      action: 'qualify', affected: ['darcy_factor', 'delta_p', 'head_loss'], reason: 'Fixed Darcy factor chosen by the user for comparison; not computed from Re or roughness.', source: 'S08 §D' }
    : { ruleId: 'S08.R1.regime', status: fr.status, kind: 'empirical-domain', basis: 'evidence', facts: { Re, relRough: rr },
      action: fr.status === 'outside' ? 'suppress' : 'qualify', affected: Q === 0 ? ['darcy_factor'] : ['darcy_factor', 'delta_p', 'head_loss'],
      reason: fr.reason ?? `${fr.regime} (Re = ${Re.toPrecision(4)}), ${fr.method}`, source: 'S08 §I, CORRELATION_REGISTER' }];
  const q = (value: number | null, unit: string, reason?: string) => ({ value, unit, origin: 'calculated' as const, ...(reason ? { reason } : {}) });
  return {
    outputs: {
      Re: q(Re, '1'), relative_roughness: q(rr, '1'), darcy_factor: q(f, '1', fr.reason),
      delta_p: q(dp, 'Pa', fr.reason), head_loss: q(dp === null ? null : dp / (S08_RHO * G), 'm', fr.reason),
    },
    rules,
    extras: { mode, regime: fr.regime, method: fixed ? 'fixed' : fr.method, fanning: f === null ? null : fanningFromDarcy(f),
      solver: fr.solver ?? null, rho: S08_RHO, mu: S08_MU },
  };
}

export const S08_DEFINITION: BlockDefinition = {
  simulationId: 'S08', modelVersion: S08_MODEL_VERSION, variant: manifest.variant, snapshotSchemaVersion: '1.0.0',
  solverVersion: COLEBROOK_SOLVER,
  inputs: [
    { kind: 'category', id: 'mode', label: 'Mode', options: ['automaticRegime', 'fixedDarcy'], default: 'automaticRegime', source: 'app-extension' },
    ...manifestInputs(manifest.inputs, { D: { exclusiveMin: 0 } }),
    { kind: 'number', id: 'fD', label: 'Fixed Darcy factor f', unit: '1', min: 0.008, max: 0.08, default: 0.02, step: 0.001, alternative: 'same', source: 'app-extension' },
  ],
  outputs: manifest.outputs,
  lockedByMode: (i) => (i['mode'] === 'fixedDarcy' ? [] : ['fD']),
  crossValidate: () => [],
  evaluate,
  assetVersions: { manifest: `spec/manifests/S08.json@${manifest.version}`, correlations: 'Colebrook (Darcy, 2.51/3.7, log10)', properties: 'TEACH-WATER rho=1000, mu=0.001' },
};

export const S08_DEFAULT_SCENARIO: Scenario = {
  schemaVersion: '1.0.0', scenarioId: 'S08.builtin.defaults', scenarioVersion: '0.2.0', simulationId: 'S08',
  modelVersion: S08_MODEL_VERSION, variant: manifest.variant,
  initialInputs: { mode: 'automaticRegime', Q: 0.001, D: 0.05, L: 10, eps: 0, fD: 0.02 },
  visibleInputs: ['mode', 'Q', 'D', 'L', 'eps', 'fD'], lockedInputs: [], restrictedRanges: {},
  visibleOutputs: manifest.outputs.map((o) => o.id), hiddenUntil: {}, objectives: ['Compute friction loss in a straight pipe.'],
  overlays: [], predictions: [], tasks: [], criteria: [], capture: ['inputs', 'outputs'],
};

export const createS08Block = (id?: string) => new AlgebraicBlock(S08_DEFINITION, id);

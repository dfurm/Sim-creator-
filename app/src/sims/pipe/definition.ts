/**
 * Composite pipe lesson block (app/docs/COMPOSITE_PIPE_SPEC.md). Registered as S04 variant
 * `composite.contraction-run` because the schemas need an S-number (SPEC_ISSUES SI-17).
 */
import type { Inputs, Scenario } from '../../../../spec/contracts/block';
import { AlgebraicBlock, type BlockDefinition, type Evaluation, type NumericInputSpec } from '../../core/block';
import { AnchorRegistry } from '../../core/anchors';
import { COLEBROOK_SOLVER } from '../S08/model';
import { PIPE_MODEL_VERSION, evaluatePipe, pipeRules, type PipeInputs } from './model';
import explore from './scenario.explore.json';
import taskA from './scenario.taskA.json';
import taskB from './scenario.taskB.json';
import taskC from './scenario.taskC.json';

export const PIPE_VARIANT = 'composite.contraction-run';

const num = (id: string, label: string, unit: string, min: number, max: number, def: number, step: number, alternative: string, from: string): NumericInputSpec =>
  ({ kind: 'number', id, label, unit, min, max, default: def, step, alternative, source: 'app-extension', description: from });

/** Ranges per COMPOSITE_PIPE_SPEC §6 (taken from S04/S07/S08 manifests). */
export const PIPE_INPUTS: readonly NumericInputSpec[] = [
  num('Q', 'Volume flow Q', 'm³/s', 0, 0.002, 0.001, 1e-5, 'L/min', 'S04'),
  { ...num('D1', 'Upstream bore D₁', 'm', 0.02, 0.1, 0.05, 0.001, 'mm', 'S04'), exclusiveMin: 0 },
  { ...num('D2', 'Downstream bore D₂', 'm', 0.015, 0.1, 0.025, 0.001, 'mm', 'S04∩S08'), exclusiveMin: 0 },
  num('dz', 'Outlet elevation z₃ (rise over the run)', 'm', -2, 2, 0, 0.01, 'mm', 'S04'),
  num('L', 'Straight run length L', 'm', 0, 100, 10, 0.1, 'm', 'S08 (0 added)'),
  num('eps', 'Wall roughness ε', 'm', 0, 0.001, 0, 1e-6, 'mm', 'S08'),
  { ...num('rho', 'Density ρ', 'kg/m³', 500, 1500, 1000, 1, 'g/L', 'S07'), exclusiveMin: 0 },
  { ...num('mu', 'Dynamic viscosity μ', 'Pa·s', 0.0005, 0.05, 0.001, 0.0001, 'mPa·s', 'S07'), exclusiveMin: 0 },
  num('p1', 'Inlet absolute pressure p₁', 'Pa', 80000, 200000, 101325, 1, 'kPa', 'S04'),
  num('K', 'Contraction loss coefficient K (on v₂)', '1', 0, 10, 0, 0.1, 'same', 'S04'),
];

export const PIPE_OUTPUTS = [
  { id: 'v1', unit: 'm/s' }, { id: 'v2', unit: 'm/s' }, { id: 'Re1', unit: '1' }, { id: 'Re2', unit: '1' },
  { id: 'regime', unit: 'text' }, { id: 'rel_rough', unit: '1' }, { id: 'darcy_f', unit: '1' },
  { id: 'h_K', unit: 'm' }, { id: 'h_f', unit: 'm' },
  { id: 'p2', unit: 'Pa' }, { id: 'p3', unit: 'Pa' }, { id: 'p2_ideal', unit: 'Pa' }, { id: 'p3_ideal', unit: 'Pa' },
  { id: 'H1', unit: 'm' }, { id: 'H2', unit: 'm' }, { id: 'H3', unit: 'm' }, { id: 'residual', unit: 'm' },
] as const;

export const PIPE_FIXED = [
  { id: 'g', label: 'Gravitational acceleration g', value: 9.80665, unit: 'm/s²', source: 'S04 §C' },
  { id: 'z1', label: 'Elevation of station 1 (datum) z₁', value: 0, unit: 'm', source: 'S04 §C' },
  { id: 'z2', label: 'Elevation of station 2 z₂ (level contraction)', value: 0, unit: 'm', source: 'lesson definition' },
  { id: 'alpha', label: 'Kinetic-energy factor α (all stations)', value: 1, unit: '1', source: 'S04 §C' },
  { id: 'hp', label: 'Pump head hₚ', value: 0, unit: 'm', source: 'no pump in this lesson (S09 out of scope)' },
] as const;

export const PIPE_ANCHORS = new AnchorRegistry('S04', [
  { id: 'S04/inlet_pressure', represents: 'derived-field', quantity: 'H1', label: 'Station 1 pressure tap and heads' },
  { id: 'S04/throat_pressure', represents: 'derived-field', quantity: 'p2', label: 'Station 2 pressure tap, just after the contraction' },
  { id: 'S04/outlet_pressure', represents: 'derived-field', quantity: 'p3', label: 'Station 3 pressure tap at the end of the run' },
  { id: 'S04/velocity_head', represents: 'derived-field', quantity: 'v2', label: 'Velocity head at station 2' },
  { id: 'S04/loss_head', represents: 'derived-field', quantity: 'h_K', label: 'Head lost in the contraction and the run' },
  { id: 'S08/friction_point', represents: 'derived-field', quantity: 'darcy_f', label: 'Straight run with friction factor f' },
  { id: 'S08/roughness_ratio', represents: 'geometry', quantity: 'rel_rough', label: 'Wall roughness ratio ε/D₂' },
  { id: 'S07/characteristic_length', represents: 'geometry', quantity: 'Re2', label: 'Bore D₂, the characteristic length for Re₂' },
], ['S07', 'S08']);

const n = (i: Inputs, k: string) => i[k] as number;

export function pipeInputsFrom(i: Inputs): PipeInputs {
  return { Q: n(i, 'Q'), D1: n(i, 'D1'), D2: n(i, 'D2'), dz: n(i, 'dz'), L: n(i, 'L'), eps: n(i, 'eps'),
    rho: n(i, 'rho'), mu: n(i, 'mu'), p1: n(i, 'p1'), K: n(i, 'K') };
}

function evaluate(inputs: Inputs): Evaluation {
  const pi = pipeInputsFrom(inputs);
  const r = evaluatePipe(pi);
  const rules = pipeRules(pi, r);
  const c = (value: number | string | null, unit: string, reason?: string) => ({ value, unit, origin: 'calculated' as const, ...(reason && value === null ? { reason } : {}) });
  return {
    outputs: {
      v1: c(r.v1, 'm/s'), v2: c(r.v2, 'm/s'), Re1: c(r.Re1, '1'), Re2: c(r.Re2, '1'), regime: c(r.regime2, 'text'),
      rel_rough: c(r.relRough, '1'), darcy_f: c(r.f, '1', r.reasons['f']), h_K: c(r.hK, 'm'), h_f: c(r.hf, 'm', r.reasons['hf']),
      p2: c(r.p2, 'Pa', r.reasons['p2']), p3: c(r.p3, 'Pa', r.reasons['p3']),
      p2_ideal: c(r.p2Ideal, 'Pa', r.reasons['p2Ideal']), p3_ideal: c(r.p3Ideal, 'Pa', r.reasons['p3Ideal']),
      H1: c(r.lossy[0].totalHead, 'm'), H2: c(r.lossy[1].totalHead, 'm', r.reasons['p2']), H3: c(r.lossy[2].totalHead, 'm', r.reasons['p3']),
      residual: c(r.residual, 'm', r.reasons['p3']),
    },
    rules,
    extras: {
      stations: { lossy: r.lossy, ideal: r.ideal }, budget: r.budget, v3: r.v3,
      friction: { method: r.friction.method, status: r.friction.status, solver: r.friction.solver ?? null },
      Re1Regime: r.Re1,
    },
  };
}

export const PIPE_DEFINITION: BlockDefinition = {
  simulationId: 'S04', modelVersion: PIPE_MODEL_VERSION, variant: PIPE_VARIANT, snapshotSchemaVersion: '1.0.0',
  solverVersion: COLEBROOK_SOLVER,
  inputs: PIPE_INPUTS,
  outputs: PIPE_OUTPUTS,
  lockedByMode: () => [],
  crossValidate: (i) => (Math.abs(n(i, 'dz')) > n(i, 'L') + 1e-12
    ? [`The outlet rise |z₃| = ${Math.abs(n(i, 'dz'))} m cannot exceed the run length L = ${n(i, 'L')} m.`] : []),
  evaluate,
  assetVersions: { lessonSpec: 'app/docs/COMPOSITE_PIPE_SPEC.md@0.2.0-proto', models: 'S07@0.2.0 S04@0.2.0 S08@0.2.0', correlations: 'Colebrook (S08)' },
};

export const PIPE_SCENARIOS: Record<string, Scenario> = {
  explore: explore as Scenario, a: taskA as Scenario, b: taskB as Scenario, c: taskC as Scenario,
};

export const createPipeBlock = (id?: string) => new AlgebraicBlock(PIPE_DEFINITION, id);

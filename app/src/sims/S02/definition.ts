/**
 * S02 block definition: binds the spec manifest (read directly from ./spec) to the pure model.
 * App-side extensions are flagged source: 'app-extension' (SPEC_ISSUES SI-04).
 */
import type { Inputs } from '../../../../spec/contracts/block';
import manifest from '../../../../spec/manifests/S02.json';
import { AlgebraicBlock, type BlockDefinition, type Evaluation, type InputSpec } from '../../core/block';
import { AnchorRegistry, anchorId } from '../../core/anchors';
import {
  RHO_WATER, S02_MODEL_VERSION, type S02Mode, continuity, designBore, s02Rules,
} from './model';
import defaultScenario from './scenario.default.json';
import investigateScenario from './scenario.investigate.json';
import type { Scenario } from '../../../../spec/contracts/block';

export { manifest as S02_MANIFEST };
export const S02_SCENARIOS: Record<string, Scenario> = {
  default: defaultScenario as Scenario,
  investigate: investigateScenario as Scenario,
};

const manifestInputs: InputSpec[] = manifest.inputs.map((m) => ({
  kind: 'number' as const,
  id: m.id, label: m.label, unit: m.unit, min: m.min, max: m.max, default: m.default,
  step: m.step, alternative: m.alternative, source: 'manifest' as const,
  ...(m.id === 'D1' || m.id === 'D2' ? { exclusiveMin: 0 } : {}),
}));

export const S02_INPUTS: readonly InputSpec[] = [
  { kind: 'category', id: 'mode', label: 'Mode', options: ['fixedThroughput', 'boreDesign'], default: 'fixedThroughput', source: 'app-extension' },
  ...manifestInputs,
  // Spec §D text: "Velocity cap 2 m/s (.25–4, step .05)" — not in the manifest inputs array.
  { kind: 'number', id: 'vmax', label: 'Velocity cap v_max', unit: 'm/s', min: 0.25, max: 4, default: 2, step: 0.05, alternative: 'same', source: 'app-extension', exclusiveMin: 0 },
];

export const S02_ANCHORS = new AnchorRegistry('S02', [
  { id: anchorId('S02', 'inlet_section'), represents: 'geometry', quantity: 'area1', label: 'Inlet section, diameter D₁, area A₁' },
  { id: anchorId('S02', 'throat_area'), represents: 'geometry', quantity: 'area2', label: 'Downstream (throat) section, diameter D₂, area A₂' },
  { id: anchorId('S02', 'outlet_velocity'), represents: 'derived-field', quantity: 'v2', label: 'Downstream mean-velocity arrow v₂' },
  // Additional anchors (app-defined, not in manifest):
  { id: anchorId('S02', 'inlet_velocity'), represents: 'derived-field', quantity: 'v1', label: 'Upstream mean-velocity arrow v₁' },
  { id: anchorId('S02', 'contraction'), represents: 'geometry', quantity: 'area2', label: 'Contraction between the two sections' },
]);

function num(inputs: Inputs, id: string): number {
  const v = inputs[id];
  if (typeof v !== 'number') throw new Error(`Input ${id} is not numeric`);
  return v;
}

function evaluate(inputs: Inputs): Evaluation {
  const mode = inputs['mode'] as S02Mode;
  const Q = num(inputs, 'Q');
  const D1 = num(inputs, 'D1');
  const design = mode === 'boreDesign' ? designBore(Q, num(inputs, 'vmax')) : null;
  const D2 = design ? (design.selected ?? num(inputs, 'D2')) : num(inputs, 'D2');
  const o = continuity({ Q, D1, D2 });
  const rules = s02Rules({ Q, D1, D2 }, mode, design);
  const out = (value: number) => ({ value, unit: '', origin: 'calculated' as const });
  return {
    outputs: {
      area1: { ...out(o.area1), unit: 'm²' },
      area2: { ...out(o.area2), unit: 'm²' },
      v1: { ...out(o.v1), unit: 'm/s' },
      v2: { ...out(o.v2), unit: 'm/s' },
      mdot: { ...out(o.mdot), unit: 'kg/s' },
    },
    rules,
    extras: {
      mode, D2used: design ? design.selected : D2, rho: RHO_WATER,
      ...(design ? { design: {
        Dmin: design.Dmin, feasible: design.feasible, selected: design.selected,
        vAtSelected: design.vAtSelected, status: design.status, grid: '10–100 mm, 1 mm (teaching grid, not a catalogue)',
      } } : {}),
    },
  };
}

export const S02_DEFINITION: BlockDefinition = {
  simulationId: 'S02',
  modelVersion: S02_MODEL_VERSION,
  variant: manifest.variant,
  snapshotSchemaVersion: '1.0.0',
  solverVersion: 'closed-form-0.2.0',
  inputs: S02_INPUTS,
  outputs: manifest.outputs,
  lockedByMode: (inputs) => (inputs['mode'] === 'boreDesign' ? ['D2'] : ['vmax']),
  crossValidate: () => [],
  evaluate,
  assetVersions: {
    manifest: `spec/manifests/S02.json@${manifest.version}`,
    metadata: 'S02.metadata@0.2.0-proto',
    properties: 'water rho=1000 kg/m3 (stipulated)',
    correlations: 'none',
  },
};

export function createS02Block(instanceId?: string): AlgebraicBlock {
  return new AlgebraicBlock(S02_DEFINITION, instanceId);
}

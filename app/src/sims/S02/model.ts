/**
 * S02 · Continuity through a contraction — starter model (spec simulations/S02.md §C, §D, §I, §K).
 * Pure TypeScript, SI units, no DOM, no framework.
 *
 *   A = πD²/4;  v = Q/A;  ṁ = ρQ;  ρ fixed at 1000 kg/m³ (stipulated by the spec).
 *   Steady incompressible continuity: both stations carry the same Q.
 */
import type { ApplicabilityRule } from '../../core/applicability';
import { DimQ } from '../../core/units';

export const S02_MODEL_VERSION = '0.2.0';
export const RHO_WATER = 1000; // kg/m³, spec §C "Density fixed at 1000 kg/m³"

export interface S02Inputs { Q: number; D1: number; D2: number }
export interface S02Outputs { area1: number; area2: number; v1: number; v2: number; mdot: number }

export function circleArea(D: number): number {
  return (Math.PI * D * D) / 4;
}

/** Forward continuity. Areas are computed before velocities (spec §N). */
export function continuity(i: S02Inputs, rho = RHO_WATER): S02Outputs {
  const area1 = circleArea(i.D1);
  const area2 = circleArea(i.D2);
  const v1 = i.Q / area1;
  const v2 = i.Q / area2;
  const mdot = rho * i.Q;
  return { area1, area2, v1, v2, mdot };
}

/** Same formulas on dimensioned quantities, used to check dimensions in tests. */
export function continuityDimensional(i: S02Inputs): Record<keyof S02Outputs, DimQ> {
  const Q = DimQ.of(i.Q, 'm³/s');
  const D1 = DimQ.of(i.D1, 'm');
  const D2 = DimQ.of(i.D2, 'm');
  const quarterPi = DimQ.pure(Math.PI / 4);
  const area1 = quarterPi.mul(D1.pow(2));
  const area2 = quarterPi.mul(D2.pow(2));
  return {
    area1, area2, v1: Q.div(area1), v2: Q.div(area2), mdot: DimQ.of(RHO_WATER, 'kg/m³').mul(Q),
  };
}

/** Minimum bore for a mean-velocity ceiling: D_min = √(4Q/(π v_max)). */
export function minimumBore(Q: number, vmax: number): number {
  return Math.sqrt((4 * Q) / (Math.PI * vmax));
}

export interface BoreGrid { minMM: number; maxMM: number; stepMM: number }

/**
 * Teaching bore grid: the D₂ control's own range and step (10–100 mm in 1 mm steps).
 * NOT a commercial catalogue — the spec does not supply one (BACKLOG R11, SPEC_ISSUES SI-06).
 */
export const TEACHING_BORE_GRID: BoreGrid = { minMM: 10, maxMM: 100, stepMM: 1 };

export interface BoreDesign {
  Dmin: number;
  /** Feasible bores from the grid, ascending, in m. */
  feasible: number[];
  /** Smallest feasible bore, or null when none in the grid meets the cap. */
  selected: number | null;
  /** Forward substitution at the selected bore. */
  vAtSelected: number | null;
  status: 'feasible' | 'all-feasible' | 'infeasible';
}

/** Relative tolerance for "v ≤ vmax" so that D exactly equal to D_min counts as feasible. */
const CAP_RTOL = 1e-12;

export function designBore(Q: number, vmax: number, grid: BoreGrid = TEACHING_BORE_GRID): BoreDesign {
  const Dmin = minimumBore(Q, vmax);
  const feasible: number[] = [];
  for (let mm = grid.minMM; mm <= grid.maxMM; mm += grid.stepMM) {
    const D = mm / 1000;
    if (Q / circleArea(D) <= vmax * (1 + CAP_RTOL)) feasible.push(D);
  }
  const selected = feasible[0] ?? null;
  const vAtSelected = selected === null ? null : Q / circleArea(selected);
  const total = Math.floor((grid.maxMM - grid.minMM) / grid.stepMM) + 1;
  const status = feasible.length === 0 ? 'infeasible' : feasible.length === total ? 'all-feasible' : 'feasible';
  return { Dmin, feasible, selected, vAtSelected, status };
}

export type S02Mode = 'fixedThroughput' | 'boreDesign';

/**
 * Applicability rules for the S02 starter variant. Author-defined (proposed, unverified):
 * the spec says "apply per-output within/approaching/outside/unknown rules" but gives no
 * numeric S02 thresholds (SPEC_ISSUES SI-05). Stipulated assumptions are recorded as assumed.
 */
export function s02Rules(i: S02Inputs, mode: S02Mode, design: BoreDesign | null): ApplicabilityRule[] {
  const all = ['area1', 'area2', 'v1', 'v2', 'mdot'];
  const rules: ApplicabilityRule[] = [
    {
      ruleId: 'S02.A1.steady-incompressible',
      status: 'within', kind: 'stipulated-assumption', basis: 'assumed',
      facts: { steady: true, singlePhase: true, rho: RHO_WATER },
      reason: 'Steady, single-phase, incompressible liquid with ρ fixed at 1000 kg/m³ (stipulated by the preset, not measured).',
      action: 'qualify', affected: all,
      alternative: 'Compressible flow: hold ṁ constant and solve densities from a thermodynamic model (deferred variant).',
      source: 'spec simulations/S02.md §C, §I',
    },
    {
      ruleId: 'S02.A2.full-branch-free-pipe',
      status: 'within', kind: 'stipulated-assumption', basis: 'assumed',
      facts: { fullPipe: true, branchFree: true, impermeable: true },
      reason: 'Full, impermeable, branch-free pipe between the two stations (stipulated).',
      action: 'qualify', affected: all, source: 'spec simulations/S02.md §I',
    },
    {
      ruleId: 'S02.A3.mean-velocity-only',
      status: 'within', kind: 'stipulated-assumption', basis: 'assumed',
      facts: { oneDimensional: true },
      reason: 'v₁ and v₂ are section-mean velocities. The local velocity profile is not modelled.',
      action: 'qualify', affected: ['v1', 'v2'], source: 'spec simulations/S02.md §F, §I',
    },
    {
      ruleId: 'S02.A4.fixed-throughput',
      status: 'within', kind: 'stipulated-assumption', basis: 'assumed',
      facts: { Q: i.Q, mode },
      reason: 'Q is held fixed while the bore changes. On a real pump and pipe system a smaller bore adds resistance and Q would usually fall.',
      action: 'qualify', affected: ['v1', 'v2'], alternative: 'S09 pump and system operating point.',
      source: 'spec simulations/S02.md §B, §K',
    },
    {
      ruleId: 'S02.I1.pressure-not-modelled',
      status: 'indeterminate', kind: 'missing-evidence', basis: 'assumed',
      facts: {},
      reason: 'Pressure change across the contraction and the acceleration profile are not modelled; no pressure output is given.',
      action: 'show', affected: [], alternative: 'S04 Bernoulli and the mechanical energy balance.',
      source: 'spec simulations/S02.md §I',
    },
  ];
  if (i.D2 > i.D1) {
    rules.push({
      ruleId: 'S02.G1.expansion-geometry',
      status: 'within', kind: 'stipulated-assumption', basis: 'assumed',
      facts: { D1: i.D1, D2: i.D2 },
      reason: 'D₂ > D₁ is an expansion, not a contraction. Mean-velocity continuity still holds; separation and losses are not modelled.',
      action: 'qualify', affected: ['v2'], source: 'author-defined',
    });
  }
  if (mode === 'boreDesign' && design && design.status === 'infeasible') {
    rules.push({
      ruleId: 'S02.D1.no-feasible-bore',
      status: 'outside', kind: 'product-guard', basis: 'evidence',
      facts: { Q: i.Q, Dmin: design.Dmin, gridMaxM: TEACHING_BORE_GRID.maxMM / 1000 },
      reason: `No bore in the 10–100 mm teaching range meets the cap: D_min = ${(design.Dmin * 1000).toFixed(1)} mm.`,
      action: 'suppress', affected: ['area2', 'v2'],
      alternative: 'Raise the velocity cap, reduce Q, or extend the bore range.',
      source: 'author-defined product guard',
    });
  }
  return rules;
}

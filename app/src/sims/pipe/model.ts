/**
 * Composite pipe lesson: contraction (1→2) + straight run of length L in D₂ (2→3).
 * Defined in app/docs/COMPOSITE_PIPE_SPEC.md (written before this code). Pure, SI, no DOM.
 * Calls the S07 (Reynolds/regime), S08 (friction) and S04 (energy balance) kernels.
 */
import type { ApplicabilityRule } from '../../core/applicability';
import { DimQ } from '../../core/units';
import { G } from '../S04/model';
import { PIPE_THRESHOLDS, pipeRegime, reynolds, velocityFromFlow, type PipeRegime } from '../S07/model';
import { frictionFactor, frictionHead, type FrictionResult } from '../S08/model';

export const PIPE_MODEL_VERSION = '0.2.0';

export interface PipeInputs {
  Q: number; D1: number; D2: number; dz: number; L: number; eps: number;
  rho: number; mu: number; p1: number; K: number;
}

export interface StationHeads {
  p: number | null;          // absolute static pressure [Pa]
  pressureHead: number | null; // p/(ρg) [m]
  velocityHead: number;      // v²/(2g) [m]
  elevationHead: number;     // z [m]
  totalHead: number | null;  // [m]
}

export interface PipeResult {
  v1: number; v2: number; v3: number;
  Re1: number; Re2: number;
  regime2: PipeRegime;
  relRough: number;
  friction: FrictionResult;
  f: number | null;
  hK: number;
  hf: number | null;
  p2: number | null; p3: number | null;
  p2Ideal: number | null; p3Ideal: number | null;
  lossy: [StationHeads, StationHeads, StationHeads];
  ideal: [StationHeads, StationHeads, StationHeads];
  /** H₁ − H₃ − h_K − h_f; null when any term is unavailable. */
  residual: number | null;
  /** Pressure budget (p₁ − p₃)/(ρg) split into terms [m]; null terms unavailable. */
  budget: { elevation: number; kinetic: number; contraction: number; friction: number | null; total: number | null };
  reasons: Record<string, string>;
}

function heads(p: number | null, v: number, z: number, rho: number, g: number): StationHeads {
  const velocityHead = (v * v) / (2 * g);
  const pressureHead = p === null ? null : p / (rho * g);
  return { p, pressureHead, velocityHead, elevationHead: z, totalHead: pressureHead === null ? null : pressureHead + velocityHead + z };
}

/** Pure evaluation. Inputs must already be validated (finite, in range, |dz| ≤ L). */
export function evaluatePipe(i: PipeInputs, g = G): PipeResult {
  const reasons: Record<string, string> = {};
  // 1. continuity
  const v1 = velocityFromFlow(i.Q, i.D1);
  const v2 = velocityFromFlow(i.Q, i.D2);
  const v3 = v2;
  // 2. Reynolds numbers
  const Re1 = reynolds(i.rho, v1, i.D1, i.mu);
  const Re2 = reynolds(i.rho, v2, i.D2, i.mu);
  const regime2 = pipeRegime(Re2);
  const relRough = i.eps / i.D2;
  // 3. losses
  const hK = (i.K * v2 * v2) / (2 * g);
  const friction = frictionFactor(Re2, relRough);
  let hf: number | null;
  if (i.L === 0) hf = 0;                                   // no run: no friction loss, whatever f is
  else if (regime2 === 'no-flow') hf = 0;                  // S08: Q = 0 → Δp = 0
  else if (friction.f === null) { hf = null; reasons['hf'] = friction.reason ?? 'friction factor unavailable'; }
  else hf = frictionHead(friction.f, i.L, i.D2, v2, g);
  if (friction.f === null && friction.reason) reasons['f'] = friction.reason;
  // 4. absolute pressures (S04 balance with z₂ = z₁ = 0, hₚ = 0)
  const z1 = 0, z2 = 0, z3 = i.dz;
  const p2Ideal = i.p1 + (i.rho * (v1 * v1 - v2 * v2)) / 2;
  const p3Ideal = p2Ideal - i.rho * g * (z3 - z2);
  const p2 = p2Ideal - i.rho * g * hK;
  const p3 = hf === null ? null : p2 - i.rho * g * (z3 - z2) - i.rho * g * hf;
  const nonPositive = (p: number | null) => p !== null && p <= 0;
  const out = {
    p2: nonPositive(p2) ? null : p2,
    p3: nonPositive(p2) || nonPositive(p3) ? null : p3,
    p2Ideal: nonPositive(p2Ideal) ? null : p2Ideal,
    p3Ideal: nonPositive(p2Ideal) || nonPositive(p3Ideal) ? null : p3Ideal,
  };
  if (nonPositive(p2)) reasons['p2'] = 'Calculated absolute pressure at station 2 is ≤ 0 Pa: not physically possible for a liquid.';
  if (out.p3 === null && hf !== null) reasons['p3'] = 'Calculated absolute pressure at station 3 (or upstream) is ≤ 0 Pa: not physically possible for a liquid.';
  if (out.p3 === null && hf === null) reasons['p3'] = reasons['hf']!;
  if (out.p2Ideal === null) reasons['p2Ideal'] = 'Ideal absolute pressure at station 2 is ≤ 0 Pa.';
  if (out.p3Ideal === null) reasons['p3Ideal'] = 'Ideal absolute pressure at station 3 (or upstream) is ≤ 0 Pa.';

  const lossy: PipeResult['lossy'] = [
    heads(i.p1, v1, z1, i.rho, g), heads(out.p2, v2, z2, i.rho, g), heads(out.p3, v3, z3, i.rho, g),
  ];
  const ideal: PipeResult['ideal'] = [
    heads(i.p1, v1, z1, i.rho, g), heads(out.p2Ideal, v2, z2, i.rho, g), heads(out.p3Ideal, v3, z3, i.rho, g),
  ];
  const H1 = lossy[0].totalHead!;
  const H3 = lossy[2].totalHead;
  const residual = H3 === null || hf === null ? null : H1 - H3 - hK - hf;
  const kinetic = (v2 * v2 - v1 * v1) / (2 * g);
  const budget = {
    elevation: z3 - z1, kinetic, contraction: hK, friction: hf,
    total: out.p3 === null ? null : (i.p1 - out.p3) / (i.rho * g),
  };
  return {
    v1, v2, v3, Re1, Re2, regime2, relRough, friction, f: friction.f, hK, hf,
    ...out, lossy, ideal, residual, budget, reasons,
  };
}

/** Dimensional twin of the key formulas (used by tests). */
export function pipeDimensional(i: PipeInputs): Record<'v2' | 'Re2' | 'hK' | 'p2' | 'hf', DimQ> {
  const Q = DimQ.of(i.Q, 'm³/s');
  const D1 = DimQ.of(i.D1, 'm');
  const D2 = DimQ.of(i.D2, 'm');
  const rho = DimQ.of(i.rho, 'kg/m³');
  const mu = new DimQ(i.mu, [1, -1, -1, 0, 0, 0, 0]);
  const g = new DimQ(G, [0, 1, -2, 0, 0, 0, 0]);
  const four = DimQ.pure(4 / Math.PI);
  const v1 = four.mul(Q).div(D1.pow(2));
  const v2 = four.mul(Q).div(D2.pow(2));
  const Re2 = rho.mul(v2).mul(D2).div(mu);
  const hK = DimQ.pure(i.K).mul(v2.pow(2)).div(DimQ.pure(2).mul(g));
  const p1 = new DimQ(i.p1, [1, -1, -2, 0, 0, 0, 0]);
  const p2 = p1.add(rho.mul(v1.pow(2).sub(v2.pow(2))).div(DimQ.pure(2))).sub(rho.mul(g).mul(hK));
  const hf = DimQ.pure(0.02).mul(DimQ.of(i.L, 'm').div(D2)).mul(v2.pow(2)).div(DimQ.pure(2).mul(g));
  return { v2, Re2, hK, p2, hf };
}

/** Applicability rules (author-defined from the spec text; all unverified / needs-SME-review). */
export function pipeRules(i: PipeInputs, r: PipeResult): ApplicabilityRule[] {
  const T = PIPE_THRESHOLDS;
  const frictionOuts = ['darcy_f', 'h_f', 'p3', 'H3', 'residual'];
  const rules: ApplicabilityRule[] = [
    {
      ruleId: 'PIPE.A1.steady-incompressible-newtonian', status: 'within', kind: 'stipulated-assumption', basis: 'assumed',
      facts: { rho: i.rho, mu: i.mu }, action: 'qualify',
      affected: ['v1', 'v2', 'Re1', 'Re2', 'h_K', 'p2', 'p3', 'p2_ideal', 'p3_ideal'],
      reason: 'Steady, incompressible, single-phase Newtonian liquid with constant ρ and μ (stipulated).',
      source: 'S04 §I, S08 §I',
    },
    {
      ruleId: 'PIPE.A2.alpha-one', status: 'within', kind: 'stipulated-assumption', basis: 'assumed', facts: { alpha: 1 },
      action: 'qualify', affected: ['p2', 'p3', 'p2_ideal', 'p3_ideal'],
      reason: 'Kinetic-energy correction factors α = 1 at every station (S04 §C), including laminar flow.',
      source: 'S04 §C; OPEN_QUESTIONS OQ-11',
    },
    {
      ruleId: 'PIPE.A3.K-user-supplied', status: 'within', kind: 'stipulated-assumption', basis: 'assumed', facts: { K: i.K },
      action: 'qualify', affected: ['h_K', 'p2', 'p3'],
      reason: 'Contraction loss uses the user-supplied K referenced to v₂. Its dependence on Re and area ratio is not modelled; no contraction correlation is implemented.',
      source: 'S04 §C; OPEN_QUESTIONS OQ-04',
    },
    {
      ruleId: 'PIPE.A4.developed-flow', status: 'within', kind: 'stipulated-assumption', basis: 'assumed', facts: { L_over_D2: i.L / i.D2 },
      action: 'qualify', affected: ['darcy_f', 'h_f', 'p3'],
      reason: 'Fully developed flow is assumed over the whole run, including just after the contraction; the development length is not modelled.',
      source: 'S08 §I; OPEN_QUESTIONS OQ-06',
    },
    {
      ruleId: 'PIPE.I1.cavitation-margin-unknown', status: 'indeterminate', kind: 'missing-evidence', basis: 'assumed', facts: {},
      action: 'show', affected: [],
      reason: 'Cavitation margin is unknown: no vapour-pressure record or fluid temperature is available. Only absolute pressures ≤ 0 are suppressed.',
      alternative: 'A named vapour-pressure record and fluid temperature.', source: 'S04 §I, §N; OPEN_QUESTIONS OQ-07',
    },
  ];
  // Regime / friction applicability on Re₂.
  const regimeRule: ApplicabilityRule = {
    ruleId: 'S08.R1.regime', kind: 'empirical-domain', basis: 'evidence',
    facts: { Re2: r.Re2, relRough: r.relRough }, affected: i.L === 0 ? ['darcy_f'] : frictionOuts,
    status: r.friction.status, action: r.friction.status === 'outside' ? 'suppress' : r.friction.status === 'indeterminate' ? 'show' : 'qualify',
    reason: '', source: 'S07 §I, S08 §I, CORRELATION_REGISTER (thresholds are conventions)',
  };
  switch (r.regime2) {
    case 'no-flow': regimeRule.reason = 'No flow (Re = 0): f is undefined; friction loss is zero.'; regimeRule.affected = ['darcy_f']; break;
    case 'laminar': regimeRule.reason = r.Re2 >= T.laminarApproach
      ? `Laminar (Re₂ = ${r.Re2.toFixed(0)}), within 2000–2300 of the transition convention: approaching the limit (provisional buffer).`
      : `Laminar (Re₂ = ${r.Re2.toFixed(0)} < 2300): f = 64/Re.`; break;
    case 'transitional': regimeRule.reason = `Transitional (2300 ≤ Re₂ = ${r.Re2.toFixed(0)} < 4000): outside scope. Re is shown; no friction factor or friction pressure drop is given.`;
      regimeRule.alternative = 'Measured pressure drop on this pipe, or a transition model validated for this geometry and disturbance level.'; break;
    case 'turbulent': regimeRule.reason = r.friction.status === 'outside' ? r.friction.reason!
      : r.Re2 < T.turbulentApproachEnd
        ? `Turbulent (Re₂ = ${r.Re2.toFixed(0)}), within 4000–4500 of the transition convention: approaching the limit (provisional buffer).`
        : `Turbulent (Re₂ = ${r.Re2.toPrecision(3)}): Colebrook, ε/D₂ = ${r.relRough.toPrecision(3)} (teaching envelope Re ≤ 10⁷, ε/D ≤ 0.05).`;
      if (r.friction.status === 'outside') regimeRule.alternative = 'Friction data or a correlation covering this roughness, or measured pressure drop.'; break;
    case 'beyond-envelope': regimeRule.reason = r.friction.reason!; regimeRule.alternative = 'A correlation with documented accuracy at this Re, or measured data.'; break;
  }
  if (i.L === 0 && r.regime2 !== 'no-flow') regimeRule.reason += ' With L = 0 there is no friction run, so h_f = 0 regardless.';
  rules.push(regimeRule);
  // Physical impossibility of absolute pressure ≤ 0.
  for (const [id, outs] of [['p2', ['p2', 'H2', 'p3', 'H3', 'residual']], ['p3', ['p3', 'H3', 'residual']], ['p2Ideal', ['p2_ideal', 'p3_ideal']], ['p3Ideal', ['p3_ideal']]] as const) {
    const reason = r.reasons[id];
    if (reason && reason.includes('≤ 0')) {
      rules.push({ ruleId: `PIPE.P.${id}-nonpositive`, status: 'outside', kind: 'physical-constraint', basis: 'evidence',
        facts: {}, action: 'suppress', affected: [...outs], reason, alternative: 'Raise p₁, reduce Q or K, or lower the outlet.', source: 'physical constraint (absolute pressure > 0)' });
    }
  }
  return rules;
}

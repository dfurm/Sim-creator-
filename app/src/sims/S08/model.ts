/**
 * S08 · Friction factor and pressure loss in a straight pipe (spec simulations/S08.md §C, §I, §K).
 * Pure, SI, no DOM. Darcy convention throughout.
 *   Δp = f_D (L/D) ρ v²/2;  laminar f_D = 64/Re;
 *   turbulent Colebrook 1/√f = −2 log10[ε/(3.7D) + 2.51/(Re √f)],
 *   solved by bisection on s = 1/√f over [1, 30] with residual < 1e-10 (S08 §K)
 *   and relative bracket width ≤ 1e-8 (VERIFICATION_VALIDATION_PLAN).
 */
import { PIPE_THRESHOLDS, pipeRegime, type PipeRegime } from '../S07/model';

export const S08_MODEL_VERSION = '0.2.0';
export const COLEBROOK_SOLVER = 'bisection-s-1-30-v1';

export interface ColebrookSolution {
  f: number;
  s: number;
  residual: number;
  iterations: number;
  bracketWidth: number;
}

export class SolverError extends Error {
  constructor(message: string, readonly detail: Record<string, number>) {
    super(message);
    this.name = 'SolverError';
  }
}

/** g(s) = s + 2 log10(εr/3.7 + 2.51 s / Re); increasing in s. Root gives s = 1/√f. */
export function colebrookResidual(s: number, Re: number, relRough: number): number {
  return s + 2 * Math.log10(relRough / 3.7 + (2.51 * s) / Re);
}

export function colebrook(Re: number, relRough: number, tol = 1e-10): ColebrookSolution {
  if (!(Re > 0) || !Number.isFinite(Re) || !(relRough >= 0)) {
    throw new SolverError('Colebrook requires Re > 0 and ε/D ≥ 0', { Re, relRough });
  }
  let lo = 1;
  let hi = 30;
  let glo = colebrookResidual(lo, Re, relRough);
  const ghi = colebrookResidual(hi, Re, relRough);
  if (glo > 0 || ghi < 0) throw new SolverError('No bracket for s = 1/√f in [1, 30]', { Re, relRough, glo, ghi });
  let mid = (lo + hi) / 2;
  let gmid = colebrookResidual(mid, Re, relRough);
  let it = 0;
  while (it < 200) {
    it += 1;
    mid = (lo + hi) / 2;
    gmid = colebrookResidual(mid, Re, relRough);
    if (Math.abs(gmid) < tol && (hi - lo) / mid <= 1e-8) break;
    if (gmid === 0) break;
    if ((gmid < 0) === (glo < 0)) { lo = mid; glo = gmid; } else { hi = mid; }
  }
  if (!(Math.abs(gmid) < tol)) throw new SolverError('Colebrook bisection did not converge', { Re, relRough, residual: gmid, it });
  return { f: 1 / (mid * mid), s: mid, residual: gmid, iterations: it, bracketWidth: hi - lo };
}

export function laminarFactor(Re: number): number {
  return 64 / Re;
}

export interface FrictionResult {
  regime: PipeRegime;
  /** Darcy factor, or null when undefined (Q = 0) or out of scope. */
  f: number | null;
  /** Why f is null. */
  reason?: string;
  status: 'within' | 'approaching' | 'outside' | 'indeterminate';
  method: 'laminar-64/Re' | 'colebrook-bisection' | 'none';
  solver?: ColebrookSolution;
}

/** Friction factor with the S08 regime rules (no fixed-f mode here). */
export function frictionFactor(Re: number, relRough: number): FrictionResult {
  const regime = pipeRegime(Re);
  const T = PIPE_THRESHOLDS;
  switch (regime) {
    case 'no-flow':
      return { regime, f: null, reason: 'f is undefined at Q = 0 (no flow); friction loss is zero.', status: 'indeterminate', method: 'none' };
    case 'laminar':
      return { regime, f: laminarFactor(Re), status: Re >= T.laminarApproach ? 'approaching' : 'within', method: 'laminar-64/Re' };
    case 'transitional':
      return { regime, f: null, status: 'outside', method: 'none',
        reason: `Re = ${Re.toPrecision(4)} is in the transition band 2300–4000: no friction model is in scope, so f and the friction loss are not shown.` };
    case 'beyond-envelope':
      return { regime, f: null, status: 'outside', method: 'none',
        reason: `Re = ${Re.toPrecision(3)} exceeds the teaching envelope (Re ≤ 1×10⁷).` };
    case 'turbulent': {
      if (relRough > T.maxRelativeRoughness) {
        return { regime, f: null, status: 'outside', method: 'none',
          reason: `ε/D = ${relRough.toPrecision(3)} exceeds the teaching envelope (ε/D ≤ 0.05).` };
      }
      const sol = colebrook(Re, relRough);
      return { regime, f: sol.f, status: Re < T.turbulentApproachEnd ? 'approaching' : 'within', method: 'colebrook-bisection', solver: sol };
    }
  }
}

/** Darcy–Weisbach head loss h_f = f (L/D) v²/(2g). */
export function frictionHead(f: number, L: number, D: number, v: number, g: number): number {
  return f * (L / D) * (v * v) / (2 * g);
}

export function fanningFromDarcy(fD: number): number {
  return fD / 4;
}

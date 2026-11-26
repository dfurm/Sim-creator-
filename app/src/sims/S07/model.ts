/**
 * S07 · Reynolds number and regime screen (spec simulations/S07.md §C, §I). Pure, SI, no DOM.
 *   Re = ρ v D / μ = v D / ν;  fixed-flow mode: v = 4Q/(πD²).
 * Regime thresholds are conventions for developed Newtonian pipe flow, not physical constants.
 */
export const S07_MODEL_VERSION = '0.2.0';

export function reynolds(rho: number, v: number, D: number, mu: number): number {
  return (rho * v * D) / mu;
}

export function kinematicViscosity(rho: number, mu: number): number {
  return mu / rho;
}

export function velocityFromFlow(Q: number, D: number): number {
  return (4 * Q) / (Math.PI * D * D);
}

/** Pipe regime thresholds (S07 §I, S08 §I) and provisional UI buffers (APPLICABILITY_STANDARD). */
export const PIPE_THRESHOLDS = {
  laminarApproach: 2000,   // provisional UI buffer start (approaching)
  laminarUpper: 2300,      // laminar is Re < 2300
  turbulentLower: 4000,    // S08: turbulent is Re ≥ 4000; S07 says "> 4000" (SPEC_ISSUES SI-16)
  turbulentApproachEnd: 4500, // provisional UI buffer end
  envelopeUpper: 1e7,      // teaching product guard (CORRELATION_REGISTER)
  maxRelativeRoughness: 0.05,
} as const;

export type PipeRegime = 'no-flow' | 'laminar' | 'transitional' | 'turbulent' | 'beyond-envelope';

/**
 * Regime per the S08 friction convention: laminar Re < 2300, transitional 2300 ≤ Re < 4000,
 * turbulent 4000 ≤ Re ≤ 1e7, beyond the teaching envelope above 1e7.
 */
export function pipeRegime(Re: number): PipeRegime {
  if (Re === 0) return 'no-flow';
  if (Re < PIPE_THRESHOLDS.laminarUpper) return 'laminar';
  if (Re < PIPE_THRESHOLDS.turbulentLower) return 'transitional';
  if (Re <= PIPE_THRESHOLDS.envelopeUpper) return 'turbulent';
  return 'beyond-envelope';
}

/** S07's own screen label ("> 4000 commonly turbulent"): exactly 4000 is still transitional here. */
export function s07ScreenLabel(Re: number): string {
  if (Re === 0) return 'stationary (Re = 0)';
  if (Re < 2300) return 'laminar screen (Re < 2300)';
  if (Re <= 4000) return 'transitional screen (2300–4000)';
  return 'commonly turbulent screen (Re > 4000)';
}

/** Whether Re lies in a provisional "approaching" UI buffer. */
export function inApproachBand(Re: number): boolean {
  return (Re >= PIPE_THRESHOLDS.laminarApproach && Re < PIPE_THRESHOLDS.laminarUpper)
    || (Re >= PIPE_THRESHOLDS.turbulentLower && Re < PIPE_THRESHOLDS.turbulentApproachEnd);
}

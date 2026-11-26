/**
 * S04 · Bernoulli and the mechanical energy balance (spec simulations/S04.md §C, §I, §N). Pure, SI.
 *   p₂ = p₁ + ρg[z₁ − z₂ + hₚ − h_L] + ρ(v₁² − v₂²)/2;  vᵢ = 4Q/(πDᵢ²);  h_L = K v₂²/(2g)
 *   z₁ = 0; ρ = 1000 kg/m³; g = 9.80665 m/s²; K referenced to station 2; α₁ = α₂ = 1.
 */
export const S04_MODEL_VERSION = '0.2.0';
export const G = 9.80665;
export const RHO_S04 = 1000;

export interface S04Inputs { Q: number; D1: number; D2: number; dz: number; p1: number; K: number; hp: number }
export interface S04Outputs {
  v1: number; v2: number; loss_head: number; p2: number; total_head_1: number; total_head_2: number;
}

/** Order per §N: continuity → kinetic heads → losses → absolute outlet pressure. */
export function energyBalance(i: S04Inputs, rho = RHO_S04, g = G): S04Outputs {
  const v1 = (4 * i.Q) / (Math.PI * i.D1 * i.D1);
  const v2 = (4 * i.Q) / (Math.PI * i.D2 * i.D2);
  const loss_head = (i.K * v2 * v2) / (2 * g);
  const z1 = 0;
  const z2 = i.dz;
  const p2 = i.p1 + rho * g * (z1 - z2 + i.hp - loss_head) + (rho * (v1 * v1 - v2 * v2)) / 2;
  const total_head_1 = i.p1 / (rho * g) + (v1 * v1) / (2 * g) + z1;
  const total_head_2 = p2 / (rho * g) + (v2 * v2) / (2 * g) + z2;
  return { v1, v2, loss_head, p2, total_head_1, total_head_2 };
}

/** Pump head that delivers a target p₂ (S04 §D design target): forward-substitutable. */
export function requiredPumpHead(i: Omit<S04Inputs, 'hp'>, p2Target: number, rho = RHO_S04, g = G): number {
  const base = energyBalance({ ...i, hp: 0 }, rho, g);
  return (p2Target - base.p2) / (rho * g);
}

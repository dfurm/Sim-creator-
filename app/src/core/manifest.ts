/** Build numeric input specs from a spec manifest (read in place). Pure. */
import type { NumericInputSpec } from './block';

interface ManifestInput { id: string; label: string; unit: string; min: number; max: number; default: number; step: number; alternative: string }

export function manifestInputs(
  inputs: readonly ManifestInput[], extra: Partial<Record<string, Partial<NumericInputSpec>>> = {},
): NumericInputSpec[] {
  return inputs.map((m) => ({
    kind: 'number' as const, id: m.id, label: m.label, unit: m.unit, min: m.min, max: m.max,
    default: m.default, step: m.step, alternative: m.alternative, source: 'manifest' as const, ...(extra[m.id] ?? {}),
  }));
}

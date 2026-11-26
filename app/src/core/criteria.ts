/** Evaluate scenario criteria (enumerated operations only; never executable expressions). Pure. */
import type { Criterion, Result } from '../../../spec/contracts/block';

export interface CriterionResult { criterion: Criterion; met: boolean; detail: string }

export function evaluateCriteria(
  criteria: readonly Criterion[], result: Result, learning: Readonly<Record<string, unknown>>,
): CriterionResult[] {
  return criteria.map((c) => {
    switch (c.op) {
      case 'predictionRecorded':
      case 'explanationRecorded': {
        const met = learning[c.prompt] !== undefined;
        return { criterion: c, met, detail: met ? `${c.prompt} recorded` : `${c.prompt} not yet recorded` };
      }
      case 'outputWithin': {
        const q = result.outputs[c.output];
        if (!q || typeof q.value !== 'number') return { criterion: c, met: false, detail: `${c.output} unavailable` };
        if (q.unit !== c.unit) return { criterion: c, met: false, detail: `unit mismatch ${q.unit} vs ${c.unit}` };
        // No assessed credit outside applicability (MODEL_APPLICABILITY_STANDARD).
        const eligible = q.status === 'within' || q.status === 'approaching';
        const met = eligible && q.value >= c.min && q.value <= c.max;
        return { criterion: c, met, detail: `${c.output} = ${q.value} ${q.unit}${eligible ? '' : ' (not eligible: status ' + q.status + ')'}` };
      }
    }
  });
}

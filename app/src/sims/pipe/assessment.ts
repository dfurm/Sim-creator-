/**
 * Assessment helpers for the pipe lesson. Pure. Numeric answers come from an enumerated set of
 * sources computed from the committed result (never from executable expressions in data).
 */
import type { Inputs, Result } from '../../../../spec/contracts/block';

export type AnswerSource = 'pressureDropIdeal12' | 'dissipatedHead' | 'flowAtRe4000Lmin';

export function answerFor(source: AnswerSource, inputs: Inputs, result: Result): number | null {
  const v = (id: string) => (typeof result.outputs[id]?.value === 'number' ? (result.outputs[id]!.value as number) : null);
  switch (source) {
    case 'pressureDropIdeal12': {
      const p2 = v('p2_ideal');
      return p2 === null ? null : (inputs['p1'] as number) - p2;
    }
    case 'dissipatedHead': {
      const hK = v('h_K'), hf = v('h_f');
      return hK === null || hf === null ? null : hK + hf;
    }
    case 'flowAtRe4000Lmin': {
      const rho = inputs['rho'] as number, mu = inputs['mu'] as number, D2 = inputs['D2'] as number;
      return ((4000 * Math.PI * D2 * mu) / (4 * rho)) * 60000;
    }
  }
}

export interface ChoiceOption { id: string; text: string; correct: boolean; feedback: string }
export interface ChoiceItem { id: string; type: 'choice'; stem: string; options: ChoiceOption[] }
export interface NumericItem {
  id: string; type: 'numeric'; stem: string; unit: string; answer: AnswerSource; rtol: number;
  feedbackCorrect: string; feedbackIncorrect: string;
}
export type AssessmentItem = ChoiceItem | NumericItem;

export interface ItemResponse { itemId: string; response: string | number; correct: boolean; feedback: string; expected?: number | null }

export function markItem(item: AssessmentItem, response: string | number, inputs: Inputs, result: Result): ItemResponse {
  if (item.type === 'choice') {
    const opt = item.options.find((o) => o.id === response);
    if (!opt) return { itemId: item.id, response, correct: false, feedback: 'Choose one of the options.' };
    return { itemId: item.id, response, correct: opt.correct, feedback: opt.feedback };
  }
  const expected = answerFor(item.answer, inputs, result);
  const x = typeof response === 'number' ? response : Number(String(response).trim());
  if (expected === null) return { itemId: item.id, response, correct: false, expected, feedback: 'The model gives no valid value for this item in the current state.' };
  if (!Number.isFinite(x)) return { itemId: item.id, response, correct: false, expected, feedback: 'Enter a number.' };
  const ok = Math.abs(x - expected) <= item.rtol * Math.abs(expected);
  return { itemId: item.id, response: x, correct: ok, expected, feedback: ok ? item.feedbackCorrect : item.feedbackIncorrect };
}

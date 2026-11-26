import { describe, expect, it } from 'vitest';
import metadata from '../src/sims/pipe/metadata.json';
import { answerFor, markItem, type AssessmentItem } from '../src/sims/pipe/assessment';
import { createPipeBlock, PIPE_SCENARIOS } from '../src/sims/pipe/definition';

async function state(sc: string) {
  const b = createPipeBlock();
  await b.initialise(PIPE_SCENARIOS[sc]!);
  return { inputs: b.getInputParameters(), result: b.getOutputs() };
}

describe('pipe lesson metadata', () => {
  it('three tasks, each with prediction fields, ≥2 assessment items with feedback, Bloom, evidence, proposed codes', () => {
    expect(metadata.tasks).toHaveLength(3);
    for (const t of metadata.tasks) {
      expect(t.prediction.fields.length).toBeGreaterThan(0);
      expect(t.items.length).toBeGreaterThanOrEqual(2);
      expect(t.bloom && t.evidenceType).toBeTruthy();
      for (const m of [...t.eaStage1, ...t.ncse2026]) expect(m.mappingStatus).toBe('proposed');
      for (const i of t.items as AssessmentItem[]) {
        if (i.type === 'choice') {
          expect(i.options.filter((o) => o.correct)).toHaveLength(1);
          for (const o of i.options) expect(o.feedback.length).toBeGreaterThan(20);
        } else expect(i.feedbackCorrect && i.feedbackIncorrect).toBeTruthy();
      }
    }
    expect(metadata.tasks.flatMap((t) => t.ncse2026.map((m) => m.code)).sort()).toEqual(expect.arrayContaining(['ETP-TK1', 'ETP-TK2', 'ETP-AN1', 'ETP-IPS1', 'ETP-ST4']));
  });
  it('no status is verified', () => {
    expect(JSON.stringify(metadata)).not.toMatch(/"verification_status":\s*"(verified|single-source)"/);
  });
});

describe('numeric answers and marking', () => {
  it('task A: p₁ − p₂ ideal = 1945.37 Pa (S04 fixture)', async () => {
    const { inputs, result } = await state('a');
    expect(answerFor('pressureDropIdeal12', inputs, result)).toBeCloseTo(1945.3667, 3);
    const item = metadata.tasks[0]!.items[2] as AssessmentItem;
    expect(markItem(item, 1950, inputs, result).correct).toBe(true);
    expect(markItem(item, 2100, inputs, result).correct).toBe(false);
    expect(markItem(item, 'abc', inputs, result).feedback).toMatch(/Enter a number/);
  });
  it('task B: dissipated head equals h_K + h_f and H₁ − H₃', async () => {
    const { inputs, result } = await state('b');
    const a = answerFor('dissipatedHead', inputs, result)!;
    expect(a).toBeCloseTo((result.outputs['H1']!.value as number) - (result.outputs['H3']!.value as number), 10);
  });
  it('task C: Q at Re₂ = 4000 is 4.712 L/min for water in a 25 mm bore', async () => {
    const { inputs, result } = await state('c');
    expect(answerFor('flowAtRe4000Lmin', inputs, result)).toBeCloseTo(4.7124, 3);
  });
  it('choice marking returns the option feedback', async () => {
    const { inputs, result } = await state('a');
    const item = metadata.tasks[0]!.items[0] as AssessmentItem;
    expect(markItem(item, 'b', inputs, result)).toMatchObject({ correct: true });
    expect(markItem(item, 'a', inputs, result).feedback).toMatch(/D²/);
  });
});

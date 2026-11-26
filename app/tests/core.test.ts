import { describe, expect, it } from 'vitest';
import { combine, statusForOutput, toContractValidity, fromContractValidity, type ApplicabilityRule } from '../src/core/applicability';
import { convert, DimQ, fromSI, toSI, UNITS } from '../src/core/units';
import { AnchorRegistry, anchorElementId, anchorId } from '../src/core/anchors';

describe('units', () => {
  it('SI ↔ display round trip for every registered unit', () => {
    for (const sym of Object.keys(UNITS)) {
      for (const x of [0, 1e-5, 0.025, 1, 123.456]) {
        expect(fromSI(toSI(x, sym), sym)).toBeCloseTo(x, 12);
      }
    }
  });
  it('known conversions', () => {
    expect(convert(60, 'L/min', 'm³/s')).toBeCloseTo(0.001, 15);
    expect(convert(0.001, 'm³/s', 'L/min')).toBeCloseTo(60, 12);
    expect(convert(25, 'mm', 'm')).toBe(0.025);
    expect(convert(20, '°C', 'K')).toBeCloseTo(293.15, 12);
  });
  it('rejects conversion across dimensions', () => {
    expect(() => convert(1, 'm', 'm/s')).toThrow(/Dimension mismatch/);
  });
  it('rejects adding incompatible dimensions', () => {
    expect(() => DimQ.of(1, 'm').add(DimQ.of(1, 'm²'))).toThrow(/Cannot add/);
  });
  it('unknown unit throws', () => expect(() => toSI(1, 'furlong')).toThrow(/Unknown unit/));
});

describe('applicability status model', () => {
  it('combines in order outside → indeterminate → approaching → within', () => {
    expect(combine([])).toBe('within');
    expect(combine(['within', 'approaching'])).toBe('approaching');
    expect(combine(['approaching', 'indeterminate'])).toBe('indeterminate');
    expect(combine(['indeterminate', 'outside', 'within'])).toBe('outside');
  });
  it('per-output eligibility keeps individual rules', () => {
    const r = (id: string, status: ApplicabilityRule['status'], affected: string[]): ApplicabilityRule => ({
      ruleId: id, status, affected, kind: 'product-guard', basis: 'assumed', facts: {}, reason: id, action: 'show', source: 'test',
    });
    const rules = [r('a', 'within', ['Re', 'f']), r('b', 'outside', ['f']), r('c', 'approaching', ['Re'])];
    expect(statusForOutput('Re', rules).status).toBe('approaching');
    expect(statusForOutput('f', rules).status).toBe('outside');
    expect(statusForOutput('f', rules).rules.map((x) => x.ruleId)).toEqual(['a', 'b']);
  });
  it('maps indeterminate ↔ contract "unknown"', () => {
    expect(toContractValidity('indeterminate')).toBe('unknown');
    expect(fromContractValidity('unknown')).toBe('indeterminate');
    expect(toContractValidity('within')).toBe('within');
  });
});

describe('semantic anchors', () => {
  it('stable ids and DOM ids', () => {
    expect(anchorId('S02', 'throat_area')).toBe('S02/throat_area');
    expect(anchorElementId('S02/throat_area')).toBe('anchor-S02-throat_area');
    expect(() => anchorId('S02', 'Bad Name')).toThrow();
  });
  it('rejects duplicates and foreign anchors', () => {
    const s = { represents: 'geometry' as const, quantity: 'x', label: 'x' };
    expect(() => new AnchorRegistry('S02', [{ id: 'S02/a', ...s }, { id: 'S02/a', ...s }])).toThrow(/Duplicate/);
    expect(() => new AnchorRegistry('S02', [{ id: 'S11/a', ...s }])).toThrow();
  });
});

import { evaluateCriteria } from '../src/core/criteria';
describe('criteria', () => {
  const result = { revision: 1, timeSI: 0, checks: [], outputs: {
    v2: { value: 2.0372, unit: 'm/s', status: 'within' as const, rules: [], origin: 'calculated' as const },
    v1: { value: 9, unit: 'm/s', status: 'outside' as const, rules: [], origin: 'calculated' as const },
  } };
  it('evaluates enumerated operations', () => {
    const r = evaluateCriteria([
      { op: 'predictionRecorded', prompt: 'p' },
      { op: 'outputWithin', output: 'v2', min: 2.03, max: 2.04, unit: 'm/s' },
      { op: 'outputWithin', output: 'v1', min: 0, max: 10, unit: 'm/s' },
      { op: 'outputWithin', output: 'v2', min: 2.03, max: 2.04, unit: 'mm/s' },
    ], result, { p: 1 });
    expect(r.map((x) => x.met)).toEqual([true, true, false, false]);
  });
});

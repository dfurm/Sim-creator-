/**
 * Applicability status model (spec standards/MODEL_APPLICABILITY_STANDARD.md).
 * Pure: no DOM, no framework.
 *
 * The run brief names the fourth state "indeterminate"; contracts/block.ts names it
 * "unknown". The kernel uses "indeterminate" and maps it to "unknown" at the contract
 * boundary (see SPEC_ISSUES.md SI-03).
 */
import type { Validity } from '../../../spec/contracts/block';

export type Applicability = 'within' | 'approaching' | 'outside' | 'indeterminate';

export type RuleKind =
  | 'physical-constraint'
  | 'empirical-domain'
  | 'product-guard'
  | 'missing-evidence'
  | 'numerical-condition'
  | 'stipulated-assumption';

export interface ApplicabilityRule {
  ruleId: string;
  status: Applicability;
  kind: RuleKind;
  /** Facts tested, in SI. */
  facts: Readonly<Record<string, number | string | boolean>>;
  /** Whether the facts are assumed (stipulated by the preset) or supported by evidence. */
  basis: 'assumed' | 'evidence';
  reason: string;
  action: 'show' | 'qualify' | 'suppress';
  /** Output IDs this rule governs. Empty = informational only. */
  affected: readonly string[];
  alternative?: string;
  source: string;
}

/** Severity order for combining: outside → indeterminate → approaching → within. */
const SEVERITY: Record<Applicability, number> = {
  within: 0, approaching: 1, indeterminate: 2, outside: 3,
};

export function combine(statuses: readonly Applicability[]): Applicability {
  let worst: Applicability = 'within';
  for (const s of statuses) if (SEVERITY[s] > SEVERITY[worst]) worst = s;
  return worst;
}

/** Combined status for one output, keeping every individual rule. */
export function statusForOutput(outputId: string, rules: readonly ApplicabilityRule[]): {
  status: Applicability; rules: ApplicabilityRule[];
} {
  const governing = rules.filter((r) => r.affected.includes(outputId));
  return { status: combine(governing.map((r) => r.status)), rules: governing };
}

export function toContractValidity(a: Applicability): Validity {
  return a === 'indeterminate' ? 'unknown' : a;
}

export function fromContractValidity(v: Validity): Applicability {
  return v === 'unknown' ? 'indeterminate' : v;
}

/** Icon + text presentation; status must never rely on colour alone. */
export const STATUS_PRESENTATION: Record<Applicability, { icon: string; label: string; aria: string }> = {
  within: { icon: '✓', label: 'Within documented applicability', aria: 'Status: within applicability' },
  approaching: { icon: '▲', label: 'Approaching a limit', aria: 'Status: approaching a limit' },
  outside: { icon: '⛔', label: 'Outside documented applicability', aria: 'Status: outside applicability' },
  indeterminate: { icon: '?', label: 'Applicability cannot be established', aria: 'Status: indeterminate' },
};

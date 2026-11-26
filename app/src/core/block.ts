/**
 * Generic algebraic (time-independent) block implementing contracts/block.ts.
 * Pure TypeScript: no DOM, no framework. `Blob` is a web/Node global used only by export.
 */
import type {
  BlockEvent, EducationalBlock, EventName, Inputs, Phase, Quantity, Result, RuleResult,
  Scenario, Snapshot, Value,
} from '../../../spec/contracts/block';
import {
  type ApplicabilityRule, type Applicability, statusForOutput, toContractValidity,
} from './applicability';
import { validateSchema } from './schemas';
import { unitDef } from './units';

export type ErrorCode =
  | 'BAD_INPUT' | 'LOCKED' | 'STALE_REVISION' | 'UNSUPPORTED' | 'DISPOSED'
  | 'NOT_INITIALISED' | 'INCOMPATIBLE_VERSION' | 'INVALID_SCENARIO' | 'INVALID_SNAPSHOT'
  | 'MISSING_MODEL' | 'SOLVER_FAILURE';

export class BlockError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: { input?: string; messages?: string[]; recoverable?: boolean } = {},
  ) {
    super(message);
    this.name = 'BlockError';
  }
}

export interface NumericInputSpec {
  kind: 'number';
  id: string; label: string; unit: string;
  min: number; max: number; default: number; step: number;
  alternative: string; source: 'manifest' | 'app-extension';
  /** Physical domain beyond the teaching range, e.g. strictly positive. */
  exclusiveMin?: number;
}
export interface CategoricalInputSpec {
  kind: 'category';
  id: string; label: string; options: readonly string[]; default: string;
  source: 'manifest' | 'app-extension';
}
export type InputSpec = NumericInputSpec | CategoricalInputSpec;

export interface EvaluatedOutput {
  value: number | string | null;
  unit: string;
  origin: Quantity['origin'];
  /** Reason given when value is null (suppressed or not modelled). */
  reason?: string;
}

export interface Evaluation {
  outputs: Record<string, EvaluatedOutput>;
  rules: ApplicabilityRule[];
  /** Additional structured results (e.g. design candidates). Exported with the result. */
  extras: Readonly<Record<string, unknown>>;
}

export interface BlockDefinition {
  simulationId: string;
  modelVersion: string;
  variant: string;
  snapshotSchemaVersion: string;
  solverVersion: string;
  inputs: readonly InputSpec[];
  outputs: readonly { id: string; unit: string }[];
  /** Inputs inactive (locked) in the mode described by these inputs. */
  lockedByMode(inputs: Inputs): string[];
  /** Model-dependent constraints after per-field checks. Returns error messages. */
  crossValidate(inputs: Inputs): string[];
  /** Pure model evaluation. Must not throw for validated inputs. */
  evaluate(inputs: Inputs): Evaluation;
  assetVersions: Readonly<Record<string, string>>;
}

export interface BlockResult extends Result {
  extras: Readonly<Record<string, unknown>>;
  rulesDetail: ApplicabilityRule[];
  overall: Applicability;
}

const HISTORY_LIMIT = 20;
let instanceCounter = 0;

function newRunId(): string {
  const c = globalThis.crypto;
  return c && 'randomUUID' in c ? c.randomUUID() : `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(x: number): string {
  return Number.isInteger(x) ? String(x) : String(+x.toPrecision(6));
}

export class AlgebraicBlock implements EducationalBlock {
  readonly instanceId: string;
  private phase: Phase = 'new';
  private revision = 0;
  private runId = newRunId();
  private scenario: Scenario | null = null;
  private inputs: Record<string, Value> = {};
  private last: BlockResult | null = null;
  private history: BlockResult[] = [];
  private learning: Record<string, unknown> = {};
  private listeners = new Set<(e: BlockEvent) => void>();
  private readonly specs: Map<string, InputSpec>;

  constructor(readonly def: BlockDefinition, instanceId?: string) {
    this.instanceId = instanceId ?? `${def.simulationId}-${++instanceCounter}`;
    this.specs = new Map(def.inputs.map((s) => [s.id, s]));
    for (const o of def.outputs) unitDef(o.unit); // every output unit must be registered
  }

  // ---------- lifecycle ----------
  getPhase(): Phase { return this.phase; }
  getRevision(): number { return this.revision; }
  getRunId(): string { return this.runId; }
  getScenario(): Scenario | null { return this.scenario; }
  getInputSpecs(): readonly InputSpec[] { return this.def.inputs; }

  async initialise(scenario: Scenario): Promise<void> {
    this.assertNotDisposed();
    this.checkScenario(scenario);
    this.scenario = scenario;
    this.inputs = this.defaultInputs(scenario);
    this.revision += 1;
    this.history = [];
    this.learning = {};
    this.setPhase('ready');
    await this.calculate();
  }

  async loadScenario(scenario: Scenario): Promise<void> {
    this.assertReady();
    this.runId = newRunId();
    await this.initialise(scenario);
  }

  async start(): Promise<void> { this.unsupported('start'); }
  async pause(): Promise<void> { this.unsupported('pause'); }
  async advanceTimestep(_dtSI: number): Promise<Result> { return this.unsupported('advanceTimestep'); }

  async reset(): Promise<void> {
    this.assertReady();
    const scenario = this.scenario!;
    this.inputs = this.defaultInputs(scenario);
    this.runId = newRunId();
    this.history = [];
    this.learning = {};
    this.revision += 1;
    this.emit('simulation.stateChanged', { from: this.phase, to: 'ready', timeSI: 0, runId: this.runId, reset: true });
    await this.calculate();
  }

  dispose(): void {
    if (this.phase === 'disposed') return;
    this.setPhase('disposed');
    this.listeners.clear();
  }

  subscribe(listener: (event: BlockEvent) => void): () => void {
    this.assertNotDisposed();
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // ---------- inputs ----------
  getInputParameters(): Inputs {
    this.assertReady();
    return { ...this.inputs };
  }

  /** Inputs currently locked (by scenario or by mode). */
  lockedInputs(inputs: Inputs = this.inputs): string[] {
    const fromScenario = this.scenario?.lockedInputs ?? [];
    return [...new Set([...fromScenario, ...this.def.lockedByMode(inputs)])];
  }

  /** Effective range: manifest teaching bounds narrowed by the scenario. */
  rangeOf(id: string): { min: number; max: number } | null {
    const s = this.specs.get(id);
    if (!s || s.kind !== 'number') return null;
    const r = this.scenario?.restrictedRanges[id];
    return r ? { min: Math.max(s.min, r.min), max: Math.min(s.max, r.max) } : { min: s.min, max: s.max };
  }

  /** Validate a patch without committing. Returns error messages keyed by input ID. */
  validatePatch(patch: Inputs): Record<string, string> {
    const errors: Record<string, string> = {};
    const candidate: Record<string, Value> = { ...this.inputs, ...patch };
    const lockedBefore = this.lockedInputs(this.inputs);
    for (const [id, value] of Object.entries(patch)) {
      const spec = this.specs.get(id);
      if (!spec) { errors[id] = `Unknown input "${id}".`; continue; }
      if (lockedBefore.includes(id) && value !== this.inputs[id]) {
        errors[id] = `${spec.label} is locked in the current mode or scenario.`;
        continue;
      }
      const msg = this.checkValue(spec, value, this.rangeOf(id));
      if (msg) errors[id] = msg;
    }
    if (Object.keys(errors).length === 0) {
      for (const m of this.def.crossValidate(candidate)) errors['*'] = errors['*'] ? `${errors['*']} ${m}` : m;
    }
    return errors;
  }

  async setInputParameters(patch: Inputs, expectedRevision?: number): Promise<number> {
    this.assertReady();
    if (expectedRevision !== undefined && expectedRevision !== this.revision) {
      throw new BlockError('STALE_REVISION', `Expected revision ${expectedRevision}, current ${this.revision}.`, { recoverable: true });
    }
    const errors = this.validatePatch(patch);
    const keys = Object.keys(errors);
    if (keys.length) {
      const first = keys[0]!;
      const code: ErrorCode = Object.values(errors).some((m) => m.includes('locked')) ? 'LOCKED' : 'BAD_INPUT';
      const err = new BlockError(code, Object.values(errors).join(' '), {
        input: first, messages: Object.values(errors), recoverable: true,
      });
      this.emit('error', { code, severity: 'warning', input: first, messages: err.details.messages, recoverable: true });
      throw err;
    }
    const prior: Record<string, Value | undefined> = {};
    for (const id of Object.keys(patch)) prior[id] = this.inputs[id];
    this.inputs = { ...this.inputs, ...patch };   // atomic commit
    this.revision += 1;
    this.emit('parameter.changed', { changed: Object.keys(patch), prior, next: { ...patch }, source: 'api', revision: this.revision });
    return this.revision;
  }

  // ---------- calculation ----------
  async calculate(): Promise<BlockResult> {
    this.assertReady();
    const evaluation = this.def.evaluate(this.inputs);
    const outputs: Record<string, Quantity> = {};
    for (const o of this.def.outputs) {
      const e = evaluation.outputs[o.id];
      const { status, rules } = statusForOutput(o.id, evaluation.rules);
      const suppressed = rules.some((r) => r.action === 'suppress' && r.status !== 'within');
      outputs[o.id] = {
        value: suppressed ? null : (e?.value ?? null),
        unit: o.unit,
        status: toContractValidity(status),
        rules: rules.map((r) => r.ruleId),
        origin: e?.origin ?? 'calculated',
      };
    }
    const checks: RuleResult[] = evaluation.rules.map((r) => ({
      ruleId: r.ruleId, status: toContractValidity(r.status), facts: r.facts, reason: r.reason,
      action: r.action, affected: [...r.affected], ...(r.alternative ? { alternative: r.alternative } : {}),
    }));
    const overall = this.overallFrom(evaluation.rules);
    const prev = this.last;
    const result: BlockResult = {
      revision: this.revision, timeSI: 0, outputs, checks,
      extras: { ...evaluation.extras, nullReasons: Object.fromEntries(
        Object.entries(evaluation.outputs).filter(([, v]) => v.value === null && v.reason).map(([k, v]) => [k, v.reason]),
      ) },
      rulesDetail: evaluation.rules, overall,
    };
    this.last = result;
    this.history = [...this.history, result].slice(-HISTORY_LIMIT);
    if (prev && prev.overall !== overall) {
      this.emit('validity.changed', { affected: this.def.outputs.map((o) => o.id), previous: prev.overall, next: overall,
        rules: evaluation.rules.map((r) => r.ruleId) });
    }
    this.emit('calculation.completed', { outputs, validity: overall, revision: this.revision, timeSI: 0 });
    return result;
  }

  getOutputs(): BlockResult {
    this.assertReady();
    if (!this.last) throw new BlockError('NOT_INITIALISED', 'No calculation available.');
    return this.last;
  }

  getModelValidity(): readonly RuleResult[] { return this.getOutputs().checks; }

  private overallFrom(rules: readonly ApplicabilityRule[]): Applicability {
    const ids = this.def.outputs.map((o) => o.id);
    const statuses = ids.map((id) => statusForOutput(id, rules).status);
    const order: Applicability[] = ['outside', 'indeterminate', 'approaching', 'within'];
    return order.find((s) => statuses.includes(s)) ?? 'within';
  }

  // ---------- learning record (pre-reveal predictions etc.) ----------
  recordLearning(key: string, value: unknown): void {
    this.assertReady();
    this.learning = { ...this.learning, [key]: value };
  }
  getLearning(): Readonly<Record<string, unknown>> { return this.learning; }

  /** Host-neutral completion event (SIMULATION_BLOCK_INTERFACE: activity.completed). */
  reportActivityCompleted(activityId: string, version: string, criteria: readonly string[], evidenceRefs: readonly string[]): void {
    this.assertReady();
    this.emit('activity.completed', { activity: activityId, version, criteria: [...criteria], evidence: [...evidenceRefs], timestamp: new Date().toISOString() });
  }

  // ---------- export ----------
  async exportData(format: 'csv' | 'json'): Promise<Blob> {
    const r = this.getOutputs();
    let text: string;
    let rows = 0;
    if (format === 'json') {
      text = JSON.stringify(this.exportObject(r), null, 2);
      rows = Object.keys(r.outputs).length;
    } else {
      const lines = [['kind', 'id', 'value_SI', 'unit', 'status', 'origin', 'rules', 'reason', 'model', 'model_version', 'revision']];
      const reasons = (r.extras['nullReasons'] ?? {}) as Record<string, string>;
      for (const s of this.def.inputs) {
        const v = this.inputs[s.id];
        lines.push(['input', s.id, String(v), s.kind === 'number' ? s.unit : '', '', 'assumed', '', '',
          this.def.simulationId, this.def.modelVersion, String(r.revision)]);
      }
      for (const [id, q] of Object.entries(r.outputs)) {
        const reason = q.value === null ? (reasons[id] ?? r.checks.filter((c) => c.affected.includes(id) && c.action === 'suppress').map((c) => c.reason).join('; ')) : '';
        lines.push(['output', id, q.value === null ? '' : String(q.value), q.unit, q.status, q.origin, q.rules.join(' '),
          reason, this.def.simulationId, this.def.modelVersion, String(r.revision)]);
      }
      rows = lines.length - 1;
      text = lines.map((l) => l.map(csvField).join(',')).join('\r\n') + '\r\n';
    }
    this.emit('data.exported', { kind: format, schemaVersion: this.def.snapshotSchemaVersion, rows, userAction: true });
    return new Blob([text], { type: format === 'json' ? 'application/json' : 'text/csv' });
  }

  exportObject(r: BlockResult = this.getOutputs()): Record<string, unknown> {
    return {
      simulationId: this.def.simulationId, modelVersion: this.def.modelVersion, variant: this.def.variant,
      revision: r.revision, runId: this.runId, unitSystem: 'SI',
      inputs: this.def.inputs.map((s) => ({ id: s.id, value: this.inputs[s.id], unit: s.kind === 'number' ? s.unit : null })),
      outputs: r.outputs, checks: r.checks, extras: r.extras,
    };
  }

  // ---------- snapshots ----------
  saveState(): Snapshot {
    this.assertReady();
    const snap: Snapshot = {
      schemaVersion: this.def.snapshotSchemaVersion,
      modelVersion: this.def.modelVersion,
      scenario: this.scenario!,
      revision: this.revision,
      runId: this.runId,
      timeSI: 0,
      inputs: { ...this.inputs },
      states: {},
      solverVersion: this.def.solverVersion,
      // Noise-free algebraic model: RNG unused; seed recorded per DATA_INTERCHANGE (initial seed 17).
      rng: { algorithm: 'xorshift32-v1', state: 17 },
      assetVersions: { ...this.def.assetVersions, rng: 'unused (noise-free model; seed 17 recorded)' },
      pendingEvents: [],
      externalDataHashes: [],
      history: this.history.map((h) => stripResult(h)),
      learning: JSON.parse(JSON.stringify(this.learning)) as Record<string, unknown>,
    };
    const check = validateSchema('snapshot', snap);
    if (!check.valid) throw new BlockError('INVALID_SNAPSHOT', `Snapshot failed schema: ${check.errors.join('; ')}`);
    return snap;
  }

  async restoreState(snapshot: Snapshot): Promise<void> {
    this.assertNotDisposed();
    const check = validateSchema('snapshot', snapshot);
    if (!check.valid) {
      throw new BlockError('INVALID_SNAPSHOT', `Snapshot failed schema: ${check.errors.join('; ')}`, { messages: check.errors });
    }
    if (snapshot.modelVersion !== this.def.modelVersion) {
      throw new BlockError('INCOMPATIBLE_VERSION', `Snapshot model ${snapshot.modelVersion} ≠ block model ${this.def.modelVersion}.`);
    }
    this.checkScenario(snapshot.scenario);
    // Validate inputs as a complete set against the snapshot's scenario before touching state.
    const prevScenario = this.scenario;
    const prevInputs = this.inputs;
    this.scenario = snapshot.scenario;
    this.inputs = this.defaultInputs(snapshot.scenario);
    const missing = this.def.inputs.filter((s) => !(s.id in snapshot.inputs)).map((s) => s.id);
    const errs = missing.length ? { '*': `Snapshot missing inputs: ${missing.join(', ')}` } : this.validateFull(snapshot.inputs);
    if (Object.keys(errs).length) {
      this.scenario = prevScenario;
      this.inputs = prevInputs;
      throw new BlockError('INVALID_SNAPSHOT', Object.values(errs).join(' '), { messages: Object.values(errs) });
    }
    this.inputs = { ...snapshot.inputs };
    this.revision = snapshot.revision;
    this.runId = snapshot.runId;
    this.learning = JSON.parse(JSON.stringify(snapshot.learning)) as Record<string, unknown>;
    this.history = [];
    if (this.phase === 'new') this.setPhase('ready');
    await this.calculate();
  }

  // ---------- internals ----------
  private validateFull(inputs: Inputs): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [id, value] of Object.entries(inputs)) {
      const spec = this.specs.get(id);
      if (!spec) { errors[id] = `Unknown input "${id}".`; continue; }
      const msg = this.checkValue(spec, value, this.rangeOf(id));
      if (msg) errors[id] = msg;
    }
    if (!Object.keys(errors).length) for (const m of this.def.crossValidate(inputs)) errors['*'] = m;
    const locked = this.scenario?.lockedInputs ?? [];
    for (const id of locked) {
      const init = this.scenario?.initialInputs[id];
      if (init !== undefined && inputs[id] !== init) errors[id] = `${id} is locked by the scenario at ${String(init)}.`;
    }
    return errors;
  }

  private checkValue(spec: InputSpec, value: Value, range: { min: number; max: number } | null): string | null {
    if (spec.kind === 'category') {
      return typeof value === 'string' && spec.options.includes(value)
        ? null : `${spec.label} must be one of: ${spec.options.join(', ')}.`;
    }
    if (typeof value !== 'number') return `${spec.label} must be a number in ${spec.unit}.`;
    if (!Number.isFinite(value)) return `${spec.label} must be a finite number (got ${String(value)}).`;
    if (spec.exclusiveMin !== undefined && value <= spec.exclusiveMin) {
      return `${spec.label} must be greater than ${formatNumber(spec.exclusiveMin)} ${spec.unit}.`;
    }
    if (range && (value < range.min || value > range.max)) {
      return `${spec.label} must be between ${formatNumber(range.min)} and ${formatNumber(range.max)} ${spec.unit} (got ${formatNumber(value)}).`;
    }
    return null;
  }

  private defaultInputs(scenario: Scenario): Record<string, Value> {
    const inputs: Record<string, Value> = {};
    for (const s of this.def.inputs) inputs[s.id] = s.default;
    return { ...inputs, ...scenario.initialInputs };
  }

  private checkScenario(scenario: Scenario): void {
    const v = validateSchema('scenario', scenario);
    if (!v.valid) throw new BlockError('INVALID_SCENARIO', `Scenario failed schema: ${v.errors.join('; ')}`, { messages: v.errors });
    const errs: string[] = [];
    if (scenario.simulationId !== this.def.simulationId) errs.push(`Scenario is for ${scenario.simulationId}, not ${this.def.simulationId}.`);
    if (scenario.modelVersion !== this.def.modelVersion) errs.push(`Scenario pins model ${scenario.modelVersion}; block is ${this.def.modelVersion}.`);
    if (scenario.variant !== this.def.variant) errs.push(`Scenario variant ${scenario.variant} ≠ ${this.def.variant}.`);
    const known = new Set(this.def.inputs.map((s) => s.id));
    const outs = new Set(this.def.outputs.map((o) => o.id));
    for (const id of [...Object.keys(scenario.initialInputs), ...scenario.visibleInputs, ...scenario.lockedInputs, ...Object.keys(scenario.restrictedRanges)]) {
      if (!known.has(id)) errs.push(`Scenario references unknown input "${id}".`);
    }
    for (const id of [...scenario.visibleOutputs, ...Object.keys(scenario.hiddenUntil)]) {
      if (!outs.has(id)) errs.push(`Scenario references unknown output "${id}".`);
    }
    for (const [id, r] of Object.entries(scenario.restrictedRanges)) {
      const s = this.specs.get(id);
      if (s?.kind === 'number' && (r.min > r.max || r.min < s.min || r.max > s.max)) {
        errs.push(`Restricted range for ${id} must lie within ${s.min}–${s.max} ${s.unit}.`);
      }
    }
    if (errs.length) throw new BlockError(errs.some((e) => e.includes('pins model')) ? 'INCOMPATIBLE_VERSION' : 'INVALID_SCENARIO', errs.join(' '), { messages: errs });
    // Initial values must themselves be valid.
    const saved = { scenario: this.scenario, inputs: this.inputs };
    this.scenario = scenario;
    this.inputs = this.defaultInputs(scenario);
    const vErr = this.validateFull(this.inputs);
    this.scenario = saved.scenario;
    this.inputs = saved.inputs;
    if (Object.keys(vErr).length) throw new BlockError('INVALID_SCENARIO', Object.values(vErr).join(' '), { messages: Object.values(vErr) });
  }

  private setPhase(to: Phase): void {
    const from = this.phase;
    this.phase = to;
    if (from !== to && to !== 'disposed') this.emit('simulation.stateChanged', { from, to, timeSI: 0, runId: this.runId });
  }

  private emit(type: EventName, payload: Record<string, unknown>): void {
    const e: BlockEvent = { type, instanceId: this.instanceId, revision: this.revision, timeSI: 0, runId: this.runId, payload };
    for (const l of [...this.listeners]) l(e);
  }

  private assertNotDisposed(): void {
    if (this.phase === 'disposed') throw new BlockError('DISPOSED', 'Block has been disposed.', { recoverable: false });
  }
  private assertReady(): void {
    this.assertNotDisposed();
    if (this.phase === 'new' || !this.scenario) throw new BlockError('NOT_INITIALISED', 'Call initialise(scenario) first.');
  }
  private unsupported(op: string): never {
    this.assertNotDisposed();
    throw new BlockError('UNSUPPORTED', `${op} is not supported by an algebraic block.`, { recoverable: true });
  }
}

function stripResult(r: BlockResult): Result {
  return { revision: r.revision, timeSI: r.timeSI, outputs: r.outputs, checks: r.checks };
}

function csvField(s: string): string {
  // Neutralise spreadsheet formula injection on text fields (WEBSITE_DEPLOYMENT_PLAN).
  let t = s;
  if (/^[=+\-@\t\r]/.test(t) && !/^-?\d/.test(t)) t = `'${t}`;
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

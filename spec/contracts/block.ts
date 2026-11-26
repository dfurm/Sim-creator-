/** Proposed public contract. A reference interface only. Units are canonical SI unless declared categorical. */
export type Value = number | string | boolean;
export type Inputs = Readonly<Record<string, Value>>;
export type Validity = "within" | "approaching" | "outside" | "unknown";
export type Phase = "new" | "ready" | "running" | "paused" | "disposed";
export interface RuleResult {
  ruleId: string; status: Validity; facts: Inputs; reason: string;
  action: "show" | "qualify" | "suppress"; affected: string[]; alternative?: string;
}
export interface Quantity {
  value: number | string | null; unit: string; status: Validity;
  rules: string[]; origin: "calculated" | "assumed" | "measured" | "fitted" | "synthetic";
}
export interface Result {
  revision: number; timeSI: number; outputs: Record<string, Quantity>; checks: RuleResult[];
}
export interface Scenario {
  schemaVersion: string; scenarioId: string; scenarioVersion: string;
  simulationId: string; modelVersion: string; variant: string; initialInputs: Inputs;
  visibleInputs: string[]; lockedInputs: string[]; restrictedRanges: Record<string,{min:number; max:number}>;
  visibleOutputs: string[]; hiddenUntil: Record<string,string>; overlays: {anchor:string; text:string}[];
  predictions: string[]; tasks: string[]; criteria: Criterion[]; objectives: string[]; capture: string[];
}
export type Criterion =
  | { op: "predictionRecorded"; prompt: string }
  | { op: "outputWithin"; output: string; min: number; max: number; unit: string }
  | { op: "explanationRecorded"; prompt: string };
export interface Snapshot {
  schemaVersion: string; modelVersion: string; scenario: Scenario; revision: number; runId: string;
  timeSI: number; inputs: Inputs; states: Readonly<Record<string,number>>; solverVersion: string;
  rng: { algorithm: string; state: number }; assetVersions: Record<string,string>;
  pendingEvents: ReadonlyArray<{at: number; patch: Inputs}>; externalDataHashes: string[];
  history: ReadonlyArray<Result>; learning: Readonly<Record<string,unknown>>;
}
export type EventName = "parameter.changed" | "calculation.completed" | "simulation.stateChanged"
  | "validity.changed" | "error" | "activity.completed" | "data.exported";
export interface BlockEvent { type: EventName; instanceId: string; revision: number; timeSI: number;
  runId: string; payload: Readonly<Record<string,unknown>> }
export interface EducationalBlock {
  initialise(scenario: Scenario): Promise<void>;
  setInputParameters(patch: Inputs, expectedRevision?: number): Promise<number>;
  getInputParameters(): Inputs;
  calculate(): Promise<Result>; getOutputs(): Result; getModelValidity(): readonly RuleResult[];
  start(): Promise<void>; pause(): Promise<void>; reset(): Promise<void>; advanceTimestep(dtSI: number): Promise<Result>;
  loadScenario(scenario: Scenario): Promise<void>; exportData(format: "csv" | "json"): Promise<Blob>;
  saveState(): Snapshot; restoreState(snapshot: Snapshot): Promise<void>; dispose(): void;
  subscribe(listener: (event: BlockEvent)=>void): ()=>void;
}

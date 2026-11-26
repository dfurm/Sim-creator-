import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Scenario, Snapshot } from '../../../spec/contracts/block';
import { BlockError, type AlgebraicBlock, type BlockResult, type NumericInputSpec } from '../core/block';
import { evaluateCriteria } from '../core/criteria';
import { createS02Block, S02_SCENARIOS, S02_ANCHORS } from '../sims/S02/definition';
import { continuity } from '../sims/S02/model';
import metadata from '../sims/S02/metadata.json';
import { full, sig } from '../views/format';
import { NumberControl } from './NumberControl';
import { EquationPanel, LiveRegion, OutputsTable, StatusBanner, type EquationLine, type OutputRow } from './Panels';
import { PlotsView, SceneView } from './Views';

const STORAGE_KEY = 'furmtech.sim.S02.snapshot.v1';
const APP_VERSION = '0.2.0-proto';

const OUTPUT_LABELS: Record<string, { label: string; anchor?: string }> = {
  area1: { label: 'Upstream area A₁', anchor: 'S02/inlet_section' },
  area2: { label: 'Downstream area A₂', anchor: 'S02/throat_area' },
  v1: { label: 'Upstream mean velocity v̄₁', anchor: 'S02/inlet_velocity' },
  v2: { label: 'Downstream mean velocity v̄₂', anchor: 'S02/outlet_velocity' },
  mdot: { label: 'Mass flow ṁ' },
};

type UnitSystem = 'SI' | 'engineering';
const DISPLAY_UNIT: Record<UnitSystem, Record<string, string>> = {
  SI: { Q: 'm³/s', D1: 'm', D2: 'm', vmax: 'm/s' },
  engineering: { Q: 'L/min', D1: 'mm', D2: 'mm', vmax: 'm/s' },
};

function scenarioKey(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('scenario');
    return q && q in S02_SCENARIOS ? q : 'default';
  } catch { return 'default'; }
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function App() {
  const blockRef = useRef<AlgebraicBlock | null>(null);
  const [scKey] = useState(scenarioKey);
  const scenario: Scenario = S02_SCENARIOS[scKey]!;
  const [result, setResult] = useState<BlockResult | null>(null);
  const [inputs, setInputs] = useState<Record<string, number | string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<UnitSystem>('engineering');
  const [active, setActive] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const [notice, setNotice] = useState('');
  const [learning, setLearning] = useState<Record<string, unknown>>({});
  const [predDraft, setPredDraft] = useState('');
  const [explDraft, setExplDraft] = useState('');
  const [fatal, setFatal] = useState<string | null>(null);

  const sync = useCallback((b: AlgebraicBlock, announce?: string) => {
    const r = b.getOutputs();
    setResult(r);
    setInputs({ ...b.getInputParameters() });
    setLearning({ ...b.getLearning() });
    if (announce) setLive(announce);
  }, []);

  useEffect(() => {
    const b = createS02Block('S02-standalone');
    blockRef.current = b;
    b.initialise(scenario).then(() => sync(b)).catch((e: unknown) => setFatal(String(e)));
    return () => b.dispose();
  }, [scenario, sync]);

  const commit = useCallback(async (patch: Record<string, number | string>) => {
    const b = blockRef.current;
    if (!b) return;
    try {
      await b.setInputParameters(patch);
      const r = await b.calculate();
      setErrors((e) => { const n = { ...e }; for (const k of Object.keys(patch)) delete n[k]; delete n['*']; return n; });
      const v2 = r.outputs['v2']!.value;
      sync(b, `Revision ${r.revision}: v̄₁ ${sig(r.outputs['v1']!.value as number)} m/s, v̄₂ ${typeof v2 === 'number' ? sig(v2) + ' m/s' : 'not shown'}.`);
    } catch (e) {
      if (e instanceof BlockError) {
        const id = e.details.input ?? '*';
        setErrors((er) => ({ ...er, [id]: e.message }));
        setLive(`Not applied: ${e.message}`);
      } else throw e;
    }
  }, [sync]);

  const hiddenOutputs = useMemo(() => new Set(Object.entries(scenario.hiddenUntil)
    .filter(([, prompt]) => learning[prompt] === undefined).map(([id]) => id)), [scenario, learning]);

  if (fatal) return <main><p role="alert">Could not start: {fatal}</p></main>;
  if (!result || !blockRef.current) return <main><p>Loading S02…</p></main>;
  const b = blockRef.current;

  const mode = inputs['mode'] as string;
  const num = (id: string) => inputs[id] as number;
  const Q = num('Q'), D1 = num('D1');
  const extras = result.extras as { D2used: number | null; design?: { Dmin: number; feasible: number[]; selected: number | null; vAtSelected: number | null; status: string } };
  const D2shown = extras.D2used ?? num('D2');
  const o = result.outputs;
  const val = (id: string) => (typeof o[id]!.value === 'number' ? (o[id]!.value as number) : null);
  const reasons = (result.extras['nullReasons'] ?? {}) as Record<string, string>;
  const suppressedReason = result.rulesDetail.find((r) => r.action === 'suppress' && r.status !== 'within')?.reason;
  const locked = b.lockedInputs();
  const visible = new Set(scenario.visibleInputs);

  const rows: OutputRow[] = b.def.outputs.map((d) => ({
    id: d.id, label: OUTPUT_LABELS[d.id]!.label, q: o[d.id]!, hidden: hiddenOutputs.has(d.id),
    ...(OUTPUT_LABELS[d.id]!.anchor ? { anchor: OUTPUT_LABELS[d.id]!.anchor! } : {}),
    ...(reasons[d.id] || suppressedReason ? { reason: reasons[d.id] ?? suppressedReason! } : {}),
  }));

  const a1 = val('area1')!, a2 = val('area2'), v1 = val('v1')!, v2 = val('v2');
  const v2Hidden = hiddenOutputs.has('v2');
  const eq: EquationLine[] = [
    { id: 'A1', anchor: 'S02/inlet_section', tex: `A_1 = \\frac{\\pi D_1^2}{4} = \\frac{\\pi\\,(${full(D1)}\\,\\text{m})^2}{4} = ${sig(a1)}\\ \\text{m}^2`,
      text: `A1 equals pi times D1 squared over 4 equals pi times ${D1} metres squared over 4 equals ${sig(a1)} square metres` },
    { id: 'A2', anchor: 'S02/throat_area', tex: a2 === null ? `A_2 = \\frac{\\pi D_2^2}{4}\\ \\text{(suppressed)}` : `A_2 = \\frac{\\pi\\,(${full(D2shown)}\\,\\text{m})^2}{4} = ${sig(a2)}\\ \\text{m}^2`,
      text: a2 === null ? 'A2 suppressed' : `A2 equals pi times ${D2shown} metres squared over 4 equals ${sig(a2)} square metres` },
    { id: 'v1', anchor: 'S02/inlet_velocity', tex: `\\bar v_1 = \\frac{Q}{A_1} = \\frac{${full(Q)}\\ \\text{m}^3/\\text{s}}{${sig(a1, 6)}\\ \\text{m}^2} = ${sig(v1)}\\ \\text{m/s}`,
      text: `v1 equals Q over A1 equals ${Q} cubic metres per second over ${sig(a1, 6)} square metres equals ${sig(v1)} metres per second` },
    { id: 'v2', anchor: 'S02/outlet_velocity', tex: v2Hidden ? `\\bar v_2 = \\frac{Q}{A_2} = \\;?` : v2 === null || a2 === null ? `\\bar v_2\\ \\text{(suppressed)}` : `\\bar v_2 = \\frac{Q}{A_2} = \\frac{${full(Q)}\\ \\text{m}^3/\\text{s}}{${sig(a2, 6)}\\ \\text{m}^2} = ${sig(v2)}\\ \\text{m/s}`,
      text: v2Hidden ? 'v2 equals Q over A2; hidden until you record a prediction' : v2 === null ? 'v2 suppressed' : `v2 equals Q over A2 equals ${sig(v2)} metres per second` },
    { id: 'mdot', tex: `\\dot m = \\rho Q = 1000\\ \\text{kg/m}^3 \\times ${full(Q)}\\ \\text{m}^3/\\text{s} = ${sig(val('mdot')!)}\\ \\text{kg/s}`,
      text: `m dot equals rho Q equals 1000 kilograms per cubic metre times ${Q} cubic metres per second equals ${sig(val('mdot')!)} kilograms per second` },
  ];
  if (!v2Hidden && v2 !== null) {
    eq.push({ id: 'ratio', tex: `\\frac{\\bar v_2}{\\bar v_1} = \\left(\\frac{D_1}{D_2}\\right)^2 = ${sig(v2 / v1, 4)}`, text: `v2 over v1 equals D1 over D2 squared equals ${sig(v2 / v1, 4)}` });
  }

  const curve = Array.from({ length: 91 }, (_, i) => { const mm = 10 + i; return { x: mm, y: continuity({ Q, D1, D2: mm / 1000 }).v2 }; });
  const sceneData = {
    revision: result.revision, Q, D1, D2: D2shown, area1: a1, area2: a2, v1, v2, v2Hidden,
    ...(suppressedReason ? { suppressedReason } : {}),
  };

  const crit = evaluateCriteria(scenario.criteria, result, learning);
  const predPrompt = scenario.predictions[0] ?? 'predict-halve-D2';
  const explPrompt = 'explain-halve-D2';
  const pred = learning[predPrompt] as { factor: number; revision: number; D2: number; v2: number | null } | undefined;
  const halved = pred && Math.abs(num('D2') - pred.D2 / 2) < 1e-12 && mode === 'fixedThroughput';
  const observedFactor = halved && pred && pred.v2 && v2 ? v2 / pred.v2 : null;

  const recordPrediction = () => {
    const f = Number(predDraft.trim());
    if (!Number.isFinite(f) || f <= 0) { setErrors((e) => ({ ...e, prediction: 'Enter a positive number for the factor.' })); return; }
    const vNow = typeof o['v2']!.value === 'number' ? (o['v2']!.value as number) : null;
    b.recordLearning(predPrompt, { factor: f, revision: result.revision, D2: num('D2'), v2: vNow, at: new Date().toISOString() });
    setErrors((e) => { const n = { ...e }; delete n['prediction']; return n; });
    sync(b, `Prediction recorded: factor ${f}.`);
  };
  const recordExplanation = () => {
    if (!explDraft.trim()) return;
    b.recordLearning(explPrompt, { text: explDraft.trim(), revision: result.revision, at: new Date().toISOString() });
    sync(b, 'Explanation recorded.');
    const after = evaluateCriteria(scenario.criteria, b.getOutputs(), b.getLearning());
    if (after.every((c) => c.met)) b.reportActivityCompleted(`activity.S02.investigate`, scenario.scenarioVersion, after.map((c) => c.criterion.op), [predPrompt, explPrompt]);
  };

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b.saveState())); setNotice(`Saved revision ${result.revision} in this browser.`); }
    catch (e) { setNotice(`Could not save in this browser (${String(e)}). Use “Download snapshot” instead.`); }
  };
  const restoreFrom = async (snap: Snapshot, label: string) => {
    try { await b.restoreState(snap); setErrors({}); sync(b, `Restored ${label}, revision ${b.getRevision()}.`); setNotice(`Restored ${label} (revision ${b.getRevision()}).`); }
    catch (e) { setNotice(`Restore failed: ${e instanceof Error ? e.message : String(e)}`); }
  };
  const restoreLocal = () => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* storage blocked */ }
    if (!raw) { setNotice('No saved state found in this browser.'); return; }
    try { void restoreFrom(JSON.parse(raw) as Snapshot, 'browser save'); } catch { setNotice('Saved state is not valid JSON.'); }
  };
  const loadFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1_000_000) { setNotice('Snapshot file is larger than 1 MB; not loaded.'); return; }
    f.text().then((t) => restoreFrom(JSON.parse(t) as Snapshot, f.name)).catch(() => setNotice('File is not valid snapshot JSON.'));
  };

  const numericSpecs = b.getInputSpecs().filter((s): s is NumericInputSpec => s.kind === 'number');
  const shownSpecs = numericSpecs.filter((s) => visible.has(s.id) && !(s.id === 'vmax' && mode !== 'boreDesign'));

  return (
    <div className="page">
      <header className="masthead">
        <p className="kicker">Furmtech Simulation Library · prototype {APP_VERSION} · not reviewed for release</p>
        <h1>S02 · Continuity through a contraction</h1>
        <p className="objective">{scenario.objectives[0]}</p>
        <nav aria-label="Scenarios" className="scenario-nav">
          <a href="?scenario=default" aria-current={scKey === 'default' ? 'page' : undefined}>Explore and design</a>
          <a href="?scenario=investigate" aria-current={scKey === 'investigate' ? 'page' : undefined}>Guided investigation: halve D₂</a>
        </nav>
      </header>
      <LiveRegion message={live} />
      <main className="layout">
        <div className="col-main">
          <StatusBanner overall={result.overall} rules={result.rulesDetail} revision={result.revision} />
          <SceneView data={sceneData} active={active} onActivate={setActive} />
          <section className="card" aria-labelledby="out-title">
            <h2 id="out-title" className="sr-only">Outputs</h2>
            <OutputsTable rows={rows} revision={result.revision} active={active} onActivate={setActive} />
          </section>
          <EquationPanel lines={eq} revision={result.revision} active={active} onActivate={setActive} />
          <PlotsView v1={v1} v2={v2Hidden ? null : v2} curve={curve} current={v2Hidden || v2 === null ? null : { x: +(D2shown * 1000).toPrecision(10), y: v2 }} revision={result.revision} />
        </div>
        <aside className="col-side">
          <section className="card" aria-labelledby="ctl-title">
            <h2 id="ctl-title">Controls</h2>
            {visible.has('mode') && (
              <fieldset className="mode" disabled={locked.includes('mode')}>
                <legend>Mode</legend>
                {[['fixedThroughput', 'Fixed throughput (choose D₂)'], ['boreDesign', 'Bore design (D₂ from a velocity cap)']].map(([m, label]) => (
                  <label key={m}><input type="radio" name="mode" value={m} checked={mode === m} onChange={() => void commit({ mode: m! })} /> {label}</label>
                ))}
              </fieldset>
            )}
            <fieldset className="units">
              <legend>Display units</legend>
              <label><input type="radio" name="units" checked={units === 'engineering'} onChange={() => setUnits('engineering')} /> L/min and mm</label>
              <label><input type="radio" name="units" checked={units === 'SI'} onChange={() => setUnits('SI')} /> SI (m³/s, m)</label>
            </fieldset>
            {shownSpecs.map((s) => {
              const isLocked = locked.includes(s.id);
              return (
                <NumberControl key={s.id} spec={s} valueSI={s.id === 'D2' && mode === 'boreDesign' && extras.D2used !== null ? (extras.D2used ?? num('D2')) : num(s.id)}
                  range={b.rangeOf(s.id)!} displayUnit={DISPLAY_UNIT[units][s.id] ?? s.unit} locked={isLocked}
                  lockedReason={s.id === 'D2' && mode === 'boreDesign' ? 'Derived in bore-design mode: smallest feasible bore is shown.' : 'Locked by this scenario.'}
                  {...(errors[s.id] ? { error: errors[s.id]! } : {})}
                  onCommit={(v) => void commit({ [s.id]: v })}
                  onInvalidEntry={(m) => { setErrors((e) => ({ ...e, [s.id]: m })); setLive(`Not applied: ${m}`); }} />
              );
            })}
            {errors['*'] && <p className="field-error" role="alert">⚠ {errors['*']}</p>}
            <p className="hint">Density is fixed at 1000 kg/m³ (water, stipulated). Inputs are stored in SI; display units are converted on screen only.</p>
          </section>

          {mode === 'boreDesign' && extras.design && (
            <section className="card" aria-labelledby="design-title" data-testid="design-panel">
              <h2 id="design-title">Bore design</h2>
              <p>Minimum bore D<sub>min</sub> = √(4Q/(π v<sub>max</sub>)) = <strong data-testid="dmin">{sig(extras.design.Dmin * 1000, 4)} mm</strong></p>
              {extras.design.status === 'infeasible' ? (
                <p className="status status-outside"><span aria-hidden="true">⛔</span> No bore in the 10–100 mm teaching range meets the cap.</p>
              ) : (
                <>
                  <p>Selected (smallest feasible): <strong data-testid="selected-bore">{Math.round(extras.design.selected! * 1000)} mm</strong>. Check by forward substitution: v̄₂ = {sig(extras.design.vAtSelected!, 4)} m/s ≤ {sig(num('vmax'))} m/s <span aria-hidden="true">✓</span></p>
                  <p>Feasible bores: {Math.round(extras.design.feasible[0]! * 1000)}–{Math.round(extras.design.feasible[extras.design.feasible.length - 1]! * 1000)} mm ({extras.design.feasible.length} bores in 1 mm steps){extras.design.status === 'all-feasible' ? ' — every bore in range already meets the cap' : ''}.</p>
                </>
              )}
              <p className="hint">Bores come from the teaching control grid (10–100 mm, 1 mm), not a supplier catalogue. Holding Q fixed is an assumption: on a real pump a smaller bore usually reduces Q.</p>
            </section>
          )}

          {mode === 'fixedThroughput' && (
            <section className="card" aria-labelledby="pred-title" data-testid="prediction-panel">
              <h2 id="pred-title">Investigate: predict, then halve D₂</h2>
              {!pred ? (
                <>
                  <label htmlFor="pred-in">If D₂ is halved at fixed Q, by what factor will v̄₂ change?</label>
                  <div className="control-row">
                    <input id="pred-in" type="text" inputMode="decimal" value={predDraft} onChange={(e) => setPredDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') recordPrediction(); }} aria-describedby={errors['prediction'] ? 'pred-err' : undefined} />
                    <button type="button" onClick={recordPrediction}>Record prediction</button>
                  </div>
                  {errors['prediction'] && <p id="pred-err" className="field-error" role="alert">⚠ {errors['prediction']}</p>}
                </>
              ) : (
                <>
                  <p>Your prediction: ×{pred.factor} (recorded at revision {pred.revision}, D₂ = {sig(pred.D2 * 1000)} mm).</p>
                  {!halved ? (
                    <button type="button" onClick={() => void commit({ D2: +(pred.D2 / 2).toPrecision(12) })} disabled={locked.includes('D2') || pred.D2 / 2 < b.rangeOf('D2')!.min}>
                      Halve D₂ to {sig(pred.D2 * 500)} mm
                    </button>
                  ) : observedFactor !== null && (
                    <div data-testid="pred-feedback">
                      <p>Calculated factor: <strong>×{sig(observedFactor, 4)}</strong>. {Math.abs(pred.factor - 4) < 0.05
                        ? 'Your prediction matches: area scales with D², so halving D quarters the area.'
                        : Math.abs(pred.factor - 2) < 0.05 ? 'A twofold prediction misses the square in the area; the correct factor is four.'
                          : 'Velocity scales with 1/A and A with D², so halving D₂ gives a factor of four.'}</p>
                      <label htmlFor="expl-in">Explain the factor in one or two sentences:</label>
                      <textarea id="expl-in" rows={3} value={explDraft} onChange={(e) => setExplDraft(e.target.value)} />
                      <button type="button" onClick={recordExplanation}>Record explanation</button>
                    </div>
                  )}
                </>
              )}
              <ul className="criteria" aria-label="Activity criteria">
                {crit.map((c, i) => <li key={i}><span aria-hidden="true">{c.met ? '✓' : '○'}</span> {c.met ? 'Done' : 'To do'}: {c.detail}</li>)}
              </ul>
            </section>
          )}

          <section className="card" aria-labelledby="state-title">
            <h2 id="state-title">State and export</h2>
            <div className="buttons">
              <button type="button" onClick={save}>Save in this browser</button>
              <button type="button" onClick={restoreLocal}>Restore browser save</button>
              <button type="button" onClick={() => download(`S02-snapshot-r${result.revision}.json`, new Blob([JSON.stringify(b.saveState(), null, 2)], { type: 'application/json' }))}>Download snapshot</button>
              <label className="file-btn">Load snapshot file <input type="file" accept="application/json,.json" onChange={(e) => loadFile(e.target.files?.[0])} /></label>
              <button type="button" onClick={() => void b.exportData('csv').then((bl) => download(`S02-r${result.revision}.csv`, bl))}>Export CSV</button>
              <button type="button" onClick={() => void b.exportData('json').then((bl) => download(`S02-r${result.revision}.json`, bl))}>Export JSON</button>
              <button type="button" onClick={() => void b.reset().then(() => { setErrors({}); setPredDraft(''); setExplDraft(''); sync(b, 'Reset to scenario defaults.'); })}>Reset</button>
            </div>
            {notice && <p role="status" data-testid="notice">{notice}</p>}
            <p className="hint">State stays in this browser or in files you download. Nothing is sent over the network.</p>
          </section>

          <section className="card" aria-labelledby="assume-title">
            <h2 id="assume-title">Assumptions and provenance</h2>
            <ul className="rules">
              {result.rulesDetail.map((r) => <li key={r.ruleId}><span aria-hidden="true">{r.status === 'within' ? '✓' : r.status === 'outside' ? '⛔' : r.status === 'approaching' ? '▲' : '?'}</span> <code>{r.ruleId}</code> ({r.basis}, {r.kind}): {r.reason}</li>)}
            </ul>
            <details>
              <summary>Curriculum mapping (proposed, not reviewed)</summary>
              <ul>
                {metadata.activities.map((a) => (
                  <li key={a.id}><code>{a.id}</code> · Bloom: {a.bloom} · EA Stage 1: {a.eaStage1.map((m) => `${m.code} ${m.label}`).join('; ')} · NCSE 2026: {a.ncse2026.map((m) => `${m.code} ${m.label}`).join('; ')} · Evidence: {a.evidenceType}</li>
                ))}
              </ul>
              <p>Fidelity: {metadata.fidelity.specFCodes.join(', ')} · {metadata.fidelity.modelForm} · {metadata.fidelity.solutionMethod} · data: {metadata.fidelity.dataDependency}. All equations and references: unverified.</p>
            </details>
            <p className="hint">Source: US DOE Fundamentals Handbook, Fluid Flow (DOE-HDBK-1012/3-92). Original diagram. Model {b.def.modelVersion}, scenario {scenario.scenarioId}@{scenario.scenarioVersion}. Anchors: {S02_ANCHORS.all().map((a) => a.id).join(', ')}.</p>
          </section>
        </aside>
      </main>
    </div>
  );
}

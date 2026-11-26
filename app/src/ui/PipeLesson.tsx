import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Scenario, Snapshot } from '../../../spec/contracts/block';
import { BlockError, type AlgebraicBlock, type BlockResult, type NumericInputSpec } from '../core/block';
import { evaluateCriteria } from '../core/criteria';
import { createPipeBlock, PIPE_FIXED, PIPE_SCENARIOS } from '../sims/pipe/definition';
import { markItem, type AssessmentItem, type ItemResponse } from '../sims/pipe/assessment';
import metadata from '../sims/pipe/metadata.json';
import type { StationHeads } from '../sims/pipe/model';
import { full, sig } from '../views/format';
import { renderBudget, renderGradeLines, renderPipeScene, describePipe, type PipeViewData } from '../views/pipeViews';
import { NumberControl } from './NumberControl';
import { EquationPanel, LiveRegion, OutputsTable, StatusBanner, type EquationLine, type OutputRow } from './Panels';

const STORAGE_KEY = 'furmtech.sim.pipe.snapshot.v1';
type TaskKey = 'explore' | 'a' | 'b' | 'c';
const TASK_INDEX: Record<string, number> = { a: 0, b: 1, c: 2 };

const LABELS: Record<string, { label: string; anchor?: string }> = {
  v1: { label: 'Mean velocity v̄₁', anchor: 'S04/velocity_head' }, v2: { label: 'Mean velocity v̄₂ = v̄₃', anchor: 'S04/velocity_head' },
  Re1: { label: 'Reynolds number Re₁ (information)' }, Re2: { label: 'Reynolds number Re₂ (friction run)', anchor: 'S07/characteristic_length' },
  regime: { label: 'Regime in the run (S08 convention)', anchor: 'S08/friction_point' }, rel_rough: { label: 'Relative roughness ε/D₂', anchor: 'S08/roughness_ratio' },
  darcy_f: { label: 'Darcy friction factor f', anchor: 'S08/friction_point' }, h_K: { label: 'Contraction loss head h_K', anchor: 'S04/loss_head' },
  h_f: { label: 'Friction loss head h_f', anchor: 'S08/friction_point' }, p2: { label: 'Pressure p₂ (lossy, absolute)', anchor: 'S04/throat_pressure' },
  p3: { label: 'Pressure p₃ (lossy, absolute)', anchor: 'S04/outlet_pressure' }, p2_ideal: { label: 'Pressure p₂ (ideal, absolute)' },
  p3_ideal: { label: 'Pressure p₃ (ideal, absolute)' }, H1: { label: 'Total head H₁', anchor: 'S04/inlet_pressure' },
  H2: { label: 'Total head H₂ (lossy)' }, H3: { label: 'Total head H₃ (lossy)' }, residual: { label: 'Head-balance residual H₁ − H₃ − h_K − h_f' },
};

type UnitSystem = 'engineering' | 'SI';
const DISPLAY: Record<UnitSystem, Record<string, string>> = {
  engineering: { Q: 'L/min', D1: 'mm', D2: 'mm', dz: 'm', L: 'm', eps: 'mm', rho: 'kg/m³', mu: 'mPa·s', p1: 'kPa', K: '1' },
  SI: { Q: 'm³/s', D1: 'm', D2: 'm', dz: 'm', L: 'm', eps: 'm', rho: 'kg/m³', mu: 'Pa·s', p1: 'Pa', K: '1' },
};

function taskKey(): TaskKey {
  try {
    const t = new URLSearchParams(window.location.search).get('task');
    return t === 'a' || t === 'b' || t === 'c' ? t : 'explore';
  } catch { return 'explore'; }
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SvgView({ render, testId, deps }: { render: (svg: SVGSVGElement) => void; testId: string; deps: unknown[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const key = JSON.stringify(deps);
  useEffect(() => { if (ref.current) render(ref.current); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <svg ref={ref} data-testid={testId} />;
}

export function PipeLesson() {
  const [task] = useState<TaskKey>(taskKey);
  const scenario: Scenario = PIPE_SCENARIOS[task]!;
  const meta = task === 'explore' ? null : metadata.tasks[TASK_INDEX[task]!]!;
  const blockRef = useRef<AlgebraicBlock | null>(null);
  const [result, setResult] = useState<BlockResult | null>(null);
  const [inputs, setInputs] = useState<Record<string, number | string | boolean>>({});
  const [learning, setLearning] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<UnitSystem>('engineering');
  const [active, setActive] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState<string | null>(null);

  const sync = useCallback((b: AlgebraicBlock, msg?: string) => {
    setResult(b.getOutputs());
    setInputs({ ...b.getInputParameters() });
    setLearning({ ...b.getLearning() });
    if (msg) setLive(msg);
  }, []);

  useEffect(() => {
    const b = createPipeBlock('pipe-standalone');
    blockRef.current = b;
    b.initialise(scenario).then(() => sync(b)).catch((e: unknown) => setFatal(String(e)));
    return () => b.dispose();
  }, [scenario, sync]);

  // Task (c): log when the friction prediction is first withdrawn after the prediction was recorded.
  useEffect(() => {
    const b = blockRef.current;
    if (!b || !result || task !== 'c' || learning['predict-c'] === undefined || learning['limit-reached'] !== undefined) return;
    if (result.outputs['darcy_f']!.status === 'outside') {
      b.recordLearning('limit-reached', { revision: result.revision, regime: result.outputs['regime']!.value, Re2: result.outputs['Re2']!.value,
        relRough: result.outputs['rel_rough']!.value, inputs: b.getInputParameters(), at: new Date().toISOString() });
      sync(b, 'Applicability limit reached and logged.');
    }
  }, [result, learning, task, sync]);

  const commit = useCallback(async (patch: Record<string, number | string>) => {
    const b = blockRef.current;
    if (!b) return;
    try {
      await b.setInputParameters(patch);
      const r = await b.calculate();
      setErrors((e) => { const n = { ...e }; for (const k of Object.keys(patch)) delete n[k]; delete n['*']; return n; });
      const f = r.outputs['darcy_f']!.value;
      sync(b, `Revision ${r.revision}: Re₂ ${sig(r.outputs['Re2']!.value as number)}, ${String(r.outputs['regime']!.value)}, friction factor ${typeof f === 'number' ? sig(f, 3) : 'not available'}.`);
    } catch (e) {
      if (e instanceof BlockError) { setErrors((er) => ({ ...er, [e.details.input ?? '*']: e.message })); setLive(`Not applied: ${e.message}`); }
      else throw e;
    }
  }, [sync]);

  const hidden = useMemo(() => new Set(Object.entries(scenario.hiddenUntil).filter(([, p]) => learning[p] === undefined).map(([id]) => id)), [scenario, learning]);

  if (fatal) return <main className="page"><p role="alert">Could not start: {fatal}</p></main>;
  if (!result || !blockRef.current) return <main className="page"><p>Loading pipe lesson…</p></main>;
  const b = blockRef.current;
  const o = result.outputs;
  const val = (id: string) => (typeof o[id]!.value === 'number' ? (o[id]!.value as number) : null);
  const ex = result.extras as { stations: { lossy: StationHeads[]; ideal: StationHeads[] }; budget: PipeViewData['budget']; friction: { method: string } };
  const num = (id: string) => inputs[id] as number;
  const locked = b.lockedInputs();
  const frictionRule = result.rulesDetail.find((r) => r.ruleId === 'S08.R1.regime');
  const hiddenStations = [2, 3].filter((n) => hidden.has(`p${n}`));
  const hideLosses = hidden.has('h_f') || hidden.has('h_K');

  const viewData: PipeViewData = {
    revision: result.revision, D1: num('D1'), D2: num('D2'), L: num('L'), dz: num('dz'), eps: num('eps'), K: num('K'), Q: num('Q'),
    v1: val('v1')!, v2: hidden.has('v2') ? NaN : val('v2')!, Re2: val('Re2')!, regime: String(o['regime']!.value), f: hidden.has('darcy_f') ? null : val('darcy_f'),
    lossy: ex.stations.lossy, ideal: hiddenStations.length && hidden.has('p2_ideal') ? ex.stations.ideal.map((s, i) => (i === 0 ? s : { ...s, p: null, pressureHead: null, totalHead: null })) : ex.stations.ideal,
    budget: ex.budget, hiddenStations,
    ...(frictionRule && frictionRule.status !== 'within' ? { frictionReason: frictionRule.reason } : {}),
  };

  const rows: OutputRow[] = b.def.outputs.map((d) => ({
    id: d.id, label: LABELS[d.id]!.label, q: o[d.id]!, hidden: hidden.has(d.id),
    ...(LABELS[d.id]!.anchor ? { anchor: LABELS[d.id]!.anchor! } : {}),
    ...(o[d.id]!.value === null ? { reason: result.rulesDetail.filter((r) => r.affected.includes(d.id) && r.status !== 'within').map((r) => r.reason).join(' ') || 'not available' } : {}),
  }));

  const g = 9.80665;
  const fmt = (x: number | null, d = 4) => (x === null ? '?' : sig(x, d));
  const eq: EquationLine[] = [
    { id: 'v2', anchor: 'S04/velocity_head', tex: hidden.has('v2') ? '\\bar v_2 = \\frac{4Q}{\\pi D_2^2} = \\;?' : `\\bar v_2 = \\frac{4Q}{\\pi D_2^2} = \\frac{4 \\times ${full(num('Q'))}}{\\pi \\times ${full(num('D2'))}^2} = ${fmt(val('v2'))}\\ \\text{m/s}`,
      text: hidden.has('v2') ? 'v2 equals 4 Q over pi D2 squared; hidden until prediction' : `v2 equals 4 Q over pi D2 squared equals ${fmt(val('v2'))} metres per second` },
    { id: 'Re2', anchor: 'S07/characteristic_length', tex: `Re_2 = \\frac{\\rho \\bar v_2 D_2}{\\mu} = ${fmt(val('Re2'), 5)}\\ \\ (\\text{${String(o['regime']!.value)}})`,
      text: `Re2 equals rho v2 D2 over mu equals ${fmt(val('Re2'), 5)}, ${String(o['regime']!.value)}` },
    { id: 'hK', anchor: 'S04/loss_head', tex: hidden.has('h_K') ? 'h_K = K\\,\\frac{\\bar v_2^2}{2g} = \\;?' : `h_K = K\\,\\frac{\\bar v_2^2}{2g} = ${full(num('K'))} \\times ${fmt(val('v2') === null ? null : (val('v2')! ** 2) / (2 * g))} = ${fmt(val('h_K'))}\\ \\text{m}`,
      text: hidden.has('h_K') ? 'h K hidden until prediction' : `h K equals K times v2 squared over 2 g equals ${fmt(val('h_K'))} metres` },
    { id: 'f', anchor: 'S08/friction_point', tex: hidden.has('darcy_f') ? 'f = \\;?' : val('darcy_f') === null ? `f\\ \\text{not available: ${String(o['regime']!.value)}}` : ex.friction.method === 'laminar-64/Re' ? `f = \\frac{64}{Re_2} = ${fmt(val('darcy_f'))}` : `\\frac{1}{\\sqrt f} = -2\\log_{10}\\!\\left[\\frac{\\varepsilon}{3.7D_2} + \\frac{2.51}{Re_2\\sqrt f}\\right] \\Rightarrow f = ${fmt(val('darcy_f'))}`,
      text: hidden.has('darcy_f') ? 'f hidden until prediction' : val('darcy_f') === null ? `friction factor not available, ${String(o['regime']!.value)}` : `Darcy friction factor f equals ${fmt(val('darcy_f'))} by ${ex.friction.method}` },
    { id: 'hf', anchor: 'S08/friction_point', tex: hidden.has('h_f') ? 'h_f = f\\,\\frac{L}{D_2}\\frac{\\bar v_2^2}{2g} = \\;?' : val('h_f') === null ? 'h_f\\ \\text{not available}' : `h_f = f\\,\\frac{L}{D_2}\\frac{\\bar v_2^2}{2g} = ${fmt(val('h_f'))}\\ \\text{m}`,
      text: hidden.has('h_f') ? 'h f hidden until prediction' : val('h_f') === null ? 'h f not available' : `h f equals f L over D2 times v2 squared over 2 g equals ${fmt(val('h_f'))} metres` },
    { id: 'p3', anchor: 'S04/outlet_pressure', tex: hidden.has('p3') ? 'p_3 = p_1 + \\tfrac{\\rho}{2}(\\bar v_1^2 - \\bar v_2^2) - \\rho g\\,(z_3 + h_K + h_f) = \\;?' : `p_3 = p_1 + \\tfrac{\\rho}{2}(\\bar v_1^2 - \\bar v_2^2) - \\rho g\\,(z_3 + h_K + h_f) = ${val('p3') === null ? '\\text{not available}' : `${fmt(val('p3')! / 1000, 5)}\\ \\text{kPa}`}`,
      text: hidden.has('p3') ? 'p3 hidden until prediction' : `p3 equals p1 plus rho over 2 times v1 squared minus v2 squared, minus rho g times z3 plus h K plus h f, equals ${val('p3') === null ? 'not available' : `${fmt(val('p3')! / 1000, 5)} kilopascals`}` },
  ];

  // Prediction and assessment
  const pred = meta ? (learning[meta.prediction.prompt] as Record<string, unknown> | undefined) : undefined;
  const explPrompt = meta ? `explain-${task}` : '';
  const recordPrediction = () => {
    if (!meta) return;
    const values: Record<string, number | string> = {};
    for (const f of meta.prediction.fields) {
      const raw = (drafts[f.id] ?? '').trim();
      if (f.unit === 'choice') {
        if (!raw) { setErrors((e) => ({ ...e, prediction: `Choose an answer for: ${f.label}.` })); return; }
        values[f.id] = raw;
      } else {
        const x = Number(raw.replace(',', '.'));
        if (raw === '' || !Number.isFinite(x)) { setErrors((e) => ({ ...e, prediction: `Enter a number for: ${f.label} [${f.unit}].` })); return; }
        values[f.id] = x;
      }
    }
    b.recordLearning(meta.prediction.prompt, { ...values, units: Object.fromEntries(meta.prediction.fields.map((f) => [f.id, f.unit])), revision: result.revision, inputs: b.getInputParameters(), at: new Date().toISOString() });
    setErrors((e) => { const n = { ...e }; delete n['prediction']; return n; });
    sync(b, 'Prediction recorded. Hidden results are now shown.');
  };
  const checkItem = (item: AssessmentItem) => {
    const resp = responses[item.id] ?? '';
    const r: ItemResponse = markItem(item, item.type === 'numeric' ? resp : resp, b.getInputParameters(), b.getOutputs());
    b.recordLearning(`item-${item.id}`, { ...r, revision: result.revision, at: new Date().toISOString() });
    sync(b, `${item.id}: ${r.correct ? 'correct' : 'not correct'}. ${r.feedback}`);
  };
  const recordExplanation = () => {
    const t = (drafts['explanation'] ?? '').trim();
    if (!t) { setErrors((e) => ({ ...e, explanation: 'Write a sentence or two first.' })); return; }
    b.recordLearning(explPrompt, { text: t, revision: result.revision, at: new Date().toISOString() });
    setErrors((e) => { const n = { ...e }; delete n['explanation']; return n; });
    sync(b, 'Explanation recorded.');
    const crit = evaluateCriteria(scenario.criteria, b.getOutputs(), b.getLearning());
    if (meta && crit.every((c) => c.met)) b.reportActivityCompleted(meta.id, scenario.scenarioVersion, crit.map((c) => c.criterion.op), Object.keys(b.getLearning()));
  };
  const crit = evaluateCriteria(scenario.criteria, result, learning);

  const save = () => {
    try { localStorage.setItem(`${STORAGE_KEY}.${task}`, JSON.stringify(b.saveState())); setNotice(`Saved revision ${result.revision} in this browser.`); }
    catch (e) { setNotice(`Could not save in this browser (${String(e)}). Use “Download snapshot”.`); }
  };
  const restoreFrom = async (snap: Snapshot, label: string) => {
    try { await b.restoreState(snap); setErrors({}); sync(b, `Restored ${label}.`); setNotice(`Restored ${label} (revision ${b.getRevision()}).`); }
    catch (e) { setNotice(`Restore failed: ${e instanceof Error ? e.message : String(e)}`); }
  };
  const restoreLocal = () => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(`${STORAGE_KEY}.${task}`); } catch { /* blocked */ }
    if (!raw) { setNotice('No saved state found in this browser.'); return; }
    try { void restoreFrom(JSON.parse(raw) as Snapshot, 'browser save'); } catch { setNotice('Saved state is not valid JSON.'); }
  };

  const specs = b.getInputSpecs().filter((s): s is NumericInputSpec => s.kind === 'number');
  const stationRows = [0, 1, 2].map((i) => {
    const L = ex.stations.lossy[i]!, I = ex.stations.ideal[i]!;
    const hid = hiddenStations.includes(i + 1);
    return { n: i + 1, L, I, hid, idealHidden: hid && hidden.has(`p${i + 1}_ideal`) };
  });
  const cell = (x: number | null, hid: boolean, d = 4) => (hid ? 'hidden' : x === null ? '—' : sig(x, d));

  return (
    <div className="page">
      <header className="masthead">
        <p className="kicker">Furmtech Simulation Library · prototype 0.2.0-proto · not reviewed for release</p>
        <h1>Pipe lesson · contraction and straight run</h1>
        <p className="objective">{scenario.objectives[0]}</p>
        <nav aria-label="Lesson tasks" className="scenario-nav">
          <a href="?">Library home</a>
          {(['explore', 'a', 'b', 'c'] as const).map((k) => (
            <a key={k} href={`?sim=pipe&task=${k}`} aria-current={task === k ? 'page' : undefined}>{k === 'explore' ? 'Explore' : `Task (${k})`}</a>
          ))}
        </nav>
      </header>
      <LiveRegion message={live} />
      <main className="layout">
        <div className="col-main">
          <StatusBanner overall={result.overall} rules={result.rulesDetail} revision={result.revision}
            model="Model: S04 energy balance with S07 Reynolds number and S08 friction (laminar 64/Re or Colebrook), using stipulated assumptions." />
          <figure className="card scene-card" aria-labelledby="pipe-cap">
            <SvgView testId="pipe-scene" render={(svg) => renderPipeScene(svg, viewData, setActive)} deps={[viewData]} />
            <figcaption id="pipe-cap">
              <p className="scene-text" data-testid="pipe-scene-text"><strong>Text description:</strong> {describePipe(viewData)}</p>
              <p className="hint">Nothing in this diagram moves. Tab to a tap, the bore or the run to link it to the table and equations.</p>
            </figcaption>
          </figure>
          <section className="card" aria-labelledby="heads-title">
            <h2 id="heads-title">Heads at each station <span className="rev">(m of fluid, revision {result.revision}; datum z = 0 at station 1)</span></h2>
            <div className="table-scroll">
              <table className="data" data-testid="heads-table">
                <caption>Pressure head uses absolute pressure. Ideal = no losses (K = 0, f = 0) with identical inputs.</caption>
                <thead><tr><th scope="col">Station</th><th scope="col">p (abs) [kPa]</th><th scope="col">Pressure head p/ρg</th><th scope="col">Velocity head v̄²/2g</th><th scope="col">Elevation head z</th><th scope="col">Total head H (lossy)</th><th scope="col">p ideal [kPa]</th><th scope="col">H ideal</th></tr></thead>
                <tbody>
                  {stationRows.map((s) => (
                    <tr key={s.n} data-station={s.n}>
                      <th scope="row">{s.n}</th>
                      <td>{cell(s.L.p === null ? null : s.L.p / 1000, s.hid, 5)}</td>
                      <td>{cell(s.L.pressureHead, s.hid)}</td>
                      <td>{hidden.has('v2') && s.n > 1 ? 'hidden' : sig(s.L.velocityHead, 3)}</td>
                      <td>{sig(s.L.elevationHead, 3)}</td>
                      <td>{cell(s.L.totalHead, s.hid)}</td>
                      <td>{cell(s.I.p === null ? null : s.I.p / 1000, s.idealHidden, 5)}</td>
                      <td>{cell(s.I.totalHead, s.idealHidden)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card" aria-labelledby="charts-title">
            <h2 id="charts-title">Where the head goes <span className="rev">(revision {result.revision})</span></h2>
            <div className="plots-stack">
              <figure className="grade-fig">
                <SvgView testId="grade-lines" render={(svg) => renderGradeLines(svg, viewData)} deps={[viewData]} />
                <figcaption className="hint">● solid: lossy EGL (upper) and HGL (lower); ■ dashed: ideal EGL; ◆ dotted: pipe centreline z. Gap EGL − HGL = velocity head; drop of the lossy EGL below the ideal = head lost.</figcaption>
              </figure>
              <figure>
                <SvgView testId="budget" render={(svg) => renderBudget(svg, viewData, hideLosses)} deps={[viewData, hideLosses]} />
                <figcaption className="hint">Head budget from station 1 to 3. Recoverable conversions (elevation, velocity head) vs dissipated losses (contraction, friction).</figcaption>
              </figure>
            </div>
          </section>
          <section className="card" aria-labelledby="out-title">
            <h2 id="out-title" className="sr-only">Outputs</h2>
            <div className="table-scroll"><OutputsTable rows={rows} revision={result.revision} active={active} onActivate={setActive} /></div>
          </section>
          <EquationPanel lines={eq} revision={result.revision} active={active} onActivate={setActive} />
        </div>
        <aside className="col-side">
          {meta && (
            <section className="card task" aria-labelledby="task-title" data-testid="task-panel">
              <h2 id="task-title">Task ({task}): {meta.title}</h2>
              <ol className="task-steps">{scenario.tasks.map((t) => <li key={t}>{t}</li>)}</ol>
              {!pred ? (
                <fieldset className="prediction" data-testid="prediction-form">
                  <legend>Commit your prediction before the reveal</legend>
                  {meta.prediction.fields.map((f) => (
                    'options' in f && f.options ? (
                      <fieldset key={f.id}><legend>{f.label}</legend>
                        {f.options.map((opt) => (
                          <label key={opt}><input type="radio" name={`pred-${f.id}`} value={opt} checked={drafts[f.id] === opt} onChange={() => setDrafts((d) => ({ ...d, [f.id]: opt }))} /> {opt}</label>
                        ))}
                      </fieldset>
                    ) : (
                      <label key={f.id} className="pred-field">{f.label} <span className="unit">[{f.unit}]</span>
                        <input type="text" inputMode="decimal" value={drafts[f.id] ?? ''} data-pred={f.id}
                          onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') recordPrediction(); }} />
                      </label>
                    )
                  ))}
                  <button type="button" onClick={recordPrediction}>Record prediction</button>
                  {errors['prediction'] && <p className="field-error" role="alert">⚠ {errors['prediction']}</p>}
                </fieldset>
              ) : (
                <div data-testid="prediction-recorded">
                  <p><span aria-hidden="true">✓</span> Prediction recorded at revision {String(pred['revision'])}: {meta.prediction.fields.map((f) => `${f.label.replace(/^Your predicted /, '')} = ${String(pred[f.id])}${f.unit === 'choice' ? '' : ' ' + f.unit}`).join('; ')}.</p>
                  <PredictionComparison task={task} pred={pred} out={(id) => val(id)} inputs={inputs} />
                </div>
              )}
              {pred && (
                <div className="items">
                  <h3>Assessment</h3>
                  {(meta.items as AssessmentItem[]).map((item) => {
                    const rec = learning[`item-${item.id}`] as ItemResponse | undefined;
                    return (
                      <fieldset key={item.id} className="item" data-item={item.id}>
                        <legend>{item.id}. {item.stem}</legend>
                        {item.type === 'choice' ? item.options.map((opt) => (
                          <label key={opt.id}><input type="radio" name={`item-${item.id}`} value={opt.id} checked={responses[item.id] === opt.id}
                            onChange={() => setResponses((r) => ({ ...r, [item.id]: opt.id }))} /> {opt.text}</label>
                        )) : (
                          <label>Answer <span className="unit">[{item.unit}]</span> <input type="text" inputMode="decimal" value={responses[item.id] ?? ''}
                            onChange={(e) => setResponses((r) => ({ ...r, [item.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') checkItem(item); }} /></label>
                        )}
                        <button type="button" onClick={() => checkItem(item)}>Check {item.id}</button>
                        {rec && (
                          <p className={`feedback ${rec.correct ? 'ok' : 'no'}`} role="status" data-testid={`feedback-${item.id}`}>
                            <span aria-hidden="true">{rec.correct ? '✓' : '✗'}</span> <strong>{rec.correct ? 'Correct.' : 'Not quite.'}</strong> {rec.feedback}
                            {item.type === 'numeric' && rec.expected !== undefined && rec.expected !== null && !rec.correct ? ` (Model value: ${sig(rec.expected, 4)} ${item.unit}.)` : ''}
                          </p>
                        )}
                      </fieldset>
                    );
                  })}
                  <label htmlFor="expl" className="control-label">Explain your reasoning (logged with your prediction):</label>
                  <textarea id="expl" rows={3} value={drafts['explanation'] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, explanation: e.target.value }))} />
                  <button type="button" onClick={recordExplanation}>Record explanation</button>
                  {errors['explanation'] && <p className="field-error" role="alert">⚠ {errors['explanation']}</p>}
                </div>
              )}
              {task === 'c' && learning['limit-reached'] !== undefined && (
                <p className="status status-outside" data-testid="limit-reached"><span aria-hidden="true">⛔</span> Limit reached and logged: {String((learning['limit-reached'] as { regime: string }).regime)} at Re₂ = {sig((learning['limit-reached'] as { Re2: number }).Re2, 4)}.</p>
              )}
              <ul className="criteria" aria-label="Task criteria">
                {crit.map((c, i) => <li key={i}><span aria-hidden="true">{c.met ? '✓' : '○'}</span> {c.met ? 'Done' : 'To do'}: {c.detail}</li>)}
              </ul>
              <details><summary>Competencies (proposed, not reviewed)</summary>
                <p>Bloom: {meta.bloom}. Evidence: {meta.evidenceType}.</p>
                <p>EA Stage 1: {meta.eaStage1.map((m) => `${m.code} ${m.label}`).join('; ')}.</p>
                <p>NCSE 2026: {meta.ncse2026.map((m) => `${m.code} ${m.label}`).join('; ')}.</p>
              </details>
            </section>
          )}
          <section className="card" aria-labelledby="ctl-title">
            <h2 id="ctl-title">Quantities</h2>
            <fieldset className="units">
              <legend>Display units</legend>
              <label><input type="radio" name="units" checked={units === 'engineering'} onChange={() => setUnits('engineering')} /> L/min, mm, kPa, mPa·s</label>
              <label><input type="radio" name="units" checked={units === 'SI'} onChange={() => setUnits('SI')} /> SI</label>
            </fieldset>
            <p className="hint"><span className="tag tag-input">input</span> editable · <span className="tag tag-fixed">fixed</span> constant or locked by the task · <span className="tag tag-solved">solved</span> calculated (outputs table).</p>
            {specs.map((s) => {
              const isLocked = locked.includes(s.id);
              return (
                <div key={s.id} className="tagged-control">
                  <span className={`tag ${isLocked ? 'tag-fixed' : 'tag-input'}`}>{isLocked ? 'fixed' : 'input'}</span>
                  <NumberControl spec={s} valueSI={num(s.id)} range={b.rangeOf(s.id)!} displayUnit={DISPLAY[units][s.id] ?? s.unit} locked={isLocked}
                    lockedReason="Fixed by this task." {...(errors[s.id] ? { error: errors[s.id]! } : {})}
                    onCommit={(v) => void commit({ [s.id]: v })}
                    onInvalidEntry={(m) => { setErrors((e) => ({ ...e, [s.id]: m })); setLive(`Not applied: ${m}`); }} />
                </div>
              );
            })}
            {errors['*'] && <p className="field-error" role="alert">⚠ {errors['*']}</p>}
            <h3>Fixed constants</h3>
            <ul className="fixed-list">{PIPE_FIXED.map((f) => <li key={f.id}><span className="tag tag-fixed">fixed</span> {f.label} = {f.value} {f.unit === '1' ? '' : f.unit} <span className="hint">({f.source})</span></li>)}</ul>
            <p className="hint">Signs: z up from the station-1 centreline; flow 1 → 2 → 3 is positive; pressures absolute. K is referenced to v̄₂ (S04).</p>
          </section>
          <section className="card" aria-labelledby="state-title">
            <h2 id="state-title">State and export</h2>
            <div className="buttons">
              <button type="button" onClick={save}>Save in this browser</button>
              <button type="button" onClick={restoreLocal}>Restore browser save</button>
              <button type="button" onClick={() => download(`pipe-${task}-snapshot-r${result.revision}.json`, new Blob([JSON.stringify(b.saveState(), null, 2)], { type: 'application/json' }))}>Download snapshot</button>
              <label className="file-btn">Load snapshot file <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then((t) => restoreFrom(JSON.parse(t) as Snapshot, f.name)).catch(() => setNotice('File is not valid snapshot JSON.')); }} /></label>
              <button type="button" onClick={() => void b.exportData('csv').then((bl) => download(`pipe-${task}-r${result.revision}.csv`, bl))}>Export CSV</button>
              <button type="button" onClick={() => void b.exportData('json').then((bl) => download(`pipe-${task}-r${result.revision}.json`, bl))}>Export JSON</button>
              <button type="button" onClick={() => void b.reset().then(() => { setErrors({}); setDrafts({}); setResponses({}); sync(b, 'Reset to task defaults.'); })}>Reset</button>
            </div>
            {notice && <p role="status" data-testid="notice">{notice}</p>}
            <p className="hint">Exports include your predictions, answers and explanations. Nothing is sent over the network.</p>
          </section>
          <section className="card" aria-labelledby="assume-title">
            <h2 id="assume-title">Assumptions and provenance</h2>
            <ul className="rules">
              {result.rulesDetail.map((r) => <li key={r.ruleId}><span aria-hidden="true">{r.status === 'within' ? '✓' : r.status === 'outside' ? '⛔' : r.status === 'approaching' ? '▲' : '?'}</span> <code>{r.ruleId}</code> ({r.basis}): {r.reason}</li>)}
            </ul>
            <p className="hint">Thresholds 2300/4000 are conventions for developed Newtonian pipe flow; 2000–2300 and 4000–4500 are provisional “approaching” buffers. Sources: DOE fluid-flow handbook; Colebrook (1939), Colebrook and White (1937). Lesson spec: COMPOSITE_PIPE_SPEC.md. Equations, coefficients and rules are unverified; several need SME review (OPEN_QUESTIONS.md).</p>
          </section>
        </aside>
      </main>
    </div>
  );
}

function PredictionComparison({ task, pred, out, inputs }: {
  task: TaskKey; pred: Record<string, unknown>; out: (id: string) => number | null; inputs: Record<string, number | string | boolean>;
}) {
  if (task === 'a') {
    const v2 = out('v2'), p2 = out('p2_ideal');
    const dp = p2 === null ? null : p2 - (inputs['p1'] as number);
    return <p data-testid="comparison">Ideal prediction: v̄₂ = {v2 === null ? '—' : sig(v2, 4)} m/s (yours {String(pred['v2'])}); p₂ − p₁ = {dp === null ? '—' : sig(dp, 4)} Pa (yours {String(pred['dp'])}).</p>;
  }
  if (task === 'b') {
    const hK = out('h_K'), hf = out('h_f');
    const total = hK === null || hf === null ? null : hK + hf;
    return <p data-testid="comparison">Head balance: ideal p₃ − lossy p₃ = ρg(h_K + h_f) = {total === null ? 'not available' : `${sig(total, 4)} m of head`} (h_K = {hK === null ? '—' : sig(hK, 3)} m, h_f = {hf === null ? '—' : sig(hf, 3)} m). You predicted {String(pred['dh'])} m and “{String(pred['larger'])}”.</p>;
  }
  if (task === 'c') {
    const Q4000 = ((4000 * Math.PI * (inputs['D2'] as number) * (inputs['mu'] as number)) / (4 * (inputs['rho'] as number))) * 60000;
    return <p data-testid="comparison">Model: Re₂ = 4000 at Q = {sig(Q4000, 4)} L/min for the current D₂ and fluid (you predicted {String(pred['Q4000'])} L/min). Now lower Q, or raise ε or μ, until the friction prediction is withdrawn.</p>;
  }
  return null;
}

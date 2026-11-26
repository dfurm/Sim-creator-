/**
 * Framework-free SVG renderers for the composite pipe lesson:
 *  - schematic (geometry: bores to one scale; axial length and rise schematic, labelled),
 *  - grade-line chart (EGL/HGL at three stations, ideal vs lossy, heads relative to station-1 HGL),
 *  - head budget (signed bars: recoverable conversions vs dissipated losses).
 */
import { anchorElementId } from '../core/anchors';
import { sig, sigText } from './format';
import { ticks } from './plots';
import { clear, el } from './svg';

export interface StationView {
  p: number | null; pressureHead: number | null; velocityHead: number; elevationHead: number; totalHead: number | null;
}
export interface PipeViewData {
  revision: number;
  D1: number; D2: number; L: number; dz: number; eps: number; K: number;
  Q: number; v1: number; v2: number; Re2: number; regime: string; f: number | null;
  lossy: StationView[]; ideal: StationView[];
  budget: { elevation: number; kinetic: number; contraction: number; friction: number | null; total: number | null };
  /** Station indices (1-based) whose lossy pressure is hidden until a prediction is recorded. */
  hiddenStations: number[];
  frictionReason?: string;
}

type Focus = (anchor: string | null) => void;

function anchorGroup(parent: Element, id: string, aria: string, onFocus?: Focus): SVGGElement {
  const g = el('g', { id: anchorElementId(id), 'data-anchor': id, tabindex: 0, role: 'img', 'aria-label': aria, class: 'anchor' });
  g.appendChild(el('title', {}, aria));
  g.addEventListener('focus', () => onFocus?.(id));
  g.addEventListener('blur', () => onFocus?.(null));
  g.addEventListener('click', () => onFocus?.(id));
  parent.appendChild(g);
  return g;
}

const fmtP = (p: number | null, hidden: boolean) => (hidden ? 'hidden until prediction' : p === null ? 'not available' : `${sig(p / 1000, 4)} kPa`);

/** Pipe schematic with stations 1–3 and pressure taps. */
export function renderPipeScene(svg: SVGSVGElement, d: PipeViewData, onFocus?: Focus): void {
  clear(svg);
  const W = 640, H = 250;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-labelledby', 'pipe-scene-title pipe-scene-desc');
  svg.classList.add('scene');
  svg.appendChild(el('title', { id: 'pipe-scene-title' }, `Pipe schematic, revision ${d.revision}`));
  svg.appendChild(el('desc', { id: 'pipe-scene-desc' }, describePipe(d)));
  const s = 900; // px per m of diameter: 100 mm → 90 px
  const h1 = d.D1 * s, h2 = d.D2 * s;
  const x1 = 30, xc0 = 190, xc1 = 250, x3 = 610;
  const cy = 125;
  const rise = Math.max(-40, Math.min(40, -d.dz * 20)); // schematic: 20 px per m, clipped
  const y3 = cy + rise;
  const top = (x: number) => (x <= xc0 ? cy - h1 / 2 : x <= xc1 ? cy - h1 / 2 + ((x - xc0) / (xc1 - xc0)) * (h1 / 2 - h2 / 2) : cy - h2 / 2 + ((x - xc1) / (x3 - xc1)) * rise);
  const bot = (x: number) => (x <= xc0 ? cy + h1 / 2 : x <= xc1 ? cy + h1 / 2 - ((x - xc0) / (xc1 - xc0)) * (h1 / 2 - h2 / 2) : cy + h2 / 2 + ((x - xc1) / (x3 - xc1)) * rise);
  const outline = `M${x1},${top(x1)} L${xc0},${top(xc0)} L${xc1},${top(xc1)} L${x3},${top(x3)} L${x3},${bot(x3)} L${xc1},${bot(xc1)} L${xc0},${bot(xc0)} L${x1},${bot(x1)} Z`;
  svg.appendChild(el('path', { d: outline, class: 'fluid' }));
  svg.appendChild(el('path', { d: `M${x1},${top(x1)} L${xc0},${top(xc0)} L${xc1},${top(xc1)} L${x3},${top(x3)}`, class: 'wall' }));
  svg.appendChild(el('path', { d: `M${x1},${bot(x1)} L${xc0},${bot(xc0)} L${xc1},${bot(xc1)} L${x3},${bot(x3)}`, class: 'wall' }));
  svg.appendChild(el('line', { x1, y1: cy, x2: xc1, y2: cy, class: 'centreline' }));
  svg.appendChild(el('line', { x1: xc1, y1: cy, x2: x3, y2: y3, class: 'centreline' }));
  // Flow arrow
  svg.appendChild(el('text', { x: x1, y: 18, class: 'legend' }, `Flow left to right, Q = ${sig(d.Q * 60000)} L/min. Bores to scale; run length and rise schematic (L = ${sig(d.L)} m, z₃ = ${sig(d.dz)} m).`));
  // Taps
  const tap = (x: number, yTop: number, n: number, id: string, extra: string) => {
    const st = d.lossy[n - 1]!;
    const hidden = d.hiddenStations.includes(n);
    const g = anchorGroup(svg, id, `Station ${n} pressure tap: ${hidden ? 'pressure hidden until you record a prediction' : st.p === null ? 'pressure not available' : `${sigText(st.p / 1000, 4)} kilopascals absolute`}. ${extra}`, onFocus);
    g.appendChild(el('line', { x1: x, y1: yTop, x2: x, y2: yTop - 28, class: 'dim' }));
    g.appendChild(el('circle', { cx: x, cy: yTop - 32, r: 5, class: 'section' }));
    g.appendChild(el('text', { x, y: yTop - 42, 'text-anchor': 'middle', class: 'label' }, `${n}: ${fmtP(st.p, hidden)}`));
  };
  tap(110, top(110), 1, 'S04/inlet_pressure', `Bore ${sigText(d.D1 * 1000)} mm, elevation 0 m (datum).`);
  tap(285, top(285), 2, 'S04/throat_pressure', `Just after the contraction, bore ${sigText(d.D2 * 1000)} mm, elevation 0 m.`);
  tap(590, top(590), 3, 'S04/outlet_pressure', `End of the ${sigText(d.L)} m run, elevation ${sigText(d.dz)} m.`);
  // Bore D2 (characteristic length) and friction run anchors
  const gD = anchorGroup(svg, 'S07/characteristic_length', `Bore D₂ = ${sigText(d.D2 * 1000)} mm: the length used for Re₂ = ${sigText(d.Re2)}.`, onFocus);
  gD.appendChild(el('line', { x1: 270, y1: top(270), x2: 270, y2: bot(270), class: 'dim' }));
  gD.appendChild(el('text', { x: 262, y: bot(270) + 16, 'text-anchor': 'middle', class: 'label' }, `D₂ ${sig(d.D2 * 1000)} mm`));
  const gR = anchorGroup(svg, 'S08/friction_point', `Straight run: ${d.regime}, Re₂ = ${sigText(d.Re2)}, ${d.f === null ? `friction factor not available. ${d.frictionReason ?? ''}` : `Darcy f = ${sigText(d.f, 4)}`}.`, onFocus);
  gR.appendChild(el('path', { d: `M${330},${bot(330) + 6} L${560},${bot(560) + 6}`, class: 'hit' }));
  gR.appendChild(el('text', { x: 470, y: Math.max(bot(470) + 34, cy + 50), 'text-anchor': 'middle', class: 'label' },
    d.f === null ? `f: not available (${d.regime})` : `f = ${sig(d.f, 4)} (${d.regime})`));
  const gE = anchorGroup(svg, 'S08/roughness_ratio', `Roughness ε = ${sigText(d.eps * 1000)} mm, ε/D₂ = ${sigText(d.eps / d.D2)}.`, onFocus);
  gE.appendChild(el('text', { x: 470, y: Math.max(bot(470) + 50, cy + 66), 'text-anchor': 'middle', class: 'legend' }, `ε/D₂ = ${sig(d.eps / d.D2)}`));
  const gV = anchorGroup(svg, 'S04/velocity_head', `Velocity: v̄₁ = ${sigText(d.v1)} m/s, v̄₂ = v̄₃ = ${sigText(d.v2)} m/s.`, onFocus);
  gV.appendChild(el('text', { x: 60, y: bot(60) + 18, class: 'label' }, `v̄₁ ${sig(d.v1)} m/s`));
  gV.appendChild(el('text', { x: 300, y: bot(300) + 32, class: 'label' }, `v̄₂ ${sig(d.v2)} m/s`));
  const gK = anchorGroup(svg, 'S04/loss_head', `Contraction with loss coefficient K = ${sigText(d.K)} on v̄₂.`, onFocus);
  gK.appendChild(el('path', { d: `M${xc0},${top(xc0) - 6} L${xc1},${top(xc1) - 6}`, class: 'hit' }));
  gK.appendChild(el('text', { x: 220, y: top(220) - 10, 'text-anchor': 'middle', class: 'legend' }, `contraction, K = ${sig(d.K)}`));
}

export function describePipe(d: PipeViewData): string {
  const st = (n: number) => {
    const s = d.lossy[n - 1]!;
    return d.hiddenStations.includes(n) ? 'hidden until you record a prediction' : s.p === null ? 'not available' : `${sigText(s.p / 1000, 4)} kPa absolute`;
  };
  return `Water-like liquid flows at ${sigText(d.Q * 60000)} L/min from a ${sigText(d.D1 * 1000)} mm bore through a contraction ` +
    `into a ${sigText(d.D2 * 1000)} mm bore, then along a ${sigText(d.L)} m straight run that rises ${sigText(d.dz)} m. ` +
    `Re₂ = ${sigText(d.Re2)} (${d.regime}). Pressures: station 1 ${st(1)}, station 2 ${st(2)}, station 3 ${st(3)}.`;
}

/** Energy- and hydraulic-grade lines at the three stations, relative to station-1 HGL (p₁/ρg + z₁ = 0). */
export function renderGradeLines(svg: SVGSVGElement, d: PipeViewData): void {
  clear(svg);
  const W = 320, H = 230, Lm = 52, R = 12, T = 16, B = 42;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  const ref = d.lossy[0]!.pressureHead!; // station-1 pressure head (z₁ = 0)
  const rel = (x: number | null) => (x === null ? null : x - ref);
  type Pt = number | null;
  const series = (stations: StationView[], hideLossy: boolean) => stations.map((s, i) => {
    const hidden = hideLossy && d.hiddenStations.includes(i + 1);
    const hgl: Pt = hidden || s.pressureHead === null ? null : rel(s.pressureHead + s.elevationHead);
    const egl: Pt = hgl === null ? null : hgl + s.velocityHead;
    return { hgl, egl, z: s.elevationHead };
  });
  const lossy = series(d.lossy, true);
  const ideal = series(d.ideal, true);
  const vals = [...lossy, ...ideal].flatMap((p) => [p.hgl, p.egl, p.z]).filter((x): x is number => x !== null);
  let ymin = Math.min(0, ...vals), ymax = Math.max(0.05, ...vals);
  const pad = (ymax - ymin) * 0.08 || 0.1; ymin -= pad; ymax += pad;
  const sx = (i: number) => Lm + (i * (W - Lm - R)) / 2;
  const sy = (y: number) => H - B - ((y - ymin) / (ymax - ymin)) * (H - T - B);
  svg.setAttribute('aria-label', `Grade lines at stations 1, 2, 3, revision ${d.revision}`);
  svg.appendChild(el('title', {}, 'Energy grade line (EGL) and hydraulic grade line (HGL), ideal and lossy'));
  const g = el('g', { class: 'plot' });
  for (const t of ticks(ymin, ymax, 5)) {
    g.appendChild(el('line', { x1: Lm - 4, y1: sy(t), x2: W - R, y2: sy(t), class: 'grid' }));
    g.appendChild(el('text', { x: Lm - 6, y: sy(t) + 3, 'text-anchor': 'end', class: 'tick' }, sig(t, 2)));
  }
  [0, 1, 2].forEach((i) => g.appendChild(el('text', { x: sx(i), y: H - B + 15, 'text-anchor': 'middle', class: 'tick' }, `${i + 1}`)));
  g.appendChild(el('text', { x: (Lm + W) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axis-label' }, 'Station (profile between stations not modelled)'));
  g.appendChild(el('text', { x: 12, y: (T + H - B) / 2, 'text-anchor': 'middle', class: 'axis-label', transform: `rotate(-90 12 ${(T + H - B) / 2})` }, 'Head relative to station-1 HGL [m]'));
  const line = (pts: Pt[], cls: string, marker: 'circle' | 'square' | 'diamond') => {
    const segs: string[] = [];
    pts.forEach((y, i) => { if (y !== null) segs.push(`${segs.length && pts[i - 1] !== null ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(y).toFixed(1)}`); });
    if (segs.length > 1) g.appendChild(el('path', { d: segs.join(' '), class: cls }));
    pts.forEach((y, i) => {
      if (y === null) return;
      if (marker === 'circle') g.appendChild(el('circle', { cx: sx(i), cy: sy(y), r: 4, class: `${cls}-pt` }));
      else if (marker === 'square') g.appendChild(el('rect', { x: sx(i) - 4, y: sy(y) - 4, width: 8, height: 8, class: `${cls}-pt` }));
      else g.appendChild(el('path', { d: `M${sx(i)},${sy(y) - 5} l5,5 l-5,5 l-5,-5 z`, class: `${cls}-pt` }));
    });
  };
  line(lossy.map((p) => p.z), 'gl-z', 'diamond');
  line(ideal.map((p) => p.egl), 'gl-egl-ideal', 'square');
  line(lossy.map((p) => p.hgl), 'gl-hgl', 'circle');
  line(lossy.map((p) => p.egl), 'gl-egl', 'circle');
  lossy.forEach((p, i) => { if (p.egl === null) g.appendChild(el('text', { x: sx(i), y: T + 10, 'text-anchor': 'middle', class: 'tick' }, d.hiddenStations.includes(i + 1) ? 'hidden' : 'n/a')); });
  svg.appendChild(g);
}

/** Signed head budget (p₁ − p₃)/(ρg) = Δz + Δ(v²/2g) + h_K + h_f. */
export function renderBudget(svg: SVGSVGElement, d: PipeViewData, hideLosses: boolean): void {
  clear(svg);
  const rows: { label: string; value: number | null; kind: 'recoverable' | 'dissipated' | 'total' }[] = [
    { label: 'Elevation gain z₃ − z₁', value: d.budget.elevation, kind: 'recoverable' },
    { label: 'Velocity-head rise (v̄₂² − v̄₁²)/2g', value: d.budget.kinetic, kind: 'recoverable' },
    { label: 'Contraction loss h_K', value: hideLosses ? null : d.budget.contraction, kind: 'dissipated' },
    { label: 'Friction loss h_f', value: hideLosses ? null : d.budget.friction, kind: 'dissipated' },
    { label: 'Total pressure-head drop (p₁ − p₃)/ρg', value: hideLosses ? null : d.budget.total, kind: 'total' },
  ];
  const W = 640, rowH = 30, T = 10, Lw = 270, R = 80;
  const H = T + rows.length * rowH + 30;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Head budget from station 1 to station 3, revision ${d.revision}`);
  svg.appendChild(el('title', {}, 'Where the pressure head goes between station 1 and station 3'));
  const vals = rows.map((r) => r.value).filter((x): x is number => x !== null);
  const vmin = Math.min(0, ...vals), vmax = Math.max(0.01, ...vals);
  const sx = (v: number) => Lw + ((v - vmin) / (vmax - vmin || 1)) * (W - Lw - R);
  const g = el('g', { class: 'plot budget' });
  g.appendChild(el('line', { x1: sx(0), y1: T - 4, x2: sx(0), y2: T + rows.length * rowH, class: 'axis' }));
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    g.appendChild(el('text', { x: Lw - 8, y: y + 18, 'text-anchor': 'end', class: 'tick' }, r.label));
    if (r.value === null) {
      g.appendChild(el('text', { x: sx(0) + 6, y: y + 18, class: 'tick' }, hideLosses && r.kind !== 'recoverable' ? 'hidden until prediction' : 'not available (see status)'));
      return;
    }
    const x0 = Math.min(sx(0), sx(r.value)), w = Math.abs(sx(r.value) - sx(0));
    g.appendChild(el('rect', { x: x0, y: y + 5, width: Math.max(w, 1), height: rowH - 10, class: `bar-${r.kind}` }));
    g.appendChild(el('text', { x: Math.max(sx(r.value), sx(0)) + 6, y: y + 18, class: 'tick' }, `${sig(r.value, 3)} m`));
  });
  g.appendChild(el('text', { x: Lw, y: H - 8, class: 'tick' }, 'Solid edge: recoverable · dashed edge: dissipated · open: total'));
  svg.appendChild(g);
}

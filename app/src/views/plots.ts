/**
 * Lightweight labelled SVG plots (spec §G): station vs section-mean velocity, and a
 * D₂ sweep of v₂ at the committed Q. Linear axes with units; calculated series only.
 * Framework-free.
 */
import { sig } from './format';
import { clear, el } from './svg';

export interface Point { x: number; y: number }
interface Axis { min: number; max: number; label: string }

const W = 300, H = 210, L = 52, R = 12, T = 14, B = 44;

function frame(svg: SVGSVGElement, title: string, xa: Axis, ya: Axis, xTicks: number[], yTicks: number[], xFmt: (x: number) => string) {
  clear(svg);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', title);
  svg.appendChild(el('title', {}, title));
  const sx = (x: number) => L + ((x - xa.min) / (xa.max - xa.min || 1)) * (W - L - R);
  const sy = (y: number) => H - B - ((y - ya.min) / (ya.max - ya.min || 1)) * (H - T - B);
  const g = el('g', { class: 'plot' });
  g.appendChild(el('line', { x1: L, y1: H - B, x2: W - R, y2: H - B, class: 'axis' }));
  g.appendChild(el('line', { x1: L, y1: T, x2: L, y2: H - B, class: 'axis' }));
  for (const t of xTicks) {
    g.appendChild(el('line', { x1: sx(t), y1: H - B, x2: sx(t), y2: H - B + 4, class: 'axis' }));
    g.appendChild(el('text', { x: sx(t), y: H - B + 15, 'text-anchor': 'middle', class: 'tick' }, xFmt(t)));
  }
  for (const t of yTicks) {
    g.appendChild(el('line', { x1: L - 4, y1: sy(t), x2: W - R, y2: sy(t), class: 'grid' }));
    g.appendChild(el('text', { x: L - 6, y: sy(t) + 3, 'text-anchor': 'end', class: 'tick' }, sig(t, 2)));
  }
  g.appendChild(el('text', { x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axis-label' }, xa.label));
  g.appendChild(el('text', { x: 12, y: (T + H - B) / 2, 'text-anchor': 'middle', class: 'axis-label', transform: `rotate(-90 12 ${(T + H - B) / 2})` }, ya.label));
  svg.appendChild(g);
  return { g, sx, sy };
}

export function ticks(min: number, max: number, n = 4): number[] {
  if (max <= min) return [min];
  const raw = (max - min) / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}

/** Two calculated points: station 1 and station 2 mean velocity. */
export function renderStationPlot(svg: SVGSVGElement, v1: number, v2: number | null, revision: number, fixedYMax?: number): void {
  const ymax = fixedYMax ?? Math.max(0.5, v1, v2 ?? 0) * 1.15;
  const { g, sx, sy } = frame(svg, `Section-mean velocity at stations 1 and 2, revision ${revision}`,
    { min: 0.5, max: 2.5, label: 'Axial station (1 upstream, 2 downstream)' },
    { min: 0, max: ymax, label: 'Mean velocity v̄ [m/s]' }, [1, 2], ticks(0, ymax), (x) => String(x));
  const pts: [number, number | null][] = [[1, v1], [2, v2]];
  for (const [x, y] of pts) {
    if (y === null) {
      g.appendChild(el('text', { x: sx(x), y: sy(ymax / 2), 'text-anchor': 'middle', class: 'tick' }, 'not shown'));
      continue;
    }
    g.appendChild(el('circle', { cx: sx(x), cy: sy(y), r: 5, class: 'pt-calc' }));
    g.appendChild(el('text', { x: sx(x) + 8, y: sy(y) - 6, class: 'tick' }, `${sig(y)} m/s`));
  }
}

/** Curve of v₂ over the allowed D₂ range, with the current point marked. */
export function renderSweepPlot(svg: SVGSVGElement, curve: Point[], current: Point | null, revision: number): void {
  const xs = curve.map((p) => p.x);
  const ymax = Math.max(0.5, ...curve.map((p) => p.y)) * 1.05;
  const xa = { min: Math.min(...xs), max: Math.max(...xs), label: 'Downstream bore D₂ [mm]' };
  const { g, sx, sy } = frame(svg, `Calculated v₂ against D₂ at fixed Q, revision ${revision}`, xa,
    { min: 0, max: ymax, label: 'v̄₂ [m/s]' }, ticks(xa.min, xa.max), ticks(0, ymax), (x) => String(x));
  const d = curve.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  g.appendChild(el('path', { d, class: 'curve-calc' }));
  if (current) {
    g.appendChild(el('rect', { x: sx(current.x) - 5, y: sy(current.y) - 5, width: 10, height: 10, class: 'pt-current' }));
    g.appendChild(el('text', { x: Math.min(sx(current.x) + 8, W - 80), y: Math.max(sy(current.y) - 8, T + 10), class: 'tick' }, `current: ${sig(current.y)} m/s`));
  }
}

/**
 * S02 physical scene: longitudinal contraction with two round sections drawn to one
 * diameter scale, mean-velocity arrows on one velocity legend, and fixed-time volume
 * parcels whose length is proportional to mean velocity (spec §F, §N).
 * Framework-free SVG. The scene shows section-mean velocity, not a local velocity field.
 */
import { anchorElementId } from '../core/anchors';
import { sig, sigText } from './format';
import { clear, el } from './svg';

export interface S02SceneData {
  revision: number;
  Q: number; D1: number; D2: number;
  area1: number; area2: number | null;
  v1: number; v2: number | null;
  /** Reason when v2/area2 are suppressed. */
  suppressedReason?: string;
  v2Hidden: boolean;
}

export interface S02SceneOptions {
  onAnchorFocus?: (anchor: string | null) => void;
}

const W = 640;
const H = 290;
const CY = 128;
const PX_PER_M = 1500;          // diameter scale: 100 mm → 150 px
const X0 = 30, X1 = 250, X2 = 330, X3 = 610;
const BASE_PX_PER_MPS = 60;      // preferred arrow scale
const MAX_ARROW = 200;
const PARCEL_MAX = 110;          // longest parcel band, px

export class S02Scene {
  private readonly root: SVGGElement;
  private data: S02SceneData | null = null;
  private parcelLayers: { g: SVGGElement; width: number; speed: number; x0: number; x1: number }[] = [];
  private active: string | null = null;

  constructor(private readonly svg: SVGSVGElement, private readonly opts: S02SceneOptions = {}) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-labelledby', 's02-scene-title s02-scene-desc');
    svg.classList.add('scene');
    this.root = el('g');
    svg.appendChild(this.root);
  }

  /** Arrow scale in px per (m/s); reduced when the longest arrow would not fit. */
  static arrowScale(vmax: number): { pxPerMps: number; changed: boolean } {
    if (vmax * BASE_PX_PER_MPS <= MAX_ARROW || vmax === 0) return { pxPerMps: BASE_PX_PER_MPS, changed: false };
    return { pxPerMps: MAX_ARROW / vmax, changed: true };
  }

  update(d: S02SceneData): void {
    this.data = d;
    clear(this.svg);
    this.svg.appendChild(this.root);
    clear(this.root);
    this.parcelLayers = [];

    const h1 = d.D1 * PX_PER_M;
    const h2 = d.D2 * PX_PER_M;
    const showV2 = d.v2 !== null && !d.v2Hidden;
    const v2 = d.v2 ?? 0;

    // Title/description (text alternative).
    this.svg.prepend(el('desc', { id: 's02-scene-desc' }, this.describe()));
    this.svg.prepend(el('title', { id: 's02-scene-title' }, `S02 contraction diagram, revision ${d.revision}`));

    const defs = el('defs');
    const hatch = el('pattern', { id: 's02-hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hatch.appendChild(el('rect', { width: 8, height: 8, class: 'parcel-bg' }));
    hatch.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 8, class: 'parcel-hatch' }));
    defs.appendChild(hatch);
    const marker = el('marker', { id: 's02-arrowhead', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.appendChild(el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }));
    defs.appendChild(marker);
    const clip1 = el('clipPath', { id: 's02-clip1' });
    clip1.appendChild(el('rect', { x: X0, y: CY - h1 / 2, width: X1 - X0, height: h1 }));
    const clip2 = el('clipPath', { id: 's02-clip2' });
    clip2.appendChild(el('rect', { x: X2, y: CY - h2 / 2, width: X3 - X2, height: h2 }));
    defs.append(clip1, clip2);
    this.root.appendChild(defs);

    // Fluid region and walls (geometry to scale in diameter; axial length schematic).
    const outline = `M${X0},${CY - h1 / 2} L${X1},${CY - h1 / 2} L${X2},${CY - h2 / 2} L${X3},${CY - h2 / 2} ` +
      `L${X3},${CY + h2 / 2} L${X2},${CY + h2 / 2} L${X1},${CY + h1 / 2} L${X0},${CY + h1 / 2} Z`;
    this.root.appendChild(el('path', { d: outline, class: 'fluid' }));

    // Parcels: equal-volume bands advected for the same time τ; length ∝ v.
    const vPeak = Math.max(d.v1, showV2 ? v2 : 0);
    const pxPerMpsParcel = vPeak > 0 ? PARCEL_MAX / vPeak : 0;
    const w1 = d.v1 * pxPerMpsParcel;
    const w2 = showV2 ? v2 * pxPerMpsParcel : 0;
    const parcels = el('g', { class: 'parcels', 'aria-hidden': 'true' });
    if (w1 > 0.5) this.addParcels(parcels, 's02-clip1', X0, X1, CY - h1 / 2, h1, w1);
    if (w2 > 0.5) this.addParcels(parcels, 's02-clip2', X2, X3, CY - h2 / 2, h2, w2);
    this.root.appendChild(parcels);

    // Walls drawn after parcels.
    const wall = (pts: string) => this.root.appendChild(el('path', { d: pts, class: 'wall' }));
    wall(`M${X0},${CY - h1 / 2} L${X1},${CY - h1 / 2} L${X2},${CY - h2 / 2} L${X3},${CY - h2 / 2}`);
    wall(`M${X0},${CY + h1 / 2} L${X1},${CY + h1 / 2} L${X2},${CY + h2 / 2} L${X3},${CY + h2 / 2}`);
    this.root.appendChild(el('line', { x1: X0, y1: CY, x2: X3, y2: CY, class: 'centreline' }));

    // Contraction anchor (geometry).
    this.anchor('S02/contraction', `${d.D2 < d.D1 ? 'Contraction' : d.D2 > d.D1 ? 'Expansion' : 'Uniform pipe'} between section 1 and section 2`, (g) => {
      g.appendChild(el('path', { d: `M${X1},${CY - h1 / 2 - 6} L${X2},${CY - h2 / 2 - 6}`, class: 'hit' }));
    });

    // Sections (round cross-sections shown as end-on ellipses).
    const sec = (x: number, h: number, id: string, label: string, aria: string) =>
      this.anchor(id, aria, (g) => {
        g.appendChild(el('ellipse', { cx: x, cy: CY, rx: Math.max(4, h / 8), ry: h / 2, class: 'section' }));
        g.appendChild(el('line', { x1: x + 16, y1: CY - h / 2, x2: x + 16, y2: CY + h / 2, class: 'dim' }));
        g.appendChild(el('text', { x, y: CY - h / 2 - 10, class: 'label', 'text-anchor': 'middle' }, label));
      });
    sec(140, h1, 'S02/inlet_section', `D₁ = ${sig(d.D1 * 1000)} mm`,
      `Section 1: diameter ${sigText(d.D1 * 1000)} millimetres, area ${sigText(d.area1)} square metres`);
    sec(470, h2, 'S02/throat_area', `D₂ = ${sig(d.D2 * 1000)} mm`,
      d.area2 === null ? `Section 2: diameter ${sigText(d.D2 * 1000)} millimetres, area suppressed`
        : `Section 2: diameter ${sigText(d.D2 * 1000)} millimetres, area ${sigText(d.area2)} square metres`);

    // Mean-velocity arrows on one legend.
    const { pxPerMps, changed } = S02Scene.arrowScale(vPeak);
    const arrow = (x: number, v: number, h: number, id: string, text: string, aria: string) =>
      this.anchor(id, aria, (g) => {
        const len = v * pxPerMps;
        if (len > 1) g.appendChild(el('line', { x1: x, y1: CY, x2: x + len, y2: CY, class: 'arrow', 'marker-end': 'url(#s02-arrowhead)' }));
        else g.appendChild(el('circle', { cx: x, cy: CY, r: 3, class: 'arrow-zero' }));
        g.appendChild(el('line', { x1: x, y1: CY, x2: x, y2: CY + h / 2 + 8, class: 'leader' }));
        g.appendChild(el('text', { x: x, y: CY + h / 2 + 22, class: 'label' }, text));
      });
    arrow(X0 + 8, d.v1, h1, 'S02/inlet_velocity', `v̄₁ = ${sig(d.v1)} m/s`, `Mean velocity at section 1: ${sigText(d.v1)} metres per second`);
    if (showV2) {
      arrow(X2 + 8, v2, h2, 'S02/outlet_velocity', `v̄₂ = ${sig(v2)} m/s`, `Mean velocity at section 2: ${sigText(v2)} metres per second`);
    } else {
      this.anchor('S02/outlet_velocity', d.v2Hidden ? 'Mean velocity at section 2: hidden until you record a prediction' : `Mean velocity at section 2: suppressed. ${d.suppressedReason ?? ''}`, (g) => {
        g.appendChild(el('text', { x: X2 + 8, y: CY + h2 / 2 + 22, class: 'label' }, d.v2Hidden ? 'v̄₂ = ? (record a prediction)' : 'v̄₂ suppressed'));
      });
    }

    // Legend: velocity scale bar and diameter scale.
    const legendY = H - 34;
    const ref = niceRef(MAX_ARROW / 2 / pxPerMps);
    this.root.appendChild(el('line', { x1: X0, y1: legendY, x2: X0 + ref * pxPerMps, y2: legendY, class: 'arrow', 'marker-end': 'url(#s02-arrowhead)' }));
    this.root.appendChild(el('text', { x: X0, y: legendY + 18, class: 'legend' },
      `Arrow scale: this arrow = ${sig(ref)} m/s (mean velocity)${changed ? ' — scale reduced to fit' : ''}`));
    this.root.appendChild(el('line', { x1: X3 - 75, y1: legendY - 6, x2: X3 - 75, y2: legendY + 6 + 0, class: 'dim' }));
    this.root.appendChild(el('line', { x1: X3 - 75, y1: legendY, x2: X3 - 75 + 0.05 * PX_PER_M, y2: legendY, class: 'dim' }));
    this.root.appendChild(el('text', { x: X3, y: legendY + 18, class: 'legend', 'text-anchor': 'end' }, 'Diameter scale: bar = 50 mm; axial length not to scale'));
    this.root.appendChild(el('text', { x: X0, y: 16, class: 'legend' },
      'Hatched bands: equal fluid volumes passing in the same time; longer band = higher mean speed.'));
    this.root.appendChild(el('text', { x: X0, y: 30, class: 'legend' }, 'Flow direction: left to right (positive axial direction).'));

    this.setActive(this.active);
  }

  /** Advance parcel animation to time t (s). Purely visual; the model is unaffected. */
  setPhase(t: number): void {
    for (const p of this.parcelLayers) {
      const period = 2 * p.width;
      const offset = ((p.speed * t) % period + period) % period;
      p.g.setAttribute('transform', `translate(${offset.toFixed(2)},0)`);
    }
  }

  setActive(anchor: string | null): void {
    this.active = anchor;
    for (const g of this.svg.querySelectorAll('[data-anchor]')) {
      g.classList.toggle('is-active', g.getAttribute('data-anchor') === anchor);
    }
  }

  describe(): string {
    return this.data ? describeS02Scene(this.data) : '';
  }

  private addParcels(parent: SVGGElement, clip: string, x0: number, x1: number, y: number, h: number, w: number): void {
    const holder = el('g', { 'clip-path': `url(#${clip})` });
    const g = el('g');
    for (let x = x0 - 2 * w; x < x1 + 2 * w; x += 2 * w) {
      g.appendChild(el('rect', { x, y, width: w, height: h, fill: 'url(#s02-hatch)', class: 'parcel' }));
    }
    holder.appendChild(g);
    parent.appendChild(holder);
    // Visual speed: band moves one band-width per second at the peak speed scale.
    this.parcelLayers.push({ g, width: w, speed: w / 2, x0, x1 });
  }

  private anchor(id: string, aria: string, build: (g: SVGGElement) => void): void {
    const g = el('g', { id: anchorElementId(id), 'data-anchor': id, tabindex: 0, role: 'img', 'aria-label': aria, class: 'anchor' });
    g.appendChild(el('title', {}, aria));
    build(g);
    g.addEventListener('focus', () => this.opts.onAnchorFocus?.(id));
    g.addEventListener('blur', () => this.opts.onAnchorFocus?.(null));
    g.addEventListener('click', () => this.opts.onAnchorFocus?.(id));
    this.root.appendChild(g);
  }
}

function niceRef(x: number): number {
  if (x <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
}

/** Text alternative for the scene, from the same data the scene draws. Pure. */
export function describeS02Scene(d: S02SceneData): string {
  const kind = d.D2 < d.D1 ? 'contracts' : d.D2 > d.D1 ? 'expands' : 'stays the same size';
  const v2 = d.v2Hidden ? 'hidden until you record a prediction'
    : d.v2 === null ? `suppressed (${d.suppressedReason ?? 'see status'})` : `${sigText(d.v2)} m/s`;
  return `A pipe carrying ${sigText(d.Q * 60000)} litres per minute ${kind} from diameter ${sigText(d.D1 * 1000)} mm ` +
    `to ${sigText(d.D2 * 1000)} mm. Mean velocity is ${sigText(d.v1)} m/s upstream and ${v2} downstream. ` +
    `Mass flow is the same at both sections.`;
}

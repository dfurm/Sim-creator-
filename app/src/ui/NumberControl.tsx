import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import type { NumericInputSpec } from '../core/block';
import { fromSI, toSI } from '../core/units';

export interface NumberControlProps {
  spec: NumericInputSpec;
  valueSI: number;
  range: { min: number; max: number };
  displayUnit: string;
  locked: boolean;
  lockedReason?: string;
  error?: string;
  onCommit: (valueSI: number) => void;
  onInvalidEntry: (message: string) => void;
}

/** Round converted values so display-unit entry returns exact decimal SI values. */
export function cleanSI(x: number): number {
  return +x.toPrecision(12);
}

function fmtDisplay(x: number): string {
  return String(+x.toPrecision(10));
}

/**
 * Slider + numeric entry for one SI input. The numeric field accepts partial tokens and
 * commits on Enter or blur; the slider commits on change. Arrow keys step finely;
 * Shift+Arrow and PageUp/PageDown step ×10.
 */
export function NumberControl(p: NumberControlProps) {
  const id = useId();
  const [draft, setDraft] = useState(fmtDisplay(fromSI(p.valueSI, p.displayUnit)));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(fmtDisplay(fromSI(p.valueSI, p.displayUnit)));
  }, [p.valueSI, p.displayUnit, editing]);

  const stepSI = p.spec.step;
  const clamp = (x: number) => Math.min(p.range.max, Math.max(p.range.min, x));
  const commitDraft = () => {
    setEditing(false);
    const t = draft.trim().replace(',', '.');
    if (t === '') { p.onInvalidEntry(`${p.spec.label}: enter a number.`); return; }
    const n = Number(t);
    if (Number.isNaN(n)) { p.onInvalidEntry(`${p.spec.label}: "${draft}" is not a number.`); return; }
    p.onCommit(Number.isFinite(n) ? cleanSI(toSI(n, p.displayUnit)) : n);
  };
  const onSliderKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const big = e.key === 'PageUp' || e.key === 'PageDown' || (e.shiftKey && e.key.startsWith('Arrow'));
    if (!big) return;
    e.preventDefault();
    const dir = e.key === 'PageUp' || e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1;
    p.onCommit(cleanSI(clamp(p.valueSI + dir * 10 * stepSI)));
  };
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const dmin = fmtDisplay(fromSI(p.range.min, p.displayUnit));
  const dmax = fmtDisplay(fromSI(p.range.max, p.displayUnit));
  return (
    <div className={`control${p.locked ? ' is-locked' : ''}${p.error ? ' has-error' : ''}`} data-input={p.spec.id}>
      <label htmlFor={`${id}-num`} className="control-label">
        {p.spec.label} <span className="unit">[{p.displayUnit}]</span>
      </label>
      <div className="control-row">
        <input
          type="range" id={`${id}-range`} aria-label={`${p.spec.label} slider, ${p.displayUnit === p.spec.unit ? p.spec.unit : p.displayUnit}`}
          aria-describedby={hintId}
          min={p.range.min} max={p.range.max} step={stepSI} value={p.valueSI}
          aria-valuetext={`${fmtDisplay(fromSI(p.valueSI, p.displayUnit))} ${p.displayUnit}`}
          disabled={p.locked}
          onChange={(e) => p.onCommit(cleanSI(Number(e.target.value)))}
          onKeyDown={onSliderKey}
        />
        <input
          type="text" inputMode="decimal" id={`${id}-num`} className="num" value={draft}
          disabled={p.locked} aria-invalid={p.error ? true : undefined}
          aria-describedby={`${hintId}${p.error ? ' ' + errId : ''}`}
          onFocus={() => setEditing(true)}
          onChange={(e) => { setEditing(true); setDraft(e.target.value); }}
          onBlur={commitDraft}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } if (e.key === 'Escape') { setEditing(false); } }}
        />
      </div>
      <div id={hintId} className="hint">
        {p.locked ? (p.lockedReason ?? 'Locked') : `Range ${dmin}–${dmax} ${p.displayUnit}. Enter commits; Shift+Arrow or PageUp/PageDown steps ×10.`}
      </div>
      {p.error && <div id={errId} className="field-error" role="alert"><span aria-hidden="true">⚠ </span>{p.error} Last calculated value kept.</div>}
    </div>
  );
}

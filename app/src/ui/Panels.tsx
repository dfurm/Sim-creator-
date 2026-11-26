import katex from 'katex';
import { useEffect, useRef } from 'react';
import type { Quantity } from '../../../spec/contracts/block';
import { STATUS_PRESENTATION, fromContractValidity, type Applicability, type ApplicabilityRule } from '../core/applicability';
import { anchorElementId } from '../core/anchors';
import { full, sig } from '../views/format';

export function Tex({ tex, text }: { tex: string; text: string }) {
  const html = katex.renderToString(tex, { output: 'htmlAndMathml', throwOnError: false, displayMode: false });
  return (
    <span className="tex">
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
      <span className="sr-only">{text}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: Applicability }) {
  const p = STATUS_PRESENTATION[status];
  return <span className={`status status-${status}`}><span className="status-icon" aria-hidden="true">{p.icon}</span> {p.label}</span>;
}

export function StatusBanner({ overall, rules, revision }: { overall: Applicability; rules: ApplicabilityRule[]; revision: number }) {
  const p = STATUS_PRESENTATION[overall];
  const notModelled = rules.filter((r) => r.affected.length === 0);
  const governing = rules.filter((r) => r.affected.length > 0 && r.status !== 'within');
  return (
    <section className={`banner banner-${overall}`} aria-labelledby="banner-title" data-testid="status-banner">
      <h2 id="banner-title" className="banner-title">
        <span className="status-icon" aria-hidden="true">{p.icon}</span> {p.label}
        <span className="rev"> · outputs at revision {revision}</span>
      </h2>
      {governing.map((r) => (
        <p key={r.ruleId}><strong>{STATUS_PRESENTATION[r.status].icon} {r.ruleId}:</strong> {r.reason} {r.alternative && <em>Next: {r.alternative}</em>}</p>
      ))}
      <p>Model: 1-D steady incompressible continuity (F1), using stipulated assumptions. This is a calculated teaching result, not a measurement.</p>
      {notModelled.map((r) => (
        <p key={r.ruleId} className="not-modelled"><span aria-hidden="true">{STATUS_PRESENTATION[r.status].icon}</span> <strong>Not modelled:</strong> {r.reason} {r.alternative && <>See {r.alternative}</>}</p>
      ))}
    </section>
  );
}

export interface OutputRow { id: string; label: string; q: Quantity; anchor?: string; hidden: boolean; reason?: string }

export function OutputsTable({ rows, revision, active, onActivate }: {
  rows: OutputRow[]; revision: number; active: string | null; onActivate: (anchor: string | null) => void;
}) {
  return (
    <table className="data" data-testid="outputs-table">
      <caption>Calculated outputs (SI), revision {revision}</caption>
      <thead><tr><th scope="col">Quantity</th><th scope="col">Value (3 s.f.)</th><th scope="col">Unit</th><th scope="col">Full precision</th><th scope="col">Applicability</th><th scope="col">Origin</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const v = r.q.value;
          const isActive = !!r.anchor && r.anchor === active;
          return (
            <tr key={r.id} data-output={r.id} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'true' : undefined}>
              <th scope="row">
                {r.anchor ? <a href={`#${anchorElementId(r.anchor)}`} onFocus={() => onActivate(r.anchor!)} onBlur={() => onActivate(null)}
                  onClick={(e) => { e.preventDefault(); document.getElementById(anchorElementId(r.anchor!))?.focus(); }}>{r.label}</a> : r.label}
              </th>
              <td data-testid={`out-${r.id}`}>{r.hidden ? 'hidden until prediction' : v === null ? '—' : typeof v === 'number' ? sig(v) : v}</td>
              <td>{r.q.unit}</td>
              <td className="mono">{r.hidden ? '' : v === null ? (r.reason ?? 'suppressed') : typeof v === 'number' ? full(v) : v}</td>
              <td><StatusBadge status={fromContractValidity(r.q.status)} /></td>
              <td>{r.q.origin}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export interface EquationLine { id: string; anchor?: string; tex: string; text: string }

export function EquationPanel({ lines, revision, active, onActivate }: {
  lines: EquationLine[]; revision: number; active: string | null; onActivate: (a: string | null) => void;
}) {
  return (
    <section aria-labelledby="eq-title" className="card">
      <h2 id="eq-title">Equations with live substitution <span className="rev">(revision {revision})</span></h2>
      <ol className="equations">
        {lines.map((l) => {
          const isActive = !!l.anchor && l.anchor === active;
          return (
            <li key={l.id} className={isActive ? 'is-active' : ''} data-eq={l.id}>
              {l.anchor ? (
                <button type="button" className="eq-term" aria-pressed={isActive}
                  onFocus={() => onActivate(l.anchor!)} onBlur={() => onActivate(null)}
                  onClick={() => document.getElementById(anchorElementId(l.anchor!))?.focus()}>
                  <Tex tex={l.tex} text={l.text} />
                </button>
              ) : <Tex tex={l.tex} text={l.text} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Polite live region announcing a concise committed change. */
export function LiveRegion({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.textContent = message; }, [message]);
  return <div ref={ref} className="sr-only" aria-live="polite" role="status" data-testid="live" />;
}

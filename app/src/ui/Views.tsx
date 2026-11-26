import { useEffect, useMemo, useRef, useState } from 'react';
import { S02Scene, describeS02Scene, type S02SceneData } from '../views/s02Scene';
import { renderStationPlot, renderSweepPlot, type Point } from '../views/plots';
import { sig } from '../views/format';

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** Mounts the framework-free scene; React only owns the container and motion controls. */
export function SceneView({ data, active, onActivate }: {
  data: S02SceneData; active: string | null; onActivate: (a: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<S02Scene | null>(null);
  const reduced = useRef(prefersReducedMotion());
  const [playing, setPlaying] = useState(!reduced.current);
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  useEffect(() => {
    if (!svgRef.current) return;
    sceneRef.current = new S02Scene(svgRef.current, { onAnchorFocus: (a) => onActivateRef.current(a) });
  }, []);
  // Rebuild the scene only when its content changes, so focus on an anchor survives re-renders.
  const key = useMemo(() => JSON.stringify(data), [data]);
  const stable = useMemo(() => data, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { sceneRef.current?.update(stable); }, [stable]);
  useEffect(() => { sceneRef.current?.setActive(active); }, [active, stable]);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (now - last > 33) { sceneRef.current?.setPhase((now - t0) / 1000); last = now; } // ≤30 fps
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stable]);

  return (
    <figure className="card scene-card" aria-labelledby="scene-cap">
      <svg ref={svgRef} data-testid="scene" />
      <figcaption id="scene-cap">
        <div className="scene-controls">
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing} data-testid="motion-toggle">
            {playing ? '⏸ Pause parcel motion' : '▶ Play parcel motion'}
          </button>
          <span className="hint">{reduced.current ? 'Reduced motion is on: motion starts paused.' : 'Motion is illustrative only; the result does not depend on it.'}</span>
        </div>
        <p className="scene-text" data-testid="scene-text"><strong>Text description:</strong> {describeS02Scene(data)}</p>
        <p className="hint">Tab to the sections and arrows in the diagram to link them to the table and equations.</p>
      </figcaption>
    </figure>
  );
}

export function PlotsView({ v1, v2, curve, current, revision }: {
  v1: number; v2: number | null; curve: Point[]; current: Point | null; revision: number;
}) {
  const a = useRef<SVGSVGElement>(null);
  const b = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (a.current) renderStationPlot(a.current, v1, v2, revision);
    if (b.current) renderSweepPlot(b.current, curve, current, revision);
  }, [v1, v2, curve, current, revision]);
  const sample = curve.filter((_, i) => i % 10 === 0 || i === curve.length - 1);
  return (
    <section className="card" aria-labelledby="plots-title">
      <h2 id="plots-title">Graphs <span className="rev">(revision {revision}, calculated series)</span></h2>
      <div className="plots">
        <svg ref={a} data-testid="plot-stations" />
        <svg ref={b} data-testid="plot-sweep" />
      </div>
      <details>
        <summary>Table equivalent of the D₂ sweep</summary>
        <table className="data">
          <caption>v̄₂ against D₂ at the committed Q (calculated)</caption>
          <thead><tr><th scope="col">D₂ [mm]</th><th scope="col">v̄₂ [m/s]</th></tr></thead>
          <tbody>{sample.map((p) => <tr key={p.x}><td>{p.x}</td><td>{sig(p.y)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

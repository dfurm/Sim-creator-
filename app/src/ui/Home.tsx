import { Link } from './router';

export function Home() {
  return (
    <div className="page">
      <header className="masthead">
        <p className="kicker">Furmtech Simulation Library · prototype 0.2.0-proto · not reviewed for release</p>
        <h1>Pipe-flow lesson sequence</h1>
        <p className="objective">From continuity through a contraction, to the ideal energy balance, to real pipe losses. All results are calculated teaching values, not measurements.</p>
      </header>
      <main className="card">
        <h2>Simulations and tasks</h2>
        <ol className="home-list">
          <li><Link to={{ page: 'S02', scenario: 'default' }}>S02 · Continuity through a contraction</Link> (explore and bore design)</li>
          <li><Link to={{ page: 'S02', scenario: 'investigate' }}>S02 · Guided investigation: halve D₂</Link></li>
          <li><Link to={{ page: 'pipe', task: 'explore' }}>Pipe lesson · Contraction and straight run (S07 → S04 → S08): explore</Link></li>
          <li><Link to={{ page: 'pipe', task: 'a' }}>Task (a) · Level contraction: predict velocity and pressure</Link></li>
          <li><Link to={{ page: 'pipe', task: 'b' }}>Task (b) · Ideal vs lossy: account for the difference</Link></li>
          <li><Link to={{ page: 'pipe', task: 'c' }}>Task (c) · Push the model to an applicability limit</Link></li>
        </ol>
        <p className="hint">Works offline, including when this single file is opened from a phone’s file manager: navigation happens inside the page and does not need web addresses. State stays in your browser or in files you download.</p>
      </main>
    </div>
  );
}

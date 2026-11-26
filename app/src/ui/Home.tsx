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
          <li><a href="?sim=S02">S02 · Continuity through a contraction</a> (explore and bore design)</li>
          <li><a href="?sim=S02&amp;scenario=investigate">S02 · Guided investigation: halve D₂</a></li>
          <li><a href="?sim=pipe&amp;task=explore">Pipe lesson · Contraction and straight run (S07 → S04 → S08): explore</a></li>
          <li><a href="?sim=pipe&amp;task=a">Task (a) · Level contraction: predict velocity and pressure</a></li>
          <li><a href="?sim=pipe&amp;task=b">Task (b) · Ideal vs lossy: account for the difference</a></li>
          <li><a href="?sim=pipe&amp;task=c">Task (c) · Push the model to an applicability limit</a></li>
        </ol>
        <p className="hint">Works offline. State stays in your browser or in files you download.</p>
      </main>
    </div>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './ui/styles.css';
import { App } from './ui/App';
import { Home } from './ui/Home';
import { PipeLesson } from './ui/PipeLesson';

function route(): 'S02' | 'pipe' | 'home' {
  try {
    const s = new URLSearchParams(window.location.search).get('sim');
    return s === 'S02' ? 'S02' : s === 'pipe' ? 'pipe' : 'home';
  } catch { return 'home'; }
}

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');
const page = route();
createRoot(root).render(<StrictMode>{page === 'S02' ? <App /> : page === 'pipe' ? <PipeLesson /> : <Home />}</StrictMode>);

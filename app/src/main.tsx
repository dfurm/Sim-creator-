import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './ui/styles.css';
import { App } from './ui/App';
import { Home } from './ui/Home';
import { PipeLesson } from './ui/PipeLesson';
import { RouterProvider, routeToHash } from './ui/router';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');
createRoot(root).render(
  <StrictMode>
    <RouterProvider>
      {(route) => route.page === 'S02' ? <App key={routeToHash(route)} scenarioKey={route.scenario} />
        : route.page === 'pipe' ? <PipeLesson key={routeToHash(route)} task={route.task} />
        : <Home />}
    </RouterProvider>
  </StrictMode>,
);

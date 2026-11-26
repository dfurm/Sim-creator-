import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './ui/styles.css';
import { App } from './ui/App';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');
createRoot(root).render(<StrictMode><App /></StrictMode>);

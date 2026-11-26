import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';

/** Keep only the woff2 sources in KaTeX's @font-face rules (all target browsers support woff2). */
function katexWoff2Only(): Plugin {
  return {
    name: 'katex-woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!/katex(\.min)?\.css$/.test(id.split('?')[0] ?? '')) return null;
      return code.replace(/,\s*url\([^)]*\.woff\)\s*format\("woff"\)/g, '').replace(/,\s*url\([^)]*\.ttf\)\s*format\("truetype"\)/g, '');
    },
  };
}

// `--mode file` inlines all JS, CSS and fonts into one index.html so it opens via file://
// (Chromium blocks external module scripts from a file:// page).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [katexWoff2Only(), react(), ...(mode === 'file' ? [viteSingleFile()] : [])],
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: mode === 'file' ? '../dist/file' : '../dist/app',
    emptyOutDir: true,
    ...(mode === 'file' ? { assetsInlineLimit: () => true } : {}),
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
}));

import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode file` inlines all JS/CSS into one index.html so it opens via file://
// (Chromium blocks external module scripts from a file:// page).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'file' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'file' ? '../dist/file' : '../dist/app',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
}));

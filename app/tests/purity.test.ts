/** Architecture guard: models and kernel have no DOM or framework access; renderers have no framework. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = resolve(import.meta.dirname, '../src');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('purity', () => {
  const pure = [...files(join(src, 'core')), ...files(join(src, 'sims'))];
  it.each(pure.map((p) => [p.slice(src.length + 1), p]))('%s: no React, no DOM', (_n, p) => {
    const s = strip(readFileSync(p, 'utf8'));
    expect(s).not.toMatch(/from ['"]react/);
    expect(s).not.toMatch(/\b(document|window|localStorage|HTMLElement|SVGElement)\b/);
  });
  const views = files(join(src, 'views'));
  it.each(views.map((p) => [p.slice(src.length + 1), p]))('%s: framework-free renderer', (_n, p) => {
    expect(strip(readFileSync(p, 'utf8'))).not.toMatch(/from ['"]react/);
  });
  it('no runtime network calls anywhere in src', () => {
    for (const p of files(src)) expect(strip(readFileSync(p, 'utf8'))).not.toMatch(/\b(fetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|https?:\/\/(?!www\.w3\.org))/);
  });
});

import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs Vitest under strict TypeScript', () => {
    const x: number = 0.1 + 0.2;
    expect(x).toBeCloseTo(0.3, 12);
  });
});

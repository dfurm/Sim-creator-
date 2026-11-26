import { describe, expect, it } from 'vitest';
import { HOME, parseHash, parseSearch, routeToHash, sameRoute, type Route } from '../src/ui/router';

const all: Route[] = [HOME, { page: 'S02', scenario: 'default' }, { page: 'S02', scenario: 'investigate' },
  ...(['explore', 'a', 'b', 'c'] as const).map((task) => ({ page: 'pipe' as const, task }))];

describe('router (no query strings needed)', () => {
  it('every route round-trips through its hash', () => {
    for (const r of all) expect(parseHash(routeToHash(r))).toEqual(r);
  });
  it('non-route hashes (in-page anchors) are ignored', () => {
    expect(parseHash('#anchor-S02-throat_area')).toBeNull();
    expect(parseHash('')).toBeNull();
  });
  it('unknown hash pages fall back safely', () => {
    expect(parseHash('#/nope')).toEqual(HOME);
    expect(parseHash('#/pipe/zz')).toEqual({ page: 'pipe', task: 'explore' });
  });
  it('legacy ?sim= links still resolve', () => {
    expect(parseSearch('?sim=pipe&task=b')).toEqual({ page: 'pipe', task: 'b' });
    expect(parseSearch('?sim=S02&scenario=investigate')).toEqual({ page: 'S02', scenario: 'investigate' });
    expect(parseSearch('')).toBeNull();
  });
  it('sameRoute compares by destination', () => {
    expect(sameRoute({ page: 'pipe', task: 'a' }, { page: 'pipe', task: 'a' })).toBe(true);
    expect(sameRoute(HOME, { page: 'pipe', task: 'a' })).toBe(false);
  });
});

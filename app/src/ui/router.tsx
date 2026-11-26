/**
 * In-app routing that does not depend on URL query strings.
 *
 * Source of truth: React state. Links call navigate(), which updates that state directly
 * (so navigation works even where the browser ignores or rewrites the URL, e.g. a local
 * file opened from an Android file manager via content://). As an extra, the route is
 * mirrored to location.hash ("#/pipe/a") when the browser allows it, so the web build can
 * deep-link and the Back button works. Legacy "?sim=…" URLs are still read at start-up.
 */
import { createContext, useCallback, useContext, useEffect, useState, type MouseEvent, type ReactNode } from 'react';

export type S02Scenario = 'default' | 'investigate';
export type PipeTask = 'explore' | 'a' | 'b' | 'c';
export type Route =
  | { page: 'home' }
  | { page: 'S02'; scenario: S02Scenario }
  | { page: 'pipe'; task: PipeTask };

export const HOME: Route = { page: 'home' };

/** Hash form, e.g. "#/S02/investigate", "#/pipe/a", "#/". */
export function routeToHash(r: Route): string {
  if (r.page === 'S02') return `#/S02/${r.scenario}`;
  if (r.page === 'pipe') return `#/pipe/${r.task}`;
  return '#/';
}

const TASKS: readonly PipeTask[] = ['explore', 'a', 'b', 'c'];

/** Parse "#/…" (returns null for other hashes such as in-page anchors). */
export function parseHash(hash: string): Route | null {
  if (!hash.startsWith('#/')) return null;
  const [page, sub] = hash.slice(2).split('/');
  if (!page) return HOME;
  if (page === 'S02') return { page: 'S02', scenario: sub === 'investigate' ? 'investigate' : 'default' };
  if (page === 'pipe') return { page: 'pipe', task: TASKS.includes(sub as PipeTask) ? (sub as PipeTask) : 'explore' };
  return HOME;
}

/** Legacy query form "?sim=S02&scenario=…" / "?sim=pipe&task=…". */
export function parseSearch(search: string): Route | null {
  let p: URLSearchParams;
  try { p = new URLSearchParams(search); } catch { return null; }
  const sim = p.get('sim');
  if (sim === 'S02') return { page: 'S02', scenario: p.get('scenario') === 'investigate' ? 'investigate' : 'default' };
  if (sim === 'pipe') {
    const t = p.get('task');
    return { page: 'pipe', task: TASKS.includes(t as PipeTask) ? (t as PipeTask) : 'explore' };
  }
  return null;
}

export function initialRoute(): Route {
  try {
    return parseHash(window.location.hash) ?? parseSearch(window.location.search) ?? HOME;
  } catch { return HOME; }
}

export function sameRoute(a: Route, b: Route): boolean {
  return routeToHash(a) === routeToHash(b);
}

interface RouterValue { route: Route; navigate: (r: Route) => void }
const RouterContext = createContext<RouterValue>({ route: HOME, navigate: () => undefined });

export function RouterProvider({ children }: { children: (route: Route) => ReactNode }) {
  const [route, setRoute] = useState<Route>(initialRoute);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    try {
      const h = routeToHash(r);
      if (window.location.hash !== h) window.history.pushState(null, '', h);
    } catch { /* URL not writable here (some local-file viewers): in-app state still navigates */ }
    try { window.scrollTo(0, 0); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onPop = () => { const r = parseHash(window.location.hash); if (r) setRoute(r); };
    window.addEventListener('hashchange', onPop);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('hashchange', onPop); window.removeEventListener('popstate', onPop); };
  }, []);

  // Move focus to the new page heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    const t = setTimeout(() => {
      const h = document.querySelector<HTMLElement>('h1');
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }, 0);
    return () => clearTimeout(t);
  }, [route]);

  return <RouterContext.Provider value={{ route, navigate }}>{children(route)}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  return useContext(RouterContext);
}

/**
 * A real link (keyboard, middle-click and "open in new tab" still work on the web build via the
 * hash href) whose click is handled in-app, so it never relies on the browser loading a URL.
 */
export function Link({ to, children, current, className, testId }: {
  to: Route; children: ReactNode; current?: boolean; className?: string; testId?: string;
}) {
  const { navigate } = useRouter();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={routeToHash(to)} onClick={onClick} aria-current={current ? 'page' : undefined}
      className={className} data-route={routeToHash(to)} {...(testId ? { 'data-testid': testId } : {})}>
      {children}
    </a>
  );
}

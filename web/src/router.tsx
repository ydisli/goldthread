import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

/** Minimal hash router: works from file servers, PWAs and the dev server alike. */

function current(): { path: string; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '') || '/today';
  const [path, qs] = raw.split('?');
  return { path: path || '/today', query: new URLSearchParams(qs ?? '') };
}

let snapshot = current();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  snapshot = current();
  for (const l of listeners) l();
});

export function useRoute() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot);
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (opts.replace) history.replaceState(null, '', hash);
  else history.pushState(null, '', hash);
  snapshot = current();
  for (const l of listeners) l();
  document.querySelector('main')?.scrollTo?.(0, 0);
}

export function setQuery(params: Record<string, string | undefined>) {
  const { path, query } = current();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') query.delete(k);
    else query.set(k, v);
  }
  const qs = query.toString();
  navigate(`${path}${qs ? `?${qs}` : ''}`, { replace: true });
}

/** Match "/stakeholders/:id" against a path; returns params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, children, ...rest }: { to: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    rest.onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={`#${to}`} {...rest} onClick={onClick}>{children}</a>;
}

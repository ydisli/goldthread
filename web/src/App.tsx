import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from './store.ts';
import { match, navigate, useRoute } from './router.tsx';
import { CommandPalette, MobileNav, NewWorkspaceModal, QuickCapture, SectionNav, Shortcuts, Sidebar, openCapture } from './shell.tsx';
import { EditorHost } from './entity/editor.tsx';
import { Toasts, Empty } from './ui/kit.tsx';
import { Icon } from './ui/icons.tsx';
import { ROUTES } from './routes.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { AuthScreen, JoinScreen, ResetScreen } from './pages/auth/Auth.tsx';

export function App() {
  const s = useStore();
  const { path, query } = useRoute();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (path === '/capture' && s.status === 'ready') { navigate('/today', { replace: true }); setTimeout(() => openCapture(), 50); }
  }, [path, s.status]);

  // Each page gets its own tab title, and after you navigate, focus moves to the new page's
  // heading so screen readers announce it and Tab continues from there.
  const firstPage = useRef(true);
  useEffect(() => {
    if (s.status !== 'ready' && s.status !== 'offline') return;
    const id = requestAnimationFrame(() => {
      const h1 = document.querySelector<HTMLElement>('main h1');
      document.title = h1?.textContent ? `${h1.textContent} · Throughline` : 'Throughline';
      if (firstPage.current) { firstPage.current = false; return; }
      if (h1 && !document.querySelector('.drawer, [role="dialog"]')) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(id);
  }, [path, s.status]);

  // Invite links work whether or not you are signed in.
  const join = match('/join/:token', path);
  if (join) return <><JoinScreen token={join.token} /><Toasts /></>;
  const reset = match('/reset/:token', path);
  if (reset) return <><ResetScreen token={reset.token} /><Toasts /></>;
  if (s.status === 'loading' && !s.auth) return <div className="boot"><span className="ws-mark">T</span></div>;
  if (s.status === 'auth') return <><AuthScreen /><Toasts /></>;

  let page: ReactNode = null;
  for (const r of ROUTES) {
    const params = match(r.path, path);
    if (params) { page = r.render(params, query); break; }
  }
  const noWorkspace = s.status === 'ready' && !s.auth?.current;

  return (
    <div className="app">
      <button className="skip-link" onClick={() => document.getElementById('main')?.focus()}>Skip to content</button>
      <Sidebar open={menu} onNavigate={() => setMenu(false)} />
      <div className={`sidebar-scrim ${menu ? 'open' : ''}`} onClick={() => setMenu(false)} />
      <div className="main-col">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <span className="ws-name" style={{ flex: 1 }}>{s.auth?.current?.name ?? 'Throughline'}</span>
        </header>
        <main id="main" tabIndex={-1}>
          {s.status === 'offline' && <div className="banner">You're offline. Showing the last copy of this workspace — changes are paused until the server is back.</div>}
          {s.status === 'loading' && <div className="page"><Empty icon="clock">Opening workspace…</Empty></div>}
          {s.status === 'error' && <div className="page"><Empty icon="circle-alert">Could not reach the Throughline server: {s.error}. Is <code>npm run dev</code> running?</Empty></div>}
          {noWorkspace && <NoWorkspace />}
          {!noWorkspace && (s.status === 'ready' || s.status === 'offline') && (
            <>
              <SectionNav />
              <ErrorBoundary resetKey={path}>{page ?? <div className="page"><Empty icon="search">Page not found. <a href="#/today">Go home</a></Empty></div>}</ErrorBoundary>
            </>
          )}
        </main>
      </div>
      <MobileNav onMenu={() => setMenu(true)} />
      <EditorHost />
      <CommandPalette />
      <QuickCapture />
      <Shortcuts />
      <Toasts />
    </div>
  );
}

function NoWorkspace() {
  const [open, setOpen] = useState(false);
  return (
    <div className="page">
      <Empty icon="boxes">
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>You're not in any workspace yet</div>
        <div>Create one for yourself, or ask a teammate to send you an invite link.</div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setOpen(true)}><Icon name="plus" size={14} />New workspace</button>
      </Empty>
      {open && <NewWorkspaceModal onClose={() => setOpen(false)} />}
    </div>
  );
}

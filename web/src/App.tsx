import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from './store.ts';
import { match, navigate, useRoute } from './router.tsx';
import { CommandPalette, MobileNav, QuickCapture, Sidebar, openCapture, openPalette } from './shell.tsx';
import { EditorHost } from './entity/editor.tsx';
import { Toasts, Empty } from './ui/kit.tsx';
import { Icon } from './ui/icons.tsx';
import { ROUTES } from './routes.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';

export function App() {
  const s = useStore();
  const { path, query } = useRoute();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (path === '/capture') { navigate('/today', { replace: true }); setTimeout(() => openCapture(), 50); }
  }, [path]);

  let page: ReactNode = null;
  for (const r of ROUTES) {
    const params = match(r.path, path);
    if (params) { page = r.render(params, query); break; }
  }

  return (
    <div className="app">
      <Sidebar open={menu} onNavigate={() => setMenu(false)} />
      <div className={`sidebar-scrim ${menu ? 'open' : ''}`} onClick={() => setMenu(false)} />
      <div className="main-col">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <button className="search-trigger" onClick={openPalette}><Icon name="search" size={15} />Search, jump, create…<kbd>⌘K</kbd></button>
          <span className="spacer" />
          <button className="btn btn-primary hide-mobile" onClick={() => openCapture()} title="Quick capture (c)"><Icon name="zap" size={14} />Capture</button>
        </header>
        <main>
          {s.status === 'loading' && <div className="page"><Empty icon="clock">Loading workspace…</Empty></div>}
          {s.status === 'error' && <div className="page"><Empty icon="circle-alert">Could not reach the Throughline server: {s.error}. Is <code>npm run dev</code> running?</Empty></div>}
          {(s.status === 'ready' || s.status === 'offline') && <ErrorBoundary resetKey={path}>{page ?? <div className="page"><Empty icon="search">Page not found. <a href="#/today">Go to today</a></Empty></div>}</ErrorBoundary>}
        </main>
      </div>
      <MobileNav onMenu={() => setMenu(true)} />
      <EditorHost />
      <CommandPalette />
      <QuickCapture />
      <Toasts />
    </div>
  );
}

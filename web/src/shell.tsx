import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ENTITY_MAP, ENTITIES, nameOf } from '../../core/schema.ts';
import { SearchIndex } from '../../core/engines/search.ts';
import { similar } from '../../core/engines/clustering.ts';
import { isoDate } from '../../core/util.ts';
import { createEntity, now, useGraph, useStore } from './store.ts';
import { Link, navigate, useRoute } from './router.tsx';
import { ALL_NAV, NAV } from './nav.ts';
import { Icon } from './ui/icons.tsx';
import { Modal, errorToast, toast } from './ui/kit.tsx';
import { EntityPicker } from './entity/fields.tsx';
import { openEditor } from './entity/editor.tsx';
import { hrefOf } from './entity/links.ts';

// ---------------- theme ----------------

export function useTheme(): ['light' | 'dark' | 'system', (t: 'light' | 'dark' | 'system') => void] {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try { return (localStorage.getItem('tl.theme') as 'light' | 'dark') ?? 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('tl.theme', theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme];
}

// ---------------- sidebar ----------------

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const g = useGraph();
  const s = useStore();
  const { path } = useRoute();
  const today = now();
  const [theme, setTheme] = useTheme();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('tl.nav') ?? '{}'); } catch { return {}; }
  });
  const toggle = (id: string) => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    try { localStorage.setItem('tl.nav', JSON.stringify(next)); } catch { /* ignore */ }
  };
  const counts = useMemo(() => {
    const out = new Map<string, { n: number; alert?: boolean } | null>();
    for (const item of ALL_NAV) out.set(item.to, item.count ? item.count(g, today) : null);
    return out;
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = (to: string) => path === to || (to !== '/today' && to.split('/').length > 2 && path.startsWith(`${to}/`)) || (to === '/stakeholders' && path.startsWith('/stakeholders/p/'));

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Main">
      <div className="brand">
        <img src="/icon.svg" alt="" />
        <div style={{ minWidth: 0 }}>
          <div className="brand-name">Throughline</div>
          <div className="brand-ws">{s.settings.workspaceName}</div>
        </div>
      </div>
      <div className="nav">
        {NAV.map((area) => (
          <div className="nav-area" key={area.id}>
            <button className="nav-area-title" onClick={() => toggle(area.id)} aria-expanded={!collapsed[area.id]}>
              {area.label}<Icon name={collapsed[area.id] ? 'chevron-right' : 'chevron-down'} size={13} />
            </button>
            {!collapsed[area.id] && area.items.map((item) => {
              const c = counts.get(item.to);
              return (
                <Link key={item.to} to={item.to} className={`nav-link ${active(item.to) ? 'active' : ''}`} onClick={onNavigate}>
                  <Icon name={item.icon} size={16} />{item.label}
                  {c && <span className={`nav-count ${c.alert ? 'alert' : ''}`}>{c.n}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <span className={`live-dot ${s.live ? 'on' : ''}`} title={s.live ? 'Live sync on' : 'Not connected'} />
        <span>{s.status === 'offline' ? 'Offline (read-only)' : s.live ? 'Live' : 'Connecting…'}{s.ai.enabled ? ' · Claude' : ''}</span>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm btn-icon" title={`Theme: ${theme}`} onClick={() => setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system')}>
          <Icon name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'sliders-horizontal'} size={14} />
        </button>
      </div>
    </nav>
  );
}

// ---------------- command palette ----------------

let paletteOpener: (() => void) | null = null;
export const openPalette = () => paletteOpener?.();

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hl, setHl] = useState(0);
  const g = useGraph();
  useEffect(() => {
    paletteOpener = () => { setOpen(true); setQ(''); setHl(0); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); setQ(''); setHl(0); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); paletteOpener = null; };
  }, []);
  const index = useMemo(() => (open ? new SearchIndex([...g.byId.values()]) : null), [g, open]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const items: { group: string; label: ReactNode; sub?: string; icon: string; run: () => void }[] = [];
    const nav = ALL_NAV.filter((n) => !t || `${n.label} ${n.keywords ?? ''}`.toLowerCase().includes(t)).slice(0, t ? 6 : 8);
    for (const n of nav) items.push({ group: 'Go to', label: n.label, icon: n.icon, run: () => navigate(n.to) });
    if (t && index) {
      for (const h of index.search(q, 12)) {
        items.push({ group: 'Results', label: <>{h.entity.key && <span className="key">{h.entity.key} </span>}{nameOf(h.entity)}</>, sub: `${ENTITY_MAP[h.entity.type]?.label} · ${h.snippet}`, icon: ENTITY_MAP[h.entity.type]?.icon ?? 'circle-dot', run: () => navigate(hrefOf(h.entity)) });
      }
      items.push({ group: 'Ask', label: `Ask Throughline: “${q.trim()}”`, icon: 'sparkles', run: () => navigate(`/ask?q=${encodeURIComponent(q.trim())}`) });
    }
    const creatable = ENTITIES.filter((d) => !['comment', 'vision'].includes(d.type) && (!t || `new ${d.label}`.toLowerCase().includes(t))).slice(0, t ? 5 : 0);
    for (const d of creatable) items.push({ group: 'Create', label: `New ${d.label.toLowerCase()}`, icon: d.icon, run: () => openEditor({ type: d.type }) });
    if (!t || 'capture'.includes(t)) items.push({ group: 'Create', label: 'Quick capture', sub: 'Evidence, request, interaction, decision, risk', icon: 'zap', run: () => openCapture() });
    return items;
  }, [q, index]);
  if (!open) return null;
  const run = (i: number) => { const r = results[i]; if (!r) return; setOpen(false); r.run(); };
  let lastGroup = '';
  return (
    <Modal onClose={() => setOpen(false)} label="Command palette">
      <input
        className="palette-input" autoFocus placeholder="Search everything, jump to a page, create…" value={q}
        onChange={(e) => { setQ(e.target.value); setHl(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => Math.min(results.length - 1, h + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); }
          if (e.key === 'Enter') { e.preventDefault(); run(hl); }
        }}
      />
      <div className="palette-list">
        {results.map((r, i) => {
          const head = r.group !== lastGroup ? <div className="palette-group">{r.group}</div> : null;
          lastGroup = r.group;
          return (
            <div key={i}>
              {head}
              <div className={`palette-item ${i === hl ? 'hl' : ''}`} onMouseEnter={() => setHl(i)} onClick={() => run(i)}>
                <Icon name={r.icon} size={16} className="muted" />
                <div style={{ minWidth: 0 }}>
                  <div className="ellipsis">{r.label}</div>
                  {r.sub && <div className="snip ellipsis">{r.sub}</div>}
                </div>
              </div>
            </div>
          );
        })}
        {!results.length && <div className="empty">No matches.</div>}
      </div>
    </Modal>
  );
}

// ---------------- quick capture ----------------

type CaptureKind = 'evidence' | 'request' | 'interaction' | 'decision' | 'raid' | 'bet';
const CAPTURE_KINDS: { id: CaptureKind; label: string; icon: string; hint: string }[] = [
  { id: 'evidence', label: 'Signal', icon: 'quote', hint: 'A customer quote, ticket, call note or data point' },
  { id: 'request', label: 'Request', icon: 'inbox', hint: 'Something a stakeholder asked for' },
  { id: 'interaction', label: 'Interaction', icon: 'message-square', hint: 'You just talked to someone — log it with sentiment' },
  { id: 'decision', label: 'Decision', icon: 'git-branch', hint: 'A decision that was just made' },
  { id: 'raid', label: 'Risk / issue', icon: 'triangle-alert', hint: 'Something that could go (or went) wrong' },
  { id: 'bet', label: 'Idea', icon: 'rocket', hint: 'A solution idea to explore later' },
];

let captureOpener: ((kind?: CaptureKind) => void) | null = null;
export const openCapture = (kind?: CaptureKind) => captureOpener?.(kind);

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CaptureKind>('evidence');
  const [text, setText] = useState('');
  const [who, setWho] = useState<string[]>([]);
  const [account, setAccount] = useState('');
  const [source, setSource] = useState('support');
  const [sentiment, setSentiment] = useState(0);
  const [busy, setBusy] = useState(false);
  const g = useGraph();
  useEffect(() => {
    captureOpener = (k) => { setOpen(true); if (k) setKind(k); };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); captureOpener = null; };
  }, []);
  const dupes = useMemo(() => (open && kind === 'evidence' && text.length > 12 ? similar(text, g.all('evidence')).slice(0, 3) : []), [open, kind, text, g]);
  if (!open) return null;
  const close = () => { setOpen(false); setText(''); setWho([]); setAccount(''); setSentiment(0); };
  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const today = isoDate(now());
    const title = text.trim().split('\n')[0].slice(0, 160);
    const detail = text.trim().length > title.length ? text.trim() : undefined;
    try {
      let e;
      if (kind === 'evidence') e = await createEntity('evidence', { title, detail, source, account: account || undefined, date: today, relayedById: who[0], kind: source === 'analytics' ? 'did' : 'said' });
      else if (kind === 'request') e = await createEntity('request', { title, description: detail, requesterId: who[0], receivedAt: today, status: 'new' });
      else if (kind === 'interaction') {
        if (!who.length) { toast('Pick who you talked to', 'error'); setBusy(false); return; }
        e = await createEntity('interaction', { title, summary: detail, stakeholderIds: who, date: today, sentiment, kind: 'meeting' });
      } else if (kind === 'decision') e = await createEntity('decision', { title, context: detail, date: today, status: 'decided', deciderIds: who });
      else if (kind === 'raid') e = await createEntity('raid', { title, description: detail, kind: 'risk', ownerId: who[0], status: 'open' });
      else e = await createEntity('bet', { title, hypothesis: detail, status: 'idea', horizon: 'later' });
      toast(`${ENTITY_MAP[e.type].label} captured`, 'info', { label: 'Open', run: () => navigate(hrefOf(e)) });
      close();
    } catch (err) { errorToast(err); } finally { setBusy(false); }
  };
  const k = CAPTURE_KINDS.find((x) => x.id === kind)!;
  return (
    <Modal onClose={close} label="Quick capture">
      <div style={{ padding: 16 }} className="col">
        <div className="row-wrap" style={{ gap: 6 }}>
          {CAPTURE_KINDS.map((c) => (
            <button key={c.id} className={`btn btn-sm ${kind === c.id ? 'btn-primary' : ''}`} onClick={() => setKind(c.id)}><Icon name={c.icon} size={13} />{c.label}</button>
          ))}
        </div>
        <div className="small muted">{k.hint}</div>
        <textarea className="textarea" autoFocus rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="First line becomes the title…" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save(); }} />
        <div className="form-grid">
          <div className="field">
            <label>{kind === 'interaction' ? 'With' : kind === 'request' ? 'Requested by' : kind === 'decision' ? 'Decided by' : kind === 'raid' ? 'Owner' : 'Relayed by'}</label>
            <EntityPicker targets={['stakeholder']} value={who} onChange={setWho} single={kind !== 'interaction' && kind !== 'decision'} />
          </div>
          {kind === 'evidence' && (
            <>
              <div className="field">
                <label>Source</label>
                <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
                  {ENTITY_MAP.evidence.fields.find((f) => f.key === 'source')!.options!.map((o) => <option key={o} value={o}>{o.replace('-', ' ')}</option>)}
                </select>
              </div>
              <div className="field"><label>Account</label><input className="input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="e.g. Contoso" /></div>
            </>
          )}
          {kind === 'interaction' && (
            <div className="field">
              <label>How did it go?</label>
              <div className="scale">{[-2, -1, 0, 1, 2].map((v) => <button key={v} className={sentiment === v ? 'on' : ''} onClick={() => setSentiment(v)}>{v > 0 ? `+${v}` : v}</button>)}</div>
            </div>
          )}
        </div>
        {dupes.length > 0 && (
          <div className="small"><span className="muted">Similar signals already captured:</span> {dupes.map((d) => <span key={d.entity.id} className="chip" style={{ margin: 2 }}>{nameOf(d.entity)}</span>)}</div>
        )}
        <div className="row">
          <span className="small muted">Tip: press <kbd>c</kbd> anywhere to capture, <kbd>⌘</kbd><kbd>↵</kbd> to save.</span>
          <span className="spacer" />
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !text.trim()}>Capture</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- mobile nav ----------------

export function MobileNav({ onMenu }: { onMenu: () => void }) {
  const { path } = useRoute();
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      <Link to="/today" className={path === '/today' ? 'on' : ''}><Icon name="house" size={20} /><span>Today</span></Link>
      <Link to="/stakeholders" className={path.startsWith('/stakeholders') ? 'on' : ''}><Icon name="users" size={20} /><span>People</span></Link>
      <button className="capture" onClick={() => openCapture()}><span><Icon name="plus" size={20} /></span><span style={{ color: 'var(--text-3)' }}>Capture</span></button>
      <Link to="/stakeholders/approvals" className={path.startsWith('/stakeholders/approvals') ? 'on' : ''}><Icon name="clipboard-check" size={20} /><span>Approvals</span></Link>
      <button onClick={onMenu}><Icon name="menu" size={20} /><span>More</span></button>
    </nav>
  );
}

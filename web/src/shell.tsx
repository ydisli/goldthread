import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ENTITY_MAP, ENTITIES, nameOf } from '../../core/schema.ts';
import { SearchIndex } from '../../core/engines/search.ts';
import { similar } from '../../core/engines/clustering.ts';
import { isoDate } from '../../core/util.ts';
import { api, can, createEntity, logout, now, switchWorkspace, updateMe, useGraph, useMe, useStore, type Role } from './store.ts';
import { Link, navigate, useRoute } from './router.tsx';
import { ALL_TOOLS, ASK, DEFAULT_PINS, GUIDE, HOME, INBOX, SECTIONS, sectionOf, type Tool } from './nav.ts';
import { Icon } from './ui/icons.tsx';
import { Avatar, Dropdown, Modal, Seg, errorToast, toast } from './ui/kit.tsx';
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

// ---------------- pins ----------------

export function usePins(): [string[], (id: string) => void] {
  const me = useMe();
  const pins = me?.prefs.pinned ?? DEFAULT_PINS[me?.prefs.persona ?? 'both'];
  const toggle = (id: string) => {
    const next = pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
    updateMe({ prefs: { pinned: next } }).catch(errorToast);
  };
  return [pins, toggle];
}

// ---------------- sidebar ----------------

function useCounts() {
  const g = useGraph();
  return useMemo(() => {
    const today = now();
    const out = new Map<string, { n: number; alert?: boolean } | null>();
    for (const t of ALL_TOOLS) out.set(t.id, t.count ? t.count(g, today) : null);
    return out;
  }, [g]);
}

function NavLink({ tool, active, count, onNavigate }: { tool: Tool; active: boolean; count?: { n: number; alert?: boolean } | null; onNavigate: () => void }) {
  return (
    <Link to={tool.to} className={`nav-link ${active ? 'active' : ''}`} onClick={onNavigate} title={tool.blurb}>
      <Icon name={tool.icon} size={16} />{tool.label}
      {count && <span className={`nav-count ${count.alert ? 'alert' : ''}`}>{count.n}</span>}
    </Link>
  );
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const s = useStore();
  const { path } = useRoute();
  const counts = useCounts();
  const [pins] = usePins();
  const here = sectionOf(path);
  const pinned = pins.map((id) => ALL_TOOLS.find((t) => t.id === id)).filter((t): t is Tool => !!t);
  const isActive = (t: Tool) => here?.tool.id === t.id || path === t.to;

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Main">
      <WorkspaceSwitcher onNavigate={onNavigate} />
      <div className="side-actions">
        <button className="btn btn-sm btn-ghost" onClick={openPalette}><Icon name="search" size={14} />Search<kbd style={{ marginLeft: 'auto' }}>⌘K</kbd></button>
        {can('editor') && <button className="btn btn-sm btn-ghost" onClick={() => openCapture()} title="Capture something (c)"><Icon name="plus" size={14} />Capture</button>}
      </div>
      <div className="nav">
        <NavLink tool={HOME} active={path === HOME.to} count={counts.get(HOME.id)} onNavigate={onNavigate} />
        <NavLink tool={INBOX} active={path === INBOX.to} count={counts.get(INBOX.id)} onNavigate={onNavigate} />
        <NavLink tool={ASK} active={path === ASK.to} onNavigate={onNavigate} />
        <NavLink tool={GUIDE} active={path === GUIDE.to || path.startsWith('/guide/')} onNavigate={onNavigate} />

        <div className="nav-group">
          <div className="nav-title">Pinned<Link to="/tools" onClick={onNavigate}>Edit</Link></div>
          {pinned.map((t) => <NavLink key={t.id} tool={t} active={isActive(t)} count={counts.get(t.id)} onNavigate={onNavigate} />)}
          {!pinned.length && <Link to="/tools" className="nav-link" onClick={onNavigate}><Icon name="pin" size={16} />Pin your tools</Link>}
        </div>

        <div className="nav-group">
          <div className="nav-title">All tools<Link to="/tools" onClick={onNavigate}>Browse</Link></div>
          {SECTIONS.map((sec) => (
            <Link key={sec.id} to={`/s/${sec.id}`} className={`nav-link ${here?.section.id === sec.id || path === `/s/${sec.id}` ? 'active' : ''}`} onClick={onNavigate} title={sec.blurb}>
              <Icon name={sec.icon} size={16} />{sec.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="sidebar-foot">
        <UserMenu onNavigate={onNavigate} />
        <div className="row small muted" style={{ padding: '2px 10px 2px', gap: 6 }}>
          <span className={`live-dot ${s.live ? 'on' : ''}`} />
          <span className="ellipsis">{s.status === 'offline' ? 'Offline — read only' : s.live ? 'Synced' : 'Connecting…'}{s.ai.enabled ? ` · AI: ${s.ai.provider === 'anthropic' ? 'Claude' : s.ai.model ?? 'on'}` : ''}</span>
        </div>
      </div>
    </nav>
  );
}

const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };

function WorkspaceSwitcher({ onNavigate }: { onNavigate: () => void }) {
  const s = useStore();
  const [creating, setCreating] = useState(false);
  const cur = s.auth?.current;
  const list = s.auth?.workspaces ?? [];
  const go = (to: string, close: () => void) => { close(); onNavigate(); navigate(to); };
  return (
    <>
      <Dropdown width={260} trigger={(toggle) => (
        <button className="ws-switch" onClick={toggle} aria-label="Switch workspace">
          <span className="ws-mark">{(cur?.name ?? 'T').trim()[0]?.toUpperCase()}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <div className="ws-name">{cur?.name ?? 'Throughline'}</div>
            <div className="ws-kind">{cur ? `${cur.kind === 'personal' ? 'Personal' : 'Team'} · ${ROLE_LABEL[cur.role]}${s.members.length > 1 ? ` · ${s.members.length} people` : ''}` : 'No workspace'}</div>
          </span>
          <Icon name="chevrons-up-down" size={14} className="muted" />
        </button>
      )}>
        {(close) => (
          <>
            <div className="menu-label">Workspaces</div>
            {list.map((w) => (
              <button key={w.id} className="menu-item" onClick={() => { close(); if (w.id !== cur?.id) switchWorkspace(w.id).catch(errorToast); }}>
                <span className="ws-mark" style={{ width: 22, height: 22, fontSize: 11, borderRadius: 6 }}>{w.name.trim()[0]?.toUpperCase()}</span>
                <span style={{ flex: 1, minWidth: 0 }} className="ellipsis">{w.name}</span>
                <span className="small muted">{ROLE_LABEL[w.role]}</span>
                {w.id === cur?.id && <Icon name="check" size={14} />}
              </button>
            ))}
            <button className="menu-item" onClick={() => { close(); setCreating(true); }}><Icon name="plus" size={15} />New workspace…</button>
            {cur && (
              <>
                <div className="menu-sep" />
                <button className="menu-item" onClick={() => go('/workspace/settings?tab=workspace', close)}><Icon name="settings" size={15} />Workspace settings</button>
                {can('admin') && <button className="menu-item" onClick={() => go('/workspace/settings?tab=members', close)}><Icon name="user-plus" size={15} />Invite people & access</button>}
                <button className="menu-item" onClick={() => go('/workspace/activity', close)}><Icon name="history" size={15} />Activity</button>
              </>
            )}
          </>
        )}
      </Dropdown>
      {creating && <NewWorkspaceModal onClose={() => setCreating(false)} />}
    </>
  );
}

export function NewWorkspaceModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'team' | 'personal'>('team');
  const [sample, setSample] = useState<'empty' | 'it' | 'saas'>('empty');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const ws = await api<{ id: string }>('/api/workspaces', { method: 'POST', json: { name, kind, sample } });
      onClose();
      await switchWorkspace(ws.id);
      toast(`Workspace “${name.trim()}” created`);
    } catch (err) { errorToast(err); setBusy(false); }
  };
  return (
    <Modal onClose={onClose} label="New workspace">
      <form className="col" style={{ padding: 20, gap: 14 }} onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <div>
          <h2>New workspace</h2>
          <div className="small muted">A workspace holds one product or programme. Invite your team to it, or keep it to yourself.</div>
        </div>
        <div className="field"><label>Name</label><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Identity & Access, Data Platform" /></div>
        <div className="field"><label>Who is it for?</label><Seg options={[{ id: 'team', label: 'My team' }, { id: 'personal', label: 'Just me' }]} value={kind} onChange={setKind} /></div>
        <div className="field">
          <label>Start with</label>
          <Seg options={[{ id: 'empty', label: 'Blank' }, { id: 'it', label: 'IT sample' }, { id: 'saas', label: 'SaaS sample' }]} value={sample} onChange={setSample} />
          <span className="help">{sample === 'empty' ? 'Nothing but you as a stakeholder.' : sample === 'it' ? 'An internal IT service platform, to explore with.' : 'A B2B payments product, to explore with.'}</span>
        </div>
        <div className="row"><span className="spacer" /><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !name.trim()}>Create workspace</button></div>
      </form>
    </Modal>
  );
}

function UserMenu({ onNavigate }: { onNavigate: () => void }) {
  const me = useMe();
  const [theme, setTheme] = useTheme();
  if (!me) return null;
  const go = (to: string, close: () => void) => { close(); onNavigate(); navigate(to); };
  return (
    <Dropdown up width={250} trigger={(toggle) => (
      <button className="user-chip" onClick={toggle} aria-label="Account menu">
        <Avatar name={me.name} size="sm" />
        <span style={{ minWidth: 0, flex: 1 }}>
          <div className="ellipsis" style={{ fontWeight: 560, fontSize: 13 }}>{me.name}</div>
          <div className="ellipsis small muted">{me.title ?? me.email}</div>
        </span>
        <Icon name="ellipsis" size={15} className="muted" />
      </button>
    )}>
      {(close) => (
        <>
          <div style={{ padding: '6px 9px 8px' }}>
            <div style={{ fontWeight: 600 }}>{me.name}</div>
            <div className="small muted ellipsis">{me.email}{me.demo ? ' · demo account' : ''}</div>
          </div>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => go('/workspace/settings?tab=profile', close)}><Icon name="circle-user" size={15} />Profile & preferences</button>
          <button className="menu-item" onClick={() => go('/workspace/settings?tab=connect', close)}><Icon name="plug" size={15} />Connect tools & AI</button>
          <button className="menu-item" onClick={() => go('/tools', close)}><Icon name="pin" size={15} />Choose pinned tools</button>
          <button className="menu-item" onClick={() => { close(); openShortcuts(); }}><Icon name="keyboard" size={15} />Keyboard shortcuts<kbd style={{ marginLeft: 'auto' }}>?</kbd></button>
          <div className="menu-sep" />
          <div className="menu-label">Theme</div>
          <div style={{ padding: '2px 6px 6px' }}>
            <Seg options={[{ id: 'system', label: 'Auto' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} value={theme} onChange={setTheme} />
          </div>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => { close(); void logout(); }}><Icon name="log-out" size={15} />Sign out</button>
        </>
      )}
    </Dropdown>
  );
}

/** Tabs across the top of a tool, showing the other tools in the same section. */
export function SectionNav() {
  const { path } = useRoute();
  const here = sectionOf(path);
  const [pins, togglePin] = usePins();
  if (!here) return null;
  const pinned = pins.includes(here.tool.id);
  return (
    <div className="section-nav no-print">
      <Link to={`/s/${here.section.id}`} className="label" style={{ border: 0 }}>{here.section.label}</Link>
      {here.section.tools.map((t) => <Link key={t.id} to={t.to} className={t.id === here.tool.id ? 'on' : ''}>{t.label}</Link>)}
      <button className="btn btn-ghost btn-sm pin hide-mobile" onClick={() => togglePin(here.tool.id)} title={pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}>
        <Icon name={pinned ? 'pin-off' : 'pin'} size={13} />{pinned ? 'Pinned' : 'Pin'}
      </button>
    </div>
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
    const nav = ALL_TOOLS.filter((n) => !t || `${n.label} ${n.keywords ?? ''} ${n.blurb}`.toLowerCase().includes(t)).slice(0, t ? 6 : 8);
    for (const n of nav) items.push({ group: 'Go to', label: n.label, icon: n.icon, run: () => navigate(n.to) });
    if (t && index) {
      for (const h of index.search(q, 12)) {
        items.push({ group: 'Results', label: <>{h.entity.key && <span className="key">{h.entity.key} </span>}{nameOf(h.entity)}</>, sub: `${ENTITY_MAP[h.entity.type]?.label} · ${h.snippet}`, icon: ENTITY_MAP[h.entity.type]?.icon ?? 'circle-dot', run: () => navigate(hrefOf(h.entity)) });
      }
      items.push({ group: 'Ask', label: `Ask Throughline: “${q.trim()}”`, icon: 'sparkles', run: () => navigate(`/ask?q=${encodeURIComponent(q.trim())}`) });
    }
    const creatable = !can('editor') ? [] : ENTITIES.filter((d) => !['comment', 'vision'].includes(d.type) && (!t || `new ${d.label}`.toLowerCase().includes(t))).slice(0, t ? 5 : 0);
    for (const d of creatable) items.push({ group: 'Create', label: `New ${d.label.toLowerCase()}`, icon: d.icon, run: () => openEditor({ type: d.type }) });
    if (can('editor') && (!t || 'capture'.includes(t))) items.push({ group: 'Create', label: 'Quick capture', sub: 'Evidence, request, interaction, decision, risk', icon: 'zap', run: () => openCapture() });
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
      if (e.key === 'c' && can('editor') && !e.metaKey && !e.ctrlKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) { e.preventDefault(); setOpen(true); }
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
              <div className="field"><label>Account</label><input className="input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="e.g. Halcyon Foods" /></div>
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
      <Link to="/today" className={path === '/today' ? 'on' : ''}><Icon name="house" size={20} /><span>Home</span></Link>
      <Link to="/inbox" className={path === '/inbox' ? 'on' : ''}><Icon name="inbox" size={20} /><span>Inbox</span></Link>
      {can('editor') && <button className="capture" onClick={() => openCapture()}><span><Icon name="plus" size={20} /></span><span style={{ color: 'var(--text-3)' }}>Capture</span></button>}
      <Link to="/stakeholders" className={path.startsWith('/stakeholders') ? 'on' : ''}><Icon name="users" size={20} /><span>People</span></Link>
      <button onClick={onMenu}><Icon name="menu" size={20} /><span>More</span></button>
    </nav>
  );
}

// ---------------- keyboard shortcuts ----------------

const GO: Record<string, { to: string; label: string }> = {
  h: { to: '/today', label: 'Home' },
  i: { to: '/inbox', label: 'Inbox' },
  a: { to: '/ask', label: 'Ask' },
  t: { to: '/tools', label: 'All tools' },
  f: { to: '/guide', label: 'Field guide' },
  s: { to: '/workspace/settings', label: 'Settings' },
};

let shortcutsOpener: (() => void) | null = null;
export const openShortcuts = () => shortcutsOpener?.();

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
};

/** "?" for the list, "g" then a letter to jump. */
export function Shortcuts() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    shortcutsOpener = () => setOpen(true);
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === 'g') { pendingG = Date.now(); return; }
      if (pendingG && Date.now() - pendingG < 1200 && GO[e.key]) { e.preventDefault(); pendingG = 0; setOpen(false); navigate(GO[e.key].to); return; }
      pendingG = 0;
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); shortcutsOpener = null; };
  }, []);
  if (!open) return null;
  const rows: [string[], string][] = [
    [['⌘', 'K'], 'Search and jump anywhere'],
    [['c'], 'Capture a signal, note or request'],
    [['?'], 'Show this list'],
    ...Object.entries(GO).map(([k, v]): [string[], string] => [['g', k], `Go to ${v.label}`]),
    [['⌘', '↵'], 'Post a comment, save a capture'],
    [['@'], 'Mention a teammate in a comment'],
    [['Esc'], 'Close a drawer, dialog or menu'],
  ];
  const canvas: [string[], string][] = [
    [['Drag'], 'Move a step; drag its handle to connect'],
    [['↵'], 'Rename the selected step'],
    [['←', '→', '↑', '↓'], 'Nudge the selected step'],
    [['Del'], 'Remove the selection'],
    [['⌘', 'Z'], 'Undo  ·  ⇧⌘Z redo'],
  ];
  const table = (list: [string[], string][]) => (
    <div className="shortcut-list">{list.map(([keys, label]) => (
      <div key={label} className="shortcut-row"><span>{label}</span><span className="row" style={{ gap: 4 }}>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</span></div>
    ))}</div>
  );
  return (
    <Modal onClose={() => setOpen(false)} label="Keyboard shortcuts">
      <div className="col" style={{ padding: 20, gap: 14 }}>
        <div className="row"><h2 style={{ margin: 0 }}>Keyboard shortcuts</h2><span className="spacer" /><button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" /></button></div>
        {table(rows)}
        <div className="eyebrow" style={{ marginTop: 4 }}>Process modeller</div>
        {table(canvas)}
      </div>
    </Modal>
  );
}

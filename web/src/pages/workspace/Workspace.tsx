import { useEffect, useMemo, useRef, useState } from 'react';
import { ENTITIES, nameOf } from '../../../../core/schema.ts';
import { DOC_KINDS, generateDoc, type DocKind } from '../../../../core/engines/docs.ts';
import { SearchIndex } from '../../../../core/engines/search.ts';
import { AUDIENCES, type Audience } from '../../../../core/engines/stakeholders.ts';
import { daysBetween, isoDate } from '../../../../core/util.ts';
import { api, now, updateEntity, updateSettings, useEntity, useGraph, useSettings, useStore } from '../../store.ts';
import { Link, setQuery, useRoute } from '../../router.tsx';
import { Avatar, Badge, Card, Empty, Markdown, PageHead, Seg, copyText, downloadFile, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { fmtDate, humanize, relDays } from '../../ui/format.ts';
import { ActivityFeed, EntityHeader, Backlinks, Comments } from '../../entity/views.tsx';
import { EntityPicker, RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { ExtractPanel } from '../define/Toolkit.tsx';
import { useTheme } from '../../shell.tsx';

// ---------------- Meetings ----------------

export function MeetingsPage() {
  const g = useGraph();
  const today = now();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const list = g.all('meeting').filter((m) => (view === 'upcoming' ? daysBetween(today, m.date) >= 0 : daysBetween(today, m.date) < 0))
    .sort((a, b) => (view === 'upcoming' ? 1 : -1) * String(a.date).localeCompare(String(b.date)));
  const openActions = g.all('meeting').flatMap((m) => ((m.actions ?? []) as any[]).filter((a) => !a.done).map((a) => ({ a, m })));
  return (
    <div className="page">
      <PageHead title="Meetings" sub="Refinement, planning, reviews, retros, steering and 1:1s. Notes turn into decisions, actions and risks with one click." actions={<><Seg value={view} onChange={setView} options={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }]} /><button className="btn btn-primary" onClick={() => openEditor({ type: 'meeting', defaults: { date: isoDate(today), kind: 'refinement', attendeeIds: g.me ? [g.me.id] : [] } })}><Icon name="plus" size={14} />New meeting</button></>} />
      <div className="grid g-side">
        <Card flush>
          {list.length === 0 ? <Empty icon="calendar">No {view} meetings.</Empty> : <div className="list">{list.map((m) => (
            <Link key={m.id} to={hrefOf(m)} className="list-item">
              <div style={{ width: 64 }} className="small muted">{fmtDate(m.date)}</div>
              <div className="grow"><div className="strong">{m.title}</div><div className="small muted">{humanize(m.kind)} · {(m.attendeeIds ?? []).length} attendees{(m.actions ?? []).length ? ` · ${(m.actions as any[]).filter((a) => !a.done).length} open actions` : ''}</div></div>
              <div className="row" style={{ gap: -4 }}>{(m.attendeeIds ?? []).slice(0, 5).map((id: string) => <Avatar key={id} name={g.get(id)?.name} size="sm" />)}</div>
            </Link>
          ))}</div>}
        </Card>
        <Card title={`Open action items · ${openActions.length}`} icon="list-checks" flush>
          <div className="list">{openActions.map(({ a, m }) => (
            <Link key={a.id + m.id} to={hrefOf(m)} className="list-item small"><div className="grow">{a.text}<div className="muted">{nameOf(g.get(a.ownerId))}{a.due ? ` · due ${fmtDate(a.due)}` : ''}</div></div>{a.due && daysBetween(today, a.due) < 0 && <Badge tone="red">late</Badge>}</Link>
          ))}</div>
        </Card>
      </div>
    </div>
  );
}

export function MeetingPage({ id }: { id: string }) {
  const m = useEntity(id);
  const g = useGraph();
  const [notes, setNotes] = useState(m?.notes ?? '');
  const [newAction, setNewAction] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { setNotes(m?.notes ?? ''); }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <div className="page"><Empty>Meeting not found.</Empty></div>;
  const actions = (m.actions ?? []) as { id: string; text: string; ownerId?: string; due?: string; done: boolean }[];
  const saveActions = (next: typeof actions) => updateEntity(m.id, { actions: next }).catch(errorToast);
  const onNotes = (v: string) => {
    setNotes(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateEntity(m.id, { notes: v }).catch(errorToast), 800);
  };
  return (
    <div className="page">
      <EntityHeader e={m} sub={<>{fmtDate(m.date)} ({relDays(m.date)}) · {humanize(m.kind)}</>} />
      <div className="grid g-side">
        <div className="stack">
          {m.agenda && <Card title="Agenda" icon="list-checks"><div className="pre small">{m.agenda}</div></Card>}
          <Card title="Notes / transcript" icon="pencil" sub="Paste a transcript or type notes. Lines like “Decision: …”, “Action: @name … by Friday”, “Risk: …” are extracted below.">
            <textarea className="textarea" rows={12} value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="- Decision: …&#10;- Action: @maya to … by Friday&#10;- Risk: …" />
          </Card>
          <ExtractPanel e={{ ...m, notes }} field="notes" />
          <Card title={`Action items · ${actions.filter((a) => !a.done).length} open`} icon="circle-check" flush>
            <div className="list">
              {actions.map((a) => (
                <div key={a.id} className="list-item" style={{ alignItems: 'center' }}>
                  <input type="checkbox" checked={a.done} onChange={(e) => saveActions(actions.map((x) => (x.id === a.id ? { ...x, done: e.target.checked } : x)))} style={{ accentColor: 'var(--accent)' }} />
                  <span className="grow" style={{ textDecoration: a.done ? 'line-through' : undefined }}>{a.text}</span>
                  {a.ownerId && <RefChip id={a.ownerId} />}
                  {a.due && <Badge tone={!a.done && daysBetween(now(), a.due) < 0 ? 'red' : ''}>{fmtDate(a.due)}</Badge>}
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => saveActions(actions.filter((x) => x.id !== a.id))}><Icon name="x" size={12} /></button>
                </div>
              ))}
              <div className="list-item"><input className="input input-sm" placeholder="Add an action item, Enter" value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newAction.trim()) { saveActions([...actions, { id: `a${Date.now().toString(36)}`, text: newAction.trim(), done: false, ownerId: g.me?.id }]); setNewAction(''); } }} /></div>
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card title="Attendees" icon="users" sub="Open a prep brief for anyone before the meeting." flush>
            <div className="list">{(m.attendeeIds ?? []).map((sid: string) => {
              const s = g.get(sid);
              return <div key={sid} className="list-item" style={{ alignItems: 'center' }}><Avatar name={s?.name} size="sm" /><span className="grow">{s?.name}<div className="small muted">{s?.title}</div></span>{s && !s.isMe && <Link className="btn btn-sm" to={`/stakeholders/p/${sid}?tab=prep`}>Prep</Link>}</div>;
            })}</div>
          </Card>
          <Backlinks id={m.id} />
          <Comments entityId={m.id} />
        </div>
      </div>
    </div>
  );
}

// ---------------- Documents ----------------

export function DocsPage() {
  const g = useGraph();
  const { query } = useRoute();
  const kind = (query.get('kind') ?? 'prd') as DocKind;
  const subjectId = query.get('subject') ?? '';
  const audience = (query.get('audience') ?? 'exec') as Audience;
  const info = DOC_KINDS[kind];
  const doc = useMemo(() => generateDoc(kind, g, subjectId || undefined, now(), { audience }), [g, kind, subjectId, audience]);
  const fileName = `${kind}-${(nameOf(g.get(subjectId)) || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.md`;
  return (
    <div className="page">
      <PageHead title="Documents" sub="Generated from the graph, so they are never out of date: PRD, BRD, PR/FAQ, steering pack, release notes and audience-specific updates." />
      <div className="grid g-side-l">
        <div className="stack no-print">
          <Card title="Document" icon="file-text">
            <div className="col" style={{ gap: 6 }}>
              {(Object.keys(DOC_KINDS) as DocKind[]).map((k) => (
                <button key={k} className={`btn ${k === kind ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setQuery({ kind: k, subject: DOC_KINDS[k].subject.includes(g.get(subjectId)?.type ?? '') ? subjectId : undefined })}>{DOC_KINDS[k].label}</button>
              ))}
            </div>
            <p className="small muted mt12">{info.description}</p>
          </Card>
          {info.subject.length > 0 && (
            <Card title="Subject" icon="target">
              <EntityPicker targets={info.subject} value={subjectId ? [subjectId] : []} onChange={(ids) => setQuery({ subject: ids[0] })} single />
              {kind === 'stakeholder-update' && (
                <div className="mt12"><div className="label mb8">Audience</div><select className="select" value={audience} onChange={(e) => setQuery({ audience: e.target.value })}>{(Object.keys(AUDIENCES) as Audience[]).map((a) => <option key={a} value={a}>{AUDIENCES[a]}</option>)}</select></div>
              )}
            </Card>
          )}
        </div>
        <Card title={info.label} icon="file-text" actions={<>
          <button className="btn btn-sm" onClick={() => copyText(doc, 'Markdown copied')}><Icon name="copy" size={13} />Copy</button>
          <button className="btn btn-sm" onClick={() => downloadFile(fileName, doc)}><Icon name="download" size={13} />.md</button>
          <button className="btn btn-sm" onClick={() => window.print()}><Icon name="file-text" size={13} />Print / PDF</button>
        </>}>
          <Markdown text={doc} />
        </Card>
      </div>
    </div>
  );
}

// ---------------- Activity ----------------

export function ActivityPage() {
  return (
    <div className="page">
      <PageHead title="Activity" sub="Append-only audit trail of every change, by whom and when — including changes from the CLI, the browser extension and integrations." />
      <Card flush><ActivityFeed limit={200} /></Card>
    </div>
  );
}

// ---------------- Settings ----------------

export function SettingsPage() {
  const s = useStore();
  const settings = useSettings();
  const g = useGraph();
  const [theme, setTheme] = useTheme();
  const [token, setToken] = useState<string>('');
  const [form, setForm] = useState({ workspaceName: settings.workspaceName, productName: settings.productName, userName: settings.userName ?? '' });
  useEffect(() => { api<{ captureToken: string }>('/api/settings').then((x) => setToken(x.captureToken)).catch(() => {}); }, []);
  const origin = location.origin;
  const save = async () => {
    try {
      await updateSettings(form);
      const me = g.me;
      if (me && form.userName && me.name !== form.userName) await updateEntity(me.id, { name: form.userName });
      toast('Settings saved');
    } catch (err) { errorToast(err); }
  };
  const importFile = async (file: File) => {
    try {
      const dump = JSON.parse(await file.text());
      if (!confirm(`Replace the whole workspace with ${dump.entities?.length ?? 0} entities from ${file.name}?`)) return;
      await api('/api/import', { method: 'POST', json: dump });
      toast('Workspace imported');
    } catch (err) { errorToast(err); }
  };
  const reset = async (empty: boolean) => {
    if (!confirm(empty ? 'Start with an empty workspace? Everything is removed.' : 'Reset to the Northwind Pay demo workspace? Your changes are removed.')) return;
    try { await api('/api/reset', { method: 'POST', json: { empty } }); toast('Workspace reset'); } catch (err) { errorToast(err); }
  };
  const counts = ENTITIES.map((d) => ({ d, n: g.all(d.type).length })).filter((x) => x.n > 0);
  return (
    <div className="page">
      <PageHead title="Settings" sub="Workspace, appearance, integrations across platforms, AI, and your data." />
      <div className="grid g2">
        <Card title="Workspace" icon="settings">
          <div className="form-grid">
            <div className="field"><label>Workspace name</label><input className="input" value={form.workspaceName} onChange={(e) => setForm({ ...form, workspaceName: e.target.value })} /></div>
            <div className="field"><label>Product name</label><input className="input" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
            <div className="field full"><label>Your name</label><input className="input" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /><span className="help">Recorded on every change you make (audit trail). Also renames your own stakeholder record.</span></div>
          </div>
          <div className="row mt12"><span className="spacer" /><button className="btn btn-primary" onClick={save}>Save</button></div>
        </Card>
        <Card title="Appearance" icon="sun">
          <Seg value={theme} onChange={setTheme} options={[{ id: 'system', label: 'System' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
          <div className="small muted mt12">Install Throughline as an app: in Chrome/Edge use “Install app” in the address bar; in Safari use File → Add to Dock (macOS) or Share → Add to Home Screen (iOS). It works offline in read-only mode.</div>
        </Card>
        <Card title="Integrations — capture from anywhere" icon="zap">
          <div className="label">Capture token</div>
          <div className="row mt8"><input className="input mono" readOnly value={token ? token : 'loading…'} /><button className="btn" onClick={() => copyText(token, 'Token copied')}><Icon name="copy" size={14} /></button></div>
          <div className="small muted mt8">Required by the CLI, the browser extension and any external tool calling the capture API. Keep it private.</div>
          <div className="label mt16">CLI</div>
          <pre className="md" style={{ margin: '6px 0' }}><code>{`export TL_URL=${origin}\nexport TL_TOKEN=${token || '<token>'}\nnode cli/tl.ts capture "Customer wants SFTP export" --account Contoso\nnode cli/tl.ts brief\nnode cli/tl.ts lint docs/my-spec.md   # exits 1 on errors (CI)`}</code></pre>
          <div className="label mt12">Browser extension</div>
          <div className="small">Load the <code>extension/</code> folder in Chrome → Extensions → Developer mode → “Load unpacked”. Paste the URL and token in its options; then right-click any selected text → “Send to Throughline”.</div>
          <div className="label mt12">REST API</div>
          <pre className="md" style={{ margin: '6px 0' }}><code>{`curl -X POST ${origin}/api/capture \\\n  -H "Content-Type: application/json" -H "X-TL-Token: ${token || '<token>'}" \\\n  -d '{"kind":"evidence","text":"Exports time out","account":"Fabrikam","source":"support"}'`}</code></pre>
        </Card>
        <Card title="AI" icon="sparkles">
          {s.ai.enabled ? <div className="row"><Badge tone="green">Claude enabled</Badge><span className="small muted">{s.ai.model}</span></div> : <Badge>Deterministic engines only</Badge>}
          <div className="small muted mt12">Every analysis works offline with deterministic, explainable engines. Set <code>ANTHROPIC_API_KEY</code> before starting the server to add Claude-powered deep review, Ask and extraction. Claude only proposes; nothing is written without your click.</div>
        </Card>
        <Card title="Your data" icon="boxes">
          <div className="row-wrap">
            <a className="btn" href="/api/export" download><Icon name="download" size={14} />Export JSON</a>
            <label className="btn" style={{ cursor: 'pointer' }}><Icon name="upload" size={14} />Import JSON<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} /></label>
            <button className="btn btn-ghost" onClick={() => reset(false)}>Reset demo</button>
            <button className="btn btn-ghost btn-danger" onClick={() => reset(true)}>Start empty</button>
          </div>
          <div className="chips mt12">{counts.map(({ d, n }) => <span key={d.type} className="badge">{d.plural} {n}</span>)}</div>
        </Card>
        <Card title="About" icon="compass">
          <div className="small">Throughline keeps the chain of intent — strategy → evidence → bet → requirement → story → release → outcome — and the people around it in one graph. Stored locally in SQLite (<code>data/throughline.db</code>).</div>
          <div className="small muted mt8">{g.byId.size.toLocaleString()} entities · {s.live ? 'live sync on' : 'live sync off'}</div>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Ask ----------------

export function AskPage() {
  const g = useGraph();
  const s = useStore();
  const { query } = useRoute();
  const q = query.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const [ai, setAi] = useState<{ answer: string; citations: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(q); setAi(null); }, [q]);
  const hits = useMemo(() => (q ? new SearchIndex([...g.byId.values()]).search(q, 30) : []), [q, g]);
  const decisions = hits.filter((h) => h.entity.type === 'decision');
  const askClaude = async () => {
    setBusy(true);
    try { setAi(await api('/api/ai/ask', { method: 'POST', json: { question: q } })); } catch (err) { errorToast(err); } finally { setBusy(false); }
  };
  const SUGGESTIONS = ['Why did we decide on XLSX only?', 'What do enterprise customers complain about?', 'export retention', 'type:request PDF', 'Who is resistant?'];
  return (
    <div className="page">
      <PageHead title="Ask Throughline" sub="Search everything — decisions, evidence, requirements, people. Every answer links to its source." />
      <form className="row mb16" onSubmit={(e) => { e.preventDefault(); setQuery({ q: draft.trim() || undefined }); }}>
        <input className="input" style={{ fontSize: 15, minHeight: 42 }} autoFocus placeholder="Ask a question or search… (type:decision, REQ-12 …)" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn btn-primary" style={{ height: 42 }}>Search</button>
      </form>
      {!q && <div className="row-wrap">{SUGGESTIONS.map((x) => <button key={x} className="btn btn-sm" onClick={() => setQuery({ q: x })}>{x}</button>)}</div>}
      {q && (
        <div className="grid g-side">
          <div className="stack">
            {s.ai.enabled && (
              <Card title="Claude" icon="sparkles" actions={!ai && <button className="btn btn-sm btn-primary" onClick={askClaude} disabled={busy}>{busy ? 'Thinking…' : 'Ask Claude'}</button>}>
                {ai ? <><Markdown text={ai.answer} /><div className="chips mt12">{ai.citations.map((c) => <RefChip key={c} id={c} />)}</div></> : <div className="small muted">Claude answers from the most relevant items in your workspace and cites them.</div>}
              </Card>
            )}
            {decisions.length > 0 && (
              <Card title="Decisions" icon="git-branch" flush>
                <div className="list">{decisions.slice(0, 3).map((h) => (
                  <Link key={h.entity.id} to={hrefOf(h.entity)} className="list-item" style={{ flexDirection: 'column', gap: 4 }}>
                    <div className="row"><span className="key">{h.entity.key}</span><span className="strong">{h.entity.title}</span><span className="spacer" /><span className="small muted">{fmtDate(h.entity.date)}</span></div>
                    {h.entity.rationale && <div className="small"><strong>Why:</strong> {h.entity.rationale}</div>}
                    <div className="small muted">Decided by {(h.entity.deciderIds ?? []).map((id: string) => nameOf(g.get(id))).join(', ') || '—'}{(h.entity.consultedIds ?? []).length ? ` · consulted ${(h.entity.consultedIds as string[]).map((id) => nameOf(g.get(id))).join(', ')}` : ''}</div>
                  </Link>
                ))}</div>
              </Card>
            )}
            <Card title={`Results · ${hits.length}`} icon="search" flush>
              {hits.length === 0 ? <Empty icon="search">Nothing matches “{q}”.</Empty> : (
                <div className="list">{hits.map((h) => (
                  <Link key={h.entity.id} to={hrefOf(h.entity)} className="list-item">
                    <Icon name={ENTITIES.find((d) => d.type === h.entity.type)?.icon ?? 'circle-dot'} size={15} className="muted" />
                    <div className="grow"><div className="strong">{h.entity.key && <span className="key">{h.entity.key} </span>}{nameOf(h.entity)}</div><div className="small muted">{h.snippet}</div></div>
                    <span className="small muted nowrap">{ENTITIES.find((d) => d.type === h.entity.type)?.label}</span>
                  </Link>
                ))}</div>
              )}
            </Card>
          </div>
          <Card title="By type" icon="filter">
            <div className="col" style={{ gap: 4 }}>{[...new Set(hits.map((h) => h.entity.type))].map((t) => <button key={t} className="btn btn-sm btn-ghost" style={{ justifyContent: 'space-between' }} onClick={() => setQuery({ q: `${q.replace(/type:\w+\s*/g, '')} type:${t}`.trim() })}>{ENTITIES.find((d) => d.type === t)?.plural}<span className="nav-count">{hits.filter((h) => h.entity.type === t).length}</span></button>)}</div>
          </Card>
        </div>
      )}
    </div>
  );
}


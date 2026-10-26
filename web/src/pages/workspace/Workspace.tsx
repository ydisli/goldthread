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
import { ActivityFeed, Attachments, EntityHeader, Backlinks, Comments } from '../../entity/views.tsx';
import { EntityPicker, RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { ExtractPanel } from '../define/Toolkit.tsx';
import { mergedMessage, saveText } from '../../entity/autosave.ts';
import { downloadDocx, printMarkdown } from '../../ui/export.ts';
import { readTranscript } from '../../ui/transcript.ts';

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
  // The notes as last saved or received, so two people taking notes merge instead of overwriting.
  const saved = useRef(m?.notes ?? '');
  const latest = useRef(notes);
  latest.current = notes;
  useEffect(() => { setNotes(m?.notes ?? ''); saved.current = m?.notes ?? ''; }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Follow someone else's notes when we have nothing unsaved.
  useEffect(() => {
    if (m && (m.notes ?? '') !== saved.current && latest.current === saved.current) { setNotes(m.notes ?? ''); saved.current = m.notes ?? ''; }
  }, [m?.notes]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <div className="page"><Empty>Meeting not found.</Empty></div>;
  const actions = (m.actions ?? []) as { id: string; text: string; ownerId?: string; due?: string; done: boolean }[];
  const saveActions = (next: typeof actions) => updateEntity(m.id, { actions: next }).catch(errorToast);
  const onNotes = (v: string) => {
    setNotes(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await saveText(m.id, 'notes', saved.current, v);
        saved.current = r.saved;
        if (r.merged) {
          if (latest.current === v) setNotes(r.saved);
          toast(mergedMessage(r.merged, 'notes'), r.merged.conflicts ? 'error' : 'info');
        }
      } catch (err) { errorToast(err); }
    }, 800);
  };
  return (
    <div className="page">
      <EntityHeader e={m} sub={<>{fmtDate(m.date)} ({relDays(m.date)}) · {humanize(m.kind)}</>} />
      <div className="grid g-side">
        <div className="stack">
          {m.agenda && <Card title="Agenda" icon="list-checks"><div className="pre small">{m.agenda}</div></Card>}
          <Card title="Notes / transcript" icon="pencil" sub="Type notes, paste a transcript, or import one from Teams or Zoom. Lines like “Decision: …”, “Action: @name … by Friday”, “Risk: …” are extracted below."
            actions={<label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}><Icon name="file-up" size={13} />Import transcript<input type="file" hidden accept=".vtt,.srt,.txt,.docx,text/vtt,text/plain" onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const t = await readTranscript(f);
                if (!t.trim()) { toast(`Nothing to import in ${f.name}`, 'error'); return; }
                onNotes(notes.trim() ? `${notes.trimEnd()}\n\n— Transcript: ${f.name} —\n${t}` : t);
                toast(`Imported ${t.split('\n').length} lines from ${f.name}. Check what was extracted below.`);
              } catch (err) { errorToast(err); }
            }} /></label>}>
            <textarea aria-label="Meeting notes" className="textarea" rows={12} value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="- Decision: …&#10;- Action: @maya to … by Friday&#10;- Risk: …" />
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
              <div className="list-item"><input aria-label="Add an action item" className="input input-sm" placeholder="Add an action item, Enter" value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newAction.trim()) { saveActions([...actions, { id: `a${Date.now().toString(36)}`, text: newAction.trim(), done: false, ownerId: g.me?.id }]); setNewAction(''); } }} /></div>
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card title="Attendees" icon="users" sub="Open a prep brief for anyone before the meeting." flush>
            <div className="list">{(m.attendeeIds ?? []).map((sid: string) => {
              const s = g.get(sid);
              return <div key={sid} className="list-item" style={{ alignItems: 'center' }}><Avatar name={s?.name} size="sm" /><span className="grow">{s?.name}<div className="small muted">{s?.title}</div></span>{s && s.id !== g.me?.id && <Link className="btn btn-sm" to={`/stakeholders/p/${sid}?tab=prep`}>Prep</Link>}</div>;
            })}</div>
          </Card>
          <Backlinks id={m.id} />
          <Attachments entityId={m.id} />
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
  const docTitle = `${DOC_KINDS[kind].label}${g.get(subjectId) ? ` — ${nameOf(g.get(subjectId))}` : ''}`;
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
                <div className="mt12"><div className="label mb8">Audience</div><select aria-label="Audience" className="select" value={audience} onChange={(e) => setQuery({ audience: e.target.value })}>{(Object.keys(AUDIENCES) as Audience[]).map((a) => <option key={a} value={a}>{AUDIENCES[a]}</option>)}</select></div>
              )}
            </Card>
          )}
        </div>
        <Card title={info.label} icon="file-text" actions={<>
          <button className="btn btn-sm" onClick={() => copyText(doc, 'Markdown copied')}><Icon name="copy" size={13} />Copy</button>
          <button className="btn btn-sm" onClick={() => downloadFile(fileName, doc)}><Icon name="download" size={13} />.md</button>
          <button className="btn btn-sm" onClick={() => downloadDocx(docTitle, doc)}><Icon name="download" size={13} />Word</button>
          <button className="btn btn-sm" onClick={() => printMarkdown(docTitle, doc)}><Icon name="file-text" size={13} />Print / PDF</button>
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
  const SUGGESTIONS = ['Why is Workday the source of truth?', 'What does the service desk complain about?', 'mailbox retention', 'type:request access', 'Who is resistant?'];
  return (
    <div className="page">
      <PageHead title="Ask Throughline" sub="Search everything — decisions, evidence, requirements, people. Every answer links to its source." />
      <form className="row mb16" onSubmit={(e) => { e.preventDefault(); setQuery({ q: draft.trim() || undefined }); }}>
        <input aria-label="Ask a question or search" className="input" style={{ fontSize: 15, minHeight: 42 }} autoFocus placeholder="Ask a question or search… (type:decision, REQ-12 …)" value={draft} onChange={(e) => setDraft(e.target.value)} />
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


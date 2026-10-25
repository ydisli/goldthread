import { useState } from 'react';
import { nameOf, type Entity } from '../../../../core/schema.ts';
import { alignmentCheck, validateRaci, type Approver, type RaciRole } from '../../../../core/engines/stakeholders.ts';
import { daysBetween, isoDate } from '../../../../core/util.ts';
import { createEntity, now, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link, navigate, useRoute } from '../../router.tsx';
import { Avatar, Badge, Card, Empty, PageHead, Seg, StatusBadge, copyText, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { fmtDate, relDays } from '../../ui/format.ts';
import { EntityPicker, RefChip } from '../../entity/fields.tsx';
import { EntityHeader } from '../../entity/views.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { AlignmentList, PersonLink } from './common.tsx';

const RACI_CYCLE: (RaciRole | '')[] = ['', 'R', 'A', 'C', 'I'];
const RACI_HELP: Record<RaciRole, string> = { R: 'Responsible — does the work', A: 'Accountable — owns the outcome, signs off (exactly one)', C: 'Consulted — two-way input before the decision', I: 'Informed — told after the decision' };

export function RaciListPage() {
  const g = useGraph();
  const create = async () => {
    try {
      const e = await createEntity('raci', {
        title: 'New RACI matrix',
        activities: ['Define scope & requirements', 'Approve spec', 'Build & test', 'Launch communications', 'Support readiness'],
        memberIds: g.me ? [g.me.id] : [], assignments: {},
      });
      navigate(hrefOf(e));
    } catch (err) { errorToast(err); }
  };
  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="raci" title="RACI in one minute" steps={[
        <><b>R</b>esponsible does the work · <b>A</b>ccountable owns the outcome and signs off — exactly one per activity · <b>C</b>onsulted gives input before · <b>I</b>nformed hears after.</>,
        <>Open a matrix and click a cell to cycle R → A → C → I.</>,
        <>Activities with no A, or more than one, are flagged — that is usually where decisions stall.</>,
      ]} />} title="RACI matrices" sub="Who is Responsible, Accountable, Consulted and Informed — validated so every activity has exactly one owner and nobody drowns in consultation." actions={<button className="btn btn-primary" onClick={create}><Icon name="plus" size={14} />New RACI</button>} />
      <div className="grid g2">
        {g.all('raci').map((m) => {
          const issues = validateRaci(m.activities ?? [], m.memberIds ?? [], m.assignments ?? {}, (id) => nameOf(g.get(id)));
          const errors = issues.filter((i) => i.severity === 'error').length;
          return (
            <Link key={m.id} to={hrefOf(m)} className="card card-link pad">
              <div className="row"><Icon name="grid-3x3" className="muted" /><h2 style={{ flex: 1 }}>{m.title}</h2>{errors ? <Badge tone="red">{errors} errors</Badge> : <Badge tone="green">Valid</Badge>}</div>
              <div className="small muted mt8">{(m.activities ?? []).length} activities · {(m.memberIds ?? []).length} people{m.scopeId ? <> · scope: {nameOf(g.get(m.scopeId))}</> : null}</div>
              <div className="row mt12" style={{ gap: -4 }}>{(m.memberIds ?? []).slice(0, 10).map((id: string) => <Avatar key={id} name={g.get(id)?.name} size="sm" />)}</div>
            </Link>
          );
        })}
        {!g.all('raci').length && <Empty icon="grid-3x3">No RACI matrices yet.</Empty>}
      </div>
    </div>
  );
}

export function RaciPage({ id }: { id: string }) {
  const m = useEntity(id);
  const g = useGraph();
  const [newAct, setNewAct] = useState('');
  if (!m) return <div className="page"><Empty>Not found.</Empty></div>;
  const activities: string[] = m.activities ?? [];
  const members: string[] = m.memberIds ?? [];
  const assignments: Record<string, Record<string, RaciRole | ''>> = m.assignments ?? {};
  const issues = validateRaci(activities, members, assignments, (x) => nameOf(g.get(x)));
  const save = (patch: Record<string, unknown>) => updateEntity(m.id, patch).catch(errorToast);
  const cycle = (a: string, sid: string) => {
    const cur = assignments[a]?.[sid] ?? '';
    const next = RACI_CYCLE[(RACI_CYCLE.indexOf(cur) + 1) % RACI_CYCLE.length];
    const row = { ...(assignments[a] ?? {}) };
    if (next) row[sid] = next; else delete row[sid];
    void save({ assignments: { ...assignments, [a]: row } });
  };
  const addActivity = () => {
    const t = newAct.trim();
    if (!t || activities.includes(t)) return;
    void save({ activities: [...activities, t] });
    setNewAct('');
  };
  const removeActivity = (a: string) => {
    const { [a]: _gone, ...rest } = assignments;
    void save({ activities: activities.filter((x) => x !== a), assignments: rest });
  };
  const renameActivity = (a: string) => {
    const t = prompt('Rename activity', a)?.trim();
    if (!t || t === a) return;
    const { [a]: row, ...rest } = assignments;
    void save({ activities: activities.map((x) => (x === a ? t : x)), assignments: { ...rest, [t]: row ?? {} } });
  };
  const removeMember = (sid: string) => {
    const next: typeof assignments = {};
    for (const [a, row] of Object.entries(assignments)) { const { [sid]: _x, ...r } = row; next[a] = r; }
    void save({ memberIds: members.filter((x) => x !== sid), assignments: next });
  };
  return (
    <div className="page page-wide">
      <EntityHeader e={m} sub={<>Click a cell to cycle R → A → C → I → empty. {m.scopeId && <>Scope: <RefChip id={m.scopeId} /></>}</>} />
      <div className="grid g-side">
        <Card flush>
          <div className="table-wrap">
            <table className="table raci">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Activity</th>
                  {members.map((sid) => (
                    <th key={sid} className="center" style={{ minWidth: 76 }}>
                      <div className="col" style={{ alignItems: 'center', gap: 2 }}>
                        <Avatar name={g.get(sid)?.name} size="sm" />
                        <Link to={`/stakeholders/p/${sid}`} className="tiny" style={{ color: 'var(--text-2)' }}>{String(g.get(sid)?.name ?? '?').split(' ')[0]}</Link>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Remove from matrix" onClick={() => removeMember(sid)}><Icon name="x" size={12} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => {
                  const rowIssues = issues.filter((i) => i.activity === a && i.severity === 'error');
                  return (
                    <tr key={a}>
                      <td>
                        <div className="row">
                          {rowIssues.length > 0 && <Icon name="circle-alert" size={14} className="err" />}
                          <span className="grow" style={{ cursor: 'pointer' }} onDoubleClick={() => renameActivity(a)} title="Double-click to rename">{a}</span>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeActivity(a)} title="Remove activity"><Icon name="trash-2" size={12} /></button>
                        </div>
                      </td>
                      {members.map((sid) => {
                        const r = assignments[a]?.[sid] ?? '';
                        return <td key={sid} className="cell"><button className={`raci-btn ${r}`} onClick={() => cycle(a, sid)} title={r ? RACI_HELP[r] : 'Not involved'} aria-label={`${a}: ${nameOf(g.get(sid))} ${r || 'none'}`}>{r || '·'}</button></td>;
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={members.length + 1}>
                    <div className="row">
                      <input className="input input-sm" placeholder="Add an activity…" value={newAct} onChange={(e) => setNewAct(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addActivity()} style={{ maxWidth: 320 }} />
                      <button className="btn btn-sm" onClick={addActivity}>Add</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <div className="label mb8">Add people</div>
            <EntityPicker targets={['stakeholder']} value={[]} onChange={(ids) => ids[0] && !members.includes(ids[0]) && void save({ memberIds: [...members, ids[0]] })} single placeholder="Search stakeholders to add…" />
          </div>
        </Card>
        <div className="stack">
          <Card title={`Validation · ${issues.length}`} icon="list-checks" flush>
            {issues.length === 0 ? <Empty icon="circle-check">Valid: one Accountable per activity, everyone has a role.</Empty> : (
              <div className="list">{issues.map((i, k) => (
                <div key={k} className="list-item small"><Badge tone={i.severity === 'error' ? 'red' : i.severity === 'warning' ? 'amber' : ''}>{i.severity}</Badge><div className="grow">{i.message}</div></div>
              ))}</div>
            )}
          </Card>
          <Card title="Legend">
            <div className="col" style={{ gap: 6 }}>{(Object.keys(RACI_HELP) as RaciRole[]).map((r) => <div key={r} className="row small"><span className={`raci-btn ${r}`}>{r}</span>{RACI_HELP[r]}</div>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------- Approvals ----------------

export function ApprovalsPage() {
  const g = useGraph();
  const today = now();
  const { query } = useRoute();
  const focus = query.get('focus');
  const [view, setView] = useState<'pending' | 'all'>('pending');
  const list = g.all('approval').filter((a) => view === 'all' || a.status === 'pending' || a.status === 'changes-requested')
    .sort((a, b) => String(a.dueDate ?? '9').localeCompare(String(b.dueDate ?? '9')));
  return (
    <div className="page">
      <PageHead
        title="Approvals & sign-offs"
        sub="Specs, baselines, decisions, releases and UAT. Every response is timestamped and attributable — the trail auditors ask for."
        actions={<><Seg value={view} onChange={setView} options={[{ id: 'pending', label: 'Open' }, { id: 'all', label: 'All' }]} /><NewApprovalButton /></>}
      />
      <div className="col" style={{ gap: 14 }}>
        {list.map((a) => <ApprovalCard key={a.id} a={a} focused={a.id === focus} today={today} />)}
        {!list.length && <Empty icon="clipboard-check">No open approvals.</Empty>}
      </div>
    </div>
  );
}

function ApprovalCard({ a, focused, today }: { a: Entity; focused: boolean; today: Date }) {
  const g = useGraph();
  const approvers = (a.approvers ?? []) as Approver[];
  const overdue = a.status === 'pending' && a.dueDate && daysBetween(today, a.dueDate) < 0;
  const respond = async (idx: number, status: Approver['status']) => {
    const comment = status === 'approved' ? prompt('Comment (optional)') ?? undefined : prompt(status === 'rejected' ? 'Why is it rejected?' : 'What needs to change?') ?? undefined;
    if (status !== 'approved' && !comment) return;
    const me = g.me;
    const target = approvers[idx];
    const onBehalf = me && target.stakeholderId !== me.id ? ` (recorded by ${me.name})` : '';
    const next = approvers.map((x, i) => (i === idx ? { ...x, status, comment: comment ? `${comment}${onBehalf}` : onBehalf.trim() || undefined, at: isoDate(today) } : x));
    try { await updateEntity(a.id, { approvers: next }); toast('Response recorded'); } catch (err) { errorToast(err); }
  };
  const remind = (s: Entity | undefined) => copyText(`Hi ${String(s?.name ?? '').split(' ')[0]}, a quick reminder: your sign-off on "${a.title}" is ${overdue ? 'overdue' : `due ${fmtDate(a.dueDate)}`}. Anything blocking you?`, 'Reminder copied');
  const addApprover = (ids: string[]) => {
    if (!ids[0] || approvers.some((x) => x.stakeholderId === ids[0])) return;
    void updateEntity(a.id, { approvers: [...approvers, { stakeholderId: ids[0], status: 'pending' }] }).catch(errorToast);
  };
  return (
    <section className="card" style={focused ? { outline: '2px solid var(--accent)' } : undefined}>
      <div className="card-head">
        <Icon name="clipboard-check" className="muted" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{a.title}</h2>
          <div className="small muted">On {a.subjectId ? <RefChip id={a.subjectId} showType /> : '—'} · requested by {nameOf(g.get(a.requestedById))} · due {fmtDate(a.dueDate)} ({relDays(a.dueDate, today)})</div>
        </div>
        {overdue && <Badge tone="red">Overdue</Badge>}
        <StatusBadge value={a.status} />
      </div>
      <div className="list">
        {approvers.map((x, i) => {
          const s = g.get(x.stakeholderId);
          return (
            <div key={x.stakeholderId} className="list-item" style={{ alignItems: 'center' }}>
              <div className="grow"><PersonLink s={s} sub={x.comment ? `“${x.comment}”` : s?.title} /></div>
              {x.at && <span className="small muted nowrap">{fmtDate(x.at)}</span>}
              <StatusBadge value={x.status} />
              {x.status === 'pending' && (
                <div className="row">
                  <button className="btn btn-sm" onClick={() => respond(i, 'approved')} title={s?.id === g.me?.id ? 'Approve' : `Record ${s?.name}'s approval`}>Approve</button>
                  <button className="btn btn-sm" onClick={() => respond(i, 'changes-requested')}>Changes</button>
                  <button className="btn btn-sm btn-ghost btn-danger" onClick={() => respond(i, 'rejected')}>Reject</button>
                  {s?.id !== g.me?.id && <button className="btn btn-sm btn-ghost" title="Copy a reminder" onClick={() => remind(s)}><Icon name="send" size={13} /></button>}
                </div>
              )}
            </div>
          );
        })}
        <div className="list-item"><div className="grow"><EntityPicker targets={['stakeholder']} value={[]} onChange={addApprover} single placeholder="Add an approver…" /></div></div>
      </div>
    </section>
  );
}

function NewApprovalButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<string[]>([]);
  const [who, setWho] = useState<string[]>([]);
  const [due, setDue] = useState('');
  const g = useGraph();
  if (!open) return <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" size={14} />Request approval</button>;
  const create = async () => {
    try {
      await createEntity('approval', { title, subjectId: subject[0], requestedById: g.me?.id, dueDate: due || undefined, approvers: who.map((id) => ({ stakeholderId: id, status: 'pending' })) });
      setOpen(false); setTitle(''); setSubject([]); setWho([]); setDue('');
      toast('Approval requested');
    } catch (err) { errorToast(err); }
  };
  return (
    <div className="card pad col" style={{ width: '100%', maxWidth: 560 }}>
      <input className="input" placeholder="What needs approval?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <EntityPicker targets="*" value={subject} onChange={setSubject} single placeholder="Subject (spec, baseline, release…)" />
      <EntityPicker targets={['stakeholder']} value={who} onChange={setWho} placeholder="Approvers…" />
      <div className="row"><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ maxWidth: 180 }} /><span className="spacer" /><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={!title || !who.length} onClick={create}>Request</button></div>
    </div>
  );
}

// ---------------- Conflicts ----------------

export function ConflictsPage() {
  const g = useGraph();
  const today = now();
  const [view, setView] = useState<'open' | 'all'>('open');
  const list = g.all('conflict').filter((c) => view === 'all' || c.status !== 'resolved');
  return (
    <div className="page">
      <PageHead
        title="Conflicts & escalations"
        sub="Separate positions (what people say they want) from interests (why they want it) — agreement usually lives in the interests."
        actions={<><Seg value={view} onChange={setView} options={[{ id: 'open', label: 'Open' }, { id: 'all', label: 'All' }]} /><button className="btn btn-primary" onClick={() => openEditor({ type: 'conflict', defaults: { raisedAt: isoDate(today) } })}><Icon name="plus" size={14} />Log conflict</button></>}
      />
      <div className="col" style={{ gap: 14 }}>
        {list.map((c) => (
          <Card key={c.id} title={c.title} icon="gavel" sub={<>Raised {fmtDate(c.raisedAt)} ({relDays(c.raisedAt, today)}){c.escalatedToId ? <> · escalated to {nameOf(g.get(c.escalatedToId))}</> : null}</>}
            actions={<><StatusBadge value={c.status} /><button className="btn btn-sm" onClick={() => openEditor({ type: 'conflict', id: c.id })}>Edit</button></>}>
            <div className="row-wrap mb12" style={{ gap: 12 }}>{(c.partyIds ?? []).map((id: string) => <PersonLink key={id} s={g.get(id)} />)}</div>
            {c.description && <p className="small">{c.description}</p>}
            <div className="grid g2">
              <div><div className="label mb8">Positions</div><div className="pre small">{c.positions ?? <span className="muted">—</span>}</div></div>
              <div><div className="label mb8">Underlying interests</div><div className="pre small">{c.interests ?? <span className="muted">Not explored yet — ask “why is that important to you?”</span>}</div></div>
            </div>
            {c.resolution && <div className="mt12 small" style={{ background: 'var(--green-soft)', padding: 10, borderRadius: 8 }}><strong>Resolution:</strong> {c.resolution}</div>}
            {c.status !== 'resolved' && (
              <div className="row-wrap mt12">
                {c.status === 'open' && <button className="btn btn-sm" onClick={() => updateEntity(c.id, { status: 'negotiating' }).catch(errorToast)}>Start negotiating</button>}
                <button className="btn btn-sm" onClick={() => openEditor({ type: 'decision', defaults: { title: `Resolve: ${c.title}`, status: 'proposed', relatedIds: [c.id], consultedIds: c.partyIds }, onSaved: (d) => void updateEntity(c.id, { decisionId: d.id }) })}>Draft a decision</button>
                <button className="btn btn-sm btn-ghost" onClick={() => openEditor({ type: 'conflict', id: c.id })}>Escalate / resolve…</button>
              </div>
            )}
          </Card>
        ))}
        {!list.length && <Empty icon="gavel">No open conflicts.</Empty>}
      </div>
    </div>
  );
}

/** Reusable panel: who should be involved in this but isn't. */
export function AlignmentPanel({ e }: { e: Entity }) {
  const g = useGraph();
  const gaps = alignmentCheck(e, g, now());
  return (
    <Card title={`Alignment check${gaps.length ? ` · ${gaps.length}` : ''}`} icon="users" sub="People with a stake who are not involved, or are resistant.">
      <AlignmentList gaps={gaps} />
    </Card>
  );
}


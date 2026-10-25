import { useMemo, useState } from 'react';
import { nameOf, type Entity } from '../../../../core/schema.ts';
import { findContradictions } from '../../../../core/engines/contradictions.ts';
import { diffSnapshots, snapshotRequirements, wordDiff, type SnapshotItem } from '../../../../core/engines/requirements.ts';
import { impactSummary, traceMatrix } from '../../../../core/engines/traceability.ts';
import { isoDate } from '../../../../core/util.ts';
import { createEntity, now, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link, navigate, setQuery, useRoute } from '../../router.tsx';
import { Badge, Card, Empty, Markdown, PageHead, Stat, StatusBadge, Tabs, errorToast, toast, Term } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { fmtDate, humanize, relDays } from '../../ui/format.ts';
import { EntityTable, EntityPage } from '../../entity/views.tsx';
import { RefChip, RefChips } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { AlignmentPanel } from '../stakeholders/Governance.tsx';

export function RequirementsPage() {
  const g = useGraph();
  const { query } = useRoute();
  const tab = (query.get('tab') ?? 'all') as 'all' | 'contradictions' | 'baselines' | 'changes';
  const reqs = g.all('requirement');
  const contradictions = useMemo(() => findContradictions(reqs), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const tm = useMemo(() => traceMatrix(g), [g]);
  const gapsOf = (r: Entity) => tm.rows.find((x) => x.requirement.id === r.id)?.gaps ?? [];
  const [specFilter, setSpecFilter] = useState('');
  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="requirements" title="Managing requirements" steps={[
        <>Each requirement has a <Term explain="Must have, Should have, Could have, Won't have (this time).">MoSCoW</Term> priority, a status and a version. Editing an approved one creates a new version.</>,
        <>A <Term explain="A frozen snapshot of what was agreed, usually at sign-off. Later changes are compared against it.">baseline</Term> freezes what was agreed; change requests track what moved after that.</>,
        <>Contradictions — say, 15 minutes in one requirement and 5 in another — are detected automatically.</>,
      ]} />} title="Requirements" sub="Managed requirements with MoSCoW, versions, baselines, change control and automatic contradiction detection." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'requirement' })}><Icon name="plus" size={14} />New requirement</button>} />
      <div className="grid g4 mb16">
        <Stat label="Requirements" value={reqs.filter((r) => r.status !== 'deprecated').length} sub={`${reqs.filter((r) => r.priority === 'must').length} must-haves`} />
        <Stat label="Contradictions" value={contradictions.length} tone={contradictions.length ? 'red' : undefined} />
        <Stat label="Without tests" value={tm.rows.filter((r) => r.gaps.includes('no-test')).length} sub={`${Math.round(tm.coverage.test * 100)}% test coverage`} />
        <Stat label="Without a source" value={tm.rows.filter((r) => r.gaps.includes('no-source')).length} sub="no stakeholder or evidence" />
      </div>
      <Tabs value={tab} onChange={(t) => setQuery({ tab: t })} tabs={[
        { id: 'all', label: 'All' }, { id: 'contradictions', label: 'Contradictions', count: contradictions.length },
        { id: 'baselines', label: 'Baselines', count: g.all('baseline').length }, { id: 'changes', label: 'Change requests', count: g.all('changeRequest').filter((c) => ['submitted', 'assessing'].includes(c.status)).length },
      ]} />
      {tab === 'all' && (
        <Card flush>
          <div className="row" style={{ padding: '10px 12px 0' }}>
            <select className="select input-sm" style={{ width: 'auto' }} value={specFilter} onChange={(e) => setSpecFilter(e.target.value)}>
              <option value="">All specs</option>{g.all('spec').map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <EntityTable type="requirement" rows={reqs.filter((r) => !specFilter || r.specId === specFilter)} initialSort={{ key: 'key', dir: 1 }} columns={[
            { key: 'key', sort: (r) => Number(String(r.key).split('-')[1]) }, 'title', 'kind', 'priority', 'status',
            { key: 'version', label: 'v', render: (r) => <span className="num muted">v{r.version ?? 1}</span> },
            { key: 'trace', label: 'Trace gaps', render: (r) => <span className="chips">{gapsOf(r).map((x) => <Badge key={x} tone={x === 'failing-test' || x === 'requirement-defects' ? 'red' : 'amber'}>{humanize(x)}</Badge>)}</span> },
          ]} />
        </Card>
      )}
      {tab === 'contradictions' && (
        <div className="col" style={{ gap: 12 }}>
          {contradictions.length === 0 && <Empty icon="circle-check">No contradictions detected.</Empty>}
          {contradictions.map((c, i) => {
            const a = g.get(c.aId)!, b = g.get(c.bId)!;
            return (
              <Card key={i} title={<span className="row"><Badge tone="red">{c.kind}</Badge><span>{c.reason}</span></span>}>
                <div className="grid g2">
                  {[a, b].map((r) => <Link key={r.id} to={hrefOf(r)} className="card pad" style={{ color: 'inherit' }}><div className="row"><span className="key">{r.key}</span><span className="strong">{r.title}</span><span className="spacer" /><StatusBadge value={r.status} /></div><div className="small mt8">{r.statement}</div><div className="small muted mt8">Source: {(r.sourceIds ?? []).map((s: string) => nameOf(g.get(s))).join(', ') || '—'}</div></Link>)}
                </div>
                <div className="row-wrap mt12">
                  <button className="btn btn-sm" onClick={() => openEditor({ type: 'decision', defaults: { title: `Resolve: ${a.title} vs ${b.title}`, status: 'proposed', relatedIds: [a.id, b.id], context: c.reason } })}>Log a decision</button>
                  <button className="btn btn-sm" onClick={() => openEditor({ type: 'conflict', defaults: { title: `${a.key} vs ${b.key}`, description: c.reason, raisedAt: isoDate(now()), partyIds: [...new Set([...(a.sourceIds ?? []), ...(b.sourceIds ?? [])].filter((x: string) => g.get(x)?.type === 'stakeholder'))] } })}>Open a conflict</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => updateEntity(b.id, { status: 'deprecated' }).then(() => toast(`${b.key} deprecated`)).catch(errorToast)}>Deprecate {b.key}</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {tab === 'baselines' && <BaselinesList />}
      {tab === 'changes' && (
        <Card flush actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'changeRequest' })}><Icon name="plus" size={13} />Change request</button>} title="Change control" icon="git-compare" sub="Changes to approved requirements, with automatic impact analysis.">
          <EntityTable type="changeRequest" columns={['key', 'title', 'requirementIds', 'requestedById', 'status']} />
        </Card>
      )}
    </div>
  );
}

function BaselinesList() {
  const g = useGraph();
  const [spec, setSpec] = useState(g.all('spec')[0]?.id ?? '');
  const create = async () => {
    const s = g.get(spec);
    if (!s) return;
    const reqs = g.all('requirement').filter((r) => r.specId === spec || (s.betId && r.betId === s.betId));
    const n = g.all('baseline').filter((b) => b.specId === spec).length + 1;
    try {
      const b = await createEntity('baseline', { title: `${s.title} — baseline v${n}`, date: isoDate(now()), specId: spec, snapshot: snapshotRequirements(reqs) });
      toast('Baseline captured');
      navigate(hrefOf(b));
    } catch (err) { errorToast(err); }
  };
  return (
    <>
      <Card className="mb16">
        <div className="row-wrap">
          <span className="small">Capture a baseline of the current requirements for</span>
          <select className="select input-sm" style={{ width: 'auto' }} value={spec} onChange={(e) => setSpec(e.target.value)}>{g.all('spec').map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          <button className="btn btn-sm btn-primary" onClick={create}>Capture baseline</button>
        </div>
      </Card>
      <Card flush><EntityTable type="baseline" columns={['title', 'date', 'specId', 'approvalId', { key: 'n', label: 'Requirements', render: (b) => (b.snapshot ?? []).length }]} /></Card>
    </>
  );
}

export function BaselinePage({ id }: { id: string }) {
  const b = useEntity(id);
  const g = useGraph();
  if (!b) return <EntityPage id={id} />;
  const spec = g.get(b.specId);
  const current = snapshotRequirements(g.all('requirement').filter((r) => r.specId === b.specId || (spec?.betId && r.betId === spec.betId)));
  const diff = diffSnapshots(b.snapshot as SnapshotItem[], current);
  const approval = g.get(b.approvalId);
  return (
    <EntityPage id={id}>
      <div className="grid g4">
        <Stat label="In baseline" value={(b.snapshot ?? []).length} />
        <Stat label="Added since" value={diff.added.length} tone={diff.added.length ? 'amber' : undefined} />
        <Stat label="Changed since" value={diff.changed.length} tone={diff.changed.length ? 'amber' : undefined} />
        <Stat label="Removed since" value={diff.removed.length} />
      </div>
      {approval && <Card title="Sign-off" icon="clipboard-check"><div className="row"><RefChip e={approval} /><StatusBadge value={approval.status} /></div></Card>}
      <Card title="Changes since this baseline" icon="git-compare" sub="Every change after a baseline should have a change request." flush>
        <div className="list">
          {diff.changed.map((c) => (
            <div key={c.after.id} className="list-item" style={{ flexDirection: 'column', gap: 6 }}>
              <div className="row"><Badge tone="amber">changed</Badge><span className="key">{c.after.key}</span><span className="strong">{c.after.title}</span><span className="muted small">{c.fields.join(', ')} · v{c.before.version} → v{c.after.version}</span></div>
              {c.fields.includes('statement') && (
                <div className="small" style={{ background: 'var(--surface-2)', padding: 8, borderRadius: 6 }}>
                  {wordDiff(c.before.statement ?? '', c.after.statement ?? '').map((p, i) => <span key={i} style={p.op === 'add' ? { background: 'var(--green-soft)', color: 'var(--green)' } : p.op === 'del' ? { background: 'var(--red-soft)', color: 'var(--red)', textDecoration: 'line-through' } : undefined}>{p.text}</span>)}
                </div>
              )}
            </div>
          ))}
          {diff.added.map((a) => <div key={a.id} className="list-item"><Badge tone="green">added</Badge><span className="key">{a.key}</span><span>{a.title}</span></div>)}
          {diff.removed.map((a) => <div key={a.id} className="list-item"><Badge tone="red">removed</Badge><span className="key">{a.key}</span><span>{a.title}</span></div>)}
          {!diff.changed.length && !diff.added.length && !diff.removed.length && <Empty icon="circle-check">No changes since this baseline.</Empty>}
        </div>
      </Card>
      <Card title="Snapshot" icon="milestone" flush>
        <div className="table-wrap"><table className="table"><thead><tr><th>Key</th><th>Requirement</th><th>Priority</th><th>v</th></tr></thead>
          <tbody>{(b.snapshot as SnapshotItem[]).map((s) => <tr key={s.id}><td className="key">{s.key}</td><td><div className="strong">{s.title}</div><div className="small muted">{s.statement}</div></td><td>{humanize(s.priority)}</td><td className="num">v{s.version}</td></tr>)}</tbody></table></div>
      </Card>
    </EntityPage>
  );
}

export function RequirementPage({ id }: { id: string }) {
  const r = useEntity(id);
  const g = useGraph();
  if (!r) return <EntityPage id={id} />;
  const tm = traceMatrix(g).rows.find((x) => x.requirement.id === r.id);
  const history = (r.history ?? []) as { version: number; statement?: string; title?: string; at: string }[];
  const contradictions = findContradictions(g.all('requirement')).filter((c) => c.aId === r.id || c.bId === r.id);
  return (
    <EntityPage id={id}>
      {contradictions.length > 0 && (
        <Card title="Contradicts" icon="triangle-alert">
          {contradictions.map((c, i) => <div key={i} className="row small mb8"><Badge tone="red">{c.kind}</Badge><RefChip id={c.aId === r.id ? c.bId : c.aId} /><span className="muted">{c.reason}</span></div>)}
        </Card>
      )}
      {tm && (
        <Card title="Traceability" icon="network" actions={<Link className="btn btn-sm" to={`/deliver/trace?impact=${r.id}`}>Impact analysis</Link>}>
          <div className="grid g4" style={{ gap: 12 }}>
            <div><div className="label mb8">Stories</div><RefChips ids={tm.stories.map((s) => s.id)} /></div>
            <div><div className="label mb8">Tests</div>{tm.tests.length ? <span className="row-wrap" style={{ gap: 4 }}>{tm.tests.map((t) => <Link key={t.id} to={hrefOf(t)} className="chip">{t.key}<StatusBadge value={t.status} /></Link>)}</span> : <span className="muted">—</span>}</div>
            <div><div className="label mb8">Releases</div><RefChips ids={tm.releases.map((x) => x.id)} /></div>
            <div><div className="label mb8">Defects</div><RefChips ids={tm.defects.map((x) => x.id)} /></div>
          </div>
          {tm.gaps.length > 0 && <div className="chips mt12">{tm.gaps.map((x) => <Badge key={x} tone="amber">{humanize(x)}</Badge>)}</div>}
        </Card>
      )}
      <Card title={`Version history · v${r.version ?? 1}`} icon="history" flush>
        {history.length === 0 ? <div className="empty">No earlier versions. Edits to approved requirements create a new version automatically.</div> : (
          <div className="list">
            {[...history].reverse().map((h) => (
              <div key={h.version} className="list-item" style={{ flexDirection: 'column', gap: 4 }}>
                <div className="row small"><Badge>v{h.version}</Badge><span className="muted">{fmtDate(h.at)}</span></div>
                <div className="small">{wordDiff(h.statement ?? '', r.statement ?? '').map((p, i) => <span key={i} style={p.op === 'add' ? { background: 'var(--green-soft)', color: 'var(--green)' } : p.op === 'del' ? { background: 'var(--red-soft)', color: 'var(--red)', textDecoration: 'line-through' } : undefined}>{p.text}</span>)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </EntityPage>
  );
}

export function ChangeRequestPanel({ cr }: { cr: Entity }) {
  const g = useGraph();
  const md = impactSummary(g, cr.requirementIds ?? []);
  return <Card title="Impact of this change" icon="network"><Markdown text={md || '_Link affected requirements to see the impact._'} /></Card>;
}

// ---------------- Decisions ----------------

export function DecisionsPage() {
  const g = useGraph();
  const today = now();
  const decisions = g.all('decision');
  const due = decisions.filter((d) => d.status === 'decided' && d.revisitDate && d.revisitDate <= isoDate(today));
  return (
    <div className="page">
      <PageHead title="Decision log" sub="Why we did what we did: options, rationale, who decided and who was consulted, reversibility and revisit triggers." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'decision', defaults: { date: isoDate(today), status: 'decided', deciderIds: g.me ? [g.me.id] : [] } })}><Icon name="plus" size={14} />Log decision</button>} />
      <div className="grid g4 mb16">
        <Stat label="Decisions" value={decisions.filter((d) => d.status === 'decided').length} />
        <Stat label="Proposed" value={decisions.filter((d) => d.status === 'proposed').length} sub="awaiting a decision" />
        <Stat label="One-way doors" value={decisions.filter((d) => d.reversibility === 'one-way-door' && d.status !== 'superseded').length} sub="hard to reverse — decide slowly" />
        <Stat label="Due for revisit" value={due.length} tone={due.length ? 'amber' : undefined} />
      </div>
      <Card flush><EntityTable type="decision" columns={['key', 'title', 'chosen', 'deciderIds', 'date', 'reversibility', 'status']} initialSort={{ key: 'date', dir: -1 }} /></Card>
    </div>
  );
}

export function DecisionPage({ id }: { id: string }) {
  const d = useEntity(id);
  if (!d) return <EntityPage id={id} />;
  return (
    <EntityPage id={id} side={<AlignmentPanel e={d} />}>
      {d.revisitDate && d.status === 'decided' && d.revisitDate <= isoDate(now()) && (
        <Card><div className="row"><Icon name="history" /><span className="grow"><strong>Time to revisit.</strong> {d.revisitTrigger ? `Trigger: ${d.revisitTrigger}.` : ''} Revisit date was {fmtDate(d.revisitDate)} ({relDays(d.revisitDate)}).</span><button className="btn btn-sm" onClick={() => updateEntity(d.id, { status: 'revisited' }).catch(errorToast)}>Mark revisited</button></div></Card>
      )}
    </EntityPage>
  );
}

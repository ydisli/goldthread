import { useMemo, useState, type ReactNode } from 'react';
import { nameOf, type Entity } from '../../../../core/schema.ts';
import { clusterEvidence, evidenceStrength, suggestOpportunities, type Cluster } from '../../../../core/engines/clustering.ts';
import { rice, wsjf } from '../../../../core/engines/prioritization.ts';
import { concurrency, forecastScope, scopeCreep } from '../../../../core/engines/forecast.ts';
import { evaluateBusinessCase } from '../../../../core/engines/finance.ts';
import { sampleSizePerVariant, twoProportionTest } from '../../../../core/engines/stats.ts';
import { daysBetween, isoDate, uniq } from '../../../../core/util.ts';
import { parseCsv } from '../../../../core/engines/importers.ts';
import { batch, now, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link, navigate, setQuery, useRoute } from '../../router.tsx';
import { Badge, Card, Empty, Meter, PageHead, Seg, Stat, StatusBadge, Tabs, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { Histogram, Legend, QuadrantScatter } from '../../ui/charts.tsx';
import { fmtDate, humanize, money, relDays } from '../../ui/format.ts';
import { EntityTable, EntityPage } from '../../entity/views.tsx';
import { RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { AlignmentPanel } from '../stakeholders/Governance.tsx';

// ---------------- Signal Hub ----------------

export function SignalsPage() {
  const g = useGraph();
  const today = now();
  const { query } = useRoute();
  const tab = (query.get('tab') ?? 'clusters') as 'clusters' | 'unlinked' | 'all' | 'import';
  const evidence = g.all('evidence');
  const clusters = useMemo(() => clusterEvidence(evidence, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const unlinked = evidence.filter((e) => !(e.opportunityIds ?? []).length).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const recent = evidence.filter((e) => e.date && daysBetween(e.date, today) <= 30 && daysBetween(e.date, today) >= 0);
  const accounts = uniq(evidence.map((e) => e.account).filter(Boolean));
  const arr = accounts.reduce((s, a) => s + Math.max(0, ...evidence.filter((e) => e.account === a).map((e) => Number(e.arr) || 0)), 0);
  return (
    <div className="page">
      <PageHead
        title="Signal Hub"
        sub="Every customer and market signal in one place — clustered into themes, weighed by accounts and ARR, linked to opportunities."
        actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'evidence', defaults: { date: isoDate(today) } })}><Icon name="plus" size={14} />Add signal</button>}
      />
      <div className="grid g4 mb16">
        <Stat label="Signals" value={evidence.length} sub={`${recent.length} in the last 30 days`} />
        <Stat label="Accounts heard from" value={accounts.length} sub={`${money(arr)} ARR`} />
        <Stat label="Themes" value={clusters.filter((c) => c.items.length >= 2).length} sub={`${clusters.filter((c) => c.trend === 'rising' || c.trend === 'new').length} rising`} />
        <Stat label="Unlinked" value={unlinked.length} sub="not tied to an opportunity" tone={unlinked.length ? 'amber' : undefined} />
      </div>
      <Tabs value={tab} onChange={(t) => setQuery({ tab: t })} tabs={[
        { id: 'clusters', label: 'Themes' }, { id: 'unlinked', label: 'Unlinked', count: unlinked.length }, { id: 'all', label: 'All signals', count: evidence.length }, { id: 'import', label: 'Import' },
      ]} />
      {tab === 'clusters' && <div className="col" style={{ gap: 14 }}>{clusters.filter((c) => c.items.length >= 2).map((c) => <ClusterCard key={c.id} c={c} />)}</div>}
      {tab === 'unlinked' && <Unlinked items={unlinked} />}
      {tab === 'all' && <Card flush><EntityTable type="evidence" columns={['title', 'source', 'kind', 'account', 'segment', 'arr', 'date', 'opportunityIds']} initialSort={{ key: 'date', dir: -1 }} /></Card>}
      {tab === 'import' && <ImportSignals />}
    </div>
  );
}

function ClusterCard({ c }: { c: Cluster }) {
  const g = useGraph();
  const [target, setTarget] = useState(c.opportunityId ?? '');
  const linkAll = async () => {
    if (!target) return;
    try {
      await batch(c.items.filter((e) => !(e.opportunityIds ?? []).includes(target)).map((e) => ({ op: 'update' as const, id: e.id, data: { opportunityIds: [...(e.opportunityIds ?? []), target] } })));
      toast(`Linked ${c.items.length} signals`);
    } catch (err) { errorToast(err); }
  };
  const createOpp = async () => {
    const title = prompt('Name the customer problem behind this theme', `Customers struggle with ${c.terms.slice(0, 2).join(' and ')}`);
    if (!title) return;
    try {
      const out = await batch([
        { op: 'create', type: 'opportunity', data: { title, status: 'exploring' } },
        ...c.items.map((e) => ({ op: 'update' as const, id: e.id, data: { opportunityIds: [...(e.opportunityIds ?? []), '$0'] } })),
      ]);
      navigate(hrefOf(out[0]));
    } catch (err) { errorToast(err); }
  };
  const linked = g.get(c.opportunityId);
  return (
    <Card
      title={<span className="row-wrap"><span>{c.label}</span><Badge tone={c.trend === 'rising' || c.trend === 'new' ? 'red' : c.trend === 'falling' ? 'green' : ''}>{c.trend}</Badge></span>}
      sub={<>{c.items.length} signals · {c.accounts.length} accounts · {money(c.arr)} ARR · {c.segments.map(humanize).join(', ') || 'no segment'} · {Math.round(c.didShare * 100)}% behavioural · {c.recent} in last 30d (prev. {c.previous})</>}
      actions={linked ? <RefChip e={linked} /> : <Badge tone="amber">No opportunity</Badge>}
    >
      <div className="col" style={{ gap: 6 }}>
        {c.items.slice(0, 4).map((e) => (
          <Link key={e.id} to={hrefOf(e)} className="row small" style={{ color: 'inherit', alignItems: 'flex-start' }}>
            <Icon name="quote" size={13} className="muted" />
            <span className="grow">“{e.title}”</span>
            <span className="muted nowrap">{e.account ?? humanize(e.source)} · {fmtDate(e.date)}</span>
          </Link>
        ))}
        {c.items.length > 4 && <span className="small muted">+{c.items.length - 4} more</span>}
      </div>
      <div className="row-wrap mt12">
        <select className="select input-sm" style={{ width: 'auto', maxWidth: 320 }} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Link all to opportunity…</option>
          {g.all('opportunity').map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
        <button className="btn btn-sm" disabled={!target} onClick={linkAll}>Link</button>
        <button className="btn btn-sm btn-ghost" onClick={createOpp}><Icon name="plus" size={13} />New opportunity from theme</button>
      </div>
    </Card>
  );
}

function Unlinked({ items }: { items: Entity[] }) {
  const g = useGraph();
  const opps = g.all('opportunity');
  const evidence = g.all('evidence');
  const link = async (e: Entity, oppId: string) => {
    try { await updateEntity(e.id, { opportunityIds: [...(e.opportunityIds ?? []), oppId] }); toast('Linked'); } catch (err) { errorToast(err); }
  };
  if (!items.length) return <Empty icon="circle-check">Every signal is linked to an opportunity.</Empty>;
  return (
    <Card flush>
      <div className="list">
        {items.map((e) => {
          const sug = suggestOpportunities(e, opps, evidence);
          return (
            <div key={e.id} className="list-item" style={{ flexDirection: 'column', gap: 8 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Icon name="quote" size={14} className="muted" />
                <Link to={hrefOf(e)} className="grow strong" style={{ color: 'inherit' }}>“{e.title}”</Link>
                <span className="small muted nowrap">{e.account ?? humanize(e.source)} · {fmtDate(e.date)}</span>
              </div>
              <div className="row-wrap" style={{ gap: 6 }}>
                <span className="small muted">Suggested:</span>
                {sug.map((s) => <button key={s.opportunity.id} className="btn btn-sm" onClick={() => link(e, s.opportunity.id)} title={`Similarity ${s.similarity.toFixed(2)}`}><Icon name="link" size={12} />{s.opportunity.title}</button>)}
                {!sug.length && <span className="small muted">no close match — new opportunity?</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ImportSignals() {
  const [text, setText] = useState('title,source,account,segment,arr,date,detail\n"Need the export to include tax codes",support,Halcyon Foods,enterprise,180000,2026-10-20,');
  const rows = parseCsv(text);
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const body = rows.slice(1);
  const doImport = async () => {
    const ti = head.indexOf('title');
    if (ti < 0) { toast('A "title" column is required', 'error'); return; }
    const get = (r: string[], k: string) => { const i = head.indexOf(k); return i >= 0 ? r[i]?.trim() || undefined : undefined; };
    try {
      await batch(body.map((r) => ({
        op: 'create' as const, type: 'evidence', data: {
          title: get(r, 'title'), source: get(r, 'source') ?? 'support', account: get(r, 'account'), segment: get(r, 'segment'),
          arr: get(r, 'arr') ? Number(get(r, 'arr')) : undefined, date: get(r, 'date') ?? isoDate(now()), detail: get(r, 'detail'), kind: get(r, 'kind') ?? 'said',
        },
      })));
      toast(`Imported ${body.length} signals`);
      setQuery({ tab: 'unlinked' });
    } catch (err) { errorToast(err); }
  };
  return (
    <Card title="Import signals from CSV" icon="upload" sub="Paste an export from your support desk, survey tool or CRM. Columns: title (required), source, kind, account, segment, arr, date, detail.">
      <textarea className="textarea mono" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row mt12"><span className="small muted">{body.length} rows detected · columns: {head.join(', ') || '—'}</span><span className="spacer" /><button className="btn btn-primary" disabled={!body.length} onClick={doImport}>Import {body.length} signals</button></div>
    </Card>
  );
}

// ---------------- Opportunity tree ----------------

export function evidenceForOpportunity(g: ReturnType<typeof useGraph>, oppId: string): Entity[] {
  const ids = new Set([oppId]);
  let added = true;
  while (added) {
    added = false;
    for (const o of g.all('opportunity')) if (o.parentId && ids.has(o.parentId) && !ids.has(o.id)) { ids.add(o.id); added = true; }
  }
  return g.all('evidence').filter((e) => (e.opportunityIds ?? []).some((x: string) => ids.has(x)));
}

export function OpportunitiesPage() {
  const g = useGraph();
  const today = now();
  const opps = g.all('opportunity');
  const roots = opps.filter((o) => !o.parentId || !g.get(o.parentId));
  const byObjective = new Map<string, Entity[]>();
  for (const r of roots) byObjective.set(r.objectiveId ?? '', [...(byObjective.get(r.objectiveId ?? '') ?? []), r]);
  const Node = ({ o, depth }: { o: Entity; depth: number }) => {
    const ev = evidenceForOpportunity(g, o.id);
    const st = evidenceStrength(ev, today);
    const bets = g.referencing(o.id, 'bet', 'opportunityIds');
    const kids = opps.filter((x) => x.parentId === o.id);
    return (
      <div style={{ marginLeft: depth * 24, borderLeft: depth ? '2px solid var(--border)' : undefined, paddingLeft: depth ? 14 : 0 }}>
        <div className="card pad mb8">
          <div className="row-wrap">
            <Icon name="lightbulb" className="muted" />
            <Link to={hrefOf(o)} className="strong" style={{ color: 'var(--text)', flex: 1, minWidth: 200 }}>{o.title}</Link>
            <StatusBadge value={o.status} />
            <Badge tone={st.verdict === 'strong' ? 'green' : st.verdict === 'moderate' ? 'blue' : st.verdict === 'weak' ? 'amber' : 'red'} title={st.breakdown.map((b) => `${b.label}: ${b.points}/${b.max}`).join('\n')}>evidence {st.score}/100 · {st.verdict}</Badge>
          </div>
          <div className="small muted mt8">{st.count} signals · {st.accounts} accounts · {money(st.arr)} ARR · {Math.round(st.didShare * 100)}% behavioural{o.metricId && <> · moves <RefChip id={o.metricId} /></>}</div>
          {st.loudest && <div className="small mt8" style={{ color: 'var(--amber)' }}><Icon name="triangle-alert" size={12} /> {Math.round(st.loudest.share * 100)}% of signals come from {st.loudest.account} — a loud customer, not necessarily a market.</div>}
          {bets.length > 0 && (
            <div className="row-wrap mt8" style={{ gap: 6 }}>
              {bets.map((b) => <Link key={b.id} to={hrefOf(b)} className="chip"><Icon name="rocket" size={12} />{b.title}<StatusBadge value={b.status} /></Link>)}
            </div>
          )}
          <div className="row mt8"><button className="btn btn-sm btn-ghost" onClick={() => openEditor({ type: 'bet', defaults: { opportunityIds: [o.id], objectiveId: o.objectiveId, metricId: o.metricId, status: 'idea' } })}><Icon name="plus" size={12} />Bet</button><button className="btn btn-sm btn-ghost" onClick={() => openEditor({ type: 'opportunity', defaults: { parentId: o.id, objectiveId: o.objectiveId } })}><Icon name="plus" size={12} />Sub-opportunity</button></div>
        </div>
        {kids.map((k) => <Node key={k.id} o={k} depth={depth + 1} />)}
      </div>
    );
  };
  return (
    <div className="page">
      <PageHead title="Opportunity tree" sub="Outcome → customer opportunities → bets → experiments. Evidence strength is computed from volume, account spread, segment diversity, behavioural data and recency." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'opportunity' })}><Icon name="plus" size={14} />New opportunity</button>} />
      {[...byObjective.entries()].map(([objId, list]) => {
        const obj = g.get(objId);
        return (
          <div key={objId || 'none'} className="mb16">
            <div className="row mb8"><Icon name={obj ? 'goal' : 'circle-dot'} className="muted" /><h2>{obj ? obj.title : 'Not linked to an objective'}</h2>{obj && <Badge>{obj.period}</Badge>}</div>
            {list.map((o) => <Node key={o.id} o={o} depth={0} />)}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Bets ----------------

export function BetsPage() {
  const [view, setView] = useState<'active' | 'all'>('active');
  const g = useGraph();
  const rows = g.all('bet').filter((b) => view === 'all' || !['measured', 'killed'].includes(b.status));
  return (
    <div className="page">
      <PageHead title="Bets" sub="Initiatives framed as falsifiable hypotheses, with a metric, a confidence and a date to check the result." actions={<><Seg value={view} onChange={setView} options={[{ id: 'active', label: 'Active' }, { id: 'all', label: 'All' }]} /><button className="btn btn-primary" onClick={() => openEditor({ type: 'bet' })}><Icon name="plus" size={14} />New bet</button></>} />
      <Card flush><EntityTable type="bet" rows={rows} columns={['key', 'title', 'status', 'horizon', 'category', 'teamId', 'confidence', 'targetDate', 'checkDate']} /></Card>
    </div>
  );
}

export function BetPage({ id }: { id: string }) {
  const b = useEntity(id);
  const g = useGraph();
  const today = now();
  if (!b) return <EntityPage id={id} />;
  const stories = g.referencing(b.id, 'story', 'betId');
  const done = stories.filter((s) => s.status === 'done').length;
  const opps = g.resolve(b, 'opportunityIds');
  const ev = uniq(opps.flatMap((o) => evidenceForOpportunity(g, o.id)));
  const st = evidenceStrength(ev, today);
  const assumptions = g.referencing(b.id, 'assumption', 'betId');
  const experiments = g.referencing(b.id, 'experiment', 'betId');
  const bc = g.referencing(b.id, 'businessCase', 'betId')[0];
  const fc = ['in-delivery', 'committed'].includes(b.status) ? forecastScope(g.all('story'), b, today, { concurrent: concurrency(g.all('bet'), b) }) : null;
  const creep = scopeCreep(g.all('story'), b);
  const r = rice(b), w = wsjf(b);
  return (
    <EntityPage
      id={id}
      hideFields
      sub={b.hypothesis}
      side={<AlignmentPanel e={b} />}
    >
      <div className="grid g4">
        <Stat label="Confidence" value={`${b.confidence ?? '—'}%`} sub={b.predictedChange ?? undefined} />
        <Stat label="Progress" value={`${done}/${stories.length}`} sub="stories done" />
        <Stat label="Evidence" value={`${st.score}/100`} sub={`${st.verdict} · ${st.accounts} accounts`} />
        <Stat label="RICE · WSJF" value={`${r !== null ? r.toFixed(0) : '—'} · ${w !== null ? w.toFixed(1) : '—'}`} />
      </div>
      {fc && (
        <Card title="Delivery forecast" icon="activity" sub={`${fc.remaining} stories remaining · Monte Carlo over ${fc.trials.toLocaleString()} simulations of the team's weekly throughput${concurrency(g.all('bet'), b) > 1 ? ` (shared with ${concurrency(g.all('bet'), b) - 1} other bet)` : ''}.`}>
          <div className="grid g3 mb12">
            <div><div className="label">50% likely by</div><div className="strong">{fmtDate(fc.dates.p50)}</div></div>
            <div><div className="label">85% likely by</div><div className="strong">{fmtDate(fc.dates.p85)}</div></div>
            <div><div className="label">Target {fmtDate(b.targetDate)}</div><div className="strong" style={{ color: (fc.probabilityBy ?? 1) < 0.5 ? 'var(--red)' : undefined }}>{fc.probabilityBy !== undefined ? `${Math.round(fc.probabilityBy * 100)}% chance` : '—'}</div></div>
          </div>
          <Histogram bins={fc.histogram.map((h) => ({ x: h.weeks, count: h.count }))} markers={[{ x: fc.weeks.p50, label: '50%' }, { x: fc.weeks.p85, label: '85%' }]} xLabel="Weeks from today" format={(v) => `${v} weeks`} />
          {creep && creep.added > 0 && <div className="small mt8" style={{ color: 'var(--amber)' }}>Scope grew by {creep.added} stories ({Math.round(creep.ratio * 100)}%) since commitment on {fmtDate(b.startDate)}.</div>}
        </Card>
      )}
      <Card title="Details" icon="rocket"><FieldGridLite e={b} /></Card>
      <div className="grid g2">
        <Card title={`Assumptions · ${assumptions.length}`} icon="brain" flush actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'assumption', defaults: { betId: b.id } })}><Icon name="plus" size={12} /></button>}>
          {assumptions.length ? <div className="list">{assumptions.map((a) => <Link key={a.id} to={hrefOf(a)} className="list-item"><div className="grow">{a.title}<div className="small muted">{humanize(a.category)} · importance {a.importance} · evidence {a.evidenceLevel}</div></div><StatusBadge value={a.status} /></Link>)}</div> : <div className="empty">No assumptions mapped.</div>}
        </Card>
        <Card title={`Experiments · ${experiments.length}`} icon="flask-conical" flush actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'experiment', defaults: { betId: b.id } })}><Icon name="plus" size={12} /></button>}>
          {experiments.length ? <div className="list">{experiments.map((x) => <Link key={x.id} to={hrefOf(x)} className="list-item"><div className="grow">{x.title}<div className="small muted">{humanize(x.method)}</div></div><StatusBadge value={x.decision !== 'pending' ? x.decision : x.status} /></Link>)}</div> : <div className="empty">No experiments.</div>}
        </Card>
      </div>
      <Card title={`Evidence · ${ev.length}`} icon="quote" sub={opps.map((o) => o.title).join(' · ')} flush>
        <div className="list">{ev.slice(0, 8).map((e) => <Link key={e.id} to={hrefOf(e)} className="list-item small"><span className="grow">“{e.title}”</span><span className="muted nowrap">{e.account ?? humanize(e.source)}</span></Link>)}</div>
      </Card>
      {bc && (() => { const res = evaluateBusinessCase(bc); return <Card title="Business case" icon="briefcase-business" actions={<Link className="btn btn-sm" to={hrefOf(bc)}>Open</Link>}><div className="grid g3"><div><div className="label">NPV</div><div className="strong">{money(res.npv)}</div></div><div><div className="label">ROI</div><div className="strong">{Math.round(res.roi * 100)}%</div></div><div><div className="label">Payback</div><div className="strong">{res.paybackYears?.toFixed(1) ?? '—'} yrs</div></div></div></Card>; })()}
    </EntityPage>
  );
}

function FieldGridLite({ e }: { e: Entity }) {
  const g = useGraph();
  const items: [string, ReactNode][] = [
    ['Status', <StatusBadge value={e.status} />], ['Horizon', humanize(e.horizon)], ['Category', humanize(e.category)], ['Owner', nameOf(g.get(e.ownerId))],
    ['Team', nameOf(g.get(e.teamId))], ['Metric', e.metricId ? <RefChip id={e.metricId} /> : '—'], ['Objective', e.objectiveId ? <RefChip id={e.objectiveId} /> : '—'],
    ['Start', fmtDate(e.startDate)], ['Target', fmtDate(e.targetDate)], ['Measure on', e.checkDate ? `${fmtDate(e.checkDate)} (${relDays(e.checkDate)})` : '—'],
    ['Result', e.result && e.result !== 'pending' ? <StatusBadge value={e.result} /> : '—'],
  ];
  return (
    <>
      <div className="grid g4" style={{ gap: 12 }}>{items.map(([k, v]) => <div key={k}><div className="label">{k}</div><div>{v}</div></div>)}</div>
      {e.actualResult && <div className="mt12"><div className="label">Actual result</div><div className="pre">{e.actualResult}</div></div>}
      {e.learning && <div className="mt12"><div className="label">Learning</div><div className="pre">{e.learning}</div></div>}
    </>
  );
}

// ---------------- Assumptions ----------------

export function AssumptionsPage() {
  const g = useGraph();
  const items = g.all('assumption');
  const STATUS_COLOR: Record<string, string> = { untested: 'var(--critical)', testing: 'var(--warning)', validated: 'var(--good)', invalidated: 'var(--text-3)' };
  return (
    <div className="page">
      <PageHead title="Assumption map" sub="What must be true for each bet to work. Top-left = important but unproven: the leaps of faith to test first." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'assumption' })}><Icon name="plus" size={14} />New assumption</button>} />
      <div className="grid g-side">
        <Card title="Importance × evidence" icon="brain">
          <QuadrantScatter
            points={items.map((a) => ({ id: a.id, x: Number(a.evidenceLevel) || 1, y: Number(a.importance) || 3, label: a.title.split(' ').slice(0, 3).join(' '), color: STATUS_COLOR[a.status] ?? 'var(--s1)', tip: <><div className="t-title">{a.title}</div><div>{humanize(a.category)} · {humanize(a.status)}</div><div>Bet: {nameOf(g.get(a.betId))}</div></> }))}
            xLabel="Evidence we have" yLabel="Importance" quadrants={['Test first', 'Proceed', 'Ignore for now', 'Safe bet']} onClick={(id) => navigate(hrefOf(g.get(id)!))} height={380}
          />
          <div className="mt12"><Legend items={Object.entries(STATUS_COLOR).map(([k, c]) => ({ label: humanize(k), color: c, shape: 'dot' }))} /></div>
        </Card>
        <Card title="Test first" icon="flask-conical" flush>
          <div className="list">{items.filter((a) => Number(a.importance) >= 4 && Number(a.evidenceLevel) <= 2 && a.status !== 'validated').map((a) => (
            <div key={a.id} className="list-item" style={{ flexDirection: 'column', gap: 6 }}>
              <Link to={hrefOf(a)} className="strong" style={{ color: 'inherit' }}>{a.title}</Link>
              <div className="small muted">{nameOf(g.get(a.betId))} · {humanize(a.category)}</div>
              {a.testPlan ? <div className="small">Plan: {a.testPlan}</div> : <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => openEditor({ type: 'experiment', defaults: { betId: a.betId, assumptionIds: [a.id], title: `Test: ${a.title}` } })}>Design an experiment</button>}
            </div>
          ))}</div>
        </Card>
      </div>
      <Card flush className="mt16"><EntityTable type="assumption" /></Card>
    </div>
  );
}

// ---------------- Experiments ----------------

export function ExperimentsPage() {
  return (
    <div className="page">
      <PageHead title="Experiment Lab" sub="Design experiments with the right sample size, and read results with statistics instead of gut feel." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'experiment' })}><Icon name="plus" size={14} />New experiment</button>} />
      <Card flush><EntityTable type="experiment" columns={['title', 'betId', 'method', 'status', 'decision', 'startDate']} /></Card>
    </div>
  );
}

export function ExperimentPage({ id }: { id: string }) {
  const x = useEntity(id);
  if (!x) return <EntityPage id={id} />;
  const base = Number(x.baselineRate) / 100, mde = Number(x.mde) / 100;
  const n = sampleSizePerVariant(base, mde, Number(x.alpha) || 0.05, Number(x.power) || 0.8);
  const t = twoProportionTest(Number(x.controlN), Number(x.controlConversions), Number(x.variantN), Number(x.variantConversions), Number(x.alpha) || 0.05);
  const single = !t && Number(x.variantN) > 0 ? Number(x.variantConversions) / Number(x.variantN) : null;
  const setDecision = (decision: string) => updateEntity(x.id, { decision, status: 'concluded' }).then(() => toast('Decision recorded')).catch(errorToast);
  return (
    <EntityPage id={id}>
      <div className="grid g2">
        <Card title="Sample size" icon="users">
          {n ? <>
            <div className="stat-value">{n.toLocaleString()} <span className="small muted">per variant</span></div>
            <div className="small muted mt8">To detect a {Math.round(mde * 100)}% relative lift on a {x.baselineRate}% baseline with α = {x.alpha ?? 0.05} and power {x.power ?? 0.8}. Total {(n * 2).toLocaleString()} visitors.</div>
            {Number(x.controlN) > 0 && <div className="mt12"><Meter value={Math.min(Number(x.controlN), Number(x.variantN)) / n} /><div className="small muted mt8">{Math.round((Math.min(Number(x.controlN), Number(x.variantN)) / n) * 100)}% of required sample collected</div></div>}
          </> : <span className="muted small">Set a baseline conversion and a minimum detectable effect.</span>}
        </Card>
        <Card title="Result" icon="chart-column">
          {t ? <>
            <div className="row-wrap" style={{ gap: 16 }}>
              <div><div className="label">Control</div><div className="strong">{(t.p1 * 100).toFixed(1)}%</div></div>
              <div><div className="label">Variant</div><div className="strong">{(t.p2 * 100).toFixed(1)}%</div></div>
              <div><div className="label">Relative lift</div><div className="strong" style={{ color: t.lift > 0 ? 'var(--green)' : 'var(--red)' }}>{t.lift > 0 ? '+' : ''}{(t.lift * 100).toFixed(1)}%</div></div>
              <div><div className="label">p-value</div><div className="strong">{t.pValue < 0.001 ? '< 0.001' : t.pValue.toFixed(3)}</div></div>
            </div>
            <div className="mt12"><Badge tone={t.significant ? 'green' : 'amber'}>{t.significant ? 'Statistically significant' : 'Not significant'}</Badge></div>
            <div className="small muted mt8">95% CI for the absolute difference: {(t.ci[0] * 100).toFixed(1)} to {(t.ci[1] * 100).toFixed(1)} percentage points.{n && Math.min(Number(x.controlN), Number(x.variantN)) < n ? ' Sample is below the planned size — beware of peeking.' : ''}</div>
          </> : single !== null ? <><div className="stat-value">{(single * 100).toFixed(1)}%</div><div className="small muted">{x.variantConversions} of {x.variantN} — {single * 100 >= Number(x.baselineRate) ? 'above' : 'below'} the {x.baselineRate}% threshold.</div></> : <span className="muted small">Enter visitors and conversions for control and variant.</span>}
          <div className="row mt12"><span className="small muted">Decision:</span>{['persevere', 'pivot', 'kill'].map((d) => <button key={d} className={`btn btn-sm ${x.decision === d ? 'btn-primary' : ''}`} onClick={() => setDecision(d)}>{humanize(d)}</button>)}</div>
        </Card>
      </div>
    </EntityPage>
  );
}

// ---------------- Customers: personas & journeys ----------------

export function CustomersPage() {
  const g = useGraph();
  const personas = g.all('persona');
  const journeys = g.all('journey');
  return (
    <div className="page">
      <PageHead title="Customers" sub="Evidence-backed personas with jobs-to-be-done, and journey maps that place pains in context." actions={<><button className="btn" onClick={() => openEditor({ type: 'journey' })}><Icon name="plus" size={14} />Journey</button><button className="btn btn-primary" onClick={() => openEditor({ type: 'persona' })}><Icon name="plus" size={14} />Persona</button></>} />
      <div className="grid g2 mb16">
        {personas.map((p) => {
          const ev = g.referencing(p.id, 'evidence', 'personaId');
          return (
            <Link key={p.id} to={hrefOf(p)} className="card card-link pad">
              <div className="row"><Icon name="book-user" className="muted" /><h2 style={{ flex: 1 }}>{p.name}</h2><Badge>{humanize(p.segment)}</Badge></div>
              <div className="small muted">{p.role}</div>
              {p.quote && <div className="mt8" style={{ fontStyle: 'italic' }}>“{p.quote}”</div>}
              {p.jobs && <div className="small mt8"><strong>Job:</strong> {p.jobs}</div>}
              <div className="small muted mt8">{ev.length} linked signals</div>
            </Link>
          );
        })}
      </div>
      <h2 className="mb8">Journey maps</h2>
      <div className="grid g2">{journeys.map((j) => <Link key={j.id} to={hrefOf(j)} className="card card-link pad"><div className="row"><Icon name="route" className="muted" /><span className="strong">{j.title}</span></div><div className="small muted mt8">{(j.stages ?? []).length} stages · {nameOf(g.get(j.personaId))}</div></Link>)}</div>
    </div>
  );
}

export function JourneyPage({ id }: { id: string }) {
  const j = useEntity(id);
  const g = useGraph();
  if (!j) return <EntityPage id={id} />;
  const stages = (j.stages ?? []) as { name: string; actions?: string; thoughts?: string; emotion?: number; pains?: string; opportunityIds?: string[] }[];
  const save = (next: typeof stages) => updateEntity(j.id, { stages: next }).catch(errorToast);
  const edit = (i: number, k: string, v: unknown) => save(stages.map((s, x) => (x === i ? { ...s, [k]: v } : s)));
  const W = Math.max(1, stages.length) * 200, H = 90;
  const sy = (e: number) => 10 + (1 - (e + 2) / 4) * (H - 20);
  return (
    <EntityPage id={id} hideFields>
      <Card title={`Journey · ${nameOf(g.get(j.personaId))}`} icon="route" actions={<button className="btn btn-sm" onClick={() => save([...stages, { name: 'New stage', emotion: 0 }])}><Icon name="plus" size={13} />Stage</button>} flush>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: W }}>
            <div className="chart" style={{ margin: 12 }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ height: H }} role="img" aria-label="Emotion curve">
                <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} className="grid-line" />
                <path d={stages.map((s, i) => `${i ? 'L' : 'M'}${i * 200 + 100},${sy(s.emotion ?? 0)}`).join(' ')} fill="none" stroke="var(--s1)" strokeWidth={2} />
                {stages.map((s, i) => <circle key={i} cx={i * 200 + 100} cy={sy(s.emotion ?? 0)} r={5} fill={(s.emotion ?? 0) < 0 ? 'var(--critical)' : 'var(--good)'} stroke="var(--chart-surface)" strokeWidth={2} />)}
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 200px)`, gap: 0 }}>
              {stages.map((s, i) => (
                <div key={i} style={{ padding: 10, borderRight: '1px solid var(--border)' }} className="col">
                  <input className="input input-sm strong" value={s.name} onChange={(e) => edit(i, 'name', e.target.value)} />
                  <div className="scale">{[-2, -1, 0, 1, 2].map((v) => <button key={v} className={(s.emotion ?? 0) === v ? 'on' : ''} onClick={() => edit(i, 'emotion', v)}>{v > 0 ? `+${v}` : v}</button>)}</div>
                  <label className="label">Doing</label><textarea className="textarea" rows={2} style={{ minHeight: 50 }} defaultValue={s.actions} onBlur={(e) => e.target.value !== (s.actions ?? '') && edit(i, 'actions', e.target.value)} />
                  <label className="label">Thinking</label><textarea className="textarea" rows={2} style={{ minHeight: 50 }} defaultValue={s.thoughts} onBlur={(e) => e.target.value !== (s.thoughts ?? '') && edit(i, 'thoughts', e.target.value)} />
                  <label className="label">Pains</label><textarea className="textarea" rows={2} style={{ minHeight: 50 }} defaultValue={s.pains} onBlur={(e) => e.target.value !== (s.pains ?? '') && edit(i, 'pains', e.target.value)} />
                  <div className="chips">{(s.opportunityIds ?? []).map((o) => <RefChip key={o} id={o} />)}</div>
                  <button className="btn btn-sm btn-ghost btn-danger" onClick={() => save(stages.filter((_, x) => x !== i))}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </EntityPage>
  );
}


import { useMemo, useState, type ReactNode } from 'react';
import { ENTITY_MAP, nameOf, type Entity } from '../../../../core/schema.ts';
import { backlogHygiene, readiness, splitHints } from '../../../../core/engines/hygiene.ts';
import { rank, rankingStability, sensitivity, type Method } from '../../../../core/engines/prioritization.ts';
import { concurrency, forecastScope, scopeCreep, weeklyThroughput } from '../../../../core/engines/forecast.ts';
import { impactAnalysis, traceMatrix } from '../../../../core/engines/traceability.ts';
import { AUDIENCES, commitmentRisk, tailoredUpdate, type Audience } from '../../../../core/engines/stakeholders.ts';
import { addDays, daysBetween, isoDate } from '../../../../core/util.ts';
import { deleteEntity, now, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link, navigate, setQuery, useRoute } from '../../router.tsx';
import { Badge, Card, Markdown, Meter, PageHead, Seg, Stat, StatusBadge, Tabs, copyText, errorToast, toast, Term } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { HBars, Legend, LineChart, RiskMatrix, SERIES, useTooltip } from '../../ui/charts.tsx';
import { fmtDate, humanize, relDays } from '../../ui/format.ts';
import { EntityPage, EntityTable } from '../../entity/views.tsx';
import { EntityPicker, RefChip, RefChips } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { AlignmentPanel } from '../stakeholders/Governance.tsx';

// ---------------- Backlog health ----------------

export function BacklogPage() {
  const g = useGraph();
  const today = now();
  const stories = g.all('story');
  const h = useMemo(() => backlogHygiene(stories, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = stories.filter((s) => s.status !== 'done');
  const archive = async (s: Entity) => {
    if (!confirm(`Archive "${s.title}"? It is removed from the backlog but kept in the activity trail.`)) return;
    try { await deleteEntity(s.id); toast('Archived'); } catch (err) { errorToast(err); }
  };
  const Section = ({ title, icon, items, render, hint }: { title: string; icon: string; items: unknown[]; render: (x: any, i: number) => ReactNode; hint: string }) => (
    <Card title={`${title} · ${items.length}`} icon={icon} sub={hint} flush>
      {items.length === 0 ? <div className="empty">None.</div> : <div className="list">{items.slice(0, 12).map(render)}</div>}
    </Card>
  );
  const Row = ({ s, extra, actions }: { s: Entity; extra?: ReactNode; actions?: ReactNode }) => (
    <div className="list-item" style={{ alignItems: 'center' }}>
      <div className="grow"><Link to={hrefOf(s)} style={{ color: 'inherit' }}>{s.key && <span className="key">{s.key} </span>}{s.title}</Link>{extra && <div className="small muted">{extra}</div>}</div>
      {actions}
    </div>
  );
  return (
    <div className="page">
      <PageHead title="Backlog health" sub="Duplicates, stale items, orphans, missing acceptance criteria, oversized stories and dependency cycles — found automatically." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'story' })}><Icon name="plus" size={14} />New story</button>} />
      <div className="grid g4 mb16">
        <Stat label="Health score" value={`${h.score}/100`} tone={h.score >= 75 ? 'green' : h.score >= 50 ? 'amber' : 'red'} />
        <Stat label="Open stories" value={open.length} sub={`${open.filter((s) => readiness(s).ok).length} meet Definition of Ready`} />
        <Stat label="Points open" value={open.reduce((t, s) => t + (Number(s.estimate) || 0), 0)} sub={`${open.filter((s) => !(Number(s.estimate) > 0)).length} unestimated`} />
        <Stat label="Dependency cycles" value={h.cycles.length} tone={h.cycles.length ? 'red' : undefined} />
      </div>
      <div className="grid g2">
        <Section title="Possible duplicates" icon="copy" items={h.duplicates} hint="Similar titles; a duplicate of a done story is probably already delivered." render={(d, i) => (
          <div key={i} className="list-item" style={{ flexDirection: 'column', gap: 6 }}>
            <div className="row-wrap"><RefChip e={d.a} /><span className="muted small">≈ {Math.round(d.similarity * 100)}%</span><RefChip e={d.b} />{d.b.status === 'done' && <Badge tone="green">done</Badge>}</div>
            <div className="row"><button className="btn btn-sm" onClick={() => archive(d.a)}>Archive {d.a.key}</button></div>
          </div>
        )} />
        <Section title="Stale" icon="clock" items={h.stale} hint="In the backlog, untouched for 90+ days." render={(s) => <Row key={s.id} s={s} extra={`last touched ${relDays(s.updatedAt?.slice(0, 10), today)}`} actions={<button className="btn btn-sm" onClick={() => archive(s)}>Archive</button>} />} />
        <Section title="Orphans" icon="link" items={h.orphans} hint="Not linked to a bet or requirement — why does this exist?" render={(s) => <Row key={s.id} s={s} actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'story', id: s.id, only: ['betId', 'requirementIds'] })}>Link</button>} />} />
        <Section title="No acceptance criteria" icon="list-checks" items={h.noAcceptance} hint="Add Given/When/Then before refinement." render={(s) => <Row key={s.id} s={s} extra={humanize(s.status)} actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'story', id: s.id, only: ['asA', 'iWant', 'soThat', 'acceptance'] })}>Write AC</button>} />} />
        <Section title="Oversized" icon="split" items={h.oversized} hint="More than 13 points." render={(s) => <Row key={s.id} s={s} extra={splitHints(s)[0] ?? `${s.estimate} points`} />} />
        <Section title="Blocked or cyclic" icon="git-branch" items={[...h.cycles.map((c) => ({ cycle: c })), ...h.blockedByLater]} hint="Ready stories that depend on backlog stories, and dependency loops." render={(x, i) => x.cycle ? (
          <div key={i} className="list-item small"><Badge tone="red">cycle</Badge><RefChips ids={x.cycle} /></div>
        ) : <Row key={i} s={x.story} extra={<>depends on <RefChip e={x.dependency} /></>} />} />
      </div>
      <Card title="All open stories" icon="kanban" flush className="mt16">
        <EntityTable type="story" rows={open} columns={['key', 'title', 'status', 'estimate', 'betId', 'releaseId', { key: 'ready', label: 'Ready?', render: (s) => { const r = readiness(s); return r.ok ? <Badge tone="green">Ready</Badge> : <span title={r.missing.join('\n')}><Badge tone="amber">{r.missing.length} missing</Badge></span>; } }]} />
      </Card>
    </div>
  );
}

// ---------------- Prioritize ----------------

export function PrioritizePage() {
  const g = useGraph();
  const [method, setMethod] = useState<Method>('rice');
  const bets = g.all('bet').filter((b) => !['shipped', 'measured', 'killed'].includes(b.status));
  const ranked = useMemo(() => rank(bets, method), [g, method]); // eslint-disable-line react-hooks/exhaustive-deps
  const flips = useMemo(() => sensitivity(ranked, method), [ranked, method]);
  const stability = useMemo(() => rankingStability(bets, method, 3), [g, method]); // eslint-disable-line react-hooks/exhaustive-deps
  const unscored = bets.filter((b) => !ranked.some((r) => r.bet.id === b.id));
  const fields = method === 'rice' ? ['reach', 'impact', 'confidence', 'effort'] : ['businessValue', 'timeCriticality', 'riskReduction', 'jobSize'];
  const set = (b: Entity, k: string, v: string) => updateEntity(b.id, { [k]: v === '' ? null : Number(v) }).catch(errorToast);
  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="prioritize" title="How the ranking works" steps={[
        <>Pick <Term explain="Reach × Impact × Confidence ÷ Effort. Value per unit of work.">RICE</Term> or <Term explain="Weighted Shortest Job First: cost of delay (business value + time criticality + risk reduction) ÷ job size. Common in SAFe.">WSJF</Term> — whichever your organisation uses.</>,
        <>Change an estimate right in the table and the ranking updates straight away.</>,
        <><b>What would change the order</b> shows how far an estimate must move before the ranking flips, so you know which estimates are worth arguing about.</>,
      ]} />} title="Prioritize" sub="Scores are only as good as their inputs — so this shows how fragile the ranking is, and which single assumption would change it." actions={<Seg value={method} onChange={setMethod} options={[{ id: 'rice', label: 'RICE' }, { id: 'wsjf', label: 'WSJF' }]} />} />
      <Card flush className="mb16">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Bet</th>{fields.map((f) => <th key={f} className="num">{ENTITY_MAP.bet.fields.find((x) => x.key === f)!.label.replace(/^(RICE|WSJF) /, '')}</th>)}<th className="num">Score</th><th title="Share of 2,000 simulations (inputs perturbed by their uncertainty) in which this bet stays in the top 3">Top-3 stability</th></tr></thead>
            <tbody>
              {ranked.map((r) => {
                const st = stability.get(r.bet.id) ?? 0;
                return (
                  <tr key={r.bet.id}>
                    <td className="num strong">{r.rank}</td>
                    <td><Link to={hrefOf(r.bet)} className="strong" style={{ color: 'var(--text)' }}>{r.bet.title}</Link><div className="small"><StatusBadge value={r.bet.status} /> <span className="muted">{humanize(r.bet.horizon)}</span></div></td>
                    {fields.map((f) => <td key={f} className="num"><input className="input input-sm num" style={{ width: 76, textAlign: 'right' }} type="number" step="any" defaultValue={r.bet[f] ?? ''} onBlur={(e) => e.target.value !== String(r.bet[f] ?? '') && set(r.bet, f, e.target.value)} /></td>)}
                    <td className="num strong">{r.score.toFixed(method === 'rice' ? 0 : 2)}</td>
                    <td style={{ minWidth: 150 }}><div className="row"><div style={{ flex: 1 }}><Meter value={st} color={st > 0.8 ? 'var(--good)' : st > 0.4 ? 'var(--warning)' : 'var(--axis)'} /></div><span className="small num">{Math.round(st * 100)}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {unscored.length > 0 && <div className="small muted" style={{ padding: 12 }}>Not scored (missing inputs): {unscored.map((b) => b.title).join(', ')}</div>}
      </Card>
      <div className="grid g2">
        <Card title="Sensitivity: what would flip the order?" icon="arrow-up-down" flush>
          <div className="list">{flips.map((f, i) => (
            <div key={i} className="list-item small"><Badge tone={f.relativeChange < 0.15 ? 'red' : f.relativeChange < 0.35 ? 'amber' : 'green'}>{f.relativeChange < 0.15 ? 'fragile' : f.relativeChange < 0.35 ? 'sensitive' : 'robust'}</Badge><span className="grow">{f.message}</span><span className="muted">{Math.round(f.relativeChange * 100)}% change</span></div>
          ))}</div>
        </Card>
        <Card title="How to read this" icon="lightbulb">
          <div className="small col" style={{ gap: 8 }}>
            <div><strong>RICE</strong> = reach × impact × confidence ÷ effort. <strong>WSJF</strong> = (business value + time criticality + risk reduction) ÷ job size.</div>
            <div><strong>Fragile</strong> pairs swap with a &lt; 15% change in one input — don't argue about #{1} vs #{2}; get better evidence on that input instead.</div>
            <div><strong>Stability</strong> perturbs every input by its own uncertainty (lower confidence → wider) and counts how often each bet stays in the top 3.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Roadmap ----------------

export function RoadmapPage() {
  const g = useGraph();
  const today = now();
  const [view, setView] = useState<'lanes' | 'timeline'>('lanes');
  const [audience, setAudience] = useState<'internal' | 'external'>('internal');
  const [drag, setDrag] = useState<string | null>(null);
  const bets = g.all('bet').filter((b) => !['killed', 'measured'].includes(b.status) && b.category !== 'maintenance' && !(b.category === 'tech-debt' && b.status === 'shipped'));
  const fc = (b: Entity) => (b.status === 'in-delivery' ? forecastScope(g.all('story'), b, today, { concurrent: concurrency(g.all('bet'), b) }) : null);
  const Lane = ({ h, label, sub }: { h: string; label: string; sub: string }) => {
    const list = bets.filter((b) => b.horizon === h).sort((a, b) => ['in-delivery', 'committed', 'shipped', 'discovery', 'idea'].indexOf(a.status) - ['in-delivery', 'committed', 'shipped', 'discovery', 'idea'].indexOf(b.status));
    return (
      <div className="lane" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (drag) updateEntity(drag, { horizon: h }).catch(errorToast); setDrag(null); }}>
        <div className="lane-head">{label}<span className="muted small">{list.length}</span></div>
        <div className="small muted" style={{ marginTop: -6, padding: '0 4px' }}>{sub}</div>
        {list.map((b) => {
          const f = fc(b);
          const late = f && b.targetDate && f.dates.p85 > b.targetDate;
          return (
            <div key={b.id} className="tile" draggable onDragStart={() => setDrag(b.id)} onClick={() => navigate(hrefOf(b))}>
              <div className="strong" style={{ fontSize: 13 }}>{b.title}</div>
              {audience === 'external' ? <div className="small muted mt8">{(b.hypothesis ?? '').replace(/^We believe /i, '').split(/ will /i)[0]}</div> : (
                <>
                  <div className="row-wrap mt8" style={{ gap: 4 }}>
                    <StatusBadge value={b.status} />
                    {b.confidence !== undefined && <Badge title="Confidence">{b.confidence}%</Badge>}
                    {g.get(b.teamId) && <Badge>{nameOf(g.get(b.teamId))}</Badge>}
                  </div>
                  {f && <div className="small mt8" style={{ color: late ? 'var(--red)' : 'var(--text-2)' }}>85%: {fmtDate(f.dates.p85)}{b.targetDate ? ` · target ${fmtDate(b.targetDate)}` : ''}</div>}
                  {!f && b.targetDate && <div className="small muted mt8">Target {fmtDate(b.targetDate)}</div>}
                  {g.get(b.objectiveId) && <div className="small muted ellipsis">↳ {nameOf(g.get(b.objectiveId))}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div className="page page-wide">
      <PageHead title="Roadmap" sub="Outcome-based Now / Next / Later, with forecast dates instead of promises. Drag between horizons. Switch to the external view before sharing." actions={<><Seg value={audience} onChange={setAudience} options={[{ id: 'internal', label: 'Internal' }, { id: 'external', label: 'External' }]} /><Seg value={view} onChange={setView} options={[{ id: 'lanes', label: 'Now / Next / Later' }, { id: 'timeline', label: 'Timeline' }]} /></>} />
      {view === 'lanes' ? (
        <div className="board" style={{ gridAutoColumns: 'minmax(280px, 1fr)' }}>
          <Lane h="now" label="Now" sub="In delivery or committed this quarter" />
          <Lane h="next" label="Next" sub="Shaping — discovery underway" />
          <Lane h="later" label="Later" sub="Opportunities we believe in, not yet shaped" />
        </div>
      ) : <Timeline bets={bets.filter((b) => b.startDate || b.targetDate)} fc={fc} today={today} external={audience === 'external'} />}
    </div>
  );
}

function Timeline({ bets, fc, today, external }: { bets: Entity[]; fc: (b: Entity) => ReturnType<typeof forecastScope>; today: Date; external: boolean }) {
  const tt = useTooltip();
  const start = addDays(today, -60), end = addDays(today, 150);
  const span = daysBetween(start, end);
  const W = 1000, LW = 220, RH = 34, H = bets.length * RH + 40;
  const sx = (d: string) => LW + (Math.max(0, Math.min(span, daysBetween(start, d))) / span) * (W - LW - 10);
  const months: string[] = [];
  for (let i = 0; i <= 7; i++) { const d = new Date(today.getFullYear(), today.getMonth() - 2 + i, 1); months.push(isoDate(d)); }
  return (
    <Card flush>
      <div className="chart" style={{ overflowX: 'auto', padding: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 800 }} role="img" aria-label="Roadmap timeline">
          {months.filter((m) => daysBetween(start, m) >= 0 && daysBetween(m, end) >= 0).map((m) => <g key={m}><line x1={sx(m)} x2={sx(m)} y1={20} y2={H} className="grid-line" /><text x={sx(m) + 4} y={14} className="axis-label">{fmtDate(m)}</text></g>)}
          <line x1={sx(isoDate(today))} x2={sx(isoDate(today))} y1={16} y2={H} stroke="var(--critical)" strokeWidth={1.5} />
          <text x={sx(isoDate(today)) + 4} y={H - 4} style={{ fill: 'var(--critical)', fontSize: 11 }}>today</text>
          {bets.map((b, i) => {
            const y = 26 + i * RH;
            const s = b.startDate ?? isoDate(today), t = b.targetDate ?? addDays(s, 30);
            const f = external ? null : fc(b);
            return (
              <g key={b.id} className="hit" onClick={() => navigate(hrefOf(b))} onPointerMove={(e) => tt.show(e, <><div className="t-title">{b.title}</div><div>{fmtDate(s)} → {fmtDate(t)}</div>{f && <div>Forecast 50–85%: {fmtDate(f.dates.p50)} – {fmtDate(f.dates.p85)}</div>}</>)} onPointerLeave={tt.hide}>
                <text x={8} y={y + 15} style={{ fill: 'var(--text)', fontSize: 12 }}>{b.title.length > 30 ? `${b.title.slice(0, 29)}…` : b.title}</text>
                <rect x={sx(s)} y={y + 4} width={Math.max(4, sx(t) - sx(s))} height={16} rx={4} fill={b.status === 'shipped' ? 'var(--good)' : 'var(--s1)'} opacity={b.status === 'idea' || b.status === 'discovery' ? 0.45 : 0.9} />
                {f && <rect x={sx(f.dates.p50)} y={y + 9} width={Math.max(3, sx(f.dates.p85) - sx(f.dates.p50))} height={6} rx={3} fill="var(--s2)" />}
              </g>
            );
          })}
        </svg>
        {tt.node}
      </div>
      <div style={{ padding: 12 }}><Legend items={[{ label: 'Planned (start → target)', color: 'var(--s1)' }, { label: 'Forecast 50–85%', color: 'var(--s2)' }, { label: 'Shipped', color: 'var(--good)' }]} /></div>
    </Card>
  );
}

// ---------------- Releases ----------------

export function ReleasesPage() {
  const g = useGraph();
  const today = now();
  return (
    <div className="page">
      <PageHead title="Releases & launches" sub="Shipping is not launching: scope, readiness across Support, Sales, Legal and Marketing, rollout and rollback — and release notes for every audience." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'release' })}><Icon name="plus" size={14} />New release</button>} />
      <div className="col" style={{ gap: 12 }}>
        {[...g.all('release')].sort((a, b) => String(b.targetDate).localeCompare(String(a.targetDate))).map((r) => {
          const list = (r.checklist ?? []) as { done: boolean }[];
          const done = list.filter((c) => c.done).length;
          const f = r.status !== 'released' ? forecastScope(g.all('story'), r, today) : null;
          return (
            <Link key={r.id} to={hrefOf(r)} className="card card-link pad">
              <div className="row-wrap"><Icon name="party-popper" className="muted" /><span className="strong" style={{ flex: 1 }}>{r.title}</span><Badge>{humanize(r.tier)}</Badge><StatusBadge value={r.status} /></div>
              <div className="grid g3 mt12">
                <div><div className="label">Target</div>{fmtDate(r.targetDate)} <span className="muted small">{relDays(r.targetDate, today)}</span></div>
                <div><div className="label">Readiness</div><div className="row"><div style={{ flex: 1 }}><Meter value={list.length ? done / list.length : 0} color={done === list.length ? 'var(--good)' : 'var(--warning)'} /></div><span className="small">{done}/{list.length}</span></div></div>
                <div><div className="label">Forecast (85%)</div>{f ? <span style={{ color: r.targetDate && f.dates.p85 > r.targetDate ? 'var(--red)' : undefined }}>{fmtDate(f.dates.p85)} · {Math.round((f.probabilityBy ?? 0) * 100)}% by target</span> : <span className="muted">{r.status === 'released' ? `Released ${fmtDate(r.releasedAt)}` : '—'}</span>}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ReleasePage({ id }: { id: string }) {
  const r = useEntity(id);
  const g = useGraph();
  const today = now();
  const [aud, setAud] = useState<Audience>('customer');
  const [newItem, setNewItem] = useState('');
  if (!r) return <EntityPage id={id} />;
  const list = (r.checklist ?? []) as { id: string; area: string; item: string; ownerId?: string; done: boolean }[];
  const save = (next: typeof list) => updateEntity(r.id, { checklist: next }).catch(errorToast);
  const stories = g.all('story').filter((s) => s.releaseId === r.id);
  const tests = g.all('testCase').filter((t) => t.releaseId === r.id);
  const defects = g.all('defect').filter((d) => d.releaseId === r.id && !['closed', 'verified', 'wont-fix', 'fixed'].includes(d.status));
  const f = r.status !== 'released' ? forecastScope(g.all('story'), r, today) : null;
  const notes = tailoredUpdate(r, aud, g, today);
  const areas = [...new Set(list.map((c) => c.area))];
  return (
    <EntityPage id={id} hideFields side={<AlignmentPanel e={r} />}>
      <div className="grid g4">
        <Stat label="Stories" value={`${stories.filter((s) => s.status === 'done').length}/${stories.length}`} sub="done" />
        <Stat label="Readiness" value={`${list.filter((c) => c.done).length}/${list.length}`} sub="launch checklist" />
        <Stat label="Tests" value={`${tests.filter((t) => t.status === 'pass').length}/${tests.length}`} sub={`${tests.filter((t) => t.status === 'fail').length} failing`} tone={tests.some((t) => t.status === 'fail') ? 'red' : undefined} />
        <Stat label="Open defects" value={defects.length} sub={`${defects.filter((d) => ['s1-critical', 's2-major'].includes(d.severity)).length} major+`} tone={defects.some((d) => d.severity === 's1-critical') ? 'red' : undefined} />
      </div>
      {f && <Card><div className="row-wrap"><Icon name="activity" /><span>Forecast: 50% by <strong>{fmtDate(f.dates.p50)}</strong>, 85% by <strong>{fmtDate(f.dates.p85)}</strong> — <strong style={{ color: (f.probabilityBy ?? 0) < 0.7 ? 'var(--red)' : 'var(--green)' }}>{Math.round((f.probabilityBy ?? 0) * 100)}%</strong> chance of hitting {fmtDate(r.targetDate)} ({f.remaining} stories left).</span></div></Card>}
      <Card title="Launch readiness" icon="list-checks" flush>
        {areas.map((a) => (
          <div key={a}>
            <div className="small strong muted" style={{ padding: '8px 16px 0' }}>{a}</div>
            {list.filter((c) => c.area === a).map((c) => (
              <label key={c.id} className="list-item" style={{ cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" checked={c.done} onChange={(e) => save(list.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)))} style={{ accentColor: 'var(--accent)' }} />
                <span className="grow" style={{ textDecoration: c.done ? 'line-through' : undefined, opacity: c.done ? 0.6 : 1 }}>{c.item}</span>
                {c.ownerId && <RefChip id={c.ownerId} />}
              </label>
            ))}
          </div>
        ))}
        <div className="list-item">
          <input className="input input-sm" placeholder="Area: item (e.g. Support: Train the team)" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => {
            if (e.key !== 'Enter' || !newItem.trim()) return;
            const [area, ...rest] = newItem.includes(':') ? newItem.split(':') : ['General', newItem];
            save([...list, { id: `c${Date.now().toString(36)}`, area: area.trim(), item: rest.join(':').trim(), done: false }]);
            setNewItem('');
          }} />
        </div>
      </Card>
      <div className="grid g2">
        <Card title="Rollout plan" icon="route"><div className="pre small">{r.rolloutPlan ?? <span className="muted">Not defined.</span>}</div></Card>
        <Card title="Rollback criteria" icon="triangle-alert"><div className="pre small">{r.rollbackCriteria ?? <span className="muted">Not defined — decide before launch, not during an incident.</span>}</div></Card>
      </div>
      <Card title="Release notes & updates" icon="megaphone" actions={<><select className="select input-sm" style={{ width: 'auto' }} value={aud} onChange={(e) => setAud(e.target.value as Audience)}>{(Object.keys(AUDIENCES) as Audience[]).map((a) => <option key={a} value={a}>{AUDIENCES[a]}</option>)}</select><button className="btn btn-sm" onClick={() => copyText(notes, 'Update copied')}><Icon name="copy" size={13} />Copy</button></>}>
        <Markdown text={notes} />
      </Card>
      <Card title="Scope" icon="kanban" flush><EntityTable type="story" rows={stories} columns={['key', 'title', 'status', 'betId', 'estimate']} filterable={false} /></Card>
    </EntityPage>
  );
}

// ---------------- Delivery pulse ----------------

export function PulsePage() {
  const g = useGraph();
  const today = now();
  const teams = g.all('team');
  const stories = g.all('story');
  const weeks = 12;
  const xLabels = Array.from({ length: weeks }, (_, i) => fmtDate(addDays(today, -(weeks - 1 - i) * 7)));
  const series = teams.map((t, i) => ({ label: t.name, values: weeklyThroughput(stories.filter((s) => s.teamId === t.id), today, weeks), color: SERIES[i] }));
  const active = g.all('bet').filter((b) => b.status === 'in-delivery' || b.status === 'committed');
  const deps = g.all('raid').filter((r) => r.kind === 'dependency' && r.status !== 'closed');
  const promises = g.all('commitment').filter((c) => c.status === 'open').map((c) => ({ c, r: commitmentRisk(c, g, today) }));
  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="forecast" title="Forecasts, not promises" steps={[
        <>Throughline replays your team's real weekly throughput thousands of times (a <Term explain="Simulating many possible futures from past data to get a range of outcomes instead of one guess.">Monte Carlo</Term> simulation) to see when the remaining work is likely done.</>,
        <>Promise the <b>85% date</b>: in 85 of 100 simulated futures the work is done by then. The 50% date is a coin flip.</>,
        <>Scope added after the start is tracked separately, so you can show why a date moved.</>,
      ]} />} title="Delivery pulse" sub="Probabilistic forecasts from real throughput (no story-point theatre), scope creep, dependencies and promises vs forecast." />
      <Card title="Throughput — stories finished per week" icon="activity" className="mb16">
        <LineChart series={series} xLabels={xLabels} />
        <div className="mt8"><Legend items={series.map((s) => ({ label: s.label, color: s.color, shape: 'line' }))} /></div>
      </Card>
      <Card title="Forecasts for active bets" icon="target" flush className="mb16">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Bet</th><th>Team</th><th className="num">Remaining</th><th>50%</th><th>85%</th><th>Target</th><th>Chance by target</th><th>Scope creep</th></tr></thead>
          <tbody>{active.map((b) => {
            const f = forecastScope(stories, b, today, { concurrent: concurrency(g.all('bet'), b) });
            const sc = scopeCreep(stories, b);
            const p = f?.probabilityBy;
            return (
              <tr key={b.id} className="clickable" onClick={() => navigate(hrefOf(b))}>
                <td className="strong">{b.title}</td><td>{nameOf(g.get(b.teamId))}</td><td className="num">{f?.remaining ?? '—'}</td>
                <td>{f ? fmtDate(f.dates.p50) : '—'}</td><td className="strong">{f ? fmtDate(f.dates.p85) : '—'}</td><td>{fmtDate(b.targetDate)}</td>
                <td>{p !== undefined ? <Badge tone={p >= 0.8 ? 'green' : p >= 0.5 ? 'amber' : 'red'}>{Math.round(p * 100)}%</Badge> : '—'}</td>
                <td>{sc && sc.added ? <Badge tone={sc.ratio > 0.3 ? 'red' : 'amber'}>+{sc.added} ({Math.round(sc.ratio * 100)}%)</Badge> : <span className="muted">—</span>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </Card>
      <div className="grid g2">
        <Card title="Promises vs forecast" icon="handshake" flush actions={<Link to="/stakeholders/commitments" className="btn btn-sm">Ledger</Link>}>
          <div className="list">{promises.map(({ c, r }) => (
            <Link key={c.id} to={hrefOf(c)} className="list-item"><div className="grow">{c.title}<div className="small muted">due {fmtDate(c.dueDate)} · {r.reason}</div></div><Badge tone={r.level === 'high' ? 'red' : r.level === 'medium' ? 'amber' : r.level === 'low' ? 'green' : ''}>{r.level}</Badge></Link>
          ))}</div>
        </Card>
        <Card title="Dependencies" icon="git-branch" flush actions={<Link to="/deliver/raid" className="btn btn-sm">RAID</Link>}>
          <div className="list">{deps.map((d) => (
            <Link key={d.id} to={hrefOf(d)} className="list-item"><div className="grow">{d.title}<div className="small muted">{d.externalTeam} · owner {nameOf(g.get(d.ownerId))}</div></div>{d.dueDate && <Badge tone={daysBetween(today, d.dueDate) < 0 ? 'red' : daysBetween(today, d.dueDate) <= 7 ? 'amber' : ''}>{relDays(d.dueDate, today)}</Badge>}</Link>
          ))}{!deps.length && <div className="empty">No open dependencies.</div>}</div>
        </Card>
      </div>
    </div>
  );
}

// ---------------- RAID ----------------

export function RaidPage() {
  const g = useGraph();
  const [kind, setKind] = useState<'all' | 'risk' | 'assumption' | 'issue' | 'dependency'>('all');
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const items = g.all('raid').filter((r) => showClosed || r.status !== 'closed');
  const risks = items.filter((r) => r.kind === 'risk');
  const rows = items.filter((r) => (kind === 'all' || r.kind === kind) && (!cell || (Number(r.probability) === cell[0] && Number(r.impact) === cell[1])))
    .sort((a, b) => b.probability * b.impact - a.probability * a.impact);
  return (
    <div className="page">
      <PageHead title="RAID log" sub="Risks, assumptions, issues and dependencies — with owners, exposure and mitigations." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'raid' })}><Icon name="plus" size={14} />New item</button>} />
      <div className="grid raid-grid mb16">
        <Card title="Risk exposure" icon="grid-3x3" sub="Click a cell to filter.">
          <RiskMatrix items={risks.map((r) => ({ id: r.id, p: Number(r.probability), i: Number(r.impact), label: r.title }))} selected={cell} onCell={(p, i) => setCell(cell && cell[0] === p && cell[1] === i ? null : [p, i])} />
        </Card>
        <div className="grid g2">
          <Stat label="Open risks" value={risks.length} sub={`${risks.filter((r) => r.probability * r.impact >= 15).length} high exposure`} />
          <Stat label="Open issues" value={items.filter((r) => r.kind === 'issue' && r.status !== 'closed').length} tone="red" />
          <Stat label="Dependencies" value={items.filter((r) => r.kind === 'dependency').length} />
          <Stat label="Without mitigation" value={items.filter((r) => r.kind === 'risk' && !r.mitigation).length} tone="amber" />
        </div>
      </div>
      <Card flush>
        <div className="row-wrap" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <Seg value={kind} onChange={setKind} options={[{ id: 'all', label: 'All' }, { id: 'risk', label: 'Risks' }, { id: 'assumption', label: 'Assumptions' }, { id: 'issue', label: 'Issues' }, { id: 'dependency', label: 'Dependencies' }]} />
          <label className="check small"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />show closed</label>
          {cell && <button className="btn btn-sm" onClick={() => setCell(null)}>P{cell[0]} × I{cell[1]} ✕</button>}
        </div>
        <EntityTable type="raid" rows={rows} filterable={false} columns={['key', 'kind', 'title', { key: 'exp', label: 'Exposure', render: (r) => { const e = r.probability * r.impact; return <Badge tone={e >= 15 ? 'red' : e >= 8 ? 'amber' : ''}>{e}</Badge>; }, sort: (r) => r.probability * r.impact }, 'ownerId', 'dueDate', 'status', { key: 'mitigation', render: (r) => r.mitigation ? <span className="small ellipsis" style={{ display: 'block', maxWidth: 280 }}>{r.mitigation}</span> : <Badge tone="amber">none</Badge> }]} />
      </Card>
    </div>
  );
}

// ---------------- UAT & quality ----------------

export function UatPage() {
  const g = useGraph();
  const { query } = useRoute();
  const tab = (query.get('tab') ?? 'tests') as 'tests' | 'defects';
  const [release, setRelease] = useState('');
  const tests = g.all('testCase').filter((t) => !release || t.releaseId === release);
  const defects = g.all('defect').filter((d) => !release || d.releaseId === release);
  const setStatus = (t: Entity, status: string) => updateEntity(t.id, { status, executedAt: isoDate(now()) }).catch(errorToast);
  const byCause = new Map<string, number>();
  for (const d of defects) byCause.set(d.rootCause ?? 'unknown', (byCause.get(d.rootCause ?? 'unknown') ?? 0) + 1);
  return (
    <div className="page">
      <PageHead title="UAT & quality" sub="Acceptance and UAT tests traced to requirements, business sign-off, and defects classified by root cause — requirement defects are the expensive ones." actions={<><select className="select input-sm" style={{ width: 'auto' }} value={release} onChange={(e) => setRelease(e.target.value)}><option value="">All releases</option>{g.all('release').map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select><button className="btn btn-primary" onClick={() => openEditor({ type: tab === 'tests' ? 'testCase' : 'defect', defaults: release ? { releaseId: release } : {} })}><Icon name="plus" size={14} />{tab === 'tests' ? 'Test case' : 'Defect'}</button></>} />
      <div className="grid g4 mb16">
        <Stat label="Pass rate" value={`${tests.length ? Math.round((tests.filter((t) => t.status === 'pass').length / tests.length) * 100) : 0}%`} sub={`${tests.filter((t) => t.status === 'pass').length} of ${tests.length} tests`} />
        <Stat label="Failing" value={tests.filter((t) => t.status === 'fail').length} tone={tests.some((t) => t.status === 'fail') ? 'red' : undefined} sub={`${tests.filter((t) => t.status === 'blocked').length} blocked`} />
        <Stat label="Open defects" value={defects.filter((d) => !['closed', 'verified', 'wont-fix'].includes(d.status)).length} />
        <Stat label="Requirement-origin defects" value={defects.filter((d) => d.rootCause === 'requirement').length} sub="the spec was wrong or silent" tone={defects.some((d) => d.rootCause === 'requirement') ? 'amber' : undefined} />
      </div>
      <Tabs value={tab} onChange={(t) => setQuery({ tab: t })} tabs={[{ id: 'tests', label: 'Tests', count: tests.length }, { id: 'defects', label: 'Defects', count: defects.length }]} />
      {tab === 'tests' ? (
        <Card flush>
          <EntityTable type="testCase" rows={tests} columns={['key', 'title', 'kind', 'requirementIds', 'testerId', 'status', { key: 'run', label: 'Record result', render: (t) => (
            <div className="row" onClick={(e) => e.stopPropagation()}>
              {(['pass', 'fail', 'blocked'] as const).map((s) => <button key={s} className={`btn btn-sm ${t.status === s ? 'btn-primary' : ''}`} onClick={() => setStatus(t, s)}>{humanize(s)}</button>)}
            </div>
          ) }]} />
        </Card>
      ) : (
        <div className="grid g-side">
          <Card flush><EntityTable type="defect" rows={defects} /></Card>
          <Card title="Root causes" icon="search"><HBars rows={[...byCause.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: humanize(k), value: v, color: k === 'requirement' ? 'var(--s2)' : 'var(--s1)' }))} format={(v) => String(v)} /><div className="small muted mt12">Requirement-origin defects point back to Spec Studio: the linter and review board exist to catch these before code.</div></Card>
        </div>
      )}
    </div>
  );
}

// ---------------- Traceability & impact ----------------

export function TracePage() {
  const g = useGraph();
  const { query } = useRoute();
  const impactId = query.get('impact') ?? '';
  const tm = useMemo(() => traceMatrix(g), [g]);
  const impact = impactId ? impactAnalysis(g, impactId, 3) : null;
  const [gapOnly, setGapOnly] = useState(false);
  const rows = tm.rows.filter((r) => !gapOnly || r.gaps.length);
  const exportCsv = () => {
    const head = ['Requirement', 'Title', 'Priority', 'Status', 'Stories', 'Tests', 'Pass', 'Fail', 'Releases', 'Defects', 'Gaps'];
    const lines = tm.rows.map((r) => [r.requirement.key, r.requirement.title, r.requirement.priority, r.requirement.status, r.stories.map((s) => s.key).join(' '), r.tests.map((t) => t.key).join(' '), r.testStatus.pass, r.testStatus.fail, r.releases.map((x) => x.version ?? x.title).join(' '), r.defects.map((d) => d.key).join(' '), r.gaps.join(' ')]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `traceability-${isoDate(now())}.csv`;
    a.click();
  };
  return (
    <div className="page page-wide">
      <PageHead guide={<ToolGuide id="trace" title="Traceability" steps={[
        <>Every requirement should trace back to a source and forward to a story, a test and a release.</>,
        <>Gaps are listed per requirement — this is the view auditors and change boards ask for.</>,
        <>Use <b>Impact</b> on any item to see what a change would touch and who to tell.</>,
      ]} />} title="Traceability & impact" sub="The requirements traceability matrix is generated from the graph — never maintained by hand. Pick anything to see what a change would ripple into." actions={<button className="btn" onClick={exportCsv}><Icon name="download" size={14} />Export RTM (CSV)</button>} />
      <Card title="Impact analysis" icon="network" className="mb16">
        <div className="mb12" style={{ maxWidth: 520 }}><EntityPicker targets="*" value={impactId ? [impactId] : []} onChange={(ids) => setQuery({ impact: ids[0] })} single placeholder="What would change? Pick a requirement, decision, bet, story…" /></div>
        {impact ? (
          <div className="grid g-side">
            <div className="col" style={{ gap: 10 }}>
              <div className="small muted">{impact.total} items within 3 hops of <RefChip e={impact.root} showType />.</div>
              {impact.byType.map((grp) => (
                <div key={grp.type}><div className="label mb8">{grp.label} · {grp.items.length}</div><div className="chips">{grp.items.slice(0, 30).map((x) => <span key={x.entity.id} title={`via ${x.via.map((v) => v.key ?? nameOf(v)).join(' → ')}`}><RefChip e={x.entity} /></span>)}</div></div>
              ))}
            </div>
            <div>
              <div className="label mb8">People to inform · {impact.stakeholders.length}</div>
              <div className="col" style={{ gap: 8 }}>{impact.stakeholders.map((s) => <div key={s.stakeholder.id} className="small"><RefChip e={s.stakeholder} /><div className="muted">{s.reasons.slice(0, 3).join('; ')}</div></div>)}</div>
              <button className="btn btn-sm mt12" onClick={() => openEditor({ type: 'changeRequest', defaults: { title: `Change to ${nameOf(impact.root)}`, requirementIds: impact.root.type === 'requirement' ? [impact.root.id] : [], requestedById: g.me?.id } })}>Raise a change request</button>
            </div>
          </div>
        ) : <div className="small muted">Select an item to see affected requirements, stories, tests, releases, promises and the people involved.</div>}
      </Card>
      <div className="grid g4 mb16">
        <Stat label="Requirements with stories" value={`${Math.round(tm.coverage.story * 100)}%`} />
        <Stat label="Requirements with tests" value={`${Math.round(tm.coverage.test * 100)}%`} />
        <Stat label="Fully passing" value={`${Math.round(tm.coverage.pass * 100)}%`} />
        <Stat label="Orphan tests" value={tm.orphanTests.length} sub="not traced to anything" />
      </div>
      <Card title="Requirements traceability matrix" icon="table-2" actions={<label className="check small"><input type="checkbox" checked={gapOnly} onChange={(e) => setGapOnly(e.target.checked)} />gaps only</label>} flush>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Requirement</th><th>Bet</th><th>Stories</th><th>Tests</th><th>Releases</th><th>Defects</th><th>Gaps</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.requirement.id}>
              <td style={{ minWidth: 220 }}><Link to={hrefOf(r.requirement)} style={{ color: 'inherit' }}><span className="key">{r.requirement.key}</span> {r.requirement.title}</Link><div className="small"><StatusBadge value={r.requirement.priority} /> <StatusBadge value={r.requirement.status} /></div></td>
              <td>{r.bet ? <RefChip e={r.bet} /> : '—'}</td>
              <td><RefChips ids={r.stories.map((s) => s.id)} max={3} /></td>
              <td>{r.tests.length ? <div className="row-wrap" style={{ gap: 3 }}>{r.tests.map((t) => <Link key={t.id} to={hrefOf(t)} title={t.title}><span className="dot" style={{ width: 10, height: 10, background: t.status === 'pass' ? 'var(--good)' : t.status === 'fail' ? 'var(--critical)' : t.status === 'blocked' ? 'var(--serious)' : 'var(--axis)' }} /></Link>)}</div> : <span className="muted">—</span>}</td>
              <td><RefChips ids={r.releases.map((x) => x.id)} max={2} /></td>
              <td><RefChips ids={r.defects.map((x) => x.id)} max={2} /></td>
              <td><div className="chips">{r.gaps.map((x) => <Badge key={x} tone={x === 'failing-test' || x === 'requirement-defects' ? 'red' : 'amber'}>{humanize(x)}</Badge>)}</div></td>
            </tr>
          ))}</tbody>
        </table></div>
        <div style={{ padding: 12 }}><Legend items={[{ label: 'Pass', color: 'var(--good)', shape: 'dot' }, { label: 'Fail', color: 'var(--critical)', shape: 'dot' }, { label: 'Blocked', color: 'var(--serious)', shape: 'dot' }, { label: 'Not run', color: 'var(--axis)', shape: 'dot' }]} /></div>
      </Card>
    </div>
  );
}


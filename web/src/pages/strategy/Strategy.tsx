import { useMemo, useState } from 'react';
import { nameOf, type Entity } from '../../../../core/schema.ts';
import { evaluateBusinessCase, cd3 } from '../../../../core/engines/finance.ts';
import { daysBetween } from '../../../../core/util.ts';
import { now, updateEntity, updateSettings, useEntity, useGraph, useSettings } from '../../store.ts';
import { Link, navigate } from '../../router.tsx';
import { activate, Badge, Card, Empty, Meter, PageHead, Stat, StatusBadge, Tabs, errorToast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { HBars, Legend, LineChart, StackBar } from '../../ui/charts.tsx';
import { humanize, money } from '../../ui/format.ts';
import { EntityTable, EntityPage } from '../../entity/views.tsx';
import { RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';

// ---------------- Vision & OKRs ----------------

export function krProgress(kr: Entity): number | null {
  const b = Number(kr.baseline), t = Number(kr.target), c = Number(kr.current);
  if ([b, t, c].some((x) => Number.isNaN(x)) || t === b) return null;
  return Math.max(0, Math.min(1, (c - b) / (t - b)));
}

export function VisionPage() {
  const g = useGraph();
  const vision = g.all('vision')[0];
  const objectives = g.all('objective');
  const boxes: [string, string][] = [['targetGroup', 'Target group'], ['needs', 'Needs'], ['product', 'Product'], ['businessGoals', 'Business goals']];
  return (
    <div className="page">
      <PageHead title="Vision & OKRs" sub="Where the product is going, and the measurable outcomes this period commits to. Bets, opportunities and metrics hang off these." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'objective' })}><Icon name="plus" size={14} />New objective</button>} />
      {vision ? (
        <Card title={<span className="row"><Icon name="compass" />Vision board · {vision.title}{vision.horizon && <Badge>{vision.horizon}</Badge>}</span>} actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'vision', id: vision.id })}>Edit</button>} className="mb16">
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 14 }}>{vision.vision}</div>
          <div className="grid g4">
            {boxes.map(([k, label]) => (
              <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
                <div className="label mb8">{label}</div>
                <div className="small pre">{vision[k] ?? <span className="muted">–</span>}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : <Card className="mb16"><Empty icon="compass">No vision yet. <button className="btn btn-sm" onClick={() => openEditor({ type: 'vision' })}>Create vision board</button></Empty></Card>}
      <div className="col" style={{ gap: 14 }}>
        {objectives.map((o) => {
          const krs = g.referencing(o.id, 'keyResult', 'objectiveId');
          const bets = g.referencing(o.id, 'bet', 'objectiveId').filter((b) => !['killed'].includes(b.status));
          const progress = krs.map(krProgress).filter((x): x is number => x !== null);
          const avg = progress.length ? progress.reduce((a, b) => a + b, 0) / progress.length : 0;
          return (
            <Card key={o.id} title={<span className="row-wrap"><span>{o.title}</span><Badge>{o.period}</Badge>{o.pillar && <Badge tone="violet">{o.pillar}</Badge>}</span>} sub={<>Owner {nameOf(g.get(o.ownerId))} · {Math.round(avg * 100)}% average progress</>} actions={<><StatusBadge value={o.status} /><button className="btn btn-sm" onClick={() => openEditor({ type: 'objective', id: o.id })}>Edit</button></>}>
              <div className="col" style={{ gap: 12 }}>
                {krs.map((kr) => {
                  const p = krProgress(kr);
                  const conf = Number(kr.confidence);
                  return (
                    <div key={kr.id} className="row" style={{ gap: 14, cursor: 'pointer' }} onClick={() => openEditor({ type: 'keyResult', id: kr.id })}>
                      <Icon name="target" size={15} className="muted" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row"><span className="ellipsis">{kr.title}</span><span className="spacer" /><span className="small num muted">{kr.current ?? '?'} / {kr.target ?? '?'} {kr.unit}</span></div>
                        <div className="mt8"><Meter value={p ?? 0} color={conf < 40 ? 'var(--critical)' : conf < 60 ? 'var(--warning)' : 'var(--good)'} title={`${Math.round((p ?? 0) * 100)}% of the way`} /></div>
                      </div>
                      <Badge tone={conf < 40 ? 'red' : conf < 60 ? 'amber' : 'green'} title="Confidence of hitting the target">{conf}% conf.</Badge>
                    </div>
                  );
                })}
                <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => openEditor({ type: 'keyResult', defaults: { objectiveId: o.id } })}><Icon name="plus" size={13} />Key result</button>
                {bets.length > 0 && <div className="row-wrap" style={{ gap: 6 }}><span className="small muted">Bets:</span>{bets.map((b) => <RefChip key={b.id} e={b} />)}</div>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Metric tree ----------------

export function MetricsPage() {
  const g = useGraph();
  const metrics = g.all('metric');
  const roots = metrics.filter((m) => !m.parentId || !g.get(m.parentId));
  const children = (id: string) => metrics.filter((m) => m.parentId === id);
  const [tab, setTab] = useState<'tree' | 'tracking'>('tree');
  const Node = ({ m, depth }: { m: Entity; depth: number }) => {
    const c = Number(m.current), t = Number(m.target);
    const good = Number.isNaN(c) || Number.isNaN(t) ? null : m.direction === 'down' ? c <= t : c >= t;
    const bets = g.referencing(m.id, 'bet', 'metricId');
    const krs = g.referencing(m.id, 'keyResult', 'metricId');
    return (
      <>
        <div className="list-item" style={{ paddingLeft: 16 + depth * 28, cursor: 'pointer' }} onClick={() => openEditor({ type: 'metric', id: m.id })}>
          {depth > 0 && <span className="muted" style={{ marginLeft: -18 }}>└</span>}
          <div className="grow">
            <div className="row-wrap"><span className="strong">{m.name}</span><Badge tone={m.level === 'north-star' ? 'accent' : m.level === 'guardrail' ? 'amber' : m.level === 'health' ? '' : 'blue'}>{humanize(m.level)}</Badge></div>
            {m.definition && <div className="small muted">{m.definition}</div>}
            {(bets.length > 0 || krs.length > 0) && <div className="chips mt8">{krs.map((k) => <RefChip key={k.id} e={k} />)}{bets.map((b) => <RefChip key={b.id} e={b} />)}</div>}
          </div>
          <div className="right">
            <div className="strong num">{m.current ?? '–'} <span className="muted small">{m.unit}</span></div>
            <div className="small muted">target {m.direction === 'down' ? '≤' : '≥'} {m.target ?? '–'}</div>
            {good !== null && <Badge tone={good ? 'green' : 'amber'}>{good ? 'On target' : 'Off target'}</Badge>}
          </div>
        </div>
        {children(m.id).map((ch) => <Node key={ch.id} m={ch} depth={depth + 1} />)}
      </>
    );
  };
  return (
    <div className="page">
      <PageHead title="Metric tree" sub="How everyday product metrics roll up into the north star, and which bets are trying to move which metric." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'metric' })}><Icon name="plus" size={14} />New metric</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'tree', label: 'Tree' }, { id: 'tracking', label: 'Tracking plan' }]} />
      {tab === 'tree' ? <Card flush><div className="list">{roots.map((r) => <Node key={r.id} m={r} depth={0} />)}</div></Card> : (
        <Card flush title="Tracking plan" sub="Events that must exist before a bet can be measured.">
          <EntityTable type="metric" columns={['name', 'level', 'eventName', 'source', 'ownerId']} />
        </Card>
      )}
    </div>
  );
}

// ---------------- Business cases ----------------

export function BusinessCasesPage() {
  const g = useGraph();
  const cases = g.all('businessCase').map((bc) => ({ bc, r: evaluateBusinessCase(bc) })).sort((a, b) => b.r.npv - a.r.npv);
  return (
    <div className="page">
      <PageHead title="Business cases" sub="Cost/benefit for bets: NPV, ROI, payback, IRR and cost of delay, ranked by value." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'businessCase' })}><Icon name="plus" size={14} />New business case</button>} />
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Business case</th><th>Bet</th><th className="num">NPV</th><th className="num">ROI</th><th className="num">Payback</th><th className="num">IRR</th><th className="num">Cost of delay / wk</th><th className="num">CD3</th><th>Status</th></tr></thead>
            <tbody>
              {cases.map(({ bc, r }) => {
                const bet = g.get(bc.betId);
                const cd = cd3(Number(bc.costOfDelayPerWeek), Number(bet?.effort));
                return (
                  <tr key={bc.id} className="clickable" {...activate(() => navigate(hrefOf(bc)), null)}>
                    <td className="strong">{bc.title}</td>
                    <td>{bet ? <RefChip e={bet} /> : '–'}</td>
                    <td className="num strong" style={{ color: r.npv < 0 ? 'var(--red)' : undefined }}>{money(r.npv)}</td>
                    <td className="num">{Math.round(r.roi * 100)}%</td>
                    <td className="num">{r.paybackYears !== null ? `${r.paybackYears.toFixed(1)} y` : '–'}</td>
                    <td className="num">{r.irr !== null ? `${Math.round(r.irr * 100)}%` : '–'}</td>
                    <td className="num">{money(bc.costOfDelayPerWeek)}</td>
                    <td className="num" title="Cost of delay ÷ duration (weeks): higher = do first">{cd !== null ? money(cd) : '–'}</td>
                    <td><StatusBadge value={bc.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function BusinessCasePage({ id }: { id: string }) {
  const bc = useEntity(id);
  if (!bc) return <EntityPage id={id} />;
  const r = evaluateBusinessCase(bc);
  return (
    <EntityPage id={id}>
      <div className="grid g4">
        <Stat label={`NPV @ ${bc.discountRate ?? 0}%`} value={money(r.npv)} tone={r.npv < 0 ? 'red' : 'green'} />
        <Stat label="ROI" value={`${Math.round(r.roi * 100)}%`} sub={`${money(r.totalBenefit)} benefit / ${money(r.totalCost)} cost`} />
        <Stat label="Payback" value={r.paybackYears !== null ? `${r.paybackYears.toFixed(1)} yrs` : 'n/a'} />
        <Stat label="IRR" value={r.irr !== null ? `${Math.round(r.irr * 100)}%` : 'n/a'} />
      </div>
      <Card title="Cumulative cash position" icon="chart-line">
        <LineChart xLabels={r.flows.map((f) => `Year ${f.year}`)} series={[{ label: 'Cumulative net', values: r.flows.map((f) => f.cumulative), color: 'var(--s1)' }]} yFormat={(v) => money(v)} yMin={Math.min(0, ...r.flows.map((f) => f.cumulative))} />
      </Card>
      <Card title="Cash flows" icon="table-2" flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Year</th><th className="num">Cost</th><th className="num">Benefit</th><th className="num">Net</th><th className="num">Discounted</th><th className="num">Cumulative</th></tr></thead>
            <tbody>{r.flows.map((f) => <tr key={f.year}><td>{f.year}</td><td className="num">{money(f.cost)}</td><td className="num">{money(f.benefit)}</td><td className="num">{money(f.net)}</td><td className="num">{money(f.discounted)}</td><td className="num strong">{money(f.cumulative)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </EntityPage>
  );
}

// ---------------- Market ----------------

export function MarketPage() {
  const g = useGraph();
  const settings = useSettings();
  const competitors = g.all('competitor');
  const ours = (settings.ourCapabilities ?? {}) as Record<string, number>;
  const caps = [...new Set([...Object.keys(ours), ...competitors.flatMap((c) => Object.keys(c.capabilities ?? {}))])];
  const wl = g.all('winLoss');
  const lost = wl.filter((w) => w.outcome === 'lost');
  const byReason = new Map<string, number>();
  for (const w of lost) byReason.set(w.reason, (byReason.get(w.reason) ?? 0) + (Number(w.amount) || 0));
  const byComp = new Map<string, number>();
  for (const w of lost) if (w.competitorId) byComp.set(w.competitorId, (byComp.get(w.competitorId) ?? 0) + (Number(w.amount) || 0));
  const won = wl.filter((w) => w.outcome === 'won');
  const winRate = wl.filter((w) => w.outcome !== 'no-decision').length ? won.length / wl.filter((w) => w.outcome !== 'no-decision').length : 0;
  const LEVEL = ['None', 'Basic', 'Good', 'Best'];
  const cellColor = (v: number) => ['var(--surface-2)', 'var(--seq-2)', 'var(--seq-4)', 'var(--seq-6)'][v] ?? 'var(--surface-2)';
  const setOurs = async (cap: string) => {
    const v = ((ours[cap] ?? 0) + 1) % 4;
    try { await updateSettings({ ourCapabilities: { ...ours, [cap]: v } }); } catch (err) { errorToast(err); }
  };
  const setTheirs = async (c: Entity, cap: string) => {
    const v = ((c.capabilities?.[cap] ?? 0) + 1) % 4;
    try { await updateEntity(c.id, { capabilities: { ...(c.capabilities ?? {}), [cap]: v } }); } catch (err) { errorToast(err); }
  };
  return (
    <div className="page">
      <PageHead title="Market" sub="Capability comparison against competitors, and why deals are won or lost." actions={<><button className="btn" onClick={() => openEditor({ type: 'winLoss' })}><Icon name="plus" size={14} />Win/loss</button><button className="btn btn-primary" onClick={() => openEditor({ type: 'competitor' })}><Icon name="plus" size={14} />Competitor</button></>} />
      <div className="grid g4 mb16">
        <Stat label="Win rate" value={`${Math.round(winRate * 100)}%`} sub={`${won.length} won · ${lost.length} lost`} />
        <Stat label="ARR lost" value={money(lost.reduce((s, w) => s + (Number(w.amount) || 0), 0))} />
        <Stat label="Top loss reason" value={humanize([...byReason.entries()].sort((a, b) => b[1] - a[1])[0]?.[0])} />
        <Stat label="Competitors tracked" value={competitors.length} />
      </div>
      <Card title="Capability matrix" icon="table-2" sub="Click a cell to change the level (none → basic → good → best)." className="mb16" flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Capability</th><th className="center">Us</th>{competitors.map((c) => <th key={c.id} className="center"><Link to={hrefOf(c)}>{c.name}</Link></th>)}</tr></thead>
            <tbody>
              {caps.map((cap) => {
                const best = Math.max(...competitors.map((c) => c.capabilities?.[cap] ?? 0));
                const us = ours[cap] ?? 0;
                return (
                  <tr key={cap}>
                    <td className="strong">{cap}{us < best && <Badge tone="amber">gap</Badge>}</td>
                    <td className="center"><button className="btn btn-sm" style={{ background: cellColor(us), color: us >= 2 ? '#fff' : undefined, minWidth: 64 }} onClick={() => setOurs(cap)}>{LEVEL[us]}</button></td>
                    {competitors.map((c) => {
                      const v = c.capabilities?.[cap] ?? 0;
                      return <td key={c.id} className="center"><button className="btn btn-sm" style={{ background: cellColor(v), color: v >= 2 ? '#fff' : undefined, minWidth: 64 }} onClick={() => setTheirs(c, cap)}>{LEVEL[v]}</button></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid g2 mb16">
        <Card title="Lost ARR by reason" icon="chart-column">
          <HBars rows={[...byReason.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: humanize(k), value: v, tip: <><div className="t-title">{humanize(k)}</div>{money(v)} lost ARR</> }))} format={(v) => money(v)} />
        </Card>
        <Card title="Lost ARR by competitor" icon="swords">
          <HBars rows={[...byComp.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: nameOf(g.get(k)), value: v }))} format={(v) => money(v)} color="var(--s2)" />
        </Card>
      </div>
      <Card title="Win / loss records" icon="scale" flush><EntityTable type="winLoss" /></Card>
    </div>
  );
}

// ---------------- Capacity & portfolio ----------------

export function CapacityPage() {
  const g = useGraph();
  const today = now();
  const teams = g.all('team');
  const CAT_COLOR: Record<string, string> = { feature: 'var(--s1)', 'tech-debt': 'var(--s2)', maintenance: 'var(--s3)', compliance: 'var(--s7)', experiment: 'var(--s5)' };
  const actual = useMemo(() => {
    const out = new Map<string, Record<string, number>>();
    for (const s of g.all('story')) {
      if (s.status !== 'done' || !s.doneAt || !s.teamId || daysBetween(s.doneAt, today) > 84) continue;
      const cat = g.get(s.betId)?.category ?? 'feature';
      const rec = out.get(s.teamId) ?? {};
      rec[cat] = (rec[cat] ?? 0) + (Number(s.estimate) || 1);
      out.set(s.teamId, rec);
    }
    return out;
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page">
      <PageHead title="Capacity & portfolio" sub="Planned allocation vs what teams actually spent their last 12 weeks on, plus the tech-debt register in business terms." actions={<><button className="btn" onClick={() => openEditor({ type: 'techDebt' })}><Icon name="plus" size={14} />Tech debt</button><button className="btn btn-primary" onClick={() => openEditor({ type: 'team' })}><Icon name="plus" size={14} />Team</button></>} />
      <div className="grid g3 mb16">
        {teams.map((t) => {
          const a = actual.get(t.id) ?? {};
          const total = Object.values(a).reduce((x, y) => x + y, 0) || 1;
          const featureShare = ((a.feature ?? 0) + (a.compliance ?? 0) + (a.experiment ?? 0)) / total;
          const active = g.all('bet').filter((b) => b.teamId === t.id && ['in-delivery', 'committed'].includes(b.status));
          return (
            <Card key={t.id} title={t.name} icon="users" sub={`${t.people ?? '?'} people · ${t.capacity ?? '?'} person-weeks / quarter`} actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'team', id: t.id })}>Edit</button>}>
              <div className="label mb8">Target allocation</div>
              <StackBar parts={[{ label: 'New value', value: Number(t.targetFeature) || 0, color: 'var(--s1)' }, { label: 'Tech debt', value: Number(t.targetDebt) || 0, color: 'var(--s2)' }, { label: 'Maintenance', value: Number(t.targetMaintenance) || 0, color: 'var(--s3)' }]} />
              <div className="label mb8 mt12">Actual (last 12 weeks, story points)</div>
              <StackBar parts={Object.entries(a).map(([k, v]) => ({ label: humanize(k), value: v, color: CAT_COLOR[k] ?? 'var(--s8)' }))} />
              <div className="small muted mt8">New value {Math.round(featureShare * 100)}% vs target {t.targetFeature ?? '–'}%{Math.abs(featureShare * 100 - (Number(t.targetFeature) || 0)) > 15 && <Badge tone="amber">off plan</Badge>}</div>
              {active.length > 0 && <div className="chips mt12">{active.map((b) => <RefChip key={b.id} e={b} />)}</div>}
            </Card>
          );
        })}
      </div>
      <div className="mb16"><Legend items={[{ label: 'New value (feature)', color: 'var(--s1)' }, { label: 'Tech debt', color: 'var(--s2)' }, { label: 'Maintenance', color: 'var(--s3)' }, { label: 'Compliance', color: 'var(--s7)' }]} /></div>
      <Card title="Tech-debt register" icon="layers" sub="Sorted by interest: the ongoing cost of not fixing it." flush>
        <EntityTable type="techDebt" rows={[...g.all('techDebt')].sort((a, b) => ['high', 'medium', 'low'].indexOf(a.interest) - ['high', 'medium', 'low'].indexOf(b.interest))} columns={['title', 'area', 'businessImpact', 'interest', 'effort', 'teamId', 'status']} />
      </Card>
    </div>
  );
}


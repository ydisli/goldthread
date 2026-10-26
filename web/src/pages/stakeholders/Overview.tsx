import { useMemo, useState, type ReactNode } from 'react';
import { ENTITY_MAP, nameOf, type Entity } from '../../../../core/schema.ts';
import {
  QUADRANTS, SALIENCE, engagementGap, hubSummary, prepBrief, profile360, quadrant, sentimentTrend, touchStatus, type Quadrant,
} from '../../../../core/engines/stakeholders.ts';
import { isoDate } from '../../../../core/util.ts';
import { createEntity, now, useEntity, useGraph } from '../../store.ts';
import { Link, navigate, setQuery, useRoute } from '../../router.tsx';
import { Avatar, Badge, Card, Empty, PageHead, Seg, Stat, StatusBadge, Tabs, copyText, errorToast, toast, Term } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { Sparkline } from '../../ui/charts.tsx';
import { fmtDate, humanize, relDays } from '../../ui/format.ts';
import { EntityTable } from '../../entity/views.tsx';
import { ActivityFeed, Attachments, Comments, FieldGrid } from '../../entity/views.tsx';
import { RefChip, SentimentValue } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { EngagementPill, EngagementShift, PersonLink, QuadrantBadge, RiskBadge, SalienceBadge, TouchBadge } from './common.tsx';

export function StakeholdersPage() {
  const g = useGraph();
  const today = now();
  const [q, setQ] = useState<'all' | Quadrant>('all');
  const [kind, setKind] = useState('all');
  const people = g.all('stakeholder').filter((s) => s.id !== g.me?.id);
  const hub = useMemo(() => hubSummary(g, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const interactions = g.all('interaction');
  const rows = people.filter((s) => (q === 'all' || quadrant(s) === q) && (kind === 'all' || (s.kind ?? 'internal') === kind));
  const openAsks = (s: Entity) => g.referencing(s.id, 'request', 'requesterId').filter((r) => !['done', 'declined'].includes(r.status)).length;

  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="stakeholders" title="Keeping track of people" steps={[
        <>Add everyone with a stake — sponsors, approvers, users, the delivery team — and rate their <Term explain="How much they can change the outcome.">power</Term> and <Term explain="How much they care about the outcome.">interest</Term> from 1 to 5.</>,
        <>Set how often you want to talk to each person. Overdue conversations show up on Home.</>,
        <>Open a person and use <b>Prep</b> before a meeting: their goals, concerns, open asks and what you promised them.</>,
      ]} />}
        title="Stakeholders"
        sub="Who has power over, interest in, or impact from the product — and where each relationship stands today."
        actions={<>
          <Link to="/stakeholders/maps" className="btn"><Icon name="radar" size={14} />Maps</Link>
          <button className="btn btn-primary" onClick={() => openEditor({ type: 'stakeholder' })}><Icon name="plus" size={14} />New stakeholder</button>
        </>}
      />
      <div className="grid g4 mb16">
        <Stat label="Stakeholders" value={people.length} sub={`${people.filter((s) => quadrant(s) === 'manage-closely').length} key players`} />
        <Stat label="Overdue touchpoints" value={hub.overdue.length} sub="against each person's cadence" tone={hub.overdue.length ? 'amber' : undefined} />
        <Stat label="Engagement gaps" value={hub.gaps.length} sub={`${people.filter((s) => s.currentEngagement === 'resistant').length} resistant`} />
        <Stat label="Relationships cooling" value={hub.cooling.length} sub="falling sentiment trend" tone={hub.cooling.length ? 'red' : undefined} />
      </div>
      <Card flush>
        <div className="row-wrap" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <Seg value={q} onChange={setQ} options={[{ id: 'all', label: 'All' }, ...(Object.keys(QUADRANTS) as Quadrant[]).map((k) => ({ id: k, label: QUADRANTS[k].label }))]} />
          <select className="select input-sm" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All types</option>
            {ENTITY_MAP.stakeholder.fields.find((f) => f.key === 'kind')!.options!.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
          </select>
        </div>
        <EntityTable
          type="stakeholder" rows={rows} filterable={false}
          initialSort={{ key: 'touch', dir: 1 }}
          columns={[
            { key: 'name', label: 'Stakeholder', render: (s) => <PersonLink s={s} />, sort: (s) => s.name },
            { key: 'quadrant', label: 'Strategy', render: (s) => <QuadrantBadge s={s} />, sort: (s) => Object.keys(QUADRANTS).indexOf(quadrant(s)) },
            { key: 'salience', label: 'Salience', render: (s) => <SalienceBadge s={s} />, className: 'hide-mobile' },
            { key: 'engagement', label: 'Engagement (now → desired)', render: (s) => <EngagementShift s={s} />, sort: (s) => -engagementGap(s).gap },
            { key: 'touch', label: 'Last touch', render: (s) => <TouchBadge t={touchStatus(s, interactions, today)} />, sort: (s) => touchStatus(s, interactions, today).dueIn ?? -999 },
            { key: 'sentiment', label: 'Sentiment', render: (s) => { const t = sentimentTrend(s, interactions); return <span className="row"><Sparkline values={t.points.map((p) => p.sentiment)} width={90} height={24} color={t.label === 'cooling' ? 'var(--critical)' : 'var(--s1)'} />{t.label === 'cooling' && <Badge tone="red">cooling</Badge>}</span>; }, className: 'hide-mobile' },
            { key: 'asks', label: 'Open asks', render: (s) => openAsks(s) || <span className="muted">0</span>, sort: (s) => openAsks(s), className: 'num' },
          ]}
        />
      </Card>
    </div>
  );
}

// ---------------- 360° profile ----------------

export function StakeholderProfilePage({ id }: { id: string }) {
  const s = useEntity(id);
  const g = useGraph();
  const { query } = useRoute();
  const tab = (query.get('tab') ?? 'prep') as 'prep' | '360' | 'interactions' | 'details';
  const today = now();
  const brief = useMemo(() => (s ? prepBrief(s, g, today) : null), [s, g]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !brief) return <div className="page"><Empty icon="search">Stakeholder not found. <Link to="/stakeholders">All stakeholders</Link></Empty></div>;
  const p = brief.profile;

  return (
    <div className="page">
      <div className="crumbs"><Icon name="users" size={13} /><Link to="/stakeholders">Stakeholders</Link></div>
      <div className="row-wrap mb16" style={{ gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={s.name} size="lg" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{s.name}{s.id === g.me?.id && <span className="muted"> (you)</span>}</h1>
          <div className="muted">{[s.title, s.orgUnit, s.account].filter(Boolean).join(' · ')}</div>
          <div className="row-wrap mt8" style={{ gap: 6 }}>
            <QuadrantBadge s={s} /><SalienceBadge s={s} /><Badge>{humanize(s.kind ?? 'internal')}</Badge>
            <span className="badge"><EngagementPill level={s.currentEngagement} />{p.engagement.gap > 0 && <> → <EngagementPill level={s.desiredEngagement} /></>}</span>
            <TouchBadge t={p.touch} />
          </div>
        </div>
        <div className="row-wrap">
          <button className="btn btn-primary" onClick={() => openEditor({ type: 'interaction', defaults: { stakeholderIds: [s.id], date: isoDate(today), kind: '1:1', title: `1:1 with ${s.name}` }, open: false })}><Icon name="message-square" size={14} />Log interaction</button>
          <button className="btn" onClick={() => openEditor({ type: 'stakeholder', id: s.id })}><Icon name="pencil" size={14} />Edit</button>
        </div>
      </div>
      <Tabs value={tab} onChange={(t) => setQuery({ tab: t })} tabs={[
        { id: 'prep', label: <><Icon name="sparkles" size={14} />Meeting prep</>, count: brief.talkingPoints.length },
        { id: '360', label: <><Icon name="radar" size={14} />360° view</> },
        { id: 'interactions', label: <><Icon name="message-square" size={14} />Interactions</>, count: p.interactions.length },
        { id: 'details', label: 'Details' },
      ]} />

      {tab === 'prep' && <PrepView s={s} brief={brief} />}
      {tab === '360' && <View360 s={s} p={p} />}
      {tab === 'interactions' && <InteractionsView s={s} p={p} />}
      {tab === 'details' && (
        <div className="grid g-side">
          <Card title="Profile"><FieldGrid e={s} /></Card>
          <div className="stack"><Attachments entityId={s.id} /><Comments entityId={s.id} /><Card title="History" icon="history" flush><ActivityFeed entityId={s.id} limit={15} /></Card></div>
        </div>
      )}
    </div>
  );
}

function PrepView({ s, brief }: { s: Entity; brief: ReturnType<typeof prepBrief> }) {
  const g = useGraph();
  const [done, setDone] = useState<Record<number, boolean>>({});
  const KIND_ICON: Record<string, string> = { 'close-loop': 'send', approval: 'clipboard-check', commitment: 'handshake', concern: 'circle-alert', engagement: 'trending-up', request: 'inbox', decision: 'git-branch', conflict: 'gavel', relationship: 'message-square' };
  const asMarkdown = () => [
    `# Prep: ${s.name}`, '', brief.headline, '',
    '## What they care about', ...brief.caresAbout.map((x) => `- ${x}`), '',
    '## Concerns', ...brief.concerns.map((x) => `- ${x}`), '',
    '## Talking points', ...brief.talkingPoints.map((t) => `- [ ] ${t.text}`), '',
    ...(brief.sinceLastTime.length ? ['## Since you last spoke', ...brief.sinceLastTime.map((d) => `- ${d.key ?? ''} ${d.title} (${d.date})`)] : []),
  ].join('\n');
  return (
    <div className="grid g-side">
      <div className="stack">
        <Card title="Briefing" icon="sparkles" actions={<button className="btn btn-sm" onClick={() => copyText(asMarkdown(), 'Prep notes copied')}><Icon name="copy" size={13} />Copy as notes</button>}>
          <p>{brief.headline}</p>
          <div className="grid g2 mt12">
            <div><div className="label mb8">What they care about</div>{brief.caresAbout.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{brief.caresAbout.map((x) => <li key={x}>{x}</li>)}</ul> : <span className="muted small">Not recorded — ask them, then add it to their profile.</span>}</div>
            <div><div className="label mb8">Concerns</div>{brief.concerns.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{brief.concerns.map((x) => <li key={x}>{x}</li>)}</ul> : <span className="muted small">None recorded.</span>}</div>
          </div>
        </Card>
        <Card title="Suggested talking points" icon="list-checks" flush>
          {brief.talkingPoints.length === 0 ? <Empty icon="circle-check">Nothing pending with {s.name}. A relationship-building conversation is a good use of the time.</Empty> : (
            <div className="list">
              {brief.talkingPoints.map((t, i) => {
                const ref = g.get(t.refId);
                return (
                  <label key={i} className="list-item" style={{ cursor: 'pointer', opacity: done[i] ? 0.5 : 1 }}>
                    <input type="checkbox" checked={!!done[i]} onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                    <Icon name={KIND_ICON[t.kind] ?? 'circle-dot'} size={15} className="muted" />
                    <div className="grow"><div style={{ textDecoration: done[i] ? 'line-through' : undefined }}>{t.text}</div>{ref && <div className="mt8"><RefChip e={ref} showType /></div>}</div>
                  </label>
                );
              })}
            </div>
          )}
        </Card>
        {brief.sinceLastTime.length > 0 && (
          <Card title="Decided since you last spoke" icon="git-branch" flush>
            <div className="list">{brief.sinceLastTime.map((d) => (
              <Link key={d.id} to={hrefOf(d)} className="list-item"><span className="key">{d.key}</span><div className="grow">{d.title}<div className="small muted">{fmtDate(d.date)} · {(d.consultedIds ?? []).includes(s.id) || (d.deciderIds ?? []).includes(s.id) ? 'they were involved' : 'they were not consulted'}</div></div></Link>
            ))}</div>
          </Card>
        )}
      </div>
      <div className="stack">
        <Card title="Relationship" icon="trending-up">
          <div className="col" style={{ gap: 10 }}>
            <div className="row"><span className="muted small" style={{ width: 110 }}>Sentiment trend</span><Sparkline values={brief.profile.sentiment.points.map((x) => x.sentiment)} width={140} color={brief.profile.sentiment.label === 'cooling' ? 'var(--critical)' : 'var(--s1)'} /><Badge tone={brief.profile.sentiment.label === 'cooling' ? 'red' : brief.profile.sentiment.label === 'warming' ? 'green' : ''}>{brief.profile.sentiment.label}</Badge></div>
            <div className="row"><span className="muted small" style={{ width: 110 }}>Cadence</span>every {brief.profile.touch.cadence} days <span className="muted small">({QUADRANTS[brief.profile.quadrant].label.toLowerCase()})</span></div>
            <div className="row"><span className="muted small" style={{ width: 110 }}>Last contact</span>{brief.profile.touch.lastDate ? `${fmtDate(brief.profile.touch.lastDate)} · ${relDays(brief.profile.touch.lastDate)}` : 'never'}</div>
            <div className="row"><span className="muted small" style={{ width: 110 }}>Prefers</span>{humanize(s.preferredChannel)}{s.timezone ? <span className="muted small"> · {s.timezone}</span> : null}</div>
            {brief.profile.engagement.action && <div className="small" style={{ background: 'var(--accent-soft)', padding: 10, borderRadius: 8 }}><strong>Move {brief.profile.engagement.current} → {brief.profile.engagement.desired}:</strong> {brief.profile.engagement.action}</div>}
            <div className="small muted">{SALIENCE[brief.profile.salience].description}</div>
          </div>
        </Card>
        {(brief.profile.influencedBy.length > 0 || brief.profile.influences.length > 0) && (
          <Card title="Influence" icon="network">
            {brief.profile.influencedBy.length > 0 && <div className="mb12"><div className="label mb8">Listens to</div><div className="col" style={{ gap: 6 }}>{brief.profile.influencedBy.map((x) => <PersonLink key={x.id} s={x} />)}</div></div>}
            {brief.profile.influences.length > 0 && <div><div className="label mb8">Influences</div><div className="col" style={{ gap: 6 }}>{brief.profile.influences.map((x) => <PersonLink key={x.id} s={x} />)}</div></div>}
          </Card>
        )}
      </div>
    </div>
  );
}

function View360({ s, p }: { s: Entity; p: ReturnType<typeof profile360> }) {
  const g = useGraph();
  const block = (title: string, icon: string, items: Entity[], render?: (e: Entity) => ReactNode, emptyText = 'None') => (
    <Card title={`${title} · ${items.length}`} icon={icon} flush>
      {items.length ? <div className="list">{items.map((e) => <Link key={e.id} to={hrefOf(e)} className="list-item"><div className="grow">{render ? render(e) : nameOf(e)}</div></Link>)}</div> : <div className="empty">{emptyText}</div>}
    </Card>
  );
  return (
    <div className="grid g2">
      {block('Open requests', 'inbox', p.openRequests, (r) => <><div className="row">{r.title}<span className="spacer" /><StatusBadge value={r.status} /></div><div className="small muted">{r.priority} priority{r.respondBy ? ` · respond by ${fmtDate(r.respondBy)}` : ''}</div></>)}
      <Card title={`Promises made to them · ${p.commitments.length}`} icon="handshake" flush>
        {p.commitments.length ? <div className="list">{p.commitments.map(({ c, risk }) => (
          <Link key={c.id} to={hrefOf(c)} className="list-item"><div className="grow"><div className="row">{c.title}<span className="spacer" /><RiskBadge r={risk} /></div><div className="small muted">Due {fmtDate(c.dueDate)} · {risk.reason}</div></div></Link>
        ))}</div> : <div className="empty">None</div>}
      </Card>
      {block('Approvals waiting on them', 'clipboard-check', p.pendingApprovals, (a) => <><div>{a.title}</div><div className="small muted">Due {fmtDate(a.dueDate)} · {relDays(a.dueDate)}</div></>)}
      {block('Decisions they made or shaped', 'git-branch', p.decisions, (d) => <><div><span className="key">{d.key}</span> {d.title}</div><div className="small muted">{fmtDate(d.date)} · {(d.deciderIds ?? []).includes(s.id) ? 'decider' : 'consulted'}</div></>)}
      <Card title={`RACI roles · ${p.raci.length}`} icon="grid-3x3" flush>
        {p.raci.length ? <div className="list">{p.raci.map((r, i) => (
          <Link key={i} to={hrefOf(r.raci)} className="list-item"><span className={`raci-btn ${r.role}`} style={{ cursor: 'pointer' }}>{r.role}</span><div className="grow">{r.activity}<div className="small muted">{r.raci.title}</div></div></Link>
        ))}</div> : <div className="empty">No RACI roles.</div>}
      </Card>
      {block('Open conflicts', 'gavel', p.conflicts, (c) => <div className="row">{c.title}<span className="spacer" /><StatusBadge value={c.status} /></div>)}
      {block('Signals they relayed', 'quote', p.evidence, (e) => <><div>“{e.title}”</div><div className="small muted">{e.account ?? e.source} · {fmtDate(e.date)}</div></>)}
      {block('Meetings', 'calendar', p.meetings, (m) => <><div>{m.title}</div><div className="small muted">{fmtDate(m.date)} · {humanize(m.kind)}</div></>)}
      {p.owns.length > 0 && block('Owns', 'star', p.owns, (e) => <><span className="muted small">{ENTITY_MAP[e.type]?.label} · </span>{nameOf(e)}</>)}
      {g.referencing(s.id, 'requirement', 'sourceIds').length > 0 && block('Requirements sourced from them', 'list-checks', g.referencing(s.id, 'requirement', 'sourceIds'), (r) => <><span className="key">{r.key}</span> {r.title}</>)}
    </div>
  );
}

function InteractionsView({ s, p }: { s: Entity; p: ReturnType<typeof profile360> }) {
  const [title, setTitle] = useState('');
  const [sentiment, setSentiment] = useState(0);
  const log = async () => {
    if (!title.trim()) return;
    try {
      await createEntity('interaction', { title: title.trim(), stakeholderIds: [s.id], date: isoDate(now()), sentiment, kind: 'meeting' });
      setTitle('');
      setSentiment(0);
      toast('Interaction logged');
    } catch (err) { errorToast(err); }
  };
  return (
    <div className="grid g-side">
      <Card title="Timeline" icon="message-square" flush>
        <div className="list-item" style={{ background: 'var(--surface-2)' }}>
          <input className="input" placeholder={`What did you talk about with ${s.name.split(' ')[0]}?`} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && log()} />
          <div className="scale">{[-2, -1, 0, 1, 2].map((v) => <button key={v} className={sentiment === v ? 'on' : ''} onClick={() => setSentiment(v)} title="Sentiment">{v > 0 ? `+${v}` : v}</button>)}</div>
          <button className="btn btn-primary" onClick={log} disabled={!title.trim()}>Log</button>
        </div>
        {p.interactions.length === 0 ? <Empty icon="message-square">No interactions logged yet.</Empty> : (
          <div className="list">
            {p.interactions.map((i) => (
              <div key={i.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => openEditor({ type: 'interaction', id: i.id })}>
                <div style={{ width: 70 }} className="small muted nowrap">{fmtDate(i.date)}</div>
                <div className="grow">
                  <div className="row-wrap"><span className="strong">{i.title}</span><span className="muted small">{humanize(i.kind)}</span></div>
                  {i.summary && <div className="small pre">{i.summary}</div>}
                  {i.followUps && <div className="small muted">Follow-up: {i.followUps}</div>}
                  {(i.stakeholderIds ?? []).length > 1 && <div className="small muted">With {(i.stakeholderIds as string[]).filter((x) => x !== s.id).length} others</div>}
                </div>
                {typeof i.sentiment === 'number' && <SentimentValue v={i.sentiment} />}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Sentiment over time" icon="trending-up">
        <Sparkline values={p.sentiment.points.map((x) => x.sentiment)} width={300} height={80} color={p.sentiment.label === 'cooling' ? 'var(--critical)' : 'var(--s1)'} />
        <div className="small muted mt8">Average {p.sentiment.average?.toFixed(1) ?? '—'} · trend: {p.sentiment.label}. Scale −2 (very negative) to +2 (very positive).</div>
      </Card>
    </div>
  );
}

export function goToStakeholder(id: string) {
  navigate(`/stakeholders/p/${id}`);
}

import { useMemo, useState } from 'react';
import { nameOf, type Entity } from '../../../../core/schema.ts';
import { commitmentRisk, commsDue, hubSummary, sentimentTrend, touchStatus } from '../../../../core/engines/stakeholders.ts';
import { daysBetween, isoDate } from '../../../../core/util.ts';
import { now, updateEntity, useGraph } from '../../store.ts';
import { Link, navigate } from '../../router.tsx';
import { Badge, Card, Empty, PageHead, Seg, Stat, StatusBadge, Tabs, errorToast, toast, copyText } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { Sparkline } from '../../ui/charts.tsx';
import { fmtDate, humanize, relDays } from '../../ui/format.ts';
import { EntityTable } from '../../entity/views.tsx';
import { RefChip, RefChips, SentimentValue } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';
import { PersonLink, QuadrantBadge, RiskBadge, TouchBadge } from './common.tsx';

export function EngagementPage() {
  const g = useGraph();
  const today = now();
  const [tab, setTab] = useState<'touch' | 'comms' | 'log'>('touch');
  const interactions = g.all('interaction');
  const people = g.all('stakeholder').filter((s) => s.id !== g.me?.id);
  const rows = people.map((s) => ({ s, t: touchStatus(s, interactions, today), trend: sentimentTrend(s, interactions) }))
    .sort((a, b) => (a.t.dueIn ?? -999) - (b.t.dueIn ?? -999));
  const comms = g.all('commsItem').map((c) => ({ c, due: commsDue(c, today) })).sort((a, b) => (a.due.dueIn ?? 999) - (b.due.dueIn ?? 999));
  const log = [...interactions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const markSent = async (c: Entity) => {
    try { await updateEntity(c.id, { lastSent: isoDate(today) }); toast(`Marked “${c.title}” as sent`); } catch (err) { errorToast(err); }
  };
  return (
    <div className="page">
      <PageHead
        title="Engagement"
        sub="Cadence-based touchpoints for every stakeholder, the communication plan, and the interaction log with sentiment."
        actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'interaction', defaults: { date: isoDate(today), kind: 'meeting' }, open: false })}><Icon name="plus" size={14} />Log interaction</button>}
      />
      <div className="grid g4 mb16">
        <Stat label="Overdue touchpoints" value={rows.filter((r) => r.t.status === 'overdue' || r.t.status === 'never').length} />
        <Stat label="Due in 2 days" value={rows.filter((r) => r.t.status === 'due-soon').length} />
        <Stat label="Comms overdue" value={comms.filter((c) => c.due.status === 'overdue').length} />
        <Stat label="Interactions (30 days)" value={interactions.filter((i) => daysBetween(i.date, today) <= 30 && daysBetween(i.date, today) >= 0).length} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'touch', label: 'Touchpoints' }, { id: 'comms', label: 'Comms plan', count: comms.length }, { id: 'log', label: 'Interaction log', count: interactions.length }]} />
      {tab === 'touch' && (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Stakeholder</th><th>Strategy</th><th>Cadence</th><th>Last contact</th><th>Status</th><th className="hide-mobile">Sentiment</th><th /></tr></thead>
              <tbody>
                {rows.map(({ s, t, trend }) => (
                  <tr key={s.id}>
                    <td><PersonLink s={s} /></td>
                    <td><QuadrantBadge s={s} /></td>
                    <td className="nowrap">every {t.cadence}d{s.cadenceDays ? '' : <span className="muted small"> (default)</span>}</td>
                    <td className="nowrap">{t.lastDate ? <>{fmtDate(t.lastDate)} <span className="muted small">{relDays(t.lastDate, today)}</span></> : <span className="muted">never</span>}</td>
                    <td><TouchBadge t={t} /></td>
                    <td className="hide-mobile"><span className="row"><Sparkline values={trend.points.map((p) => p.sentiment)} width={80} height={22} color={trend.label === 'cooling' ? 'var(--critical)' : 'var(--s1)'} />{trend.label === 'cooling' && <Badge tone="red">cooling</Badge>}</span></td>
                    <td className="tight"><button className="btn btn-sm" onClick={() => openEditor({ type: 'interaction', defaults: { stakeholderIds: [s.id], date: isoDate(today), kind: '1:1', title: `Check-in with ${s.name}` }, open: false })}>Log</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {tab === 'comms' && (
        <Card flush actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'commsItem' })}><Icon name="plus" size={13} />Add message</button>} title="Communication plan" icon="megaphone" sub="Who gets which message, how often, through which channel.">
          {comms.length === 0 ? <Empty icon="megaphone">No comms plan yet.</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Message</th><th>Audience</th><th>Channel</th><th>Frequency</th><th>Last sent</th><th>Next</th><th /></tr></thead>
                <tbody>
                  {comms.map(({ c, due }) => (
                    <tr key={c.id} className="clickable" onClick={() => openEditor({ type: 'commsItem', id: c.id })}>
                      <td className="strong">{c.title}<div className="small muted">{c.format}</div></td>
                      <td>{c.audience && <div className="small">{c.audience}</div>}<RefChips ids={c.audienceIds} max={3} /></td>
                      <td>{humanize(c.channel)}</td>
                      <td>{humanize(c.frequency)}</td>
                      <td className="nowrap">{fmtDate(c.lastSent)}</td>
                      <td>{due.status === 'event-driven' ? <span className="muted small">per event</span> : due.status === 'never-sent' ? <Badge tone="amber">Never sent</Badge> : <Badge tone={due.status === 'overdue' ? 'red' : due.status === 'due' ? 'amber' : 'green'}>{due.status === 'overdue' ? `${-due.dueIn!}d late` : fmtDate(due.nextDue)}</Badge>}</td>
                      <td className="tight" onClick={(e) => e.stopPropagation()}>
                        <div className="row">
                          {c.title?.toLowerCase().includes('steering') && <Link className="btn btn-sm" to="/workspace/docs?kind=steering">Generate</Link>}
                          {c.title?.toLowerCase().includes('release notes') && <Link className="btn btn-sm" to="/workspace/docs?kind=release-notes">Generate</Link>}
                          <button className="btn btn-sm" onClick={() => markSent(c)}>Mark sent</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {tab === 'log' && (
        <Card flush>
          <div className="list">
            {log.slice(0, 120).map((i) => (
              <div key={i.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => openEditor({ type: 'interaction', id: i.id })}>
                <div style={{ width: 70 }} className="small muted nowrap">{fmtDate(i.date)}</div>
                <div className="grow">
                  <div className="row-wrap"><span className="strong">{i.title}</span><span className="small muted">{humanize(i.kind)}</span></div>
                  <div className="chips mt8">{(i.stakeholderIds as string[] ?? []).map((id) => <RefChip key={id} id={id} />)}</div>
                  {i.summary && <div className="small mt8 pre">{i.summary}</div>}
                </div>
                {typeof i.sentiment === 'number' && <SentimentValue v={i.sentiment} />}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------- Requests ----------------

const REQ_STATUSES = ['new', 'triaging', 'accepted', 'planned', 'done', 'declined'] as const;

export function RequestsPage() {
  const g = useGraph();
  const today = now();
  const [view, setView] = useState<'board' | 'table'>('board');
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const requests = g.all('request');
  const loops = hubSummary(g, today).loopsToClose;
  const move = async (id: string, status: string) => {
    try { await updateEntity(id, { status }); } catch (err) { errorToast(err); }
  };
  const closeLoop = async (r: Entity) => {
    const requester = g.get(r.requesterId);
    const bet = g.get(r.betId);
    const msg = `Hi ${String(requester?.name ?? '').split(' ')[0] || 'there'} — good news: what you asked for ("${r.title}") is now live as part of "${bet?.title}". Thanks for raising it; it shaped what we built. Happy to walk you through it.`;
    await copyText(msg, 'Close-the-loop message copied');
    try { await updateEntity(r.id, { loopClosed: true }); } catch (err) { errorToast(err); }
  };
  return (
    <div className="page page-wide">
      <PageHead
        title="Requests"
        sub="Every ask from a stakeholder: triage it, respond within the SLA, link it to evidence or a bet — and close the loop when it ships."
        actions={<><Seg value={view} onChange={setView} options={[{ id: 'board', label: 'Board' }, { id: 'table', label: 'Table' }]} /><button className="btn btn-primary" onClick={() => openEditor({ type: 'request', defaults: { receivedAt: isoDate(today) } })}><Icon name="plus" size={14} />New request</button></>}
      />
      {loops.length > 0 && (
        <Card title={`Close the loop · ${loops.length}`} icon="send" sub="These requests shipped, but the requester has not been told yet." className="mb16" flush>
          <div className="list">{loops.map((r) => (
            <div key={r.id} className="list-item" style={{ alignItems: 'center' }}>
              <div className="grow"><div className="strong">{r.title}</div><div className="small muted">{nameOf(g.get(r.requesterId))} · shipped with <RefChip id={r.betId} /></div></div>
              <button className="btn btn-sm btn-primary" onClick={() => closeLoop(r)}><Icon name="send" size={13} />Copy message & mark informed</button>
            </div>
          ))}</div>
        </Card>
      )}
      {view === 'board' ? (
        <div className="board">
          {REQ_STATUSES.map((st) => {
            const list = requests.filter((r) => r.status === st).sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.priority) - ['critical', 'high', 'medium', 'low'].indexOf(b.priority));
            return (
              <div key={st} className={`lane ${over === st ? 'drop' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(st); }} onDragLeave={() => setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); if (dragging) void move(dragging, st); setDragging(null); }}>
                <div className="lane-head"><StatusBadge value={st} /><span className="muted small">{list.length}</span></div>
                {list.map((r) => {
                  const overdue = ['new', 'triaging'].includes(r.status) && r.respondBy && daysBetween(today, r.respondBy) < 0;
                  return (
                    <div key={r.id} className="tile" draggable onDragStart={() => setDragging(r.id)} onDragEnd={() => setDragging(null)} onClick={() => navigate(hrefOf(r))}>
                      <div className="strong" style={{ fontSize: 13 }}>{r.title}</div>
                      <div className="small muted mt8">{nameOf(g.get(r.requesterId))}</div>
                      <div className="row-wrap mt8" style={{ gap: 4 }}>
                        <Badge tone={r.priority === 'critical' ? 'red' : r.priority === 'high' ? 'amber' : ''}>{r.priority}</Badge>
                        {overdue && <Badge tone="red">SLA missed</Badge>}
                        {r.respondBy && !overdue && ['new', 'triaging'].includes(r.status) && <Badge>respond {relDays(r.respondBy, today)}</Badge>}
                        {r.betId && <Badge tone="blue">linked</Badge>}
                        {r.loopClosed && <Badge tone="green">informed</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <Card flush><EntityTable type="request" columns={['title', 'requesterId', 'priority', 'status', 'respondBy', 'betId', 'loopClosed']} /></Card>
      )}
    </div>
  );
}

// ---------------- Commitments ----------------

export function CommitmentsPage() {
  const g = useGraph();
  const today = now();
  const rows = useMemo(() => g.all('commitment').map((c) => ({ c, r: commitmentRisk(c, g, today) })), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const order = { high: 0, broken: 1, medium: 2, unknown: 3, low: 4, kept: 5 };
  rows.sort((a, b) => order[a.r.level] - order[b.r.level] || String(a.c.dueDate).localeCompare(String(b.c.dueDate)));
  const mark = async (c: Entity, status: string) => {
    try { await updateEntity(c.id, { status }); } catch (err) { errorToast(err); }
  };
  return (
    <div className="page">
      <PageHead
        title="Commitments"
        sub="The promise ledger: what was promised to whom and by when — continuously checked against the Monte Carlo delivery forecast."
        actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'commitment' })}><Icon name="plus" size={14} />Record a promise</button>}
      />
      <div className="grid g4 mb16">
        <Stat label="Open promises" value={rows.filter((x) => x.c.status === 'open').length} />
        <Stat label="High risk" value={rows.filter((x) => x.r.level === 'high').length} tone={rows.some((x) => x.r.level === 'high') ? 'red' : undefined} />
        <Stat label="Medium risk" value={rows.filter((x) => x.r.level === 'medium').length} />
        <Stat label="Kept (all time)" value={rows.filter((x) => x.c.status === 'kept').length} sub={`${rows.filter((x) => x.c.status === 'broken').length} broken`} />
      </div>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Promise</th><th>To</th><th>By</th><th>Due</th><th>Delivered by</th><th>Risk</th><th>Forecast</th><th /></tr></thead>
            <tbody>
              {rows.map(({ c, r }) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(hrefOf(c))}>
                  <td className="strong">{c.title}{c.account && <div className="small muted">{c.account}</div>}</td>
                  <td>{c.toId ? <PersonLink s={g.get(c.toId)} /> : <span className="muted">{c.account ?? '—'}</span>}</td>
                  <td className="small">{nameOf(g.get(c.promisedById))}</td>
                  <td className="nowrap">{fmtDate(c.dueDate)}<div className="small muted">{relDays(c.dueDate, today)}</div></td>
                  <td>{c.betId ? <RefChip id={c.betId} /> : c.releaseId ? <RefChip id={c.releaseId} /> : <span className="muted">not linked</span>}</td>
                  <td><RiskBadge r={r} /></td>
                  <td className="small" style={{ maxWidth: 260 }}>{r.reason}</td>
                  <td className="tight" onClick={(e) => e.stopPropagation()}>
                    {c.status === 'open' && <div className="row"><button className="btn btn-sm" onClick={() => mark(c, 'kept')}>Kept</button><button className="btn btn-sm" onClick={() => openEditor({ type: 'commitment', id: c.id })}>Renegotiate</button></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="small muted mt12">Risk = probability of the linked bet or release finishing by the promised date, simulated 5,000 times from the team's last 12 weeks of throughput. Promises not linked to delivery cannot be forecast — link them.</p>
    </div>
  );
}


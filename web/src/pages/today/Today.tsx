import { useMemo, useState } from 'react';
import { briefCounts, dailyBrief, type BriefItem } from '../../../../core/engines/brief.ts';
import { commitmentRisk, hubSummary, pendingApprovalsFor, quadrant, touchStatus } from '../../../../core/engines/stakeholders.ts';
import { daysBetween } from '../../../../core/util.ts';
import { ENTITY_MAP, nameOf } from '../../../../core/schema.ts';
import { now, useGraph, useSettings } from '../../store.ts';
import { Link } from '../../router.tsx';
import { Avatar, Badge, Card, Empty, PageHead, Seg, Stat } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { fmtDate, relDays } from '../../ui/format.ts';
import { hrefOf } from '../../entity/links.ts';

const AREA_LABEL: Record<BriefItem['area'], string> = { stakeholders: 'Stakeholders', discover: 'Discover', define: 'Define', deliver: 'Deliver', learn: 'Learn', strategy: 'Strategy' };

export function TodayPage() {
  const g = useGraph();
  const settings = useSettings();
  const today = now();
  const items = useMemo(() => dailyBrief(g, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = briefCounts(items);
  const hub = useMemo(() => hubSummary(g, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const [area, setArea] = useState<'all' | BriefItem['area']>('all');
  const shown = items.filter((i) => area === 'all' || i.area === area);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const me = g.me;
  const myApprovals = me ? pendingApprovalsFor(me.id, g.all('approval')) : [];

  const upcoming = useMemo(() => {
    const list: { date: string; label: string; icon: string; id: string; tone?: 'red' | 'amber' }[] = [];
    for (const c of g.all('commitment').filter((c) => c.status === 'open' && c.dueDate && daysBetween(today, c.dueDate) <= 21)) {
      const r = commitmentRisk(c, g, today);
      list.push({ date: c.dueDate, label: `Promise due: ${c.title}`, icon: 'handshake', id: c.id, tone: r.level === 'high' ? 'red' : r.level === 'medium' ? 'amber' : undefined });
    }
    for (const r of g.all('release').filter((r) => r.status !== 'released' && r.targetDate && daysBetween(today, r.targetDate) <= 30)) list.push({ date: r.targetDate, label: `Release: ${r.title}`, icon: 'party-popper', id: r.id });
    for (const m of g.all('meeting').filter((m) => m.date && daysBetween(today, m.date) >= 0 && daysBetween(today, m.date) <= 14)) list.push({ date: m.date, label: m.title, icon: 'calendar', id: m.id });
    for (const b of g.all('bet').filter((b) => b.checkDate && b.status === 'shipped' && daysBetween(today, b.checkDate) <= 14)) list.push({ date: b.checkDate, label: `Measure: ${b.title}`, icon: 'target', id: b.id });
    for (const a of g.all('approval').filter((a) => a.status === 'pending' && a.dueDate && daysBetween(today, a.dueDate) >= 0 && daysBetween(today, a.dueDate) <= 14)) list.push({ date: a.dueDate, label: `Approval due: ${a.title}`, icon: 'clipboard-check', id: a.id });
    return list.filter((x) => daysBetween(today, x.date) >= -1).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps

  const keyPlayers = g.all('stakeholder').filter((s) => !s.isMe && quadrant(s) === 'manage-closely').map((s) => ({ s, t: touchStatus(s, g.all('interaction'), today) }));

  return (
    <div className="page">
      <PageHead
        title={`${greet}${settings.userName ? `, ${String(settings.userName).split(' ')[0]}` : ''}`}
        sub={`${fmtDate(today.toISOString().slice(0, 10), { year: true })} · ${settings.productName}. Everything below is computed from your workspace — nothing to fill in.`}
      />
      <div className="grid g4 mb16">
        <Stat label="Needs attention" value={counts.critical + counts.high} sub={`${counts.critical} critical · ${counts.high} high`} tone={counts.critical ? 'red' : undefined} />
        <Stat label="Waiting on your sign-off" value={myApprovals.length} sub={myApprovals[0] ? myApprovals[0].title : 'Nothing pending'} />
        <Stat label="Promises at risk" value={hub.riskyCommitments.length} sub="vs 85% delivery forecast" tone={hub.riskyCommitments.length ? 'amber' : undefined} />
        <Stat label="Overdue touchpoints" value={hub.overdue.length} sub={`${hub.cooling.length} relationships cooling`} />
      </div>
      <div className="grid g-side">
        <Card
          title="Your brief" icon="sparkles"
          actions={<Seg value={area} onChange={setArea} options={[{ id: 'all', label: `All ${items.length}` }, ...(['stakeholders', 'discover', 'define', 'deliver', 'learn', 'strategy'] as const).filter((a) => items.some((i) => i.area === a)).map((a) => ({ id: a, label: AREA_LABEL[a] }))]} />}
          flush
        >
          {shown.length === 0 ? <Empty icon="circle-check">All clear. Nothing needs your attention here.</Empty> : (
            <div className="list">
              {shown.map((i) => <BriefRow key={i.id} item={i} />)}
            </div>
          )}
        </Card>
        <div className="stack">
          <Card title="Coming up" icon="calendar" flush>
            {upcoming.length === 0 ? <Empty icon="calendar">Nothing in the next three weeks.</Empty> : (
              <div className="list">
                {upcoming.map((u) => {
                  const e = g.get(u.id)!;
                  return (
                    <Link key={`${u.id}-${u.label}`} to={hrefOf(e)} className="list-item">
                      <Icon name={u.icon} size={15} className="muted" />
                      <div className="grow"><div className="ellipsis">{u.label}</div><div className="small muted">{fmtDate(u.date)} · {relDays(u.date, today)}</div></div>
                      {u.tone && <Badge tone={u.tone}>{u.tone === 'red' ? 'At risk' : 'Watch'}</Badge>}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
          <Card title="Key players" icon="users" sub="Manage closely — high power, high interest" flush>
            <div className="list">
              {keyPlayers.map(({ s, t }) => (
                <Link key={s.id} to={hrefOf(s)} className="list-item">
                  <Avatar name={s.name} />
                  <div className="grow"><div className="strong ellipsis">{s.name}</div><div className="small muted ellipsis">{s.title}{s.account ? ` · ${s.account}` : ''}</div></div>
                  <Badge tone={t.status === 'overdue' || t.status === 'never' ? 'red' : t.status === 'due-soon' ? 'amber' : 'green'}>{t.status === 'never' ? 'No contact' : t.status === 'overdue' ? `${-t.dueIn!}d overdue` : `${t.daysSince}d ago`}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BriefRow({ item }: { item: BriefItem }) {
  const g = useGraph();
  const ref = g.get(item.refId);
  const to = item.href ?? (ref ? hrefOf(ref) : undefined);
  const body = (
    <>
      <span className={`sev ${item.severity}`} aria-label={item.severity} />
      <div className="grow">
        <div className="row-wrap" style={{ gap: 6 }}>
          <span className="strong">{item.title}</span>
        </div>
        {item.detail && <div className="small muted">{item.detail}</div>}
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
        <Badge tone={item.severity === 'critical' ? 'red' : item.severity === 'high' ? 'amber' : ''}>{item.severity}</Badge>
        <span className="tiny muted">{AREA_LABEL[item.area]}{ref ? ` · ${ENTITY_MAP[ref.type]?.label}` : ''}</span>
      </div>
    </>
  );
  return to ? <Link to={to} className="list-item">{body}</Link> : <div className="list-item">{body}</div>;
}

export function InboxPage() {
  const g = useGraph();
  const today = now();
  const me = g.me;
  const approvals = me ? pendingApprovalsFor(me.id, g.all('approval')) : [];
  const requests = g.all('request').filter((r) => ['new', 'triaging'].includes(r.status)).sort((a, b) => String(a.respondBy ?? '9').localeCompare(String(b.respondBy ?? '9')));
  const findings = g.all('reviewFinding').filter((f) => f.status === 'open');
  const actions = g.all('meeting').flatMap((m) => ((m.actions ?? []) as any[]).filter((a) => !a.done).map((a) => ({ ...a, meeting: m })));
  const mine = actions.filter((a) => a.ownerId === me?.id);
  return (
    <div className="page">
      <PageHead title="Inbox" sub="Everything that is waiting on you: sign-offs, requests to triage, review questions and action items." />
      <div className="grid g2">
        <Card title={`Waiting on your sign-off · ${approvals.length}`} icon="clipboard-check" flush>
          {approvals.length ? <div className="list">{approvals.map((a) => (
            <Link key={a.id} to={`/stakeholders/approvals?focus=${a.id}`} className="list-item">
              <Icon name="clipboard-check" size={15} className="muted" />
              <div className="grow"><div className="strong">{a.title}</div><div className="small muted">On {nameOf(g.get(a.subjectId))} · due {fmtDate(a.dueDate)} ({relDays(a.dueDate, today)})</div></div>
            </Link>
          ))}</div> : <Empty icon="circle-check">No approvals waiting on you.</Empty>}
        </Card>
        <Card title={`Requests to triage · ${requests.length}`} icon="inbox" flush actions={<Link to="/stakeholders/requests" className="btn btn-sm">Open requests</Link>}>
          {requests.length ? <div className="list">{requests.map((r) => {
            const overdue = r.respondBy && daysBetween(today, r.respondBy) < 0;
            return (
              <Link key={r.id} to={hrefOf(r)} className="list-item">
                <Avatar name={g.get(r.requesterId)?.name} size="sm" />
                <div className="grow"><div className="strong">{r.title}</div><div className="small muted">{nameOf(g.get(r.requesterId))} · {r.priority} priority{r.respondBy ? ` · respond ${relDays(r.respondBy, today)}` : ''}</div></div>
                {overdue && <Badge tone="red">Overdue</Badge>}
              </Link>
            );
          })}</div> : <Empty icon="inbox">Inbox zero.</Empty>}
        </Card>
        <Card title={`Your action items · ${mine.length}`} icon="list-checks" flush>
          {mine.length ? <div className="list">{mine.map((a) => (
            <Link key={a.id + a.meeting.id} to={hrefOf(a.meeting)} className="list-item">
              <Icon name="circle-dot" size={15} className="muted" />
              <div className="grow"><div>{a.text}</div><div className="small muted">From {a.meeting.title}{a.due ? ` · due ${fmtDate(a.due)} (${relDays(a.due, today)})` : ''}</div></div>
              {a.due && daysBetween(today, a.due) < 0 && <Badge tone="red">Overdue</Badge>}
            </Link>
          ))}</div> : <Empty icon="list-checks">No open action items assigned to you.</Empty>}
        </Card>
        <Card title={`Open review questions · ${findings.length}`} icon="bot" flush>
          {findings.length ? <div className="list">{findings.map((f) => (
            <Link key={f.id} to={`${hrefOf(g.get(f.specId) ?? f)}?tab=review`} className="list-item">
              <Badge tone={f.severity === 'critical' ? 'red' : f.severity === 'major' ? 'amber' : ''}>{f.role}</Badge>
              <div className="grow"><div>{f.title}</div><div className="small muted">{nameOf(g.get(f.specId))}</div></div>
            </Link>
          ))}</div> : <Empty icon="bot">No open review questions.</Empty>}
        </Card>
      </div>
    </div>
  );
}

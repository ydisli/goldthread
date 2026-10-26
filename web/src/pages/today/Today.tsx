import { Suspense, useMemo, useState } from 'react';
import { dailyBrief, openMentions, type BriefItem } from '../../../../core/engines/brief.ts';
import { commitmentRisk, hubSummary, pendingApprovalsFor, quadrant } from '../../../../core/engines/stakeholders.ts';
import { daysBetween, isoDate } from '../../../../core/util.ts';
import { ENTITY_MAP, nameOf } from '../../../../core/schema.ts';
import { can, now, updateMe, useGraph, useMe, useSettings, useStore } from '../../store.ts';
import { Link } from '../../router.tsx';
import { Avatar, Badge, Card, Empty, PageHead, Seg, errorToast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { fmtDate, fmtDateTime, relDays } from '../../ui/format.ts';
import { hrefOf } from '../../entity/links.ts';
import { MentionText } from '../../entity/comments.tsx';
import { GuideCard } from '../guide/lazy.tsx';

const AREA_LABEL: Record<BriefItem['area'], string> = { stakeholders: 'Stakeholders', discover: 'Discover', define: 'Define', deliver: 'Deliver', learn: 'Learn', strategy: 'Strategy' };

export function TodayPage() {
  const g = useGraph();
  const settings = useSettings();
  const me = useMe();
  const s = useStore();
  const today = now();
  const items = useMemo(() => dailyBrief(g, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const hub = useMemo(() => hubSummary(g, today), [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showAll, setShowAll] = useState(false);
  const [area, setArea] = useState<'all' | BriefItem['area']>('all');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (me?.name ?? '').split(' ')[0];
  const myApprovals = g.me ? pendingApprovalsFor(g.me.id, g.all('approval')) : [];
  const toTriage = g.all('request').filter((r) => r.status === 'new');
  const urgent = items.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const top = urgent.slice(0, 6);
  const shown = items.filter((i) => area === 'all' || i.area === area);

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
    return list.filter((x) => daysBetween(today, x.date) >= -1).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps

  // People to reach: overdue touchpoints, key players first.
  const toReach = hub.overdue
    .slice()
    .sort((a, b) => Number(quadrant(b.s) === 'manage-closely') - Number(quadrant(a.s) === 'manage-closely') || (a.touch.dueIn ?? -999) - (b.touch.dueIn ?? -999))
    .slice(0, 6);

  const summary: string[] = [];
  if (myApprovals.length) summary.push(`${myApprovals.length} sign-off${myApprovals.length > 1 ? 's' : ''} waiting on you`);
  if (hub.riskyCommitments.length) summary.push(`${hub.riskyCommitments.length} promise${hub.riskyCommitments.length > 1 ? 's' : ''} the forecast says may slip`);
  if (toTriage.length) summary.push(`${toTriage.length} new request${toTriage.length > 1 ? 's' : ''} to triage`);
  if (hub.overdue.length) summary.push(`${hub.overdue.length} ${hub.overdue.length > 1 ? 'people' : 'person'} you're overdue to talk to`);

  return (
    <div className="page">
      <div className="home-head">
        <div className="eyebrow">{fmtDate(isoDate(today), { year: true })}{settings.productName ? ` · ${settings.productName}` : ''}</div>
        <h1>{greet}{first ? `, ${first}` : ''}.</h1>
        <p className="home-summary">
          {summary.length === 0 ? 'Nothing is waiting on you. A good day to talk to a customer, or tidy the backlog.' : <>Today: {summary.map((x, i) => <span key={i}>{i > 0 && (i === summary.length - 1 ? ' and ' : ', ')}{x}</span>)}.</>}
        </p>
      </div>

      <GettingStarted />

      <div className="grid g-side">
        <div className="stack">
          <Card
            title={showAll ? 'Full brief' : 'Needs you'}
            sub={showAll ? 'Everything the workspace noticed, most urgent first.' : `The ${top.length} most urgent of ${items.length} things the workspace noticed.`}
            actions={showAll && <Seg value={area} onChange={setArea} options={[{ id: 'all', label: `All ${items.length}` }, ...(['stakeholders', 'discover', 'define', 'deliver', 'learn', 'strategy'] as const).filter((a) => items.some((i) => i.area === a)).map((a) => ({ id: a, label: AREA_LABEL[a] }))]} />}
            flush
          >
            {(showAll ? shown : top).length === 0 ? <Empty icon="circle-check">All clear. Nothing urgent.</Empty> : (
              <div className="list">
                {(showAll ? shown : top).map((i) => <BriefRow key={i.id} item={i} />)}
              </div>
            )}
            {items.length > top.length && (
              <div className="card-foot"><button className="btn btn-ghost btn-sm" onClick={() => { setShowAll((v) => !v); setArea('all'); }}>{showAll ? 'Show only what needs you' : `Show everything (${items.length})`}</button></div>
            )}
          </Card>

          <Card title="People to reach" sub="Overdue for a conversation, by your own cadence. Key players first." flush actions={<Link to="/stakeholders/engagement" className="btn btn-ghost btn-sm">Engagement</Link>}>
            {toReach.length === 0 ? <Empty icon="users">You're up to date with everyone.</Empty> : (
              <div className="list">
                {toReach.map(({ s: p, touch }) => (
                  <div key={p.id} className="list-item" style={{ alignItems: 'center' }}>
                    <Avatar name={p.name} />
                    <Link to={hrefOf(p)} className="grow" style={{ color: 'inherit', minWidth: 0 }}>
                      <div className="strong ellipsis">{p.name}{quadrant(p) === 'manage-closely' && <span className="small muted"> · key player</span>}</div>
                      <div className="small muted ellipsis">{touch.status === 'never' ? 'No conversation logged yet' : `${-touch.dueIn!} days overdue · every ${touch.cadence} days`}{p.title ? ` · ${p.title}` : ''}</div>
                    </Link>
                    <Link to={`/stakeholders/p/${p.id}?tab=prep`} className="btn btn-sm">Prep</Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="stack">
          <Suspense fallback={null}><GuideCard /></Suspense>
          <Card title="Coming up" flush>
            {upcoming.length === 0 ? <Empty icon="calendar">Nothing in the next three weeks.</Empty> : (
              <div className="list">
                {upcoming.map((u) => {
                  const e = g.get(u.id)!;
                  return (
                    <Link key={`${u.id}-${u.label}`} to={hrefOf(e)} className="list-item">
                      <Icon name={u.icon} size={15} className="muted" />
                      <div className="grow"><div className="ellipsis">{u.label}</div><div className="small muted">{fmtDate(u.date)} · {relDays(u.date, today)}</div></div>
                      {u.tone && <span className={`status ${u.tone}`}>{u.tone === 'red' ? 'At risk' : 'Watch'}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
          <Card title="Shortcuts" flush>
            <div className="list">
              <Link to="/inbox" className="list-item"><Icon name="inbox" size={15} className="muted" /><span className="grow">Inbox</span><span className="small muted">{myApprovals.length + toTriage.length || ''}</span></Link>
              <Link to="/stakeholders/commitments" className="list-item"><Icon name="handshake" size={15} className="muted" /><span className="grow">Promises</span><span className="small muted">{hub.riskyCommitments.length ? `${hub.riskyCommitments.length} at risk` : ''}</span></Link>
              <Link to="/workspace/meetings" className="list-item"><Icon name="calendar" size={15} className="muted" /><span className="grow">Meetings & notes</span></Link>
              <Link to="/tools" className="list-item"><Icon name="layout-grid" size={15} className="muted" /><span className="grow">All tools</span></Link>
            </div>
          </Card>
          {s.members.length > 1 && <TeamCard />}
        </div>
      </div>
    </div>
  );
}

function TeamCard() {
  const s = useStore();
  const me = useMe();
  return (
    <Card title="Your team here" flush actions={can('admin') ? <Link to="/workspace/settings?tab=members" className="btn btn-ghost btn-sm">Manage</Link> : undefined}>
      <div className="list">
        {s.members.slice(0, 6).map((m) => (
          <div key={m.userId} className="list-item" style={{ alignItems: 'center' }}>
            <Avatar name={m.name} size="sm" />
            <span className="grow ellipsis">{m.name}{m.userId === me?.id ? <span className="muted"> (you)</span> : ''}</span>
            <span className="small muted">{m.role}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** A short, honest checklist for new workspaces. Disappears once done or dismissed. */
function GettingStarted() {
  const g = useGraph();
  const s = useStore();
  const me = useMe();
  const dismissed = me?.prefs.dismissedGuides?.includes('getting-started');
  if (!me || dismissed || !can('editor')) return null;
  const others = g.all('stakeholder').filter((x) => x.id !== g.me?.id).length;
  const steps = [
    { done: others >= 3, label: 'Add the people who matter', hint: 'Sponsors, approvers, users, the team. Rate power and interest so Goldthread knows who to keep close.', to: '/stakeholders', cta: 'Add stakeholders' },
    { done: g.all('spec').length > 0 || g.all('requirement').length > 0, label: 'Write or paste your first spec', hint: 'Spec Studio flags vague wording, missing acceptance criteria and contradictions as you type.', to: '/define/specs', cta: 'Open Spec Studio' },
    { done: g.all('evidence').length > 0 || g.all('request').length > 0, label: 'Capture a signal or a request', hint: 'Press C anywhere. A ticket, a quote, a stakeholder ask: it all lands in one place.', to: '/discover/signals', cta: 'See signals' },
    ...(can('admin') ? [{ done: s.members.length > 1, label: 'Invite your team', hint: 'Editors work alongside you; viewers (sponsors, auditors) can read and comment.', to: '/workspace/settings?tab=members', cta: 'Invite people' }] : []),
    { done: !!me.prefs.pinned, label: 'Pin the tools you use weekly', hint: 'Keep your sidebar short. Everything else stays one click away.', to: '/tools', cta: 'Choose tools' },
  ];
  const left = steps.filter((x) => !x.done);
  if (!left.length) return null;
  const dismiss = () => updateMe({ prefs: { dismissedGuides: [...(me.prefs.dismissedGuides ?? []), 'getting-started'] } }).catch(errorToast);
  return (
    <Card title="Getting started" sub={`${steps.length - left.length} of ${steps.length} done`} actions={<button className="btn btn-ghost btn-sm" onClick={dismiss}>Hide</button>} className="mb16">
      <div className="checklist">
        {steps.map((x) => (
          <div key={x.label} className={`check-item ${x.done ? 'done' : ''}`}>
            <span className="check-box">{x.done && <Icon name="check" size={12} />}</span>
            <div className="grow"><div className="strong">{x.label}</div>{!x.done && <div className="small muted">{x.hint}</div>}</div>
            {!x.done && <Link to={x.to} className="btn btn-sm">{x.cta}</Link>}
          </div>
        ))}
      </div>
    </Card>
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
        <span className={`status ${item.severity === 'critical' ? 'red' : item.severity === 'high' ? 'amber' : ''}`}>{item.severity === 'critical' ? 'Urgent' : item.severity === 'high' ? 'Soon' : item.severity === 'medium' ? 'Worth a look' : 'FYI'}</span>
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
  const account = useMe();
  const members = useStore().members;
  const seen = account?.prefs.seenMentions ?? [];
  const mentions = openMentions(g, account?.id, seen);
  const clear = (ids: string[]) => updateMe({ prefs: { seenMentions: [...seen, ...ids].slice(-300) } }).catch(errorToast);
  return (
    <div className="page">
      <PageHead title="Inbox" sub="Everything that is waiting on you: mentions, sign-offs, requests to triage, review questions and action items." />
      {mentions.length > 0 && (
        <Card title={`Mentioned you · ${mentions.length}`} icon="at-sign" flush className="mb16" actions={mentions.length > 1 && <button className="btn btn-sm btn-ghost" onClick={() => clear(mentions.map((c) => c.id))}>Mark all done</button>}>
          <div className="list">{mentions.map((c) => {
            const on = g.get(c.entityId);
            return (
              <div key={c.id} className="list-item">
                <Avatar name={c.author} size="sm" />
                <Link to={on ? hrefOf(on) : '/inbox'} className="grow" style={{ color: 'inherit' }}>
                  <div className="small"><span className="strong">{c.author}</span> <span className="muted">on {nameOf(on)} · {fmtDateTime(c.createdAt)}</span></div>
                  <div className="pre"><MentionText body={c.body} members={members} /></div>
                </Link>
                <button className="btn btn-sm" onClick={() => clear([c.id])}>Done</button>
              </div>
            );
          })}</div>
        </Card>
      )}
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

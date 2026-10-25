import type { Graph } from '../graph.ts';
import { daysBetween, impactText, pluralize } from '../util.ts';
import { clusterEvidence } from './clustering.ts';
import { backlogHygiene } from './hygiene.ts';
import { commsDue, hubSummary, pendingApprovalsFor, QUADRANTS, quadrant } from './stakeholders.ts';

export type BriefSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface BriefItem {
  id: string;
  area: 'stakeholders' | 'discover' | 'define' | 'deliver' | 'learn' | 'strategy';
  severity: BriefSeverity;
  title: string;
  detail?: string;
  refId?: string;
  href?: string;
}

/** The PO's morning brief: what changed and what needs attention. */
export function dailyBrief(g: Graph, now: Date): BriefItem[] {
  const items: BriefItem[] = [];
  const me = g.me;
  const hub = hubSummary(g, now);

  // Approvals waiting on me
  if (me) {
    for (const a of pendingApprovalsFor(me.id, g.all('approval'))) {
      const overdue = a.dueDate && daysBetween(now, a.dueDate) < 0;
      items.push({ id: `appr-me-${a.id}`, area: 'stakeholders', severity: overdue ? 'high' : 'medium', title: `Your sign-off is needed: ${a.title}`, detail: a.dueDate ? `Due ${a.dueDate}` : undefined, refId: a.id });
    }
  }
  // Approvals overdue (waiting on others)
  for (const a of hub.pendingApprovals) {
    if (!a.dueDate || daysBetween(now, a.dueDate) >= 0) continue;
    const waiting = (a.approvers ?? []).filter((x: any) => x.status === 'pending' && x.stakeholderId !== me?.id).map((x: any) => g.get(x.stakeholderId)?.name).filter(Boolean);
    if (waiting.length) items.push({ id: `appr-${a.id}`, area: 'stakeholders', severity: 'high', title: `Approval overdue: ${a.title}`, detail: `Waiting on ${waiting.join(', ')} since ${a.dueDate}`, refId: a.id });
  }
  // Overdue touchpoints for key players
  for (const { s, touch } of hub.overdue.slice(0, 6)) {
    const q = quadrant(s);
    items.push({
      id: `touch-${s.id}`, area: 'stakeholders', severity: q === 'manage-closely' ? 'high' : 'medium',
      title: touch.status === 'never' ? `No contact logged with ${s.name}` : `${s.name}: touchpoint ${-touch.dueIn!} days overdue`,
      detail: `${QUADRANTS[q].label} · cadence every ${touch.cadence} days${touch.lastDate ? ` · last ${touch.lastDate}` : ''}`, refId: s.id,
    });
  }
  for (const { s, trend } of hub.cooling) {
    items.push({ id: `cool-${s.id}`, area: 'stakeholders', severity: Number(s.power) >= 4 ? 'high' : 'medium', title: `${s.name}'s sentiment is cooling`, detail: `Recent ${trend.recent?.toFixed(1)} vs average ${trend.average?.toFixed(1)} over ${trend.points.length} interactions`, refId: s.id });
  }
  for (const r of hub.overdueRequests) {
    items.push({ id: `req-${r.id}`, area: 'stakeholders', severity: r.priority === 'critical' || r.priority === 'high' ? 'high' : 'medium', title: `Response overdue: ${r.title}`, detail: `From ${g.get(r.requesterId)?.name ?? 'unknown'} · respond by ${r.respondBy}`, refId: r.id });
  }
  for (const { c, risk } of hub.riskyCommitments) {
    items.push({ id: `com-${c.id}`, area: 'stakeholders', severity: risk.level === 'high' ? 'critical' : 'high', title: `Promise at risk: ${c.title}`, detail: `To ${g.get(c.toId)?.name ?? c.account ?? '—'} · ${risk.reason}`, refId: c.id });
  }
  for (const r of hub.loopsToClose) {
    items.push({ id: `loop-${r.id}`, area: 'stakeholders', severity: 'low', title: `Close the loop with ${g.get(r.requesterId)?.name ?? 'the requester'}`, detail: `"${r.title}" shipped with ${g.get(r.betId)?.title}`, refId: r.id });
  }
  for (const i of hub.overdueComms) {
    const due = commsDue(i, now);
    items.push({ id: `comms-${i.id}`, area: 'stakeholders', severity: 'medium', title: `Comms overdue: ${i.title}`, detail: `${i.frequency} · last sent ${i.lastSent} · ${-(due.dueIn ?? 0)} days late`, refId: i.id });
  }
  for (const c of hub.openConflicts.filter((c) => c.status === 'escalated')) {
    items.push({ id: `conf-${c.id}`, area: 'stakeholders', severity: 'high', title: `Escalated conflict: ${c.title}`, refId: c.id });
  }

  // Signals
  const clusters = clusterEvidence(g.all('evidence'), now);
  for (const c of clusters.filter((c) => (c.trend === 'rising' || c.trend === 'new') && c.recent >= 3).slice(0, 3)) {
    items.push({ id: `sig-${c.id}`, area: 'discover', severity: c.arr > 250_000 || c.people > 500 ? 'high' : 'medium', title: `Rising signal: ${c.label}`, detail: `${c.recent} signals in 30 days (vs ${c.previous}) · ${pluralize(c.accounts.length, 'source')} · ${impactText(c.arr, c.people)}`, href: '/discover/signals' });
  }
  const unlinked = g.all('evidence').filter((e) => !(e.opportunityIds ?? []).length && e.date && daysBetween(e.date, now) <= 14);
  if (unlinked.length >= 3) items.push({ id: 'sig-unlinked', area: 'discover', severity: 'low', title: `${unlinked.length} new signals not linked to an opportunity`, href: '/discover/signals' });

  // Assumptions: risky and untested on committed bets
  for (const a of g.all('assumption')) {
    const bet = g.get(a.betId);
    if (a.status === 'untested' && Number(a.importance) >= 4 && Number(a.evidenceLevel) <= 2 && bet && ['committed', 'in-delivery'].includes(bet.status)) {
      items.push({ id: `asm-${a.id}`, area: 'discover', severity: 'high', title: `Untested leap of faith on a committed bet: ${a.title}`, detail: bet.title, refId: a.id });
    }
  }

  // Define: open critical review findings, revisit decisions
  for (const f of g.all('reviewFinding').filter((f) => f.status === 'open' && f.severity === 'critical')) {
    items.push({ id: `rf-${f.id}`, area: 'define', severity: 'high', title: `Critical review question unanswered: ${f.title}`, detail: g.get(f.specId)?.title, refId: f.specId });
  }
  for (const d of g.all('decision').filter((d) => d.status === 'decided' && d.revisitDate && daysBetween(now, d.revisitDate) <= 0)) {
    items.push({ id: `dec-${d.id}`, area: 'define', severity: 'medium', title: `Decision due for revisit: ${d.title}`, detail: d.revisitTrigger ? `Trigger: ${d.revisitTrigger}` : undefined, refId: d.id });
  }
  for (const cr of g.all('changeRequest').filter((c) => c.status === 'submitted')) {
    items.push({ id: `cr-${cr.id}`, area: 'define', severity: 'medium', title: `Change request awaiting assessment: ${cr.title}`, refId: cr.id });
  }

  // Deliver
  for (const r of g.all('raid').filter((r) => r.status !== 'closed')) {
    const exposure = (Number(r.probability) || 0) * (Number(r.impact) || 0);
    if (r.kind === 'issue' && r.status === 'open') items.push({ id: `raid-${r.id}`, area: 'deliver', severity: Number(r.impact) >= 4 ? 'high' : 'medium', title: `Open issue: ${r.title}`, detail: r.ownerId ? `Owner ${g.get(r.ownerId)?.name}` : 'No owner', refId: r.id });
    else if (r.kind === 'risk' && exposure >= 15) items.push({ id: `raid-${r.id}`, area: 'deliver', severity: exposure >= 20 ? 'high' : 'medium', title: `High-exposure risk: ${r.title}`, detail: `P${r.probability} × I${r.impact} = ${exposure}${r.mitigation ? '' : ' · no mitigation'}`, refId: r.id });
    else if (r.kind === 'dependency' && r.dueDate && daysBetween(now, r.dueDate) <= 7) items.push({ id: `raid-${r.id}`, area: 'deliver', severity: 'medium', title: `Dependency due soon: ${r.title}`, detail: `${r.externalTeam ?? ''} · ${r.dueDate}`, refId: r.id });
  }
  for (const rel of g.all('release').filter((r) => !['released', 'rolled-back'].includes(r.status) && r.targetDate && daysBetween(now, r.targetDate) <= 14)) {
    const list = (rel.checklist ?? []) as { done: boolean }[];
    const open = list.filter((c) => !c.done).length;
    if (open) items.push({ id: `rel-${rel.id}`, area: 'deliver', severity: daysBetween(now, rel.targetDate) <= 5 ? 'high' : 'medium', title: `${rel.title}: ${open} launch-readiness items open`, detail: `Target ${rel.targetDate}`, refId: rel.id });
  }
  const failing = g.all('testCase').filter((t) => t.status === 'fail' && t.kind === 'uat');
  if (failing.length) items.push({ id: 'uat-fail', area: 'deliver', severity: 'high', title: `${pluralize(failing.length, 'UAT test')} failing`, detail: failing.slice(0, 3).map((t) => t.title).join(' · '), href: '/deliver/uat' });
  const hygiene = backlogHygiene(g.all('story'), now);
  if (hygiene.score < 70) items.push({ id: 'hyg', area: 'deliver', severity: 'low', title: `Backlog health ${hygiene.score}/100`, detail: `${hygiene.duplicates.length} duplicates · ${hygiene.stale.length} stale · ${hygiene.orphans.length} orphans · ${hygiene.noAcceptance.length} without AC`, href: '/deliver/backlog' });

  // Learn
  for (const b of g.all('bet').filter((b) => b.status === 'shipped' && b.checkDate && daysBetween(now, b.checkDate) <= 7)) {
    const late = daysBetween(now, b.checkDate) < 0;
    items.push({ id: `bet-${b.id}`, area: 'learn', severity: late ? 'medium' : 'low', title: `${late ? 'Overdue' : 'Due'}: measure "${b.title}"`, detail: `Predicted ${b.predictedChange ?? '—'} · check date ${b.checkDate}`, refId: b.id });
  }
  for (const f of g.all('feature').filter((f) => f.status === 'ga' && Number(f.adoption) < 5 && f.maintenanceCost !== 'low' && f.launchedAt && daysBetween(f.launchedAt, now) > 90)) {
    items.push({ id: `feat-${f.id}`, area: 'learn', severity: 'low', title: `Removal candidate: ${f.name}`, detail: `${f.adoption}% adoption · ${f.maintenanceCost} maintenance cost`, refId: f.id });
  }

  // Strategy
  for (const kr of g.all('keyResult')) {
    if (Number(kr.confidence) < 40) items.push({ id: `kr-${kr.id}`, area: 'strategy', severity: 'medium', title: `Key result at risk: ${kr.title}`, detail: `Confidence ${kr.confidence}% · ${kr.current ?? '?'} / ${kr.target ?? '?'} ${kr.unit ?? ''}`, refId: kr.id });
  }

  const order: Record<BriefSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function briefCounts(items: BriefItem[]): Record<BriefSeverity, number> {
  const out: Record<BriefSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of items) out[i.severity]++;
  return out;
}


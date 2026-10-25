import type { Graph } from '../graph.ts';
import { ENGAGEMENT, nameOf, type Entity } from '../schema.ts';
import { daysBetween, mean, fmtMoney, uniq } from '../util.ts';
import { concurrency, forecastScope } from './forecast.ts';

// ---------------- Power / interest ----------------

export type Quadrant = 'manage-closely' | 'keep-satisfied' | 'keep-informed' | 'monitor';

export const QUADRANTS: Record<Quadrant, { label: string; cadence: number; strategy: string }> = {
  'manage-closely': { label: 'Manage closely', cadence: 7, strategy: 'Key player — involve in decisions, frequent 1:1s, no surprises.' },
  'keep-satisfied': { label: 'Keep satisfied', cadence: 21, strategy: 'High power, lower interest — concise updates, consult before decisions that touch their area.' },
  'keep-informed': { label: 'Keep informed', cadence: 14, strategy: 'High interest, lower power — regular updates, use as early feedback and champions.' },
  monitor: { label: 'Monitor', cadence: 45, strategy: 'Light-touch — broadcast updates, watch for changes in power or interest.' },
};

export const isHigh = (v: unknown) => Number(v) > 3;

export function quadrant(s: Entity): Quadrant {
  const p = isHigh(s.power), i = isHigh(s.interest);
  return p && i ? 'manage-closely' : p ? 'keep-satisfied' : i ? 'keep-informed' : 'monitor';
}

export function cadenceDays(s: Entity): number {
  const c = Number(s.cadenceDays);
  return c > 0 ? c : QUADRANTS[quadrant(s)].cadence;
}

// ---------------- Salience (Mitchell, Agle & Wood) ----------------

export const SALIENCE: Record<string, { label: string; description: string }> = {
  definitive: { label: 'Definitive', description: 'Power, legitimacy and urgency — highest priority.' },
  dominant: { label: 'Dominant', description: 'Power and legitimacy — formal influence; keep engaged.' },
  dangerous: { label: 'Dangerous', description: 'Power and urgency without legitimacy — may act coercively; manage carefully.' },
  dependent: { label: 'Dependent', description: 'Legitimacy and urgency but no power — rely on others to advocate for them.' },
  dormant: { label: 'Dormant', description: 'Power only — little interaction now, but can become definitive.' },
  discretionary: { label: 'Discretionary', description: 'Legitimacy only — no pressure; engage as goodwill.' },
  demanding: { label: 'Demanding', description: 'Urgency only — loud but without power or legitimacy.' },
  none: { label: 'Non-stakeholder', description: 'No power, legitimacy or urgency.' },
};

export function salience(s: Entity): keyof typeof SALIENCE {
  const p = Number(s.power) >= 4, l = !!s.legitimacy, u = !!s.urgency;
  if (p && l && u) return 'definitive';
  if (p && l) return 'dominant';
  if (p && u) return 'dangerous';
  if (l && u) return 'dependent';
  if (p) return 'dormant';
  if (l) return 'discretionary';
  if (u) return 'demanding';
  return 'none';
}

// ---------------- Engagement ----------------

export function engagementIndex(level: string | undefined): number {
  const i = ENGAGEMENT.indexOf((level ?? 'neutral') as (typeof ENGAGEMENT)[number]);
  return i < 0 ? 2 : i;
}

const ENGAGEMENT_MOVES: Record<string, string> = {
  'unaware>': 'Introduce the initiative: a one-page brief and a 20-minute intro focused on their goals.',
  'resistant>': 'Hold a 1:1 to understand their concerns; separate their position from their interests; involve them in one decision.',
  'neutral>': 'Show what is in it for them: tie the outcome to their KPI; invite them to the next demo.',
  'supportive>': 'Give them a role: champion, co-presenter at steering, or reviewer of the next spec.',
};

export function engagementGap(s: Entity): { current: string; desired: string; gap: number; action?: string } {
  const current = s.currentEngagement ?? 'neutral';
  const desired = s.desiredEngagement ?? 'supportive';
  const gap = engagementIndex(desired) - engagementIndex(current);
  return { current, desired, gap, action: gap > 0 ? ENGAGEMENT_MOVES[`${current}>`] : undefined };
}

// ---------------- Touchpoints & sentiment ----------------

export function interactionsWith(s: Entity, interactions: Entity[]): Entity[] {
  return interactions
    .filter((i) => (i.stakeholderIds ?? []).includes(s.id))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export type TouchStatus = 'ok' | 'due-soon' | 'overdue' | 'never';

export interface Touch {
  cadence: number;
  lastDate?: string;
  daysSince?: number;
  /** Days until the next touchpoint is due (negative = overdue). */
  dueIn?: number;
  status: TouchStatus;
}

export function touchStatus(s: Entity, interactions: Entity[], now: Date): Touch {
  const cadence = cadenceDays(s);
  const past = interactionsWith(s, interactions).filter((i) => daysBetween(i.date, now) >= 0);
  const last = past[past.length - 1];
  if (!last) return { cadence, status: 'never' };
  const daysSince = daysBetween(last.date, now);
  const dueIn = cadence - daysSince;
  return { cadence, lastDate: last.date, daysSince, dueIn, status: dueIn < 0 ? 'overdue' : dueIn <= 2 ? 'due-soon' : 'ok' };
}

export interface SentimentTrend {
  points: { date: string; sentiment: number; id: string }[];
  average: number | null;
  recent: number | null;
  label: 'warming' | 'stable' | 'cooling' | 'unknown';
  slope: number;
}

export function sentimentTrend(s: Entity, interactions: Entity[]): SentimentTrend {
  const points = interactionsWith(s, interactions)
    .filter((i) => typeof i.sentiment === 'number')
    .map((i) => ({ date: i.date as string, sentiment: i.sentiment as number, id: i.id }));
  if (points.length < 2) return { points, average: points[0]?.sentiment ?? null, recent: points[0]?.sentiment ?? null, label: 'unknown', slope: 0 };
  const xs = points.map((_, i) => i), ys = points.map((p) => p.sentiment);
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den ? num / den : 0;
  const recent = mean(ys.slice(-2));
  const earlier = mean(ys.slice(0, -2).length ? ys.slice(0, -2) : ys.slice(0, 1));
  const label = slope <= -0.25 || recent - earlier <= -1 ? 'cooling' : slope >= 0.25 || recent - earlier >= 1 ? 'warming' : 'stable';
  return { points, average: my, recent, label, slope };
}

// ---------------- Influence network ----------------

export interface Influence { id: string; influences: Entity[]; influencedBy: Entity[]; score: number }

/** Influence score = power-weighted reach of the people someone influences (2 hops, damped). */
export function influenceNetwork(stakeholders: Entity[]): Map<string, Influence> {
  const byId = new Map(stakeholders.map((s) => [s.id, s]));
  const out = new Map<string, Influence>();
  for (const s of stakeholders) out.set(s.id, { id: s.id, influences: [], influencedBy: [], score: 0 });
  for (const s of stakeholders) {
    for (const by of (s.influencedBy ?? []) as string[]) {
      const src = byId.get(by);
      if (!src) continue;
      out.get(by)!.influences.push(s);
      out.get(s.id)!.influencedBy.push(src);
    }
  }
  for (const inf of out.values()) {
    let score = 0;
    for (const t of inf.influences) {
      score += Number(t.power) || 1;
      for (const t2 of out.get(t.id)?.influences ?? []) if (t2.id !== inf.id) score += 0.5 * (Number(t2.power) || 1);
    }
    inf.score = score;
  }
  return out;
}

/** Who should I talk to first to move a resistant, powerful stakeholder? */
export function pathToInfluence(target: Entity, net: Map<string, Influence>, stakeholders: Entity[]): Entity[] {
  const inf = net.get(target.id);
  if (!inf) return [];
  return [...inf.influencedBy].sort((a, b) => engagementIndex(b.currentEngagement) - engagementIndex(a.currentEngagement) || (Number(b.power) || 0) - (Number(a.power) || 0))
    .filter((x) => stakeholders.includes(x));
}

// ---------------- RACI ----------------

export type RaciRole = 'R' | 'A' | 'C' | 'I';

export interface RaciIssue { severity: 'error' | 'warning' | 'info'; message: string; activity?: string; memberId?: string }

/** Validate a RACI matrix: one A per activity, at least one R, consultation overload, idle members. */
export function validateRaci(activities: string[], memberIds: string[], assignments: Record<string, Record<string, RaciRole | ''>>, names: (id: string) => string = (x) => x): RaciIssue[] {
  const issues: RaciIssue[] = [];
  for (const a of activities) {
    const row = assignments[a] ?? {};
    const roles = memberIds.map((m) => row[m]).filter(Boolean);
    const accountable = roles.filter((r) => r === 'A').length;
    if (accountable === 0) issues.push({ severity: 'error', message: `"${a}" has no Accountable person.`, activity: a });
    if (accountable > 1) issues.push({ severity: 'error', message: `"${a}" has ${accountable} Accountable people — there must be exactly one.`, activity: a });
    if (!roles.includes('R') && !roles.includes('A')) issues.push({ severity: 'warning', message: `"${a}" has nobody Responsible for doing the work.`, activity: a });
    if (!roles.includes('I') && !roles.includes('C')) issues.push({ severity: 'info', message: `Nobody is consulted or informed about "${a}".`, activity: a });
    const consulted = roles.filter((r) => r === 'C').length;
    if (consulted >= 5) issues.push({ severity: 'warning', message: `"${a}" consults ${consulted} people — decisions will be slow.`, activity: a });
  }
  for (const m of memberIds) {
    const roles = activities.map((a) => assignments[a]?.[m]).filter(Boolean);
    if (!roles.length) issues.push({ severity: 'info', message: `${names(m)} has no role — remove from the matrix?`, memberId: m });
    const c = roles.filter((r) => r === 'C').length;
    if (activities.length >= 3 && c / activities.length > 0.6) issues.push({ severity: 'warning', message: `${names(m)} is consulted on ${c} of ${activities.length} activities — consultation overload.`, memberId: m });
    const aCount = roles.filter((r) => r === 'A').length;
    if (activities.length >= 4 && aCount / activities.length > 0.75) issues.push({ severity: 'info', message: `${names(m)} is accountable for almost everything — delegate?`, memberId: m });
  }
  return issues;
}

/** Map stakeholder id → roles across all RACI matrices. */
export function raciRolesOf(stakeholderId: string, matrices: Entity[]): { raci: Entity; activity: string; role: RaciRole }[] {
  const out: { raci: Entity; activity: string; role: RaciRole }[] = [];
  for (const m of matrices) {
    for (const a of (m.activities ?? []) as string[]) {
      const role = m.assignments?.[a]?.[stakeholderId];
      if (role) out.push({ raci: m, activity: a, role });
    }
  }
  return out;
}

// ---------------- Approvals ----------------

export interface Approver { stakeholderId: string; status: 'pending' | 'approved' | 'rejected' | 'changes-requested'; comment?: string; at?: string }

export function approvalStatus(approvers: Approver[]): 'pending' | 'approved' | 'rejected' | 'changes-requested' {
  if (!approvers.length) return 'pending';
  if (approvers.some((a) => a.status === 'rejected')) return 'rejected';
  if (approvers.some((a) => a.status === 'changes-requested')) return 'changes-requested';
  if (approvers.every((a) => a.status === 'approved')) return 'approved';
  return 'pending';
}

export function pendingApprovalsFor(stakeholderId: string, approvals: Entity[]): Entity[] {
  return approvals.filter((a) => a.status === 'pending' && ((a.approvers ?? []) as Approver[]).some((x) => x.stakeholderId === stakeholderId && x.status === 'pending'));
}

// ---------------- Commitments ----------------

export interface CommitmentRisk { level: 'kept' | 'broken' | 'low' | 'medium' | 'high' | 'unknown'; probability?: number; forecastDate?: string; reason: string }

/** Check a promise against delivery: shipped? forecast probability by the promised date? */
export function commitmentRisk(c: Entity, g: Graph, now: Date): CommitmentRisk {
  if (c.status === 'kept') return { level: 'kept', reason: 'Marked as kept.' };
  if (c.status === 'broken') return { level: 'broken', reason: 'Marked as broken.' };
  const bet = g.get(c.betId);
  const release = g.get(c.releaseId);
  if (release?.status === 'released' || bet?.status === 'shipped' || bet?.status === 'measured') {
    return { level: 'low', probability: 1, reason: 'Delivered — confirm with the stakeholder and mark as kept.' };
  }
  if (!c.dueDate) return { level: 'unknown', reason: 'No promised date.' };
  const daysLeft = daysBetween(now, c.dueDate);
  const scope = bet ?? release;
  if (!scope) return { level: daysLeft < 0 ? 'high' : 'unknown', reason: daysLeft < 0 ? 'Past the promised date and not linked to delivery.' : 'Not linked to a bet or release — cannot forecast.' };
  const fc = forecastScope(g.all('story'), scope, now, { targetDate: c.dueDate, concurrent: bet ? concurrency(g.all('bet'), bet) : 1 });
  if (!fc) return { level: 'unknown', reason: 'No throughput history to forecast from.' };
  const p = fc.probabilityBy ?? 0;
  const level = daysLeft < 0 ? 'high' : p < 0.5 ? 'high' : p < 0.8 ? 'medium' : 'low';
  return { level, probability: p, forecastDate: fc.dates.p85, reason: `${Math.round(p * 100)}% chance by ${c.dueDate}; 85% confidence date ${fc.dates.p85}.` };
}

// ---------------- 360° profile ----------------

export interface Profile360 {
  stakeholder: Entity;
  quadrant: Quadrant;
  salience: keyof typeof SALIENCE;
  touch: Touch;
  sentiment: SentimentTrend;
  engagement: ReturnType<typeof engagementGap>;
  interactions: Entity[];
  requests: Entity[];
  openRequests: Entity[];
  commitments: { c: Entity; risk: CommitmentRisk }[];
  pendingApprovals: Entity[];
  decisions: Entity[];
  conflicts: Entity[];
  raci: { raci: Entity; activity: string; role: RaciRole }[];
  evidence: Entity[];
  meetings: Entity[];
  influences: Entity[];
  influencedBy: Entity[];
  owns: Entity[];
}

export function profile360(s: Entity, g: Graph, now: Date): Profile360 {
  const interactions = g.all('interaction');
  const net = influenceNetwork(g.all('stakeholder'));
  const requests = g.referencing(s.id, 'request', 'requesterId');
  const commitments = g.referencing(s.id, 'commitment', 'toId').map((c) => ({ c, risk: commitmentRisk(c, g, now) }));
  const decisions = uniq([...g.referencing(s.id, 'decision', 'deciderIds'), ...g.referencing(s.id, 'decision', 'consultedIds')]).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const owns = g.linksTo(s.id).filter((l) => l.field.key === 'ownerId').map((l) => l.from);
  return {
    stakeholder: s,
    quadrant: quadrant(s),
    salience: salience(s),
    touch: touchStatus(s, interactions, now),
    sentiment: sentimentTrend(s, interactions),
    engagement: engagementGap(s),
    interactions: interactionsWith(s, interactions).reverse(),
    requests,
    openRequests: requests.filter((r) => !['done', 'declined'].includes(r.status)),
    commitments,
    pendingApprovals: pendingApprovalsFor(s.id, g.all('approval')),
    decisions,
    conflicts: g.referencing(s.id, 'conflict', 'partyIds').filter((c) => c.status !== 'resolved'),
    raci: raciRolesOf(s.id, g.all('raci')),
    evidence: g.referencing(s.id, 'evidence', 'relayedById'),
    meetings: g.referencing(s.id, 'meeting', 'attendeeIds'),
    influences: net.get(s.id)?.influences ?? [],
    influencedBy: net.get(s.id)?.influencedBy ?? [],
    owns,
  };
}

// ---------------- Meeting prep ----------------

export interface PrepBrief {
  stakeholder: Entity;
  headline: string;
  caresAbout: string[];
  concerns: string[];
  talkingPoints: { text: string; kind: 'close-loop' | 'approval' | 'commitment' | 'concern' | 'engagement' | 'request' | 'decision' | 'conflict' | 'relationship'; refId?: string }[];
  sinceLastTime: Entity[];
  profile: Profile360;
}

const lines = (s: unknown) => String(s ?? '').split(/\n|;/).map((x) => x.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);

/** Everything you need before you meet someone, plus suggested talking points. */
export function prepBrief(s: Entity, g: Graph, now: Date): PrepBrief {
  const p = profile360(s, g, now);
  const points: PrepBrief['talkingPoints'] = [];
  const last = p.touch.lastDate;

  for (const r of p.requests) {
    const bet = g.get(r.betId);
    if (bet && ['shipped', 'measured'].includes(bet.status) && !r.loopClosed) {
      points.push({ kind: 'close-loop', refId: r.id, text: `Close the loop: their request "${r.title}" shipped with "${bet.title}".` });
    }
  }
  for (const a of p.pendingApprovals) {
    const due = a.dueDate ? ` (due ${a.dueDate}${daysBetween(now, a.dueDate) < 0 ? ', overdue' : ''})` : '';
    points.push({ kind: 'approval', refId: a.id, text: `Ask for sign-off: "${a.title}"${due}.` });
  }
  for (const { c, risk } of p.commitments) {
    if (risk.level === 'high' || risk.level === 'medium') points.push({ kind: 'commitment', refId: c.id, text: `Reset expectations on "${c.title}" — ${risk.reason}` });
  }
  for (const r of p.openRequests) {
    const overdue = r.respondBy && daysBetween(now, r.respondBy) < 0;
    if (r.status === 'new' || r.status === 'triaging' || overdue) points.push({ kind: 'request', refId: r.id, text: `Respond to their request "${r.title}"${overdue ? ' — response is overdue' : ''}.` });
  }
  for (const c of p.conflicts) points.push({ kind: 'conflict', refId: c.id, text: `Open conflict: "${c.title}" (${c.status}). Explore interests, not positions.` });
  if (p.engagement.action) points.push({ kind: 'engagement', text: `Engagement ${p.engagement.current} → ${p.engagement.desired}: ${p.engagement.action}` });
  for (const concern of lines(s.concerns).slice(0, 2)) points.push({ kind: 'concern', text: `Address their concern: ${concern}` });
  if (p.sentiment.label === 'cooling') points.push({ kind: 'relationship', text: 'Sentiment is cooling over recent interactions — start by asking how things are going for them.' });

  // Decisions since the last interaction that involve them or their bets.
  const theirBets = new Set<string>([...p.requests.map((r) => r.betId), ...p.commitments.map((x) => x.c.betId)].filter(Boolean));
  for (const r of p.raci) if (r.raci.scopeId) theirBets.add(r.raci.scopeId);
  const sinceLastTime = g.all('decision').filter((d) => {
    if (last && d.date && d.date <= last) return false;
    if (!d.date || daysBetween(d.date, now) < 0) return false;
    const involved = (d.deciderIds ?? []).includes(s.id) || (d.consultedIds ?? []).includes(s.id);
    const touchesTheirBet = (d.relatedIds ?? []).some((id: string) => theirBets.has(id));
    return involved || touchesTheirBet;
  });
  for (const d of sinceLastTime) {
    if (!(d.consultedIds ?? []).includes(s.id) && !(d.deciderIds ?? []).includes(s.id)) {
      points.push({ kind: 'decision', refId: d.id, text: `Share decision "${d.title}" made since you last spoke — they were not consulted.` });
    }
  }

  const q = QUADRANTS[p.quadrant].label;
  const headline = `${s.name} · ${s.title ?? ''} — ${q}, ${SALIENCE[p.salience].label.toLowerCase()} stakeholder; ${p.engagement.current}${p.engagement.gap > 0 ? ` (want ${p.engagement.desired})` : ''}; ${p.touch.status === 'never' ? 'no interactions logged' : `last spoke ${p.touch.daysSince} days ago`}.`;
  return { stakeholder: s, headline, caresAbout: lines(s.goals), concerns: lines(s.concerns), talkingPoints: points, sinceLastTime, profile: p };
}

// ---------------- Alignment check ----------------

export interface AlignmentGap { stakeholder: Entity; reason: string; severity: 'high' | 'medium' | 'low' }

/**
 * Before deciding on / shipping `subject`: who should have been involved but
 * wasn't, who is resistant, and which key players are out of touch.
 */
export function alignmentCheck(subject: Entity, g: Graph, now: Date): AlignmentGap[] {
  const involved = new Set<string>([...(subject.deciderIds ?? []), ...(subject.consultedIds ?? []), subject.ownerId].filter(Boolean));
  const relatedIds = new Set<string>([subject.id, ...(subject.relatedIds ?? []), subject.betId, subject.scopeId].filter(Boolean));
  // Bets linked to related specs etc.
  for (const id of [...relatedIds]) {
    const e = g.get(id);
    if (e?.betId) relatedIds.add(e.betId);
  }
  const gaps: AlignmentGap[] = [];
  const seen = new Set<string>();
  const add = (s: Entity | undefined, reason: string, severity: AlignmentGap['severity']) => {
    if (!s || seen.has(s.id)) return;
    seen.add(s.id);
    gaps.push({ stakeholder: s, reason, severity });
  };
  for (const m of g.all('raci')) {
    if (!relatedIds.has(m.scopeId)) continue;
    for (const a of (m.activities ?? []) as string[]) {
      for (const [sid, role] of Object.entries((m.assignments?.[a] ?? {}) as Record<string, string>)) {
        if ((role === 'A' || role === 'C') && !involved.has(sid)) add(g.get(sid), `${role === 'A' ? 'Accountable' : 'Consulted'} for "${a}" in ${m.title} but not involved.`, role === 'A' ? 'high' : 'medium');
      }
    }
  }
  for (const r of g.all('request')) {
    if (r.betId && relatedIds.has(r.betId) && r.requesterId && !involved.has(r.requesterId)) add(g.get(r.requesterId), `Requested "${r.title}" — affected by this.`, 'low');
  }
  for (const c of g.all('commitment')) {
    if ((c.betId && relatedIds.has(c.betId)) && c.toId && !involved.has(c.toId)) add(g.get(c.toId), `Was promised "${c.title}" by ${c.dueDate ?? 'an open date'}.`, 'medium');
  }
  const interactions = g.all('interaction');
  for (const s of g.all('stakeholder')) {
    if (s.isMe) continue;
    if (quadrant(s) === 'manage-closely' && !involved.has(s.id)) {
      const t = touchStatus(s, interactions, now);
      if (t.status === 'overdue' || t.status === 'never') add(s, `Key player, and you are ${t.status === 'never' ? 'not in touch' : `${-t.dueIn!} days overdue for a touchpoint`}.`, 'medium');
    }
  }
  for (const gap of gaps) {
    if (gap.stakeholder.currentEngagement === 'resistant') { gap.severity = 'high'; gap.reason += ' Currently resistant.'; }
  }
  const order = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------- Tailored updates ----------------

export type Audience = 'exec' | 'sales' | 'support' | 'engineering' | 'customer';
export const AUDIENCES: Record<Audience, string> = { exec: 'Executives', sales: 'Sales & CS', support: 'Support', engineering: 'Engineering', customer: 'Customers' };

export function sectionOf(markdown: string | undefined, heading: RegExp): string[] {
  if (!markdown) return [];
  const out: string[] = [];
  let on = false;
  for (const line of markdown.split('\n')) {
    const h = /^#{1,4}\s+(.+)$/.exec(line);
    if (h) { on = heading.test(h[1]); continue; }
    if (on) {
      const b = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
      if (b) out.push(b[1].trim());
    }
  }
  return out;
}

/** Render one bet or release for a specific audience (markdown). */
export function tailoredUpdate(subject: Entity, audience: Audience, g: Graph, now: Date): string {
  const bets = subject.type === 'release' ? g.resolve(subject, 'betIds') : [subject];
  const bet = bets[0];
  const specs = bets.flatMap((b) => g.referencing(b.id, 'spec', 'betId'));
  const nonGoals = specs.flatMap((s) => sectionOf(s.body, /non-goal|out of scope/i));
  const stories = g.all('story').filter((s) => bets.some((b) => b.id === s.betId) || s.releaseId === subject.id);
  const done = stories.filter((s) => s.status === 'done').length;
  const fc = forecastScope(g.all('story'), subject, now, subject.type === 'bet' ? { concurrent: concurrency(g.all('bet'), subject) } : {});
  const when = subject.status === 'released' || subject.status === 'shipped' ? `Live since ${subject.releasedAt ?? 'recently'}` : subject.targetDate ? `Target ${subject.targetDate}${fc ? ` · forecast ${fc.dates.p50}–${fc.dates.p85} (50–85%)` : ''}` : fc ? `Forecast ${fc.dates.p50}–${fc.dates.p85} (50–85% confidence)` : 'Date not yet forecastable';
  const raid = g.all('raid').filter((r) => r.status !== 'closed' && (r.relatedIds ?? []).some((id: string) => id === subject.id || bets.some((b) => b.id === id)));
  const decisions = g.all('decision').filter((d) => (d.relatedIds ?? []).some((id: string) => id === subject.id || bets.some((b) => b.id === id)));
  const approvals = g.all('approval').filter((a) => a.status === 'pending' && (a.subjectId === subject.id || bets.some((b) => b.id === a.subjectId) || specs.some((s) => s.id === a.subjectId)));
  const requests = g.all('request').filter((r) => bets.some((b) => b.id === r.betId));
  const commitments = g.all('commitment').filter((c) => bets.some((b) => b.id === c.betId) || c.releaseId === subject.id);
  const accounts = uniq([...commitments.map((c) => c.account), ...bets.flatMap((b) => g.all('evidence').filter((e) => (e.opportunityIds ?? []).some((o: string) => (b.opportunityIds ?? []).includes(o))).map((e) => e.account))].filter(Boolean));
  const evidence = bets.flatMap((b) => g.all('evidence').filter((e) => (e.opportunityIds ?? []).some((o: string) => (b.opportunityIds ?? []).includes(o))));
  const arr = sumArr(evidence);
  const findings = specs.flatMap((s) => g.referencing(s.id, 'reviewFinding', 'specId'));
  const metric = g.get(bet?.metricId);
  const title = nameOf(subject);
  const L: string[] = [];

  switch (audience) {
    case 'exec':
      L.push(`## ${title} — executive update`, '');
      L.push(`**Outcome:** ${bet?.hypothesis ?? bet?.title ?? '—'}`);
      if (metric) L.push(`**Metric:** ${metric.name}${bet?.predictedChange ? ` — predicted ${bet.predictedChange}` : ''}`);
      L.push(`**Status:** ${subject.status} · ${done}/${stories.length} stories done · ${when}`);
      if (arr) L.push(`**Revenue context:** ${accounts.length} accounts / ${fmtMoney(arr)} ARR raised this problem.`);
      L.push('', '**Top risks**');
      L.push(...(raid.length ? raid.slice(0, 3).map((r) => `- ${r.title} (P${r.probability}×I${r.impact}) — ${r.mitigation ?? 'no mitigation yet'}`) : ['- None open.']));
      L.push('', '**Decisions / approvals needed from you**');
      L.push(...(approvals.length ? approvals.map((a) => `- ${a.title}${a.dueDate ? ` (by ${a.dueDate})` : ''}`) : ['- None right now.']));
      break;
    case 'sales':
      L.push(`## ${title} — for Sales & Customer Success`, '');
      L.push(`**What it is:** ${bet?.title ?? title}`);
      if (bet?.hypothesis) L.push(`**Why customers care:** ${bet.hypothesis}`);
      L.push(`**When:** ${when}. Please do not promise a date earlier than the 85% forecast.`);
      if (accounts.length) L.push(`**Accounts waiting for this:** ${accounts.join(', ')}`);
      if (commitments.length) L.push('', '**Promises already made**', ...commitments.map((c) => `- ${c.title} → ${nameOf(g.get(c.toId))} by ${c.dueDate ?? '—'} (${c.status})`));
      L.push('', '**What it does not do (yet)**', ...(nonGoals.length ? nonGoals.map((n) => `- ${n}`) : ['- Scope still being finalised.']));
      break;
    case 'support':
      L.push(`## ${title} — support briefing`, '');
      L.push(`**What changes for customers:** ${bet?.title ?? title}`);
      L.push(`**When:** ${when}`);
      L.push('', '**Known limitations**', ...(nonGoals.length ? nonGoals.map((n) => `- ${n}`) : ['- None documented yet.']));
      L.push('', '**Questions customers will likely ask**', ...(findings.filter((f) => f.role === 'support' || f.role === 'qa').slice(0, 5).map((f) => `- ${f.title}${f.resolution ? ` — ${f.resolution}` : ''}`)));
      if (requests.length) L.push('', `**Tickets/requests to update when live:** ${requests.length}`);
      break;
    case 'engineering':
      L.push(`## ${title} — engineering sync`, '');
      L.push(`**Scope:** ${stories.length} stories, ${stories.length - done} remaining · ${when}`);
      L.push('', '**Decisions**', ...(decisions.length ? decisions.map((d) => `- ${d.key ?? ''} ${d.title}${d.chosen ? ` → ${d.chosen}` : ''} (${d.reversibility ?? ''})`) : ['- None logged.']));
      L.push('', '**Open review findings**', ...(findings.filter((f) => f.status === 'open').slice(0, 6).map((f) => `- [${f.role}] ${f.title}`)));
      L.push('', '**Dependencies & risks**', ...(raid.length ? raid.map((r) => `- ${r.kind}: ${r.title}${r.externalTeam ? ` (${r.externalTeam})` : ''}`) : ['- None open.']));
      break;
    case 'customer':
      L.push(`## ${bet?.title ?? title}`, '');
      L.push(bet?.hypothesis ? benefitLine(bet.hypothesis) : `${title} is ${subject.status === 'released' ? 'now available' : 'coming soon'}.`);
      L.push('', `**Availability:** ${subject.status === 'released' ? `available now${subject.version ? ` (v${subject.version})` : ''}` : 'coming soon'}.`);
      L.push('', 'Thank you to everyone who asked for this — your feedback shaped it.');
      break;
  }
  return L.join('\n');
}

function benefitLine(h: string): string {
  // "We believe X for Y will Z" → "X helps Y Z."
  const m = /we believe (.+?) for (.+?) will (.+?)(?:, measured by.*)?\.?$/i.exec(h.trim());
  if (!m) return h;
  return `${capitalize(m[1])} helps ${m[2]} ${m[3]}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sumArr(evidence: Entity[]): number {
  const byAccount = new Map<string, number>();
  for (const e of evidence) if (e.account) byAccount.set(e.account, Math.max(byAccount.get(e.account) ?? 0, Number(e.arr) || 0));
  let t = 0;
  for (const v of byAccount.values()) t += v;
  return t;
}

// ---------------- Hub summary ----------------

export interface HubSummary {
  overdue: { s: Entity; touch: Touch }[];
  cooling: { s: Entity; trend: SentimentTrend }[];
  gaps: { s: Entity; gap: ReturnType<typeof engagementGap> }[];
  pendingApprovals: Entity[];
  overdueRequests: Entity[];
  riskyCommitments: { c: Entity; risk: CommitmentRisk }[];
  openConflicts: Entity[];
  loopsToClose: Entity[];
}

export function hubSummary(g: Graph, now: Date): HubSummary {
  const interactions = g.all('interaction');
  const people = g.all('stakeholder').filter((s) => !s.isMe);
  const overdue = people.map((s) => ({ s, touch: touchStatus(s, interactions, now) }))
    .filter((x) => x.touch.status === 'overdue' || (x.touch.status === 'never' && quadrant(x.s) !== 'monitor'))
    .sort((a, b) => (a.touch.dueIn ?? -999) - (b.touch.dueIn ?? -999));
  const cooling = people.map((s) => ({ s, trend: sentimentTrend(s, interactions) })).filter((x) => x.trend.label === 'cooling');
  const gaps = people.map((s) => ({ s, gap: engagementGap(s) })).filter((x) => x.gap.gap > 0).sort((a, b) => b.gap.gap - a.gap.gap || (Number(b.s.power) || 0) - (Number(a.s.power) || 0));
  const pendingApprovals = g.all('approval').filter((a) => a.status === 'pending');
  const overdueRequests = g.all('request').filter((r) => ['new', 'triaging'].includes(r.status) && r.respondBy && daysBetween(now, r.respondBy) < 0);
  const riskyCommitments = g.all('commitment').filter((c) => c.status === 'open').map((c) => ({ c, risk: commitmentRisk(c, g, now) })).filter((x) => x.risk.level === 'high' || x.risk.level === 'medium');
  const openConflicts = g.all('conflict').filter((c) => c.status !== 'resolved');
  const loopsToClose = g.all('request').filter((r) => !r.loopClosed && ['shipped', 'measured'].includes(g.get(r.betId)?.status));
  return { overdue, cooling, gaps, pendingApprovals, overdueRequests, riskyCommitments, openConflicts, loopsToClose };
}


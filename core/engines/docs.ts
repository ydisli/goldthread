import type { Graph } from '../graph.ts';
import { nameOf, type Entity } from '../schema.ts';
import { fmtMoney, impactText, isoDate } from '../util.ts';
import { clusterEvidence, evidenceStrength } from './clustering.ts';
import { evaluateBusinessCase } from './finance.ts';
import { concurrency, forecastScope } from './forecast.ts';
import { commitmentRisk, sectionOf, tailoredUpdate, type Audience } from './stakeholders.ts';

export type DocKind = 'prd' | 'brd' | 'prfaq' | 'steering' | 'release-notes' | 'stakeholder-update';

export const DOC_KINDS: Record<DocKind, { label: string; description: string; subject: string[] }> = {
  prd: { label: 'PRD', description: 'Product requirements document from a spec, its bet, evidence, requirements and decisions.', subject: ['spec'] },
  brd: { label: 'BRD', description: 'Business requirements document: objectives, stakeholders, current/future state, requirements, business case.', subject: ['bet'] },
  prfaq: { label: 'PR/FAQ', description: 'Working-backwards press release and FAQ for a bet.', subject: ['bet'] },
  steering: { label: 'Steering pack', description: 'OKRs, roadmap, promises at risk, top risks, decisions and approvals needed.', subject: [] },
  'release-notes': { label: 'Release notes', description: 'Customer-facing notes for a release.', subject: ['release'] },
  'stakeholder-update': { label: 'Stakeholder update', description: 'One bet or release rendered for a specific audience.', subject: ['bet', 'release'] },
};

const table = (head: string[], rows: (string | number | undefined)[][]) =>
  rows.length ? [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '–').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`)].join('\n') : '_None._';

function evidenceFor(g: Graph, bet: Entity | undefined): Entity[] {
  if (!bet) return [];
  const opps = new Set<string>(bet.opportunityIds ?? []);
  return g.all('evidence').filter((e) => (e.opportunityIds ?? []).some((o: string) => opps.has(o)));
}

export function generateDoc(kind: DocKind, g: Graph, subjectId: string | undefined, now: Date, opts: { audience?: Audience } = {}): string {
  const subject = g.get(subjectId);
  switch (kind) {
    case 'prd': return subject ? prd(g, subject, now) : '_Pick a spec._';
    case 'brd': return subject ? brd(g, subject, now) : '_Pick a bet._';
    case 'prfaq': return subject ? prfaq(g, subject) : '_Pick a bet._';
    case 'steering': return steering(g, now);
    case 'release-notes': return subject ? tailoredUpdate(subject, 'customer', g, now) : '_Pick a release._';
    case 'stakeholder-update': return subject ? tailoredUpdate(subject, opts.audience ?? 'exec', g, now) : '_Pick a bet or release._';
  }
}

function prd(g: Graph, spec: Entity, now: Date): string {
  const bet = g.get(spec.betId);
  const ev = evidenceFor(g, bet);
  const strength = evidenceStrength(ev, now);
  const reqs = g.referencing(spec.id, 'requirement', 'specId');
  const decisions = g.all('decision').filter((d) => (d.relatedIds ?? []).includes(spec.id) || (bet && (d.relatedIds ?? []).includes(bet.id)));
  const findings = g.referencing(spec.id, 'reviewFinding', 'specId');
  const approvals = g.all('approval').filter((a) => a.subjectId === spec.id);
  const L = [
    `# ${spec.title}`,
    `_Status: ${spec.status} · Owner: ${nameOf(g.get(spec.ownerId))} · Generated ${isoDate(now)} by Goldthread_`, '',
  ];
  if (bet) {
    L.push('## Bet', `**${bet.title}**: ${bet.hypothesis ?? ''}`, '');
    L.push(`- Success metric: ${nameOf(g.get(bet.metricId))}${bet.predictedChange ? ` (predicted ${bet.predictedChange})` : ''}`);
    L.push(`- Confidence: ${bet.confidence ?? '–'}% · Measure on ${bet.checkDate ?? '–'}`, '');
  }
  L.push('## Evidence', `${strength.count} signals from ${strength.accounts} sources (${impactText(strength.arr, strength.people)}): evidence strength **${strength.score}/100 (${strength.verdict})**.`, '');
  for (const e of ev.slice(0, 5)) L.push(`> "${e.title}": ${e.account ?? e.source}${e.segment ? `, ${e.segment}` : ''}`, '');
  L.push(spec.body ?? '', '');
  L.push('## Managed requirements', table(['Key', 'Requirement', 'Priority', 'Status'], reqs.map((r) => [r.key, r.statement ?? r.title, r.priority, r.status])), '');
  L.push('## Decisions', table(['Key', 'Decision', 'Chosen', 'Reversibility', 'Date'], decisions.map((d) => [d.key, d.title, d.chosen, d.reversibility, d.date])), '');
  const open = findings.filter((f) => f.status === 'open');
  L.push('## Open review questions', open.length ? open.map((f) => `- **[${f.role}]** ${f.title}`).join('\n') : '_None: all review questions resolved._', '');
  L.push('## Approvals', table(['Approval', 'Approver', 'Status', 'Comment'], approvals.flatMap((a) => (a.approvers ?? []).map((x: any) => [a.title, nameOf(g.get(x.stakeholderId)), x.status, x.comment]))));
  return L.join('\n');
}

function brd(g: Graph, bet: Entity, now: Date): string {
  const objective = g.get(bet.objectiveId);
  const krs = objective ? g.referencing(objective.id, 'keyResult', 'objectiveId') : [];
  const specs = g.referencing(bet.id, 'spec', 'betId');
  const reqs = g.all('requirement').filter((r) => r.betId === bet.id || specs.some((s) => s.id === r.specId));
  const raci = g.all('raci').filter((r) => r.scopeId === bet.id);
  const people = new Set<string>();
  for (const m of raci) for (const id of m.memberIds ?? []) people.add(id);
  for (const r of reqs) for (const id of r.sourceIds ?? []) if (g.get(id)?.type === 'stakeholder') people.add(id);
  const asIs = g.all('processModel').filter((p) => p.variant === 'as-is');
  const toBe = g.all('processModel').filter((p) => p.variant === 'to-be');
  const assumptions = g.referencing(bet.id, 'assumption', 'betId');
  const raid = g.all('raid').filter((r) => (r.relatedIds ?? []).includes(bet.id));
  const bc = g.referencing(bet.id, 'businessCase', 'betId')[0];
  const L = [`# Business Requirements Document: ${bet.title}`, `_Generated ${isoDate(now)} by Goldthread_`, ''];
  L.push('## 1. Executive summary', bet.hypothesis ?? '', '');
  L.push('## 2. Business objectives');
  if (objective) L.push(`**${objective.title}** (${objective.period ?? ''})`, ...krs.map((k) => `- ${k.title}: ${k.current ?? '?'} → ${k.target ?? '?'} ${k.unit ?? ''}`));
  else L.push('_Not linked to an objective._');
  L.push('', '## 3. Stakeholders', table(['Name', 'Role', 'Org unit', 'Engagement'], [...people].map((id) => g.get(id)).filter(Boolean).map((s) => [s!.name, s!.title, s!.orgUnit, `${s!.currentEngagement} → ${s!.desiredEngagement}`])), '');
  L.push('## 4. Current state', ...(asIs.length ? asIs.map((p) => `- ${p.title}: ${(p.steps ?? []).length} steps across ${(p.lanes ?? []).join(', ')}`) : ['_No as-is process modelled._']), '');
  L.push('## 5. Future state', ...(toBe.length ? toBe.map((p) => `- ${p.title}: ${(p.steps ?? []).length} steps across ${(p.lanes ?? []).join(', ')}`) : ['_No to-be process modelled._']), '');
  L.push('## 6. Business requirements', table(['Key', 'Requirement', 'Type', 'MoSCoW', 'Source'], reqs.map((r) => [r.key, r.statement ?? r.title, r.kind, r.priority, (r.sourceIds ?? []).map((id: string) => nameOf(g.get(id))).join(', ')])), '');
  L.push('## 7. Assumptions & constraints', ...(assumptions.length ? assumptions.map((a) => `- ${a.title} (${a.category}, ${a.status})`) : ['_None recorded._']), '');
  L.push('## 8. Risks', table(['Kind', 'Item', 'P×I', 'Mitigation'], raid.map((r) => [r.kind, r.title, `${r.probability}×${r.impact}`, r.mitigation])), '');
  if (bc) {
    const res = evaluateBusinessCase(bc);
    L.push('## 9. Business case', `- NPV (${bc.discountRate}%): **${fmtMoney(res.npv)}** · ROI ${Math.round(res.roi * 100)}% · payback ${res.paybackYears !== null ? `${res.paybackYears.toFixed(1)} years` : 'not within horizon'}`, `- Total cost ${fmtMoney(res.totalCost)} · total benefit ${fmtMoney(res.totalBenefit)}`, '');
  }
  return L.join('\n');
}

function prfaq(g: Graph, bet: Entity): string {
  const ev = evidenceFor(g, bet);
  const quote = ev.find((e) => e.source === 'interview' || e.source === 'sales-call') ?? ev[0];
  const specs = g.referencing(bet.id, 'spec', 'betId');
  const nonGoals = specs.flatMap((s) => sectionOf(s.body, /non-goal|out of scope/i));
  const findings = specs.flatMap((s) => g.referencing(s.id, 'reviewFinding', 'specId'));
  const decisions = g.all('decision').filter((d) => (d.relatedIds ?? []).includes(bet.id));
  const L = [`# ${bet.title}`, '_Press release (working backwards: written as if launched)_', ''];
  L.push(`**Today we launched ${bet.title}.** ${bet.hypothesis ?? ''}`, '');
  if (quote) L.push(`> "${quote.title}": a customer at ${quote.account ?? 'one of our accounts'}`, '');
  L.push(`Customers can start using it today. ${bet.predictedChange ? `We expect ${bet.predictedChange}.` : ''}`, '');
  L.push('## External FAQ');
  for (const f of findings.filter((f) => ['support', 'qa', 'privacy', 'security'].includes(f.role)).slice(0, 5)) L.push(`**${f.title}**`, f.resolution ?? '_To be answered._', '');
  if (nonGoals.length) L.push('**What does it not do?**', ...nonGoals.map((n) => `- ${n}`), '');
  L.push('## Internal FAQ');
  L.push('**Why now?**', `${ev.length} signals across ${new Set(ev.map((e) => e.account)).size} accounts.`, '');
  for (const d of decisions) L.push(`**Why did we choose ${d.chosen ?? d.title}?**`, d.rationale ?? '', '');
  return L.join('\n');
}

function steering(g: Graph, now: Date): string {
  const L = [`# Steering pack: ${isoDate(now)}`, ''];
  L.push('## OKRs');
  for (const o of g.all('objective')) {
    L.push(`**${o.title}**: ${o.status}`);
    for (const k of g.referencing(o.id, 'keyResult', 'objectiveId')) L.push(`- ${k.title}: ${k.current ?? '?'} / ${k.target ?? '?'} ${k.unit ?? ''} (confidence ${k.confidence ?? '–'}%)`);
  }
  L.push('', '## Roadmap');
  for (const h of ['now', 'next', 'later'] as const) {
    const bets = g.all('bet').filter((b) => b.horizon === h && !['killed', 'measured'].includes(b.status));
    const fmt = (b: Entity) => {
      const fc = b.status === 'in-delivery' ? forecastScope(g.all('story'), b, now, { concurrent: concurrency(g.all('bet'), b) }) : null;
      return `- ${b.title} (${b.status}${fc ? `, 85%: ${fc.dates.p85}` : ''})`;
    };
    L.push(`**${h[0].toUpperCase() + h.slice(1)}**`, ...(bets.length ? bets.map(fmt) : ['- None']));
  }
  const risky = g.all('commitment').filter((c) => c.status === 'open').map((c) => ({ c, r: commitmentRisk(c, g, now) })).filter((x) => x.r.level === 'high' || x.r.level === 'medium');
  L.push('', '## Promises at risk', table(['Promise', 'To', 'Due', 'Risk'], risky.map(({ c, r }) => [c.title, nameOf(g.get(c.toId)), c.dueDate, r.reason])));
  const raid = g.all('raid').filter((r) => r.status !== 'closed').sort((a, b) => b.probability * b.impact - a.probability * a.impact).slice(0, 5);
  L.push('', '## Top risks & issues', table(['Kind', 'Item', 'P×I', 'Owner', 'Mitigation'], raid.map((r) => [r.kind, r.title, `${r.probability}×${r.impact}`, nameOf(g.get(r.ownerId)), r.mitigation])));
  const approvals = g.all('approval').filter((a) => a.status === 'pending');
  L.push('', '## Decisions & approvals needed', table(['Item', 'Due'], approvals.map((a) => [a.title, a.dueDate])));
  const clusters = clusterEvidence(g.all('evidence'), now).slice(0, 3);
  L.push('', '## What customers are telling us', ...clusters.map((c) => `- **${c.label}**: ${c.items.length} signals, ${c.accounts.length} sources, ${impactText(c.arr, c.people)} (${c.trend})`));
  return L.join('\n');
}

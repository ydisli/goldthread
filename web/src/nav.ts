import type { Graph } from '../../core/graph.ts';
import { dailyBrief, openMentions } from '../../core/engines/brief.ts';
import { hubSummary, pendingApprovalsFor } from '../../core/engines/stakeholders.ts';
import { getState, type Persona } from './store.ts';

export interface Tool {
  id: string;
  label: string;
  to: string;
  icon: string;
  /** One line, in the user's words: what you use it for. */
  blurb: string;
  keywords?: string;
  count?: (g: Graph, now: Date) => { n: number; alert?: boolean } | null;
}

export interface Section { id: string; label: string; icon: string; blurb: string; tools: Tool[] }

export const HOME: Tool = { id: 'home', label: 'Home', to: '/today', icon: 'house', blurb: 'Your day: what is waiting on you, who to reach, what is coming up.', keywords: 'brief today morning',
  count: (g, now) => { const n = dailyBrief(g, now).filter((i) => i.severity === 'critical').length; return n ? { n, alert: true } : null; } };
export const INBOX: Tool = { id: 'inbox', label: 'Inbox', to: '/inbox', icon: 'inbox', blurb: 'Mentions, sign-offs, requests to triage, review questions and your action items.', keywords: 'approvals requests actions mentions',
  count: (g) => {
    const mentions = openMentions(g, g.meUserId, getState().auth?.user?.prefs.seenMentions).length;
    const n = (g.me ? pendingApprovalsFor(g.me.id, g.all('approval')).length : 0) + g.all('request').filter((r) => r.status === 'new').length + mentions;
    return n ? { n, alert: mentions > 0 } : null;
  } };
export const ASK: Tool = { id: 'ask', label: 'Ask', to: '/ask', icon: 'search', blurb: 'Search everything, or ask a question in plain words.', keywords: 'search question ai' };

export const SECTIONS: Section[] = [
  {
    id: 'people', label: 'People', icon: 'users', blurb: 'Stakeholders, relationships, promises and sign-offs.',
    tools: [
      { id: 'stakeholders', label: 'Stakeholders', to: '/stakeholders', icon: 'users', blurb: 'Everyone with a stake, and where each relationship stands.', keywords: 'registry people 360 prep' },
      { id: 'maps', label: 'Maps', to: '/stakeholders/maps', icon: 'radar', blurb: 'Power/interest, salience, engagement and influence at a glance.', keywords: 'power interest grid salience influence' },
      { id: 'engagement', label: 'Engagement', to: '/stakeholders/engagement', icon: 'message-square', blurb: 'Who you are overdue to talk to, comms plan and interaction log.', keywords: 'touchpoints cadence sentiment comms',
        count: (g, now) => { const h = hubSummary(g, now); const n = h.overdue.length + h.overdueComms.length; return n ? { n } : null; } },
      { id: 'requests', label: 'Requests', to: '/stakeholders/requests', icon: 'inbox', blurb: 'Asks from stakeholders — triage, answer, and close the loop.', keywords: 'asks intake',
        count: (g) => { const n = g.all('request').filter((r) => ['new', 'triaging'].includes(r.status)).length; return n ? { n } : null; } },
      { id: 'commitments', label: 'Promises', to: '/stakeholders/commitments', icon: 'handshake', blurb: 'What was promised to whom, checked against the delivery forecast.', keywords: 'commitments promise ledger',
        count: (g, now) => { const n = hubSummary(g, now).riskyCommitments.length; return n ? { n, alert: true } : null; } },
      { id: 'raci', label: 'RACI', to: '/stakeholders/raci', icon: 'grid-3x3', blurb: 'Who is responsible, accountable, consulted and informed.', keywords: 'responsible accountable' },
      { id: 'approvals', label: 'Approvals', to: '/stakeholders/approvals', icon: 'clipboard-check', blurb: 'Sign-offs with an audit trail.', keywords: 'sign-off',
        count: (g) => { const n = g.all('approval').filter((a) => a.status === 'pending').length; return n ? { n } : null; } },
      { id: 'conflicts', label: 'Conflicts', to: '/stakeholders/conflicts', icon: 'gavel', blurb: 'Competing positions, the interests behind them, and resolutions.', keywords: 'negotiation escalation' },
    ],
  },
  {
    id: 'discovery', label: 'Discovery', icon: 'lightbulb', blurb: 'What users need, what we believe, and what we are testing.',
    tools: [
      { id: 'signals', label: 'Signals', to: '/discover/signals', icon: 'quote', blurb: 'Feedback, tickets and data, grouped into themes.', keywords: 'evidence feedback clusters' },
      { id: 'opportunities', label: 'Opportunities', to: '/discover/opportunities', icon: 'lightbulb', blurb: 'Problems worth solving, with how strong the evidence is.', keywords: 'opportunity solution tree' },
      { id: 'bets', label: 'Bets', to: '/discover/bets', icon: 'rocket', blurb: 'Initiatives as hypotheses, with a metric and a date to check.', keywords: 'initiatives hypotheses epics' },
      { id: 'assumptions', label: 'Assumptions', to: '/discover/assumptions', icon: 'brain', blurb: 'What must be true — riskiest first.', keywords: 'leap of faith' },
      { id: 'experiments', label: 'Experiments', to: '/discover/experiments', icon: 'flask-conical', blurb: 'Sample sizes and significance, without a statistician.', keywords: 'ab test' },
      { id: 'customers', label: 'Personas & journeys', to: '/discover/customers', icon: 'book-user', blurb: 'Who you build for and where they struggle.', keywords: 'personas journeys jtbd users' },
      { id: 'research', label: 'Research', to: '/e/study', icon: 'binoculars', blurb: 'Interview plans, guides and findings.', keywords: 'interviews studies' },
    ],
  },
  {
    id: 'specs', label: 'Specs & analysis', icon: 'file-text', blurb: 'Write it down so it can be built, tested and audited.',
    tools: [
      { id: 'specs', label: 'Spec Studio', to: '/define/specs', icon: 'file-text', blurb: 'PRDs with live checks for vague wording and gaps, plus a review board.', keywords: 'prd lint review' },
      { id: 'requirements', label: 'Requirements', to: '/define/requirements', icon: 'list-checks', blurb: 'Managed requirements, baselines, changes and contradictions.', keywords: 'baselines change requests' },
      { id: 'decisions', label: 'Decisions', to: '/define/decisions', icon: 'git-branch', blurb: 'Why we decided what we decided.', keywords: 'decision log adr' },
      { id: 'decision-tables', label: 'Business rules', to: '/define/decision-tables', icon: 'table-2', blurb: 'Decision tables checked for gaps, with tests generated.', keywords: 'decision tables dmn rules' },
      { id: 'process', label: 'Process models', to: '/define/process', icon: 'workflow', blurb: 'Draw as-is and to-be processes with drag and drop.', keywords: 'bpmn swimlane flow' },
      { id: 'story-map', label: 'Story map', to: '/define/story-map', icon: 'map', blurb: 'The user journey, sliced into releases.', keywords: 'user story mapping' },
      { id: 'toolkit', label: 'BA toolkit', to: '/define/toolkit', icon: 'combine', blurb: 'Elicitation, use cases, states, data, gaps, capabilities, SWOT, root cause.', keywords: 'use cases state models data dictionary elicitation gap swot' },
      { id: 'glossary', label: 'Glossary', to: '/define/glossary', icon: 'book-open', blurb: 'One term, one meaning — enforced in every spec.', keywords: 'terms language' },
    ],
  },
  {
    id: 'delivery', label: 'Delivery', icon: 'route', blurb: 'From backlog to release, with honest dates.',
    tools: [
      { id: 'roadmap', label: 'Roadmap', to: '/deliver/roadmap', icon: 'route', blurb: 'Now / Next / Later with forecast dates, not promises.', keywords: 'timeline' },
      { id: 'prioritize', label: 'Prioritize', to: '/deliver/prioritize', icon: 'arrow-up-down', blurb: 'RICE or WSJF, and what would change the order.', keywords: 'rice wsjf sensitivity' },
      { id: 'backlog', label: 'Backlog health', to: '/deliver/backlog', icon: 'kanban', blurb: 'Duplicates, stale items, missing acceptance criteria.', keywords: 'stories hygiene invest' },
      { id: 'releases', label: 'Releases', to: '/deliver/releases', icon: 'party-popper', blurb: 'Launch readiness, rollout, rollback and release notes.', keywords: 'launch gtm' },
      { id: 'pulse', label: 'Forecast', to: '/deliver/pulse', icon: 'activity', blurb: 'When will it be done — from real throughput.', keywords: 'delivery pulse monte carlo scope creep' },
      { id: 'raid', label: 'RAID log', to: '/deliver/raid', icon: 'triangle-alert', blurb: 'Risks, assumptions, issues and dependencies.', keywords: 'risks issues dependencies' },
      { id: 'uat', label: 'UAT & quality', to: '/deliver/uat', icon: 'circle-check', blurb: 'Acceptance tests, sign-off and defects by root cause.', keywords: 'tests defects' },
      { id: 'trace', label: 'Traceability', to: '/deliver/trace', icon: 'network', blurb: 'Requirement → story → test → release, and what a change affects.', keywords: 'rtm impact analysis audit' },
    ],
  },
  {
    id: 'strategy', label: 'Strategy', icon: 'compass', blurb: 'Where the product is going and why.',
    tools: [
      { id: 'vision', label: 'Vision & OKRs', to: '/strategy', icon: 'compass', blurb: 'The vision board and this quarter\'s outcomes.', keywords: 'objectives key results' },
      { id: 'metrics', label: 'Metric tree', to: '/strategy/metrics', icon: 'chart-line', blurb: 'How everyday metrics roll up to the north star.', keywords: 'kpi tracking plan' },
      { id: 'business-cases', label: 'Business cases', to: '/strategy/business-cases', icon: 'briefcase-business', blurb: 'NPV, ROI, payback and cost of delay.', keywords: 'finance' },
      { id: 'market', label: 'Alternatives', to: '/strategy/market', icon: 'swords', blurb: 'Competitors, vendors and build-vs-buy, capability by capability.', keywords: 'market competitors vendors win loss' },
      { id: 'capacity', label: 'Capacity', to: '/strategy/capacity', icon: 'layers', blurb: 'Planned vs actual allocation, and the tech-debt register.', keywords: 'teams tech debt portfolio' },
    ],
  },
  {
    id: 'learning', label: 'Learning', icon: 'target', blurb: 'Did it work? What did we learn?',
    tools: [
      { id: 'ledger', label: 'Bet ledger', to: '/learn/ledger', icon: 'target', blurb: 'Predicted vs actual, and how calibrated your confidence is.', keywords: 'outcomes calibration' },
      { id: 'features', label: 'Feature catalog', to: '/learn/features', icon: 'star', blurb: 'What exists today, who uses it, what to retire.', keywords: 'lifecycle adoption sunset' },
    ],
  },
  {
    id: 'meetings', label: 'Meetings & docs', icon: 'calendar', blurb: 'Notes that turn into decisions, and documents that write themselves.',
    tools: [
      { id: 'meetings', label: 'Meetings', to: '/workspace/meetings', icon: 'calendar', blurb: 'Agendas and notes; decisions, actions and risks extracted.', keywords: 'refinement steering notes' },
      { id: 'docs', label: 'Documents', to: '/workspace/docs', icon: 'file-text', blurb: 'PRD, BRD, PR/FAQ, steering pack and release notes.', keywords: 'generator' },
    ],
  },
];

export const ALL_TOOLS: Tool[] = [HOME, INBOX, ASK, ...SECTIONS.flatMap((s) => s.tools)];

/** Sensible starting pins for each role; people can change them any time. */
export const DEFAULT_PINS: Record<Persona, string[]> = {
  po: ['roadmap', 'prioritize', 'stakeholders', 'signals', 'bets', 'releases', 'commitments', 'meetings'],
  ba: ['specs', 'requirements', 'process', 'decision-tables', 'toolkit', 'trace', 'uat', 'glossary'],
  both: ['specs', 'stakeholders', 'roadmap', 'requirements', 'signals', 'process', 'releases', 'meetings'],
};

export function sectionOf(path: string): { section: Section; tool: Tool } | null {
  let best: { section: Section; tool: Tool; len: number } | null = null;
  for (const section of SECTIONS) {
    for (const tool of section.tools) {
      const exact = path === tool.to;
      const nested = path.startsWith(`${tool.to}/`) && tool.to.split('/').length > 2;
      const special = tool.id === 'stakeholders' && path.startsWith('/stakeholders/p/');
      if ((exact || nested || special) && (!best || tool.to.length > best.len)) best = { section, tool, len: tool.to.length };
    }
  }
  // Detail pages that live under a section without their own tool.
  if (!best) {
    const prefixes: [string, string][] = [['/define/', 'specs'], ['/deliver/', 'delivery'], ['/discover/', 'discovery'], ['/strategy/', 'strategy'], ['/learn/', 'learning'], ['/workspace/meetings', 'meetings']];
    for (const [p, id] of prefixes) {
      if (path.startsWith(p)) {
        const section = SECTIONS.find((s) => s.id === id)!;
        const tool = section.tools.find((t) => path.startsWith(t.to)) ?? section.tools[0];
        return { section, tool };
      }
    }
    return null;
  }
  return { section: best.section, tool: best.tool };
}

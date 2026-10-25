import type { Graph } from '../../core/graph.ts';
import { dailyBrief } from '../../core/engines/brief.ts';
import { hubSummary, pendingApprovalsFor } from '../../core/engines/stakeholders.ts';
import type { Area } from '../../core/schema.ts';

export interface NavItem {
  label: string;
  to: string;
  icon: string;
  keywords?: string;
  count?: (g: Graph, now: Date) => { n: number; alert?: boolean } | null;
}

export interface NavArea { id: Area; label: string; items: NavItem[] }

export const NAV: NavArea[] = [
  {
    id: 'today', label: 'Today', items: [
      { label: 'Daily brief', to: '/today', icon: 'house', keywords: 'home morning attention', count: (g, now) => { const b = dailyBrief(g, now).filter((i) => i.severity === 'critical' || i.severity === 'high').length; return b ? { n: b, alert: true } : null; } },
      { label: 'Inbox', to: '/inbox', icon: 'inbox', keywords: 'requests approvals findings', count: (g) => {
        const me = g.me;
        const n = (me ? pendingApprovalsFor(me.id, g.all('approval')).length : 0) + g.all('request').filter((r) => r.status === 'new').length;
        return n ? { n } : null;
      } },
      { label: 'Ask Throughline', to: '/ask', icon: 'sparkles', keywords: 'search question ai' },
    ],
  },
  {
    id: 'strategy', label: 'Strategy', items: [
      { label: 'Vision & OKRs', to: '/strategy', icon: 'compass', keywords: 'objectives key results vision board' },
      { label: 'Metric tree', to: '/strategy/metrics', icon: 'chart-line', keywords: 'north star kpi tracking plan' },
      { label: 'Business cases', to: '/strategy/business-cases', icon: 'briefcase-business', keywords: 'npv roi payback cost of delay' },
      { label: 'Market', to: '/strategy/market', icon: 'swords', keywords: 'competitors win loss' },
      { label: 'Capacity & portfolio', to: '/strategy/capacity', icon: 'layers', keywords: 'teams allocation tech debt' },
    ],
  },
  {
    id: 'stakeholders', label: 'Stakeholders', items: [
      { label: 'Overview', to: '/stakeholders', icon: 'users', keywords: 'registry people' },
      { label: 'Maps', to: '/stakeholders/maps', icon: 'radar', keywords: 'power interest grid salience influence engagement matrix' },
      { label: 'Engagement', to: '/stakeholders/engagement', icon: 'message-square', keywords: 'touchpoints interactions comms plan cadence sentiment', count: (g, now) => { const h = hubSummary(g, now); const n = h.overdue.length + h.overdueComms.length; return n ? { n } : null; } },
      { label: 'Requests', to: '/stakeholders/requests', icon: 'inbox', keywords: 'asks intake', count: (g) => { const n = g.all('request').filter((r) => ['new', 'triaging'].includes(r.status)).length; return n ? { n } : null; } },
      { label: 'Commitments', to: '/stakeholders/commitments', icon: 'handshake', keywords: 'promises ledger', count: (g, now) => { const n = hubSummary(g, now).riskyCommitments.length; return n ? { n, alert: true } : null; } },
      { label: 'RACI', to: '/stakeholders/raci', icon: 'grid-3x3', keywords: 'responsible accountable consulted informed' },
      { label: 'Approvals', to: '/stakeholders/approvals', icon: 'clipboard-check', keywords: 'sign-off', count: (g) => { const n = g.all('approval').filter((a) => a.status === 'pending').length; return n ? { n } : null; } },
      { label: 'Conflicts', to: '/stakeholders/conflicts', icon: 'gavel', keywords: 'negotiation escalation', count: (g) => { const n = g.all('conflict').filter((c) => c.status !== 'resolved').length; return n ? { n } : null; } },
    ],
  },
  {
    id: 'discover', label: 'Discover', items: [
      { label: 'Signals', to: '/discover/signals', icon: 'quote', keywords: 'evidence feedback clusters' },
      { label: 'Opportunities', to: '/discover/opportunities', icon: 'lightbulb', keywords: 'opportunity solution tree' },
      { label: 'Bets', to: '/discover/bets', icon: 'rocket', keywords: 'initiatives hypotheses' },
      { label: 'Assumptions', to: '/discover/assumptions', icon: 'brain', keywords: 'leap of faith map' },
      { label: 'Experiments', to: '/discover/experiments', icon: 'flask-conical', keywords: 'ab test sample size significance' },
      { label: 'Customers', to: '/discover/customers', icon: 'book-user', keywords: 'personas journeys jtbd' },
      { label: 'Research', to: '/e/study', icon: 'binoculars', keywords: 'interviews studies' },
    ],
  },
  {
    id: 'define', label: 'Define', items: [
      { label: 'Spec Studio', to: '/define/specs', icon: 'file-text', keywords: 'prd lint review board' },
      { label: 'Requirements', to: '/define/requirements', icon: 'list-checks', keywords: 'baselines change requests contradictions' },
      { label: 'Decisions', to: '/define/decisions', icon: 'git-branch', keywords: 'decision log adr' },
      { label: 'Decision tables', to: '/define/decision-tables', icon: 'table-2', keywords: 'business rules dmn' },
      { label: 'Process models', to: '/define/process', icon: 'workflow', keywords: 'bpmn swimlane as-is to-be' },
      { label: 'Story map', to: '/define/story-map', icon: 'map', keywords: 'user story mapping slices' },
      { label: 'BA toolkit', to: '/define/toolkit', icon: 'combine', keywords: 'use cases state models data dictionary elicitation gap capability swot root cause' },
      { label: 'Glossary', to: '/define/glossary', icon: 'book-open', keywords: 'ubiquitous language terms' },
    ],
  },
  {
    id: 'deliver', label: 'Deliver', items: [
      { label: 'Backlog health', to: '/deliver/backlog', icon: 'kanban', keywords: 'stories hygiene invest' },
      { label: 'Prioritize', to: '/deliver/prioritize', icon: 'arrow-up-down', keywords: 'rice wsjf sensitivity' },
      { label: 'Roadmap', to: '/deliver/roadmap', icon: 'route', keywords: 'now next later timeline' },
      { label: 'Releases', to: '/deliver/releases', icon: 'party-popper', keywords: 'launch readiness gtm release notes' },
      { label: 'Delivery pulse', to: '/deliver/pulse', icon: 'activity', keywords: 'forecast monte carlo scope creep' },
      { label: 'RAID log', to: '/deliver/raid', icon: 'triangle-alert', keywords: 'risks assumptions issues dependencies' },
      { label: 'UAT & quality', to: '/deliver/uat', icon: 'circle-check', keywords: 'tests defects sign-off' },
      { label: 'Traceability', to: '/deliver/trace', icon: 'network', keywords: 'rtm impact analysis' },
    ],
  },
  {
    id: 'learn', label: 'Learn', items: [
      { label: 'Bet ledger', to: '/learn/ledger', icon: 'target', keywords: 'outcomes calibration learnings' },
      { label: 'Feature catalog', to: '/learn/features', icon: 'star', keywords: 'lifecycle adoption sunset' },
    ],
  },
  {
    id: 'workspace', label: 'Workspace', items: [
      { label: 'Meetings', to: '/workspace/meetings', icon: 'calendar', keywords: 'ceremonies refinement steering notes' },
      { label: 'Documents', to: '/workspace/docs', icon: 'file-text', keywords: 'prd brd prfaq steering pack generator' },
      { label: 'Activity', to: '/workspace/activity', icon: 'history', keywords: 'audit trail changes' },
      { label: 'Settings', to: '/workspace/settings', icon: 'settings', keywords: 'integrations cli extension import export' },
    ],
  },
];

export const ALL_NAV: NavItem[] = NAV.flatMap((a) => a.items);

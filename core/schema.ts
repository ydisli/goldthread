// Goldthread schema: every entity type is declared once here and shared by
// the server, the web app, the CLI and the browser extension. References
// between entities are typed fields, and the Intent Graph is derived from them.

export type FieldKind =
  | 'text' | 'longtext' | 'markdown' | 'number' | 'enum' | 'date' | 'bool'
  | 'ref' | 'refs' | 'tags' | 'scale' | 'percent' | 'money' | 'url' | 'json';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  ref?: string | readonly string[];
  min?: number;
  max?: number;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** Managed by a specialised editor; hidden from the generic form. */
  hidden?: boolean;
  default?: unknown;
}

export type Area = 'today' | 'strategy' | 'stakeholders' | 'discover' | 'define' | 'deliver' | 'learn' | 'workspace';

export interface EntityDef {
  type: string;
  label: string;
  plural: string;
  area: Area;
  icon: string;
  description: string;
  titleField: string;
  keyPrefix?: string;
  statusField?: string;
  columns: string[];
  fields: FieldDef[];
}

export interface Entity {
  id: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  [field: string]: any;
}

// ---------- shared option sets ----------

export const ENGAGEMENT = ['unaware', 'resistant', 'neutral', 'supportive', 'leading'] as const;
export const CHANNELS = ['meeting', 'email', 'slack', 'teams', 'phone', 'async-doc'] as const;
export const MOSCOW = ['must', 'should', 'could', 'wont'] as const;
export const REVIEW_ROLES = ['developer', 'qa', 'security', 'privacy', 'support', 'data', 'legal', 'accessibility', 'finance', 'ux'] as const;

// ---------- field helpers ----------

type X = Partial<FieldDef>;
const text = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'text', ...x });
const long = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'longtext', ...x });
const md = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'markdown', ...x });
const num = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'number', ...x });
const en = (key: string, label: string, options: readonly string[], x: X = {}): FieldDef => ({ key, label, kind: 'enum', options, default: options[0], ...x });
const date = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'date', ...x });
const bool = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'bool', ...x });
const ref = (key: string, label: string, to: string | readonly string[], x: X = {}): FieldDef => ({ key, label, kind: 'ref', ref: to, ...x });
const refs = (key: string, label: string, to: string | readonly string[], x: X = {}): FieldDef => ({ key, label, kind: 'refs', ref: to, ...x });
const tags = (key = 'tags', label = 'Tags', x: X = {}): FieldDef => ({ key, label, kind: 'tags', ...x });
const scale = (key: string, label: string, min = 1, max = 5, x: X = {}): FieldDef => ({ key, label, kind: 'scale', min, max, ...x });
const pct = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'percent', ...x });
const money = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'money', ...x });
const url = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'url', ...x });
const json = (key: string, label: string, x: X = {}): FieldDef => ({ key, label, kind: 'json', hidden: true, ...x });

const ANY = '*';

// ---------- entity definitions ----------

export const ENTITIES: EntityDef[] = [
  // ===== Strategy =====
  {
    type: 'vision', label: 'Vision', plural: 'Vision', area: 'strategy', icon: 'compass',
    description: 'Product vision board: target group, needs, product, business goals.',
    titleField: 'title', columns: ['title', 'horizon'],
    fields: [
      text('title', 'Product', { required: true }),
      long('vision', 'Vision statement', { help: 'The change you want to see in the world, not the product.' }),
      long('targetGroup', 'Target group'),
      long('needs', 'Needs'),
      long('product', 'Product'),
      long('businessGoals', 'Business goals'),
      text('horizon', 'Horizon', { placeholder: 'e.g. 2027' }),
    ],
  },
  {
    type: 'objective', label: 'Objective', plural: 'Objectives', area: 'strategy', icon: 'goal',
    description: 'OKR objectives: qualitative, ambitious, time-bound.',
    titleField: 'title', statusField: 'status', columns: ['title', 'period', 'ownerId', 'status'],
    fields: [
      text('title', 'Objective', { required: true }),
      long('description', 'Why it matters'),
      text('period', 'Period', { placeholder: '2026-Q4' }),
      text('pillar', 'Strategy pillar'),
      ref('ownerId', 'Owner', 'stakeholder'),
      en('status', 'Status', ['on-track', 'at-risk', 'off-track', 'achieved', 'missed']),
    ],
  },
  {
    type: 'keyResult', label: 'Key result', plural: 'Key results', area: 'strategy', icon: 'target',
    description: 'Measurable key results for an objective.',
    titleField: 'title', columns: ['title', 'objectiveId', 'current', 'target', 'confidence'],
    fields: [
      text('title', 'Key result', { required: true }),
      ref('objectiveId', 'Objective', 'objective', { required: true }),
      ref('metricId', 'Metric', 'metric'),
      num('baseline', 'Baseline'),
      num('target', 'Target'),
      num('current', 'Current'),
      text('unit', 'Unit'),
      date('dueDate', 'Due'),
      pct('confidence', 'Confidence', { default: 50 }),
    ],
  },
  {
    type: 'metric', label: 'Metric', plural: 'Metrics', area: 'strategy', icon: 'chart-line',
    description: 'Metric tree: north star → input → output metrics, plus guardrails.',
    titleField: 'name', columns: ['name', 'level', 'current', 'target', 'unit'],
    fields: [
      text('name', 'Metric', { required: true }),
      en('level', 'Level', ['north-star', 'input', 'output', 'guardrail', 'health']),
      ref('parentId', 'Drives', 'metric', { help: 'The metric this one rolls up into.' }),
      long('definition', 'Definition', { help: 'Exact formula and population.' }),
      num('current', 'Current'),
      num('target', 'Target'),
      text('unit', 'Unit'),
      en('direction', 'Good direction', ['up', 'down']),
      text('source', 'Source'),
      text('eventName', 'Tracking event'),
      ref('ownerId', 'Owner', 'stakeholder'),
    ],
  },
  {
    type: 'businessCase', label: 'Business case', plural: 'Business cases', area: 'strategy', icon: 'briefcase-business',
    description: 'Costs, benefits, NPV, ROI, payback and cost of delay for a bet.',
    titleField: 'title', statusField: 'status', columns: ['title', 'betId', 'status'],
    fields: [
      text('title', 'Title', { required: true }),
      ref('betId', 'Bet', 'bet'),
      num('years', 'Horizon (years)', { default: 3 }),
      pct('discountRate', 'Discount rate', { default: 10 }),
      money('oneTimeCost', 'One-time cost'),
      money('annualCost', 'Annual run cost'),
      money('annualBenefit', 'Annual benefit at full adoption'),
      text('rampUp', 'Benefit ramp-up % per year', { placeholder: '40, 80, 100' }),
      money('costOfDelayPerWeek', 'Cost of delay / week'),
      long('assumptions', 'Assumptions'),
      en('status', 'Status', ['draft', 'submitted', 'approved', 'rejected']),
    ],
  },
  {
    type: 'competitor', label: 'Alternative', plural: 'Alternatives', area: 'strategy', icon: 'swords',
    description: 'Competitors, vendors or build-vs-buy alternatives, compared capability by capability.',
    titleField: 'name', columns: ['name', 'positioning', 'threat'],
    fields: [
      text('name', 'Name', { required: true }),
      text('positioning', 'Positioning'),
      long('strengths', 'Strengths'),
      long('weaknesses', 'Weaknesses'),
      text('pricing', 'Pricing'),
      url('url', 'Website'),
      scale('threat', 'Threat level'),
      json('capabilities', 'Capabilities', { default: {} }),
    ],
  },
  {
    type: 'winLoss', label: 'Win/loss record', plural: 'Win/loss', area: 'strategy', icon: 'scale',
    description: 'Deal outcomes and the reasons behind them.',
    titleField: 'title', columns: ['title', 'account', 'outcome', 'reason', 'amount', 'date'],
    fields: [
      text('title', 'Deal', { required: true }),
      text('account', 'Account'),
      en('outcome', 'Outcome', ['won', 'lost', 'no-decision']),
      en('reason', 'Primary reason', ['price', 'missing-feature', 'competitor', 'timing', 'relationship', 'product-fit', 'security-compliance']),
      money('amount', 'Amount (ARR)'),
      date('date', 'Closed'),
      ref('competitorId', 'Competitor', 'competitor'),
      text('featureGap', 'Feature gap'),
      long('notes', 'Notes'),
    ],
  },
  {
    type: 'team', label: 'Team', plural: 'Teams', area: 'strategy', icon: 'users',
    description: 'Delivery teams, capacity and allocation targets.',
    titleField: 'name', columns: ['name', 'people', 'capacity'],
    fields: [
      text('name', 'Team', { required: true }),
      num('people', 'People'),
      num('capacity', 'Capacity (person-weeks / quarter)'),
      pct('targetFeature', 'Target: new value', { default: 60 }),
      pct('targetDebt', 'Target: tech debt', { default: 25 }),
      pct('targetMaintenance', 'Target: maintenance', { default: 15 }),
      ref('leadId', 'Team lead', 'stakeholder'),
      json('memberUserIds', 'Members', { default: [] }),
    ],
  },
  {
    type: 'techDebt', label: 'Tech debt item', plural: 'Tech debt', area: 'strategy', icon: 'layers',
    description: 'Technical debt described in business terms.',
    titleField: 'title', statusField: 'status', columns: ['title', 'area', 'interest', 'effort', 'status'],
    fields: [
      text('title', 'Title', { required: true }),
      text('area', 'Area'),
      long('description', 'Description'),
      long('businessImpact', 'Business impact'),
      en('interest', 'Interest (ongoing cost)', ['low', 'medium', 'high']),
      num('effort', 'Effort (person-weeks)'),
      ref('teamId', 'Team', 'team'),
      en('status', 'Status', ['identified', 'scheduled', 'in-progress', 'resolved']),
    ],
  },

  // ===== Stakeholders =====
  {
    type: 'stakeholder', label: 'Stakeholder', plural: 'Stakeholders', area: 'stakeholders', icon: 'user-round',
    description: 'People and groups with power over, interest in, or impact from the product.',
    titleField: 'name', columns: ['name', 'title', 'orgUnit', 'power', 'interest', 'currentEngagement'],
    fields: [
      text('name', 'Name', { required: true }),
      text('title', 'Role / title'),
      text('orgUnit', 'Org unit'),
      en('kind', 'Type', ['internal', 'customer', 'partner', 'regulator', 'vendor', 'investor']),
      text('account', 'Account / company', { help: 'For customers, vendors and partners.' }),
      text('email', 'Email'),
      scale('power', 'Power / influence', 1, 5, { default: 3 }),
      scale('interest', 'Interest', 1, 5, { default: 3 }),
      bool('legitimacy', 'Legitimate claim', { help: 'Salience model: has a legitimate stake (contract, role, regulation).' }),
      bool('urgency', 'Urgent claim', { help: 'Salience model: claim is time-sensitive or critical.' }),
      en('currentEngagement', 'Current engagement', ENGAGEMENT, { default: 'neutral' }),
      en('desiredEngagement', 'Desired engagement', ENGAGEMENT, { default: 'supportive' }),
      long('goals', 'What they care about', { help: 'Their goals, KPIs, wins.' }),
      long('concerns', 'Concerns'),
      en('preferredChannel', 'Preferred channel', CHANNELS),
      num('cadenceDays', 'Touchpoint every (days)', { help: 'Leave empty to derive from power/interest quadrant.' }),
      text('timezone', 'Timezone'),
      refs('influencedBy', 'Influenced by', 'stakeholder'),
      text('userId', 'Linked user account', { hidden: true }),
      tags(),
    ],
  },
  {
    type: 'interaction', label: 'Interaction', plural: 'Interactions', area: 'stakeholders', icon: 'message-square',
    description: 'Meetings, calls and messages with stakeholders, with sentiment.',
    titleField: 'title', columns: ['title', 'date', 'stakeholderIds', 'kind', 'sentiment'],
    fields: [
      text('title', 'Title', { required: true }),
      date('date', 'Date', { required: true }),
      refs('stakeholderIds', 'With', 'stakeholder', { required: true }),
      en('kind', 'Kind', ['1:1', 'meeting', 'workshop', 'demo', 'steering', 'email', 'call', 'chat']),
      scale('sentiment', 'Sentiment', -2, 2, { default: 0 }),
      long('summary', 'Summary'),
      long('followUps', 'Follow-ups'),
      refs('relatedIds', 'Related', ANY),
    ],
  },
  {
    type: 'request', label: 'Request', plural: 'Requests', area: 'stakeholders', icon: 'inbox',
    description: 'Asks from stakeholders: triage, respond, link to evidence and bets, close the loop.',
    titleField: 'title', statusField: 'status', columns: ['title', 'requesterId', 'priority', 'status', 'respondBy'],
    fields: [
      text('title', 'Request', { required: true }),
      long('description', 'Details'),
      ref('requesterId', 'Requested by', 'stakeholder'),
      date('receivedAt', 'Received'),
      en('priority', 'Priority', ['low', 'medium', 'high', 'critical'], { default: 'medium' }),
      en('status', 'Status', ['new', 'triaging', 'accepted', 'planned', 'declined', 'done']),
      date('respondBy', 'Respond by (SLA)'),
      ref('betId', 'Linked bet', 'bet'),
      refs('evidenceIds', 'Evidence', 'evidence'),
      long('responseNote', 'Response'),
      bool('loopClosed', 'Requester informed of outcome'),
    ],
  },
  {
    type: 'commitment', label: 'Commitment', plural: 'Commitments', area: 'stakeholders', icon: 'handshake',
    description: 'Promise ledger: what was promised to whom, by when, checked against the forecast.',
    titleField: 'title', statusField: 'status', columns: ['title', 'toId', 'dueDate', 'status'],
    fields: [
      text('title', 'Promise', { required: true }),
      ref('toId', 'Promised to', 'stakeholder'),
      ref('promisedById', 'Promised by', 'stakeholder'),
      text('account', 'Account'),
      date('dueDate', 'Promised date'),
      ref('betId', 'Delivered by bet', 'bet'),
      ref('releaseId', 'Release', 'release'),
      en('status', 'Status', ['open', 'kept', 'broken', 'renegotiated']),
      long('notes', 'Notes'),
    ],
  },
  {
    type: 'raci', label: 'RACI matrix', plural: 'RACI matrices', area: 'stakeholders', icon: 'grid-3x3',
    description: 'Who is Responsible, Accountable, Consulted, Informed: validated.',
    titleField: 'title', columns: ['title', 'scopeId'],
    fields: [
      text('title', 'Title', { required: true }),
      ref('scopeId', 'Scope', ['bet', 'release', 'spec', 'objective']),
      json('activities', 'Activities', { default: [] }),
      json('memberIds', 'Members', { default: [] }),
      json('assignments', 'Assignments', { default: {} }),
    ],
  },
  {
    type: 'approval', label: 'Approval', plural: 'Approvals', area: 'stakeholders', icon: 'clipboard-check',
    description: 'Sign-offs on specs, baselines, decisions, releases and UAT: audit-grade.',
    titleField: 'title', statusField: 'status', columns: ['title', 'subjectId', 'dueDate', 'status'],
    fields: [
      text('title', 'What needs approval', { required: true }),
      ref('subjectId', 'Subject', ANY),
      ref('requestedById', 'Requested by', 'stakeholder'),
      date('dueDate', 'Due'),
      en('status', 'Status', ['pending', 'approved', 'rejected', 'changes-requested'], { hidden: true }),
      json('approvers', 'Approvers', { default: [] }),
    ],
  },
  {
    type: 'conflict', label: 'Conflict', plural: 'Conflicts', area: 'stakeholders', icon: 'gavel',
    description: 'Competing positions between stakeholders, their interests and resolution.',
    titleField: 'title', statusField: 'status', columns: ['title', 'partyIds', 'status', 'raisedAt'],
    fields: [
      text('title', 'Conflict', { required: true }),
      refs('partyIds', 'Parties', 'stakeholder'),
      long('description', 'Description'),
      long('positions', 'Positions', { help: 'What each party says they want.' }),
      long('interests', 'Underlying interests', { help: 'Why they want it: where agreement is possible.' }),
      en('status', 'Status', ['open', 'negotiating', 'escalated', 'resolved']),
      ref('escalatedToId', 'Escalated to', 'stakeholder'),
      date('raisedAt', 'Raised'),
      long('resolution', 'Resolution'),
      ref('decisionId', 'Resolving decision', 'decision'),
    ],
  },
  {
    type: 'commsItem', label: 'Comms plan item', plural: 'Comms plan', area: 'stakeholders', icon: 'megaphone',
    description: 'Who gets which message, how often, through which channel.',
    titleField: 'title', columns: ['title', 'audienceIds', 'channel', 'frequency', 'lastSent'],
    fields: [
      text('title', 'Message', { required: true }),
      refs('audienceIds', 'Audience', 'stakeholder'),
      text('audience', 'Audience group', { placeholder: 'e.g. All of Sales' }),
      en('channel', 'Channel', CHANNELS),
      en('frequency', 'Frequency', ['weekly', 'biweekly', 'monthly', 'quarterly', 'per-release', 'ad-hoc']),
      ref('ownerId', 'Owner', 'stakeholder'),
      date('lastSent', 'Last sent'),
      text('format', 'Format', { placeholder: 'e.g. 1-page update, demo' }),
    ],
  },

  // ===== Discover =====
  {
    type: 'evidence', label: 'Signal', plural: 'Signals', area: 'discover', icon: 'quote',
    description: 'Signals from users, customers and the business: quotes, tickets, survey answers, analytics.',
    titleField: 'title', columns: ['title', 'source', 'account', 'reach', 'date'],
    fields: [
      text('title', 'Signal', { required: true, help: 'A quote or one-line summary.' }),
      long('detail', 'Detail'),
      en('source', 'Source', ['support', 'interview', 'survey', 'analytics', 'sales-call', 'app-review', 'nps', 'internal', 'audit', 'monitoring', 'social', 'competitor', 'email', 'chat']),
      en('kind', 'Kind', ['said', 'did'], { help: 'Said = opinion/quote; did = observed behaviour/data.' }),
      text('account', 'Account / department', { help: 'Customer account, business unit or department the signal came from.' }),
      text('segment', 'Segment / group', { placeholder: 'e.g. enterprise, frontline staff, EMEA' }),
      num('reach', 'People affected', { help: 'Users or employees who have this problem.' }),
      money('arr', 'Revenue at stake (ARR)', { help: 'For customer-facing products.' }),
      date('date', 'Date'),
      scale('sentiment', 'Sentiment', -2, 2, { default: -1 }),
      url('url', 'Link'),
      ref('personaId', 'Persona', 'persona'),
      refs('opportunityIds', 'Opportunities', 'opportunity'),
      ref('relayedById', 'Relayed by', 'stakeholder'),
      tags(),
    ],
  },
  {
    type: 'opportunity', label: 'Opportunity', plural: 'Opportunities', area: 'discover', icon: 'lightbulb',
    description: 'Customer problems worth solving, organised as an opportunity tree.',
    titleField: 'title', statusField: 'status', columns: ['title', 'parentId', 'status'],
    fields: [
      text('title', 'Opportunity', { required: true, help: 'Phrase it as a customer problem or need.' }),
      long('description', 'Description'),
      ref('parentId', 'Parent opportunity', 'opportunity'),
      ref('metricId', 'Outcome metric', 'metric'),
      ref('objectiveId', 'Objective', 'objective'),
      refs('personaIds', 'Personas', 'persona'),
      en('status', 'Status', ['exploring', 'prioritized', 'parked', 'solved']),
    ],
  },
  {
    type: 'bet', label: 'Bet', plural: 'Bets', area: 'discover', icon: 'rocket',
    description: 'Initiatives framed as hypotheses with a measurable outcome.',
    titleField: 'title', statusField: 'status', keyPrefix: 'BET', columns: ['key', 'title', 'status', 'horizon', 'confidence', 'checkDate'],
    fields: [
      text('title', 'Bet', { required: true }),
      long('hypothesis', 'Hypothesis', { placeholder: 'We believe [solution] for [who] will [outcome], measured by [metric].' }),
      refs('opportunityIds', 'Opportunities', 'opportunity'),
      ref('objectiveId', 'Objective', 'objective'),
      ref('metricId', 'Success metric', 'metric'),
      text('predictedChange', 'Predicted change', { placeholder: 'e.g. −60% reconciliation tickets' }),
      pct('confidence', 'Confidence', { default: 50 }),
      date('checkDate', 'Measure on'),
      en('status', 'Status', ['idea', 'discovery', 'committed', 'in-delivery', 'shipped', 'measured', 'killed']),
      en('horizon', 'Roadmap horizon', ['now', 'next', 'later']),
      en('category', 'Category', ['feature', 'tech-debt', 'maintenance', 'experiment', 'compliance']),
      ref('ownerId', 'Owner', 'stakeholder'),
      ref('teamId', 'Team', 'team'),
      date('startDate', 'Start'),
      date('targetDate', 'Target date'),
      num('reach', 'RICE reach (accounts / quarter)'),
      num('impact', 'RICE impact', { help: '0.25 minimal · 0.5 low · 1 medium · 2 high · 3 massive', default: 1 }),
      num('effort', 'Effort (person-weeks)'),
      scale('businessValue', 'WSJF business value', 1, 20, { default: 5 }),
      scale('timeCriticality', 'WSJF time criticality', 1, 20, { default: 5 }),
      scale('riskReduction', 'WSJF risk reduction / opportunity enablement', 1, 20, { default: 3 }),
      scale('jobSize', 'WSJF job size', 1, 20, { default: 5 }),
      en('result', 'Result', ['pending', 'success', 'partial', 'failed', 'inconclusive']),
      long('actualResult', 'Actual result'),
      long('learning', 'Learning'),
    ],
  },
  {
    type: 'assumption', label: 'Assumption', plural: 'Assumptions', area: 'discover', icon: 'brain',
    description: 'What must be true for a bet to work: mapped by importance and evidence.',
    titleField: 'title', statusField: 'status', columns: ['title', 'betId', 'category', 'importance', 'evidenceLevel', 'status'],
    fields: [
      text('title', 'Assumption', { required: true }),
      ref('betId', 'Bet', 'bet'),
      en('category', 'Category', ['value', 'usability', 'feasibility', 'viability', 'ethics']),
      scale('importance', 'Importance', 1, 5, { default: 3 }),
      scale('evidenceLevel', 'Evidence we have', 1, 5, { default: 1 }),
      en('status', 'Status', ['untested', 'testing', 'validated', 'invalidated']),
      long('testPlan', 'How we will test it'),
    ],
  },
  {
    type: 'experiment', label: 'Experiment', plural: 'Experiments', area: 'discover', icon: 'flask-conical',
    description: 'Experiments with sample size planning and significance testing.',
    titleField: 'title', statusField: 'status', columns: ['title', 'method', 'status', 'decision'],
    fields: [
      text('title', 'Experiment', { required: true }),
      ref('betId', 'Bet', 'bet'),
      refs('assumptionIds', 'Tests assumptions', 'assumption'),
      en('method', 'Method', ['a/b-test', 'fake-door', 'prototype-test', 'concierge', 'survey', 'wizard-of-oz', 'data-analysis']),
      long('hypothesis', 'Hypothesis'),
      text('metric', 'Primary metric'),
      pct('baselineRate', 'Baseline conversion'),
      pct('mde', 'Minimum detectable effect (relative)', { default: 10 }),
      num('alpha', 'Significance level α', { default: 0.05 }),
      num('power', 'Power (1−β)', { default: 0.8 }),
      num('controlN', 'Control: visitors'),
      num('controlConversions', 'Control: conversions'),
      num('variantN', 'Variant: visitors'),
      num('variantConversions', 'Variant: conversions'),
      en('status', 'Status', ['designing', 'running', 'concluded']),
      en('decision', 'Decision', ['pending', 'persevere', 'pivot', 'kill']),
      date('startDate', 'Start'),
      date('endDate', 'End'),
      long('notes', 'Notes'),
    ],
  },
  {
    type: 'persona', label: 'Persona', plural: 'Personas', area: 'discover', icon: 'book-user',
    description: 'Evidence-backed personas with jobs-to-be-done.',
    titleField: 'name', columns: ['name', 'role', 'segment'],
    fields: [
      text('name', 'Name', { required: true }),
      text('role', 'Role'),
      text('segment', 'Segment / group'),
      long('goals', 'Goals'),
      long('pains', 'Pains'),
      long('jobs', 'Jobs to be done', { placeholder: 'When …, I want to …, so I can …' }),
      text('quote', 'Representative quote'),
    ],
  },
  {
    type: 'journey', label: 'Journey map', plural: 'Journey maps', area: 'discover', icon: 'route',
    description: 'Stages, actions, emotions and pains along a customer journey.',
    titleField: 'title', columns: ['title', 'personaId'],
    fields: [
      text('title', 'Journey', { required: true }),
      ref('personaId', 'Persona', 'persona'),
      json('stages', 'Stages', { default: [] }),
    ],
  },
  {
    type: 'study', label: 'Research study', plural: 'Research', area: 'discover', icon: 'binoculars',
    description: 'Research plans, interview guides, participants and findings.',
    titleField: 'title', statusField: 'status', columns: ['title', 'method', 'status', 'startDate'],
    fields: [
      text('title', 'Study', { required: true }),
      long('objective', 'Research objective'),
      en('method', 'Method', ['interviews', 'usability-test', 'survey', 'diary-study', 'field-observation', 'card-sort']),
      en('status', 'Status', ['planning', 'recruiting', 'running', 'synthesizing', 'done']),
      date('startDate', 'Start'),
      long('participants', 'Participants & screener'),
      md('guide', 'Interview / test guide'),
      md('findings', 'Findings'),
      refs('evidenceIds', 'Evidence produced', 'evidence'),
    ],
  },

  // ===== Define =====
  {
    type: 'spec', label: 'Spec', plural: 'Specs', area: 'define', icon: 'file-text',
    description: 'PRDs written in Spec Studio: linted, reviewed, traced.',
    titleField: 'title', statusField: 'status', columns: ['title', 'betId', 'status', 'ownerId'],
    fields: [
      text('title', 'Title', { required: true }),
      ref('betId', 'Bet', 'bet'),
      ref('ownerId', 'Owner', 'stakeholder'),
      en('status', 'Status', ['draft', 'in-review', 'ready', 'approved', 'superseded']),
      md('body', 'Body', { hidden: true }),
    ],
  },
  {
    type: 'requirement', label: 'Requirement', plural: 'Requirements', area: 'define', icon: 'list-checks',
    description: 'Managed requirements with attributes, versions and traceability.',
    titleField: 'title', statusField: 'status', keyPrefix: 'REQ', columns: ['key', 'title', 'kind', 'priority', 'status'],
    fields: [
      text('title', 'Title', { required: true }),
      long('statement', 'Statement', { help: 'Use "The system shall …" or a business rule.' }),
      en('kind', 'Type', ['functional', 'non-functional', 'business-rule', 'constraint', 'data', 'interface', 'transition']),
      en('priority', 'Priority (MoSCoW)', MOSCOW),
      en('status', 'Status', ['draft', 'in-review', 'approved', 'implemented', 'verified', 'deprecated']),
      ref('specId', 'Spec', 'spec'),
      ref('betId', 'Bet', 'bet'),
      ref('parentId', 'Parent requirement', 'requirement'),
      refs('sourceIds', 'Sources', ['stakeholder', 'evidence', 'elicitation', 'request']),
      long('rationale', 'Rationale'),
      long('acceptance', 'Acceptance / fit criterion'),
      en('stability', 'Stability', ['stable', 'volatile', 'unknown']),
      ref('ownerId', 'Owner', 'stakeholder'),
      num('version', 'Version', { default: 1, hidden: true }),
      json('history', 'History', { default: [] }),
      tags('tags', 'Tags', { help: 'pii, payment, audit, performance … trigger NFR checks' }),
    ],
  },
  {
    type: 'baseline', label: 'Baseline', plural: 'Baselines', area: 'define', icon: 'milestone',
    description: 'Approved snapshots of requirements; diff any two baselines.',
    titleField: 'title', columns: ['title', 'date', 'specId'],
    fields: [
      text('title', 'Baseline', { required: true }),
      date('date', 'Date'),
      ref('specId', 'Spec', 'spec'),
      ref('approvalId', 'Approval', 'approval'),
      long('notes', 'Notes'),
      json('snapshot', 'Snapshot', { default: [] }),
    ],
  },
  {
    type: 'changeRequest', label: 'Change request', plural: 'Change requests', area: 'define', icon: 'git-compare',
    description: 'Controlled changes to approved requirements, with impact analysis.',
    titleField: 'title', statusField: 'status', keyPrefix: 'CR', columns: ['key', 'title', 'requestedById', 'status'],
    fields: [
      text('title', 'Change', { required: true }),
      long('description', 'Description'),
      refs('requirementIds', 'Affected requirements', 'requirement'),
      long('reason', 'Reason'),
      ref('requestedById', 'Requested by', 'stakeholder'),
      en('status', 'Status', ['submitted', 'assessing', 'approved', 'rejected', 'implemented']),
      ref('decisionId', 'Decision', 'decision'),
    ],
  },
  {
    type: 'glossaryTerm', label: 'Glossary term', plural: 'Glossary', area: 'define', icon: 'book-open',
    description: 'Ubiquitous language: one term, one meaning.',
    titleField: 'term', columns: ['term', 'definition', 'synonyms'],
    fields: [
      text('term', 'Term', { required: true }),
      long('definition', 'Definition'),
      tags('synonyms', 'Discouraged synonyms', { help: 'The linter flags these and suggests the term.' }),
      text('domain', 'Domain'),
      ref('dataEntityId', 'Data entity', 'dataEntity'),
    ],
  },
  {
    type: 'decision', label: 'Decision', plural: 'Decisions', area: 'define', icon: 'git-branch',
    description: 'Decision records: options, rationale, reversibility, revisit triggers.',
    titleField: 'title', statusField: 'status', keyPrefix: 'DEC', columns: ['key', 'title', 'date', 'reversibility', 'status'],
    fields: [
      text('title', 'Decision', { required: true }),
      long('context', 'Context'),
      md('options', 'Options considered'),
      text('chosen', 'Chosen option'),
      long('rationale', 'Rationale'),
      refs('deciderIds', 'Decided by', 'stakeholder'),
      refs('consultedIds', 'Consulted', 'stakeholder'),
      date('date', 'Date'),
      en('reversibility', 'Reversibility', ['two-way-door', 'one-way-door']),
      text('revisitTrigger', 'Revisit if …'),
      date('revisitDate', 'Revisit on'),
      en('status', 'Status', ['proposed', 'decided', 'superseded', 'revisited']),
      ref('supersedesId', 'Supersedes', 'decision'),
      refs('evidenceIds', 'Evidence', 'evidence'),
      refs('relatedIds', 'Related', ANY),
    ],
  },
  {
    type: 'decisionTable', label: 'Decision table', plural: 'Decision tables', area: 'define', icon: 'table-2',
    description: 'Business rules as decision tables: checked for gaps and conflicts, with generated tests.',
    titleField: 'title', columns: ['title', 'requirementId', 'hitPolicy'],
    fields: [
      text('title', 'Title', { required: true }),
      ref('requirementId', 'Requirement', 'requirement'),
      en('hitPolicy', 'Hit policy', ['unique', 'first', 'any']),
      json('conditions', 'Conditions', { default: [] }),
      json('actions', 'Actions', { default: [] }),
      json('rules', 'Rules', { default: [] }),
    ],
  },
  {
    type: 'processModel', label: 'Process model', plural: 'Process models', area: 'define', icon: 'workflow',
    description: 'Swimlane process models; compare as-is and to-be.',
    titleField: 'title', columns: ['title', 'variant', 'counterpartId'],
    fields: [
      text('title', 'Process', { required: true }),
      en('variant', 'Variant', ['as-is', 'to-be']),
      en('orientation', 'Lanes', ['horizontal', 'vertical']),
      ref('counterpartId', 'Compare with', 'processModel'),
      long('notes', 'Notes'),
      json('lanes', 'Lanes', { default: [] }),
      json('steps', 'Steps', { default: [] }),
    ],
  },
  {
    type: 'useCase', label: 'Use case', plural: 'Use cases', area: 'define', icon: 'list-tree',
    description: 'Actor goals with main, alternate and exception flows.',
    titleField: 'title', keyPrefix: 'UC', columns: ['key', 'title', 'actor'],
    fields: [
      text('title', 'Use case', { required: true }),
      text('actor', 'Primary actor'),
      text('goal', 'Goal'),
      long('preconditions', 'Preconditions'),
      long('mainFlow', 'Main flow', { placeholder: '1. …\n2. …' }),
      long('alternateFlows', 'Alternate flows'),
      long('exceptionFlows', 'Exception flows'),
      long('postconditions', 'Postconditions'),
      refs('requirementIds', 'Requirements', 'requirement'),
    ],
  },
  {
    type: 'stateModel', label: 'State model', plural: 'State models', area: 'define', icon: 'circle-dot',
    description: 'Entity lifecycles: checked for unreachable and dead-end states.',
    titleField: 'title', columns: ['title'],
    fields: [
      text('title', 'Entity / lifecycle', { required: true }),
      long('notes', 'Notes'),
      refs('requirementIds', 'Requirements', 'requirement'),
      json('states', 'States', { default: [] }),
      text('initial', 'Initial state', { hidden: true }),
      json('finals', 'Final states', { default: [] }),
      json('transitions', 'Transitions', { default: [] }),
    ],
  },
  {
    type: 'dataEntity', label: 'Data entity', plural: 'Data dictionary', area: 'define', icon: 'boxes',
    description: 'Data dictionary with attributes and PII classification.',
    titleField: 'name', columns: ['name', 'description'],
    fields: [
      text('name', 'Entity', { required: true }),
      long('description', 'Description'),
      long('relations', 'Relationships'),
      ref('ownerId', 'Data owner', 'stakeholder'),
      json('attributes', 'Attributes', { default: [] }),
    ],
  },
  {
    type: 'elicitation', label: 'Elicitation session', plural: 'Elicitation', area: 'define', icon: 'users',
    description: 'Plan and capture interviews, workshops, observation and document analysis.',
    titleField: 'title', statusField: 'status', columns: ['title', 'technique', 'date', 'status'],
    fields: [
      text('title', 'Session', { required: true }),
      en('technique', 'Technique', ['interview', 'workshop', 'observation', 'survey', 'document-analysis', 'focus-group', 'prototyping', 'brainstorming', 'interface-analysis']),
      date('date', 'Date'),
      refs('stakeholderIds', 'Participants', 'stakeholder'),
      long('objectives', 'Objectives'),
      long('questions', 'Questions / agenda'),
      long('notes', 'Notes'),
      en('status', 'Status', ['planned', 'done', 'synthesized']),
    ],
  },
  {
    type: 'gapItem', label: 'Gap', plural: 'Gap analysis', area: 'define', icon: 'split',
    description: 'Current state vs future state and the actions that close the gap.',
    titleField: 'title', statusField: 'status', columns: ['title', 'priority', 'status'],
    fields: [
      text('title', 'Area', { required: true }),
      long('currentState', 'Current state'),
      long('futureState', 'Future state'),
      long('gap', 'Gap'),
      long('action', 'Action to close'),
      en('priority', 'Priority', ['low', 'medium', 'high'], { default: 'medium' }),
      ref('capabilityId', 'Capability', 'capability'),
      en('status', 'Status', ['open', 'planned', 'closed']),
    ],
  },
  {
    type: 'capability', label: 'Capability', plural: 'Capability map', area: 'define', icon: 'combine',
    description: 'Business capability map with current vs target maturity.',
    titleField: 'name', columns: ['name', 'parentId', 'maturityNow', 'maturityTarget', 'importance'],
    fields: [
      text('name', 'Capability', { required: true }),
      ref('parentId', 'Parent', 'capability'),
      long('description', 'Description'),
      scale('maturityNow', 'Maturity now', 1, 5, { default: 2 }),
      scale('maturityTarget', 'Target maturity', 1, 5, { default: 4 }),
      scale('importance', 'Strategic importance', 1, 5, { default: 3 }),
      ref('ownerId', 'Owner', 'stakeholder'),
    ],
  },
  {
    type: 'swot', label: 'SWOT', plural: 'SWOT analyses', area: 'define', icon: 'grid-3x3',
    description: 'Strengths, weaknesses, opportunities, threats.',
    titleField: 'title', columns: ['title', 'date'],
    fields: [
      text('title', 'Subject', { required: true }),
      date('date', 'Date'),
      long('strengths', 'Strengths'),
      long('weaknesses', 'Weaknesses'),
      long('opportunities', 'Opportunities'),
      long('threats', 'Threats'),
    ],
  },
  {
    type: 'rootCause', label: 'Root cause analysis', plural: 'Root cause', area: 'define', icon: 'search',
    description: '5 whys and fishbone categories to get to the root of a problem.',
    titleField: 'title', columns: ['title', 'rootCause'],
    fields: [
      text('title', 'Problem', { required: true }),
      json('whys', 'Whys', { default: ['', '', '', '', ''] }),
      json('fishbone', 'Fishbone', { default: {} }),
      text('rootCause', 'Root cause'),
      long('countermeasures', 'Countermeasures'),
    ],
  },
  {
    type: 'storyMap', label: 'Story map', plural: 'Story maps', area: 'define', icon: 'map',
    description: 'User story map: activities → steps → stories, sliced into releases.',
    titleField: 'title', columns: ['title', 'betId'],
    fields: [
      text('title', 'Title', { required: true }),
      ref('betId', 'Bet', 'bet'),
      ref('personaId', 'Persona', 'persona'),
      json('activities', 'Activities', { default: [] }),
      json('slices', 'Release slices', { default: [] }),
    ],
  },
  {
    type: 'story', label: 'Story', plural: 'Stories', area: 'define', icon: 'kanban',
    description: 'User stories with Gherkin acceptance criteria, traced to requirements.',
    titleField: 'title', statusField: 'status', keyPrefix: 'ST', columns: ['key', 'title', 'status', 'estimate', 'releaseId'],
    fields: [
      text('title', 'Title', { required: true }),
      text('asA', 'As a'),
      text('iWant', 'I want'),
      text('soThat', 'So that'),
      md('description', 'Description'),
      md('acceptance', 'Acceptance criteria', { placeholder: 'Given …\nWhen …\nThen …' }),
      en('status', 'Status', ['backlog', 'ready', 'in-progress', 'in-review', 'done']),
      num('estimate', 'Estimate (points)'),
      refs('requirementIds', 'Requirements', 'requirement'),
      ref('betId', 'Bet', 'bet'),
      ref('specId', 'Spec', 'spec'),
      ref('releaseId', 'Release', 'release'),
      ref('teamId', 'Team', 'team'),
      refs('dependsOnIds', 'Depends on', 'story'),
      text('sprint', 'Sprint'),
      text('externalKey', 'Jira / Linear key'),
      date('doneAt', 'Done on'),
      ref('storyMapId', 'Story map', 'storyMap', { hidden: true }),
      text('mapStepId', 'Map step', { hidden: true }),
      text('sliceId', 'Map slice', { hidden: true }),
      tags(),
    ],
  },
  {
    type: 'reviewFinding', label: 'Review finding', plural: 'Review findings', area: 'define', icon: 'bot',
    description: 'Questions raised by the Review Board on a spec.',
    titleField: 'title', statusField: 'status', columns: ['title', 'role', 'severity', 'status'],
    fields: [
      text('title', 'Finding', { required: true }),
      ref('specId', 'Spec', 'spec'),
      en('role', 'Reviewer role', REVIEW_ROLES),
      en('severity', 'Severity', ['info', 'minor', 'major', 'critical'], { default: 'minor' }),
      long('detail', 'Detail'),
      text('anchor', 'Quoted passage'),
      en('status', 'Status', ['open', 'resolved', 'wont-fix', 'converted']),
      long('resolution', 'Resolution'),
      en('source', 'Source', ['engine', 'claude', 'human']),
    ],
  },

  // ===== Deliver =====
  {
    type: 'release', label: 'Release', plural: 'Releases', area: 'deliver', icon: 'party-popper',
    description: 'Releases and launches: scope, readiness, rollout, rollback, release notes.',
    titleField: 'title', statusField: 'status', columns: ['title', 'version', 'targetDate', 'tier', 'status'],
    fields: [
      text('title', 'Release', { required: true }),
      text('version', 'Version'),
      date('targetDate', 'Target date'),
      date('releasedAt', 'Released on'),
      en('status', 'Status', ['planning', 'in-progress', 'code-complete', 'released', 'rolled-back']),
      en('tier', 'Launch tier', ['tier-1', 'tier-2', 'tier-3'], { default: 'tier-2', help: 'Tier 1 = major launch, tier 3 = silent.' }),
      long('goals', 'Goals'),
      refs('betIds', 'Bets', 'bet'),
      long('rolloutPlan', 'Rollout plan', { placeholder: 'Flag, cohorts, percentages, dates' }),
      long('rollbackCriteria', 'Rollback criteria'),
      json('checklist', 'Launch readiness', { default: [] }),
    ],
  },
  {
    type: 'raid', label: 'RAID item', plural: 'RAID log', area: 'deliver', icon: 'triangle-alert',
    description: 'Risks, assumptions, issues and dependencies with owners and mitigations.',
    titleField: 'title', statusField: 'status', keyPrefix: 'RAID', columns: ['key', 'kind', 'title', 'probability', 'impact', 'ownerId', 'status'],
    fields: [
      en('kind', 'Kind', ['risk', 'assumption', 'issue', 'dependency']),
      text('title', 'Title', { required: true }),
      long('description', 'Description'),
      scale('probability', 'Probability', 1, 5, { default: 3 }),
      scale('impact', 'Impact', 1, 5, { default: 3 }),
      ref('ownerId', 'Owner', 'stakeholder'),
      long('mitigation', 'Mitigation / response'),
      en('status', 'Status', ['open', 'mitigating', 'occurred', 'closed']),
      date('dueDate', 'Review by'),
      text('externalTeam', 'Dependency on team'),
      refs('relatedIds', 'Related', ANY),
    ],
  },
  {
    type: 'testCase', label: 'Test case', plural: 'Test cases', area: 'deliver', icon: 'circle-check',
    description: 'UAT and acceptance test cases traced to stories and requirements.',
    titleField: 'title', statusField: 'status', keyPrefix: 'TC', columns: ['key', 'title', 'kind', 'status', 'testerId'],
    fields: [
      text('title', 'Test', { required: true }),
      en('kind', 'Kind', ['uat', 'acceptance', 'system', 'regression']),
      refs('storyIds', 'Stories', 'story'),
      refs('requirementIds', 'Requirements', 'requirement'),
      ref('releaseId', 'Release', 'release'),
      long('steps', 'Steps'),
      long('expected', 'Expected result'),
      en('status', 'Status', ['not-run', 'pass', 'fail', 'blocked']),
      ref('testerId', 'Tester', 'stakeholder'),
      date('executedAt', 'Executed on'),
    ],
  },
  {
    type: 'defect', label: 'Defect', plural: 'Defects', area: 'deliver', icon: 'shield-alert',
    description: 'Defects with root-cause classification: requirement defects are tracked.',
    titleField: 'title', statusField: 'status', keyPrefix: 'BUG', columns: ['key', 'title', 'severity', 'foundIn', 'rootCause', 'status'],
    fields: [
      text('title', 'Defect', { required: true }),
      en('severity', 'Severity', ['s1-critical', 's2-major', 's3-minor', 's4-trivial'], { default: 's3-minor' }),
      en('status', 'Status', ['new', 'triaged', 'in-progress', 'fixed', 'verified', 'closed', 'wont-fix']),
      en('foundIn', 'Found in', ['uat', 'staging', 'production', 'review']),
      en('rootCause', 'Root cause', ['requirement', 'design', 'code', 'environment', 'data', 'unknown'], { default: 'unknown' }),
      ref('storyId', 'Story', 'story'),
      ref('requirementId', 'Requirement', 'requirement'),
      ref('featureId', 'Feature', 'feature'),
      ref('releaseId', 'Release', 'release'),
      date('reportedAt', 'Reported'),
      long('detail', 'Detail'),
      text('externalKey', 'Jira / ADO key'),
    ],
  },

  // ===== Learn =====
  {
    type: 'feature', label: 'Feature', plural: 'Feature catalog', area: 'learn', icon: 'star',
    description: 'What the product does today: lifecycle, adoption, cost, sunset plans.',
    titleField: 'name', statusField: 'status', columns: ['name', 'status', 'adoption', 'adoptionTrend', 'maintenanceCost'],
    fields: [
      text('name', 'Feature', { required: true }),
      long('description', 'Description'),
      en('status', 'Lifecycle', ['alpha', 'beta', 'ga', 'deprecated', 'sunset'], { default: 'ga' }),
      ref('ownerId', 'Owner', 'stakeholder'),
      date('launchedAt', 'Launched'),
      pct('adoption', 'Adoption (% of active accounts)'),
      en('adoptionTrend', 'Trend', ['rising', 'flat', 'falling'], { default: 'flat' }),
      en('maintenanceCost', 'Maintenance cost', ['low', 'medium', 'high']),
      en('plan', 'Plan', ['all', 'pro', 'enterprise']),
      refs('betIds', 'Bets', 'bet'),
      url('docsUrl', 'Docs'),
      long('sunsetPlan', 'Sunset plan'),
    ],
  },

  // ===== Workspace =====
  {
    type: 'meeting', label: 'Meeting', plural: 'Meetings', area: 'workspace', icon: 'calendar',
    description: 'Ceremonies and stakeholder meetings: agenda, notes → decisions and actions.',
    titleField: 'title', columns: ['title', 'kind', 'date', 'attendeeIds'],
    fields: [
      text('title', 'Meeting', { required: true }),
      en('kind', 'Kind', ['refinement', 'sprint-planning', 'sprint-review', 'retro', 'steering', '1:1', 'workshop', 'stakeholder-review', 'other']),
      date('date', 'Date'),
      refs('attendeeIds', 'Attendees', 'stakeholder'),
      long('agenda', 'Agenda'),
      long('notes', 'Notes / transcript'),
      refs('decisionIds', 'Decisions', 'decision'),
      refs('relatedIds', 'Related', ANY),
      json('actions', 'Action items', { default: [] }),
    ],
  },
  {
    type: 'record', label: 'Record', plural: 'Records', area: 'workspace', icon: 'boxes',
    description: 'An item of one of this workspace\'s own types (Settings → Workspace → Custom fields & types).',
    titleField: 'title', columns: ['title', 'ownerId'],
    fields: [
      text('title', 'Title', { required: true }),
      text('recordType', 'Kind', { hidden: true }),
      md('description', 'Description'),
      ref('ownerId', 'Owner', 'stakeholder'),
      refs('relatedIds', 'Related', ANY),
      tags(),
    ],
  },
  {
    type: 'attachment', label: 'Attachment', plural: 'Attachments', area: 'workspace', icon: 'paperclip',
    description: 'A file attached to any item: a screenshot, a document, evidence for an audit.',
    titleField: 'name', columns: ['name', 'entityId', 'size', 'uploadedBy'],
    fields: [
      ref('entityId', 'On', ANY, { required: true }),
      text('name', 'File name', { required: true }),
      num('size', 'Size (bytes)'),
      text('mime', 'Type'),
      text('fileId', 'Stored as', { hidden: true }),
      text('uploadedBy', 'Uploaded by'),
    ],
  },
  {
    type: 'comment', label: 'Comment', plural: 'Comments', area: 'workspace', icon: 'message-square',
    description: 'Comments on any entity.',
    titleField: 'body', columns: ['body', 'author', 'entityId'],
    fields: [
      ref('entityId', 'On', ANY, { required: true }),
      text('author', 'Author'),
      text('authorId', 'Author account', { hidden: true }),
      long('body', 'Comment', { required: true }),
      json('mentions', 'Mentioned people', { default: [] }),
      bool('resolved', 'Resolved'),
    ],
  },
];

export const ENTITY_MAP: Record<string, EntityDef> = Object.fromEntries(ENTITIES.map((d) => [d.type, d]));

export function defOf(type: string): EntityDef {
  const d = ENTITY_MAP[type];
  if (!d) throw new Error(`Unknown entity type: ${type}`);
  return d;
}

export function fieldOf(type: string, key: string): FieldDef | undefined {
  return ENTITY_MAP[type]?.fields.find((f) => f.key === key);
}

export function titleOf(e: Entity | undefined | null): string {
  if (!e) return '–';
  const d = ENTITY_MAP[e.type];
  const t = d ? e[d.titleField] : e.title;
  const s = typeof t === 'string' && t.trim() ? t : '(untitled)';
  return e.key ? `${e.key} · ${s}` : s;
}

/** Plain title without the human key. */
export function nameOf(e: Entity | undefined | null): string {
  if (!e) return '–';
  const d = ENTITY_MAP[e.type];
  const t = d ? e[d.titleField] : e.title;
  return typeof t === 'string' && t.trim() ? t : '(untitled)';
}

export function defaultsFor(type: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of defOf(type).fields) {
    if (f.default !== undefined) out[f.key] = structuredClone(f.default);
  }
  return out;
}

export function refTargets(f: FieldDef): string[] | '*' {
  if (!f.ref) return [];
  if (f.ref === ANY) return '*';
  return Array.isArray(f.ref) ? [...f.ref] : [f.ref as string];
}

/** Validate & normalise an entity payload against its schema. Returns errors. */
export function validate(type: string, data: Record<string, unknown>): string[] {
  const d = ENTITY_MAP[type];
  if (!d) return [`Unknown type ${type}`];
  const errors: string[] = [];
  for (const f of d.fields) {
    const v = data[f.key];
    if (f.required && (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))) {
      errors.push(`${f.label} is required`);
      continue;
    }
    if (v === undefined || v === null || v === '') continue;
    switch (f.kind) {
      case 'number': case 'scale': case 'percent': case 'money':
        if (typeof v !== 'number' || Number.isNaN(v)) errors.push(`${f.label} must be a number`);
        else if (f.kind === 'scale' && (v < (f.min ?? 1) || v > (f.max ?? 5))) errors.push(`${f.label} must be between ${f.min} and ${f.max}`);
        break;
      case 'enum':
        if (!f.options?.includes(v as string)) errors.push(`${f.label} must be one of ${f.options?.join(', ')}`);
        break;
      case 'date':
        if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) errors.push(`${f.label} must be a date (YYYY-MM-DD)`);
        break;
      case 'refs': case 'tags':
        if (!Array.isArray(v)) errors.push(`${f.label} must be a list`);
        break;
      case 'bool':
        if (typeof v !== 'boolean') errors.push(`${f.label} must be true/false`);
        break;
    }
  }
  return errors;
}

export const AREAS: { id: Area; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'stakeholders', label: 'Stakeholders' },
  { id: 'discover', label: 'Discover' },
  { id: 'define', label: 'Define' },
  { id: 'deliver', label: 'Deliver' },
  { id: 'learn', label: 'Learn' },
  { id: 'workspace', label: 'Workspace' },
];

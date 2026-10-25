import type { REVIEW_ROLES } from '../schema.ts';

export type ReviewRole = (typeof REVIEW_ROLES)[number];

export interface ReviewQuestion {
  role: ReviewRole;
  severity: 'info' | 'minor' | 'major' | 'critical';
  title: string;
  detail: string;
  anchor?: string;
}

interface Check {
  role: ReviewRole;
  severity: ReviewQuestion['severity'];
  /** Relevant if the spec matches this (omit = always relevant). */
  when?: RegExp;
  /** Satisfied if the spec matches this. */
  unless: RegExp;
  title: string;
  detail: string;
}

export const ROLE_INFO: Record<ReviewRole, { name: string; focus: string }> = {
  developer: { name: 'Developer', focus: 'Feasibility, architecture, performance, edge cases in the implementation' },
  qa: { name: 'QA', focus: 'Testability, acceptance criteria, boundaries, negative paths' },
  security: { name: 'Security', focus: 'Authorisation, data exposure, abuse, file handling' },
  privacy: { name: 'Privacy', focus: 'Personal data, legal basis, retention, minimisation' },
  support: { name: 'Support', focus: 'What customers will ask, how they recover, help content' },
  data: { name: 'Data & Analytics', focus: 'Measurement, tracking plan, baselines' },
  legal: { name: 'Legal & Compliance', focus: 'Regulatory obligations, contracts, records retention' },
  accessibility: { name: 'Accessibility', focus: 'WCAG, keyboard, screen readers, contrast' },
  finance: { name: 'Finance', focus: 'Pricing, packaging, cost to serve' },
  ux: { name: 'UX', focus: 'Flows, states, destructive actions, design artefacts' },
};

const CHECKS: Check[] = [
  // Developer
  { role: 'developer', severity: 'major', when: /\b(export|import|bulk|report|sync|batch|generate)\w*/i, unless: /\b(async|asynchronous|background|queue|job|worker)\b/i,
    title: 'Is this synchronous?', detail: 'Large exports/imports usually need a background job with progress, retries and a size cap. Specify whether the request blocks the user.' },
  { role: 'developer', severity: 'major', when: /\b(schedul|recurring|daily|weekly|monthly|cron)\w*/i, unless: /\b(time ?zone|utc|local time)\b/i,
    title: 'In which time zone do schedules run?', detail: 'Account time zone, user time zone or UTC? What happens around DST changes and month-end?' },
  { role: 'developer', severity: 'minor', when: /\b(api|integration|webhook)\b/i, unless: /\b(rate limit|throttl|quota)\w*/i,
    title: 'Rate limits and quotas?', detail: 'Define per-tenant limits and the error returned when exceeded.' },
  { role: 'developer', severity: 'minor', when: /\b(search|filter|sort)\w*/i, unless: /\b(p95|p99|index|latency|within \d)/i,
    title: 'Performance target for search/filter?', detail: 'Give a p95 target at a stated data volume so engineering can size indexes.' },
  { role: 'developer', severity: 'major', when: /\b(existing|legacy|migrat|replace)\w*/i, unless: /\b(backfill|migration plan|existing data|existing records)\b/i,
    title: 'What happens to existing data?', detail: 'Is a migration or backfill required? Who runs it and how is it verified?' },
  // QA
  { role: 'qa', severity: 'major', unless: /\b(given|acceptance criteria|then)\b/i,
    title: 'No acceptance criteria', detail: 'Add Given/When/Then scenarios for the happy path and at least one negative path per requirement.' },
  { role: 'qa', severity: 'minor', when: /\b(filter|search|list|table|results)\b/i, unless: /\b(empty|no results|zero|nothing)\b/i,
    title: 'Empty result behaviour?', detail: 'What does the user see when a filter matches nothing? Can they still export an empty file?' },
  { role: 'qa', severity: 'minor', when: /\b(limit|max|maximum|up to)\b/i, unless: /\b(exceed|above the limit|more than the|over the limit)\w*/i,
    title: 'Behaviour above the limit?', detail: 'Define the message and fallback when the limit is exceeded, and test the boundary (limit, limit+1).' },
  { role: 'qa', severity: 'minor', when: /\b(date range|period|from .* to|between)\b/i, unless: /\b(inclusive|exclusive)\b/i,
    title: 'Are date ranges inclusive?', detail: 'State whether start and end dates are inclusive, and in which time zone the boundaries are evaluated.' },
  // Security
  { role: 'security', severity: 'critical', when: /\b(export|download|share|file|report)\w*/i, unless: /\b(permission|authori[sz]|role|access control|rbac)\w*/i,
    title: 'Who is allowed to do this?', detail: 'Exports bypass the UI\'s field-level restrictions. Specify which roles can export and whether field permissions apply to the file.' },
  { role: 'security', severity: 'major', when: /\b(link|url|share|email(ed)? (a|the) file)\b/i, unless: /\b(expir|signed|token|one-time)\w*/i,
    title: 'Do links to files expire?', detail: 'Download links sent by email must be signed and time-limited.' },
  { role: 'security', severity: 'major', when: /\b(upload|import|attach)\w*/i, unless: /\b(virus|malware|scan|validat|sanitiz)\w*/i,
    title: 'Are uploaded files validated?', detail: 'Type/size validation, malware scanning and formula-injection protection for CSV/XLSX.' },
  { role: 'security', severity: 'major', when: /\b(csv|xlsx|excel|spreadsheet)\b/i, unless: /\b(formula injection|csv injection|escape)\b/i,
    title: 'CSV/XLSX formula injection', detail: 'Values starting with =, +, − or @ can execute in spreadsheets. Escape them on export.' },
  // Privacy
  { role: 'privacy', severity: 'major', when: /\b(customer|email address|address|phone|contact|personal|line items?|names?)\b/i, unless: /\b(pii|personal data|gdpr|mask|redact|minimi[sz])\w*/i,
    title: 'Personal data involved?', detail: 'Identify personal data fields, the legal basis, and whether they can be masked or excluded.' },
  { role: 'privacy', severity: 'major', when: /\b(store|file|export|archive|generated)\w*/i, unless: /\b(retention|delete[sd]? after|expire|purge|\d+ days)\b/i,
    title: 'Retention of generated files?', detail: 'How long are generated files kept, and who can delete them?' },
  // Support
  { role: 'support', severity: 'major', when: /\b(async|background|schedul|job|queue)\w*/i, unless: /\b(notif|status|progress|email when)\w*/i,
    title: 'How will users know it finished — or failed?', detail: 'Without a notification or status page, expect "is it stuck?" tickets.' },
  { role: 'support', severity: 'minor', unless: /\b(help cent|documentation|faq|macro|support article|enablement)\w*/i,
    title: 'Support readiness', detail: 'Plan the help-centre article, support macros and a short internal training before launch.' },
  { role: 'support', severity: 'minor', when: /\b(error|fail)\w*/i, unless: /\b(error message|copy|wording)\b/i,
    title: 'Error message copy defined?', detail: 'Each failure mode should have user-facing copy that says what happened and what to do next.' },
  // Data
  { role: 'data', severity: 'major', unless: /\b(track|event|analytics|instrument|telemetry)\w*/i,
    title: 'No tracking plan', detail: 'Define the events and properties needed to measure the success metric before development starts.' },
  { role: 'data', severity: 'minor', when: /\b(metric|kpi|success|target)\b/i, unless: /\b(baseline|currently|today we)\b/i,
    title: 'Baseline for the success metric?', detail: 'State the current value so the result can be measured against it.' },
  // Legal
  { role: 'legal', severity: 'major', when: /\b(invoice|tax|financial|payment|ledger|accounting)\w*/i, unless: /\b(retention|audit|compliance|sox|regulat|statutory)\w*/i,
    title: 'Financial records obligations?', detail: 'Invoices and payment records often have statutory retention and audit requirements (e.g. 7–10 years).' },
  { role: 'legal', severity: 'minor', when: /\b(eu|europe|gdpr|germany|dach|uk|france)\b/i, unless: /\b(data residency|region|hosted in)\b/i,
    title: 'Data residency?', detail: 'Are files generated and stored in the customer\'s region?' },
  // Accessibility
  { role: 'accessibility', severity: 'major', when: /\b(button|screen|page|modal|dialog|form|table|chart|ui|menu)\b/i, unless: /\b(accessib|keyboard|screen reader|wcag|aria|contrast|focus)\w*/i,
    title: 'Accessibility criteria missing', detail: 'Add keyboard operation, focus order, screen-reader labels and contrast requirements (WCAG 2.2 AA).' },
  // Finance
  { role: 'finance', severity: 'minor', when: /\b(plan|tier|pricing|paid|upsell|premium|enterprise)\b/i, unless: /\b(entitle|packag|included in|available on)\w*/i,
    title: 'Which plans include this?', detail: 'Decide packaging and entitlements before launch so Sales and Billing are ready.' },
  { role: 'finance', severity: 'info', when: /\b(storage|compute|file|generate|export)\w*/i, unless: /\b(cost|budget|infrastructure)\b/i,
    title: 'Cost to serve?', detail: 'Estimate storage and compute cost at expected volume.' },
  // UX
  { role: 'ux', severity: 'minor', unless: /\b(figma|design|mockup|wireframe|prototype)\b/i,
    title: 'No design link', detail: 'Link the design or prototype so reviewers see the states being specified.' },
  { role: 'ux', severity: 'major', when: /\b(delete|remove|bulk|overwrite|cancel)\w*/i, unless: /\b(undo|confirm|dialog|restore)\w*/i,
    title: 'Destructive action without confirmation or undo?', detail: 'Bulk or destructive actions need a confirmation step or an undo window.' },
];

/** Deterministic Review Board: each role checks the spec for gaps it cares about. */
export function reviewSpec(markdown: string): ReviewQuestion[] {
  const text = markdown.replace(/^>.*$/gm, ''); // ignore quoted evidence
  const out: ReviewQuestion[] = [];
  for (const c of CHECKS) {
    const trigger = c.when ? c.when.exec(text) : null;
    if (c.when && !trigger) continue;
    if (c.unless.test(text)) continue;
    out.push({ role: c.role, severity: c.severity, title: c.title, detail: c.detail, anchor: trigger ? sentenceAround(text, trigger.index) : undefined });
  }
  const order = { critical: 0, major: 1, minor: 2, info: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

function sentenceAround(text: string, idx: number): string {
  const start = Math.max(text.lastIndexOf('\n', idx), text.lastIndexOf('. ', idx) + 1, 0);
  let end = text.indexOf('\n', idx);
  if (end < 0) end = text.length;
  return text.slice(start, end).replace(/^[\s.#*-]+/, '').trim().slice(0, 180);
}

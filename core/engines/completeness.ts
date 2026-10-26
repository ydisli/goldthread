export interface CompletenessItem {
  id: string;
  label: string;
  question: string;
  relevant: boolean;
  covered: boolean;
  /** Which trigger words made the item relevant. */
  triggeredBy: string[];
}

interface Check {
  id: string;
  label: string;
  question: string;
  triggers?: string[];
  coverage: string[];
}

const CHECKS: Check[] = [
  { id: 'problem', label: 'Problem statement', question: 'What customer problem does this solve, and for whom?', coverage: ['problem', 'pain', 'struggle', 'today,', 'currently'] },
  { id: 'metric', label: 'Success metric', question: 'How will we know it worked? Which metric moves, from what baseline, to what target?', coverage: ['metric', 'kpi', 'success', 'measure', 'target', 'baseline'] },
  { id: 'non-goals', label: 'Non-goals / out of scope', question: 'What are we explicitly not doing?', coverage: ['non-goal', 'non goal', 'out of scope', 'not in scope', 'won\'t', 'will not'] },
  { id: 'roles', label: 'Roles & permissions', question: 'Which roles can do this? What happens for roles that cannot?', coverage: ['role', 'permission', 'admin', 'access', 'authoriz', 'owner can', 'viewer'] },
  { id: 'empty', label: 'Empty states', question: 'What does the user see when there is no data?', coverage: ['empty state', 'no results', 'nothing to', 'zero ', 'no data', 'empty'] },
  { id: 'errors', label: 'Error handling', question: 'What can fail, and what does the user see and do when it does?', coverage: ['error', 'fail', 'retry', 'timeout', 'unavailable'] },
  { id: 'loading', label: 'Loading & progress', question: 'How is progress shown for slow operations?', coverage: ['loading', 'progress', 'spinner', 'skeleton', 'background', 'async'] },
  { id: 'a11y', label: 'Accessibility', question: 'Keyboard, screen reader, contrast, focus: which WCAG level?', coverage: ['accessib', 'screen reader', 'keyboard', 'wcag', 'contrast', 'aria'] },
  { id: 'analytics', label: 'Analytics events', question: 'Which events/properties do we track to measure the success metric?', coverage: ['track', 'event', 'analytics', 'instrument', 'telemetry'] },
  { id: 'rollout', label: 'Rollout & rollback', question: 'Feature flag? Who gets it first? When do we roll back?', coverage: ['feature flag', 'flag', 'rollout', 'roll out', 'rollback', 'roll back', 'beta', 'phased', 'cohort'] },
  { id: 'open-questions', label: 'Open questions', question: 'Are open questions listed with an owner?', coverage: ['open question', 'questions'] },
  { id: 'dependencies', label: 'Dependencies', question: 'Which teams, services or vendors does this depend on?', coverage: ['depend', 'requires the', 'blocked by', 'upstream', 'team'] },
  { id: 'support', label: 'Support & docs readiness', question: 'Help-centre article, support macros, sales enablement?', coverage: ['help center', 'help centre', 'documentation', 'docs', 'support', 'faq', 'enablement', 'macro'] },
  { id: 'limits', label: 'Limits & volumes', question: 'Maximum rows/size/items? What happens above the limit?', triggers: ['export', 'import', 'list', 'table', 'search', 'report', 'bulk', 'upload', 'download', 'batch'], coverage: ['limit', 'max', 'maximum', 'paginat', 'up to', 'rows', 'mb', 'gb', 'cap'] },
  { id: 'timezone', label: 'Time zones & locale', question: 'Which time zone are dates in? Locale-specific formats?', triggers: ['date', 'time', 'schedul', 'deadline', 'month', 'daily', 'weekly', 'period', 'calendar'], coverage: ['timezone', 'time zone', 'utc', 'locale', 'local time'] },
  { id: 'currency', label: 'Currency & rounding', question: 'Multi-currency? Rounding rules? Tax?', triggers: ['invoice', 'payment', 'price', 'amount', 'currency', 'billing', 'tax', 'refund'], coverage: ['currency', 'rounding', 'decimal', 'tax', 'vat'] },
  { id: 'notifications', label: 'Notifications', question: 'Who is notified, through which channel, and when?', triggers: ['schedul', 'async', 'background', 'approval', 'remind', 'export', 'assign', 'due'], coverage: ['notif', 'email', 'alert', 'in-app message'] },
  { id: 'audit', label: 'Audit trail', question: 'Must actions be logged for audit? Who can see the log?', triggers: ['delete', 'approve', 'payment', 'permission', 'admin', 'financial', 'invoice', 'refund'], coverage: ['audit', 'log', 'history', 'trail'] },
  { id: 'privacy', label: 'Personal data & retention', question: 'Is personal data involved? Masking, legal basis, retention period?', triggers: ['customer', 'email', 'address', 'personal', 'pii', 'phone', 'contact', 'export', 'download', 'name'], coverage: ['pii', 'personal data', 'gdpr', 'retention', 'privacy', 'consent', 'mask', 'redact'] },
  { id: 'security', label: 'Security', question: 'Authorisation checks, shared-link expiry, encryption, rate limits?', triggers: ['export', 'download', 'api', 'share', 'link', 'upload', 'webhook', 'integration'], coverage: ['authoriz', 'permission', 'access control', 'sso', 'token', 'encrypt', 'expire', 'signed url', 'rate limit'] },
  { id: 'concurrency', label: 'Concurrency & conflicts', question: 'What happens when two people edit at once, or a job runs twice?', triggers: ['edit', 'update', 'collaborat', 'simultaneous', 'sync', 'shared'], coverage: ['concurren', 'conflict', 'lock', 'simultaneous', 'last write', 'idempoten'] },
  { id: 'migration', label: 'Existing data & migration', question: 'What happens to existing records/customers? Backfill needed?', triggers: ['replace', 'migrat', 'existing', 'legacy', 'new field', 'rename', 'deprecat'], coverage: ['migrat', 'backfill', 'existing data', 'existing records', 'existing customers'] },
  { id: 'performance', label: 'Performance', question: 'Response-time or throughput target (e.g. p95)?', triggers: ['export', 'search', 'report', 'load', 'bulk', 'large', 'dashboard', 'sync'], coverage: ['p95', 'p99', 'latency', 'seconds', ' ms', 'performance', 'within', 'throughput'] },
  { id: 'platforms', label: 'Platforms & API parity', question: 'Web only? Mobile? Public API?', triggers: ['screen', 'button', 'page', 'ui', 'view', 'modal'], coverage: ['mobile', 'api', 'responsive', 'ios', 'android', 'web only'] },
  { id: 'i18n', label: 'Localisation', question: 'Which languages? Who translates new strings?', triggers: ['label', 'message', 'notification', 'email', 'copy', 'text'], coverage: ['i18n', 'translat', 'locali', 'language'] },
  { id: 'undo', label: 'Undo & recovery', question: 'Can destructive actions be undone or confirmed?', triggers: ['delete', 'remove', 'bulk', 'archive', 'overwrite', 'cancel'], coverage: ['undo', 'restore', 'recover', 'soft delete', 'confirm'] },
];

/** Check which commonly-forgotten topics a spec covers. */
export function completeness(text: string): CompletenessItem[] {
  const t = ` ${text.toLowerCase()} `;
  return CHECKS.map((c) => {
    const triggeredBy = (c.triggers ?? []).filter((w) => t.includes(w));
    const relevant = !c.triggers || triggeredBy.length > 0;
    const covered = c.coverage.some((w) => t.includes(w));
    return { id: c.id, label: c.label, question: c.question, relevant, covered, triggeredBy };
  });
}

export function completenessScore(items: CompletenessItem[]): number {
  const rel = items.filter((i) => i.relevant);
  if (!rel.length) return 100;
  return Math.round((rel.filter((i) => i.covered).length / rel.length) * 100);
}

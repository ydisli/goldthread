import { daysBetween, fmtMoney } from '../../../core/util.ts';

export function humanize(s: unknown): string {
  if (s === undefined || s === null || s === '') return '–';
  const t = String(s).replace(/[-_]/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(s: string | undefined | null, opts: { year?: boolean } = {}): string {
  if (!s) return '–';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const thisYear = new Date().getFullYear();
  const y = Number(m[1]);
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}${opts.year || y !== thisYear ? ` ${y}` : ''}`;
}

/** "in 3 days", "2 days ago", "today". */
export function relDays(s: string | undefined | null, now = new Date()): string {
  if (!s) return '';
  const d = daysBetween(now, s);
  if (Number.isNaN(d)) return '';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return 'yesterday';
  if (d > 0) return d < 60 ? `in ${d} days` : `in ${Math.round(d / 30)} months`;
  return -d < 60 ? `${-d} days ago` : `${Math.round(-d / 30)} months ago`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtNum(n: unknown, digits = 0): string {
  if (n === undefined || n === null || n === '' || Number.isNaN(Number(n))) return '–';
  const v = Number(n);
  if (Math.abs(v) >= 10000) return `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export const money = fmtMoney;

export function pct(n: number | undefined | null, digits = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '–';
  return `${(n * 100).toFixed(digits)}%`;
}

export type Tone = 'red' | 'amber' | 'green' | 'blue' | 'violet' | 'accent' | '';

/** Map common status/severity values to a badge tone. */
export function toneOf(value: unknown): Tone {
  const v = String(value ?? '');
  if (['critical', 'blocked', 'fail', 'failed', 'broken', 'rejected', 'off-track', 'overdue', 'high', 's1-critical', 'resistant', 'escalated', 'missed', 'killed', 'invalidated', 'rolled-back', 'one-way-door', 'lost', 'falling', 'occurred', 'issue'].includes(v)) return 'red';
  if (['at-risk', 'medium', 'major', 'warning', 'changes-requested', 'in-review', 'testing', 'triaging', 'negotiating', 'mitigating', 'pending', 's2-major', 'due-soon', 'partial', 'deprecated', 'volatile', 'risk', 'not-run', 'proposed', 'open'].includes(v)) return 'amber';
  if (['done', 'approved', 'pass', 'success', 'kept', 'on-track', 'achieved', 'validated', 'resolved', 'released', 'shipped', 'measured', 'ga', 'verified', 'implemented', 'won', 'supportive', 'leading', 'rising', 'closed', 'ok', 'decided', 'persevere', 'low', 'fixed', 'accepted'].includes(v)) return 'green';
  if (['in-progress', 'in-delivery', 'running', 'committed', 'planned', 'ready', 'now', 'beta', 'discovery', 'active', 'info', 'dependency'].includes(v)) return 'blue';
  if (['next', 'alpha', 'idea', 'exploring', 'assumption', 'designing'].includes(v)) return 'violet';
  return '';
}

/** Deterministic avatar color for a person. */
export function avatarColor(seed: string): string {
  // White initials on each of these meet WCAG AA (4.5:1).
  const palette = ['#2874d0', '#c35022', '#15845d', '#a06a00', '#d03a71', '#008300', '#6250d6', '#df2c2b'];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

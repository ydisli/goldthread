import type { Entity } from '../../../../core/schema.ts';
import { QUADRANTS, SALIENCE, quadrant, salience, type AlignmentGap, type CommitmentRisk, type Touch } from '../../../../core/engines/stakeholders.ts';
import { Link } from '../../router.tsx';
import { Avatar, Badge } from '../../ui/kit.tsx';
import { humanize } from '../../ui/format.ts';
import { hrefOf } from '../../entity/links.ts';

export const ENGAGEMENT_COLOR: Record<string, string> = {
  unaware: 'var(--text-3)', resistant: 'var(--critical)', neutral: 'var(--warning)', supportive: 'var(--good)', leading: 'var(--s1)',
};

export function PersonLink({ s, sub }: { s: Entity | undefined; sub?: string }) {
  if (!s) return <span className="muted">—</span>;
  return (
    <Link to={hrefOf(s)} className="row" style={{ color: 'inherit', gap: 8, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
      <Avatar name={s.name} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span className="strong ellipsis" style={{ display: 'block' }}>{s.name}</span>
        {sub !== undefined ? <span className="small muted ellipsis" style={{ display: 'block' }}>{sub}</span> : s.title && <span className="small muted ellipsis" style={{ display: 'block' }}>{s.title}{s.account ? ` · ${s.account}` : ''}</span>}
      </span>
    </Link>
  );
}

export function QuadrantBadge({ s }: { s: Entity }) {
  const q = quadrant(s);
  return <Badge tone={q === 'manage-closely' ? 'accent' : ''} title={QUADRANTS[q].strategy}>{QUADRANTS[q].label}</Badge>;
}

export function SalienceBadge({ s }: { s: Entity }) {
  const k = salience(s);
  return <Badge tone={k === 'definitive' ? 'red' : k === 'dangerous' ? 'amber' : k === 'dominant' ? 'violet' : ''} title={SALIENCE[k].description}>{SALIENCE[k].label}</Badge>;
}

export function EngagementPill({ level }: { level: string | undefined }) {
  const l = level ?? 'neutral';
  return <span className="row" style={{ gap: 5, display: 'inline-flex' }}><span className="dot" style={{ background: ENGAGEMENT_COLOR[l] }} />{humanize(l)}</span>;
}

export function EngagementShift({ s }: { s: Entity }) {
  const same = (s.currentEngagement ?? 'neutral') === (s.desiredEngagement ?? 'supportive');
  return (
    <span className="row-wrap" style={{ gap: 6 }}>
      <EngagementPill level={s.currentEngagement} />
      {!same && <><span className="muted">→</span><EngagementPill level={s.desiredEngagement} /></>}
    </span>
  );
}

export function TouchBadge({ t }: { t: Touch }) {
  if (t.status === 'never') return <Badge tone="red">No contact yet</Badge>;
  if (t.status === 'overdue') return <Badge tone="red">{-t.dueIn!}d overdue</Badge>;
  if (t.status === 'due-soon') return <Badge tone="amber">Due {t.dueIn === 0 ? 'today' : `in ${t.dueIn}d`}</Badge>;
  return <Badge tone="green">{t.daysSince}d ago</Badge>;
}

export function RiskBadge({ r }: { r: CommitmentRisk }) {
  const tone = r.level === 'high' || r.level === 'broken' ? 'red' : r.level === 'medium' ? 'amber' : r.level === 'low' || r.level === 'kept' ? 'green' : '';
  const label = r.level === 'kept' ? 'Kept' : r.level === 'broken' ? 'Broken' : r.level === 'unknown' ? 'Unknown' : `${humanize(r.level)} risk${r.probability !== undefined && r.probability < 1 ? ` · ${Math.round(r.probability * 100)}%` : ''}`;
  return <Badge tone={tone as any} title={r.reason}>{label}</Badge>;
}

export function AlignmentList({ gaps }: { gaps: AlignmentGap[] }) {
  if (!gaps.length) return <div className="small muted">Everyone with a stake appears to be involved.</div>;
  return (
    <div className="col" style={{ gap: 8 }}>
      {gaps.map((x) => (
        <div key={x.stakeholder.id} className="row" style={{ alignItems: 'flex-start' }}>
          <span className={`sev ${x.severity === 'high' ? 'critical' : x.severity === 'medium' ? 'medium' : 'low'}`} />
          <div style={{ minWidth: 0 }}>
            <PersonLink s={x.stakeholder} sub={x.reason} />
          </div>
        </div>
      ))}
    </div>
  );
}

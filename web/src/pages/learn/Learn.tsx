import { calibration } from '../../../../core/engines/calibration.ts';
import { daysBetween } from '../../../../core/util.ts';
import { nameOf } from '../../../../core/schema.ts';
import { now, useGraph } from '../../store.ts';
import { Link, navigate } from '../../router.tsx';
import { activate, Badge, Card, Empty, PageHead, Stat, StatusBadge } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { CalibrationChart } from '../../ui/charts.tsx';
import { fmtDate, humanize, relDays } from '../../ui/format.ts';
import { EntityTable } from '../../entity/views.tsx';
import { RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';

export function LedgerPage() {
  const g = useGraph();
  const today = now();
  const bets = g.all('bet');
  const measured = bets.filter((b) => ['success', 'partial', 'failed', 'inconclusive'].includes(b.result));
  const cal = calibration(bets);
  const due = bets.filter((b) => b.status === 'shipped' && b.checkDate).sort((a, b) => String(a.checkDate).localeCompare(String(b.checkDate)));
  const noCheck = bets.filter((b) => ['shipped', 'in-delivery', 'committed'].includes(b.status) && !b.checkDate && b.category === 'feature');
  const success = measured.filter((b) => b.result === 'success').length;
  const record = (id: string) => openEditor({ type: 'bet', id, only: ['result', 'actualResult', 'learning', 'status'] });
  return (
    <div className="page">
      <PageHead title="Bet ledger" sub="Predicted vs actual for every bet. Over time this becomes your team's calibration: how much to trust a 70% confidence." />
      <div className="grid g4 mb16">
        <Stat label="Bets measured" value={measured.length} sub={`${due.length} awaiting measurement`} />
        <Stat label="Success rate" value={measured.length ? `${Math.round((success / measured.length) * 100)}%` : '—'} sub={`${success} success · ${measured.filter((b) => b.result === 'partial').length} partial · ${measured.filter((b) => b.result === 'failed').length} failed`} />
        <Stat label="Calibration bias" value={cal.bias === null ? '—' : `${cal.bias > 0 ? '+' : ''}${Math.round(cal.bias * 100)} pts`} tone={cal.bias !== null && Math.abs(cal.bias) > 0.1 ? 'amber' : undefined} sub={cal.bias === null ? '' : cal.bias > 0 ? 'overconfident' : 'underconfident'} />
        <Stat label="Brier score" value={cal.brier === null ? '—' : cal.brier.toFixed(2)} sub="0 = perfect, 0.25 = coin flip" />
      </div>
      <div className="grid g-side mb16">
        <Card title="Awaiting measurement" icon="target" flush>
          {due.length === 0 ? <Empty icon="target">Nothing shipped is waiting for measurement.</Empty> : (
            <div className="list">{due.map((b) => {
              const late = daysBetween(today, b.checkDate) < 0;
              return (
                <div key={b.id} className="list-item" style={{ alignItems: 'center' }}>
                  <div className="grow"><Link to={hrefOf(b)} className="strong" style={{ color: 'inherit' }}>{b.title}</Link><div className="small muted">Predicted {b.predictedChange ?? '—'} on <RefChip id={b.metricId} /> · confidence {b.confidence}%</div></div>
                  <Badge tone={late ? 'red' : daysBetween(today, b.checkDate) <= 7 ? 'amber' : ''}>measure {relDays(b.checkDate, today)}</Badge>
                  <button className="btn btn-sm btn-primary" onClick={() => record(b.id)}>Record result</button>
                </div>
              );
            })}</div>
          )}
          {noCheck.length > 0 && <div className="small" style={{ padding: 12, color: 'var(--amber)' }}><Icon name="triangle-alert" size={12} /> No measurement date set: {noCheck.map((b) => b.title).join(', ')}</div>}
        </Card>
        <Card title="Calibration" icon="target" sub={cal.verdict}>
          {cal.buckets.length ? <CalibrationChart buckets={cal.buckets} /> : <Empty icon="target">Record results to see calibration.</Empty>}
        </Card>
      </div>
      <Card title="Predicted vs actual" icon="scale" flush className="mb16">
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Bet</th><th>Confidence</th><th>Predicted</th><th>Actual</th><th>Result</th></tr></thead>
          <tbody>{measured.map((b) => (
            <tr key={b.id} className="clickable" {...activate(() => navigate(hrefOf(b)), null)}>
              <td className="strong">{b.title}</td><td className="num">{b.confidence}%</td><td>{b.predictedChange ?? '—'}</td><td className="small">{b.actualResult ?? '—'}</td><td><StatusBadge value={b.result} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <Card title="Learnings" icon="lightbulb" flush>
        <div className="list">{measured.filter((b) => b.learning).map((b) => (
          <div key={b.id} className="list-item"><Icon name="lightbulb" size={15} className="muted" /><div className="grow"><div>{b.learning}</div><div className="small muted">{b.title} · {humanize(b.result)}</div></div></div>
        ))}</div>
      </Card>
    </div>
  );
}

export function FeaturesPage() {
  const g = useGraph();
  const today = now();
  const features = g.all('feature');
  const candidates = features.filter((f) => f.status === 'ga' && Number(f.adoption) < 10 && f.maintenanceCost !== 'low' && f.launchedAt && daysBetween(f.launchedAt, today) > 90);
  const STAGES = ['alpha', 'beta', 'ga', 'deprecated', 'sunset'];
  return (
    <div className="page">
      <PageHead title="Feature catalog" sub="What the product does today: lifecycle, adoption and cost — so removing things is as deliberate as adding them." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'feature' })}><Icon name="plus" size={14} />New feature</button>} />
      {candidates.length > 0 && (
        <Card title={`Removal candidates · ${candidates.length}`} icon="trash-2" sub="GA for 90+ days, under 10% adoption, and not cheap to maintain." className="mb16" flush>
          <div className="list">{candidates.map((f) => (
            <div key={f.id} className="list-item" style={{ alignItems: 'center' }}>
              <div className="grow"><Link to={hrefOf(f)} className="strong" style={{ color: 'inherit' }}>{f.name}</Link><div className="small muted">{f.adoption}% adoption · {f.adoptionTrend} · {f.maintenanceCost} maintenance · launched {fmtDate(f.launchedAt)}</div></div>
              <button className="btn btn-sm" onClick={() => openEditor({ type: 'decision', defaults: { title: `Sunset ${f.name}?`, status: 'proposed', relatedIds: [f.id], context: `${f.adoption}% adoption, ${f.maintenanceCost} maintenance cost.` } })}>Propose sunset</button>
            </div>
          ))}</div>
        </Card>
      )}
      <div className="board mb16" style={{ gridAutoColumns: 'minmax(200px, 1fr)' }}>
        {STAGES.map((s) => (
          <div key={s} className="lane">
            <div className="lane-head"><StatusBadge value={s} /><span className="muted small">{features.filter((f) => f.status === s).length}</span></div>
            {features.filter((f) => f.status === s).sort((a, b) => (Number(b.adoption) || 0) - (Number(a.adoption) || 0)).map((f) => (
              <Link key={f.id} to={hrefOf(f)} className="tile">
                <div className="strong small">{f.name}</div>
                <div className="row small mt8"><span className="num">{f.adoption ?? '—'}%</span><Badge tone={f.adoptionTrend === 'rising' ? 'green' : f.adoptionTrend === 'falling' ? 'red' : ''}>{f.adoptionTrend ?? 'flat'}</Badge>{f.maintenanceCost === 'high' && <Badge tone="amber">high cost</Badge>}</div>
              </Link>
            ))}
          </div>
        ))}
      </div>
      <Card flush><EntityTable type="feature" columns={['name', 'status', 'adoption', 'adoptionTrend', 'maintenanceCost', 'plan', 'ownerId', 'launchedAt']} /></Card>
      <p className="small muted mt12">Owner of most features: {nameOf(g.me)}. Link features to bets to see which bets produced them.</p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ENGAGEMENT, type Entity } from '../../../../core/schema.ts';
import { QUADRANTS, SALIENCE, engagementGap, engagementIndex, influenceNetwork, pathToInfluence, quadrant, salience } from '../../../../core/engines/stakeholders.ts';
import { updateEntity, useGraph } from '../../store.ts';
import { setQuery, useRoute } from '../../router.tsx';
import { Card, PageHead, Tabs, errorToast, Term } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { Legend, Network, QuadrantScatter } from '../../ui/charts.tsx';
import { humanize } from '../../ui/format.ts';
import { ENGAGEMENT_COLOR, EngagementShift, PersonLink, QuadrantBadge } from './common.tsx';
import { goToStakeholder } from './Overview.tsx';

type MapTab = 'grid' | 'salience' | 'engagement' | 'influence';

export function StakeholderMapsPage() {
  const { query } = useRoute();
  const tab = (query.get('tab') ?? 'grid') as MapTab;
  return (
    <div className="page">
      <PageHead guide={<ToolGuide id="maps" title="Reading the maps" steps={[
        <><b>Power / interest:</b> people top-right are key players — manage them closely; top-left keep satisfied; bottom-right keep informed.</>,
        <><Term explain="Mitchell's model: does the person have power, a legitimate claim, and urgency? Those with all three are 'definitive' stakeholders.">Salience</Term> shows who needs attention first.</>,
        <><b>Engagement</b> compares where someone is today (say, resistant) with where you need them (supportive). The gap is your work.</>,
      ]} />} title="Stakeholder maps" sub="Four lenses on the same people: power & interest, salience, engagement gaps and who influences whom." />
      <Tabs value={tab} onChange={(t) => setQuery({ tab: t })} tabs={[
        { id: 'grid', label: <><Icon name="grid-3x3" size={14} />Power / interest</> },
        { id: 'salience', label: <><Icon name="target" size={14} />Salience</> },
        { id: 'engagement', label: <><Icon name="trending-up" size={14} />Engagement matrix</> },
        { id: 'influence', label: <><Icon name="network" size={14} />Influence network</> },
      ]} />
      {tab === 'grid' && <PowerInterest />}
      {tab === 'salience' && <Salience />}
      {tab === 'engagement' && <EngagementMatrix />}
      {tab === 'influence' && <Influence />}
    </div>
  );
}

const engagementLegend = ENGAGEMENT.map((l) => ({ label: humanize(l), color: ENGAGEMENT_COLOR[l], shape: 'dot' as const }));

function PowerInterest() {
  const g = useGraph();
  const people = g.all('stakeholder').filter((s) => s.id !== g.me?.id);
  const points = people.map((s) => ({
    id: s.id, x: Number(s.interest) || 3, y: Number(s.power) || 3, label: String(s.name).split(' ')[0], color: ENGAGEMENT_COLOR[s.currentEngagement ?? 'neutral'],
    tip: <><div className="t-title">{s.name}</div><div>{s.title}</div><div>Power {s.power} · interest {s.interest}</div><div>{humanize(s.currentEngagement)} → {humanize(s.desiredEngagement)}</div><div className="muted">{QUADRANTS[quadrant(s)].strategy}</div></>,
  }));
  return (
    <div className="grid g-side">
      <Card title="Power / interest grid" icon="grid-3x3" sub="Colour = current engagement. Click a person to open their profile.">
        <QuadrantScatter points={points} xLabel="Interest" yLabel="Power / influence" quadrants={['Keep satisfied', 'Manage closely', 'Monitor', 'Keep informed']} onClick={goToStakeholder} />
        <div className="mt12"><Legend items={engagementLegend} /></div>
      </Card>
      <div className="stack">
        {(Object.keys(QUADRANTS) as (keyof typeof QUADRANTS)[]).map((q) => {
          const list = people.filter((s) => quadrant(s) === q);
          return (
            <Card key={q} title={`${QUADRANTS[q].label} · ${list.length}`} sub={`${QUADRANTS[q].strategy} Default cadence: every ${QUADRANTS[q].cadence} days.`}>
              <div className="col" style={{ gap: 8 }}>{list.map((s) => <PersonLink key={s.id} s={s} />)}{!list.length && <span className="muted small">Nobody here.</span>}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Salience() {
  const g = useGraph();
  const people = g.all('stakeholder').filter((s) => s.id !== g.me?.id);
  const order = ['definitive', 'dominant', 'dangerous', 'dependent', 'dormant', 'discretionary', 'demanding', 'none'];
  const toggle = async (s: Entity, key: 'legitimacy' | 'urgency') => {
    try { await updateEntity(s.id, { [key]: !s[key] }); } catch (err) { errorToast(err); }
  };
  return (
    <>
      <p className="muted small mb16">Mitchell, Agle & Wood: <strong>power</strong> (score ≥ 4), <strong>legitimacy</strong> (a rightful claim — contract, role, regulation) and <strong>urgency</strong> (time-critical claim). The more attributes, the more salient. Toggle attributes inline.</p>
      <div className="grid g2">
        {order.map((k) => {
          const list = people.filter((s) => salience(s) === k);
          if (!list.length) return null;
          return (
            <Card key={k} title={`${SALIENCE[k].label} · ${list.length}`} sub={SALIENCE[k].description} flush>
              <div className="list">
                {list.map((s) => (
                  <div key={s.id} className="list-item" style={{ alignItems: 'center' }}>
                    <div className="grow"><PersonLink s={s} /></div>
                    <span className="badge" title="Power ≥ 4">{Number(s.power) >= 4 ? '● Power' : '○ Power'}</span>
                    <button className={`btn btn-sm ${s.legitimacy ? 'btn-primary' : ''}`} onClick={() => toggle(s, 'legitimacy')}>Legitimacy</button>
                    <button className={`btn btn-sm ${s.urgency ? 'btn-primary' : ''}`} onClick={() => toggle(s, 'urgency')}>Urgency</button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function EngagementMatrix() {
  const g = useGraph();
  const people = g.all('stakeholder').filter((s) => s.id !== g.me?.id).sort((a, b) => engagementGap(b).gap - engagementGap(a).gap || (Number(b.power) || 0) - (Number(a.power) || 0));
  const set = async (s: Entity, key: 'currentEngagement' | 'desiredEngagement', level: string) => {
    try { await updateEntity(s.id, { [key]: level }); } catch (err) { errorToast(err); }
  };
  return (
    <Card title="Stakeholder engagement assessment matrix" icon="trending-up" sub="C = current, D = desired. Click a cell to set current; shift-click to set desired. The gap drives the suggested move." flush>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Stakeholder</th>{ENGAGEMENT.map((l) => <th key={l} className="center">{humanize(l)}</th>)}<th>Next move</th></tr></thead>
          <tbody>
            {people.map((s) => {
              const gap = engagementGap(s);
              return (
                <tr key={s.id}>
                  <td style={{ minWidth: 200 }}><PersonLink s={s} /></td>
                  {ENGAGEMENT.map((l) => {
                    const c = (s.currentEngagement ?? 'neutral') === l, d = (s.desiredEngagement ?? 'supportive') === l;
                    const between = engagementIndex(l) > engagementIndex(gap.current) && engagementIndex(l) < engagementIndex(gap.desired);
                    return (
                      <td key={l} className="center" style={{ cursor: 'pointer', background: between ? 'var(--accent-soft)' : undefined }} onClick={(e) => set(s, e.shiftKey ? 'desiredEngagement' : 'currentEngagement', l)} title={`Set ${l}`}>
                        <span className="row" style={{ justifyContent: 'center', gap: 4 }}>
                          {c && <span className="badge solid" style={{ background: ENGAGEMENT_COLOR[l], color: '#fff' }}>C</span>}
                          {d && <span className="badge accent">D</span>}
                          {!c && !d && <span className="muted">·</span>}
                        </span>
                      </td>
                    );
                  })}
                  <td className="small" style={{ minWidth: 260 }}>{gap.action ?? <span className="muted">Maintain — at desired level.</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Influence() {
  const g = useGraph();
  const people = g.all('stakeholder');
  const net = useMemo(() => influenceNetwork(people), [people]);
  const [sel, setSel] = useState<string | null>(null);
  const sorted = [...people].sort((a, b) => ENGAGEMENT.indexOf(a.currentEngagement) - ENGAGEMENT.indexOf(b.currentEngagement));
  const nodes = sorted.map((s) => ({
    id: s.id, label: String(s.name).split(' ')[0], color: ENGAGEMENT_COLOR[s.currentEngagement ?? 'neutral'], r: 5 + (Number(s.power) || 1) * 1.6,
    tip: <><div className="t-title">{s.name}</div><div>{s.title}</div><div>Influence score {net.get(s.id)?.score.toFixed(1)}</div><div>Influences {net.get(s.id)?.influences.length ?? 0} · listens to {net.get(s.id)?.influencedBy.length ?? 0}</div></>,
  }));
  const edges = people.flatMap((s) => ((s.influencedBy ?? []) as string[]).map((from) => ({ from, to: s.id })));
  const top = [...net.values()].filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  const targets = people.filter((s) => s.id !== g.me?.id && quadrant(s) !== 'monitor' && engagementGap(s).gap > 0 && net.get(s.id)?.influencedBy.length);
  return (
    <div className="grid g-side">
      <Card title="Who influences whom" icon="network" sub="Arrows point from influencer to influenced. Node size = power, colour = engagement. Hover to isolate.">
        <Network nodes={nodes} edges={edges} onClick={(id) => setSel(id === sel ? null : id)} highlight={sel} />
        <div className="mt12"><Legend items={engagementLegend} /></div>
        <div className="small muted mt8">Add influence links on a stakeholder's profile (“Influenced by”).</div>
      </Card>
      <div className="stack">
        <Card title="Most influential" icon="star" flush>
          <div className="list">{top.map((x) => {
            const s = g.get(x.id)!;
            return <div key={x.id} className="list-item"><div className="grow"><PersonLink s={s} sub={`Influences ${x.influences.map((i) => String(i.name).split(' ')[0]).join(', ')}`} /></div><span className="badge num">{x.score.toFixed(1)}</span></div>;
          })}</div>
        </Card>
        <Card title="Path to influence" icon="route" sub="To move someone, start with the people they listen to who already support you." flush>
          <div className="list">{targets.map((t) => {
            const via = pathToInfluence(t, net, people);
            return (
              <div key={t.id} className="list-item" style={{ flexDirection: 'column', gap: 6 }}>
                <div className="row"><PersonLink s={t} /><span className="spacer" /><QuadrantBadge s={t} /></div>
                <EngagementShift s={t} />
                <div className="small">Talk to: {via.map((v, i) => <span key={v.id}>{i ? ', ' : ''}<strong>{v.name}</strong> <span className="muted">({v.currentEngagement})</span></span>)}</div>
              </div>
            );
          })}{!targets.length && <div className="empty">No engagement gaps with known influencers.</div>}</div>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Entity } from '../../../../core/schema.ts';
import { invest, readiness, splitHints, validateGherkin } from '../../../../core/engines/hygiene.ts';
import { createEntity, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link, navigate } from '../../router.tsx';
import { Badge, Card, PageHead, StatusBadge, errorToast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { EntityPage, EntityTable } from '../../entity/views.tsx';
import { RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';

interface Activity { id: string; name: string; steps: { id: string; name: string }[] }
interface Slice { id: string; name: string }

export function StoryMapsPage() {
  const g = useGraph();
  const maps = g.all('storyMap');
  if (maps.length === 1) return <StoryMapPage id={maps[0].id} />;
  return (
    <div className="page">
      <PageHead title="Story maps" sub="User story mapping: the backbone of user activities, with stories sliced into releases." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'storyMap', defaults: { activities: [{ id: 'a1', name: 'First activity', steps: [{ id: 's1', name: 'First step' }] }], slices: [{ id: 'sl1', name: 'MVP' }, { id: 'sl2', name: 'Next' }] } })}><Icon name="plus" size={14} />New story map</button>} />
      <Card flush><EntityTable type="storyMap" /></Card>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = { backlog: 'var(--border-strong)', ready: 'var(--s1)', 'in-progress': 'var(--warning)', 'in-review': 'var(--s7)', done: 'var(--good)' };

export function StoryMapPage({ id }: { id: string }) {
  const map = useEntity(id);
  const g = useGraph();
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  if (!map) return <EntityPage id={id} />;
  const activities: Activity[] = map.activities ?? [];
  const slices: Slice[] = map.slices ?? [];
  const steps = activities.flatMap((a) => a.steps.map((s) => ({ ...s, activity: a })));
  const stories = g.all('story').filter((s) => s.storyMapId === map.id);
  const unplaced = g.all('story').filter((s) => map.betId && s.betId === map.betId && !s.storyMapId && s.status !== 'done');
  const save = (patch: Record<string, unknown>) => updateEntity(map.id, patch).catch(errorToast);
  const moveTo = (storyId: string, stepId: string, sliceId: string) => updateEntity(storyId, { storyMapId: map.id, mapStepId: stepId, sliceId }).catch(errorToast);
  const add = async (stepId: string, sliceId: string) => {
    if (!draft.trim()) { setAdding(null); return; }
    try { await createEntity('story', { title: draft.trim(), storyMapId: map.id, mapStepId: stepId, sliceId, betId: map.betId, status: 'backlog' }); setDraft(''); } catch (err) { errorToast(err); }
  };
  const addActivity = () => { const n = prompt('Activity (what the user is trying to do)'); if (n) save({ activities: [...activities, { id: `a${Date.now().toString(36)}`, name: n, steps: [{ id: `s${Date.now().toString(36)}`, name: 'Step' }] }] }); };
  const addStep = (a: Activity) => { const n = prompt(`New step in “${a.name}”`); if (n) save({ activities: activities.map((x) => (x.id === a.id ? { ...x, steps: [...x.steps, { id: `s${Date.now().toString(36)}`, name: n }] } : x)) }); };
  const renameStep = (a: Activity, sid: string) => { const st = a.steps.find((s) => s.id === sid)!; const n = prompt('Rename step', st.name); if (n) save({ activities: activities.map((x) => (x.id === a.id ? { ...x, steps: x.steps.map((s) => (s.id === sid ? { ...s, name: n } : s)) } : x)) }); };
  const addSlice = () => { const n = prompt('Release slice name'); if (n) save({ slices: [...slices, { id: `sl${Date.now().toString(36)}`, name: n }] }); };
  const cols = `repeat(${steps.length}, minmax(170px, 1fr))`;
  const Tile = ({ s }: { s: Entity }) => (
    <div className="tile" draggable onDragStart={() => setDrag(s.id)} onDragEnd={() => setDrag(null)} onClick={() => navigate(hrefOf(s))} style={{ borderLeft: `3px solid ${STATUS_COLOR[s.status] ?? 'var(--border)'}`, padding: '6px 8px' }}>
      <div className="small">{s.key && <span className="key">{s.key} </span>}{s.title}</div>
      <div className="row tiny muted mt8" style={{ gap: 6 }}>{s.status}{s.estimate ? ` · ${s.estimate} pts` : ''}{s.externalKey && <span className="key">{s.externalKey}</span>}</div>
    </div>
  );
  return (
    <div className="page page-wide">
      <PageHead
        crumbs={<><Icon name="map" size={13} /><Link to="/define/story-map">Story maps</Link></>}
        title={map.title}
        sub={<span className="row-wrap">{map.betId && <>Bet <RefChip id={map.betId} /></>}{map.personaId && <>for <RefChip id={map.personaId} /></>}<span className="small muted">Drag stories between cells. The line between slices is a release boundary.</span></span>}
        actions={<><button className="btn" onClick={addActivity}>+ Activity</button><button className="btn" onClick={addSlice}>+ Slice</button></>}
      />
      <div className="smap" style={{ gridTemplateColumns: cols }}>
        {activities.map((a) => (
          <div key={a.id} className="smap-activity row" style={{ gridColumn: `span ${a.steps.length}` }}>
            <span className="grow">{a.name}</span>
            <button className="btn btn-sm btn-ghost" style={{ color: 'inherit' }} onClick={() => addStep(a)} title="Add step"><Icon name="plus" size={12} /></button>
          </div>
        ))}
        {steps.map((s) => <div key={s.id} className="smap-step" onDoubleClick={() => renameStep(s.activity, s.id)} title="Double-click to rename">{s.name}</div>)}
        {slices.map((sl) => (
          <div key={sl.id} style={{ display: 'contents' }}>
            <div className="smap-slice"><Icon name="milestone" size={13} />{sl.name}<span className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>· {stories.filter((x) => x.sliceId === sl.id).length} stories · {stories.filter((x) => x.sliceId === sl.id).reduce((t, x) => t + (Number(x.estimate) || 0), 0)} pts</span></div>
            {steps.map((st) => {
              const key = `${st.id}|${sl.id}`;
              const cell = stories.filter((x) => x.mapStepId === st.id && x.sliceId === sl.id);
              return (
                <div key={key} className="smap-cell" style={over === key ? { outline: '2px dashed var(--accent)' } : undefined}
                  onDragOver={(e) => { e.preventDefault(); setOver(key); }} onDragLeave={() => setOver(null)}
                  onDrop={(e) => { e.preventDefault(); setOver(null); if (drag) void moveTo(drag, st.id, sl.id); }}>
                  {cell.map((s) => <Tile key={s.id} s={s} />)}
                  {adding === key ? (
                    <input className="input input-sm" autoFocus value={draft} placeholder="Story title, Enter" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(st.id, sl.id); if (e.key === 'Escape') setAdding(null); }} onBlur={() => void add(st.id, sl.id).then(() => setAdding(null))} />
                  ) : <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { setAdding(key); setDraft(''); }}><Icon name="plus" size={12} /></button>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {unplaced.length > 0 && (
        <Card title={`Not on the map yet · ${unplaced.length}`} icon="kanban" sub="Stories of this bet — drag them onto the map." className="mt16">
          <div className="row-wrap" style={{ gap: 8 }}>{unplaced.map((s) => <div key={s.id} style={{ width: 220 }}><Tile s={s} /></div>)}</div>
        </Card>
      )}
    </div>
  );
}

/** Story detail with INVEST, readiness, Gherkin checks and splitting hints. */
export function StoryPanels({ s }: { s: Entity }) {
  const inv = invest(s);
  const ready = readiness(s);
  const gherkin = s.acceptance ? validateGherkin(s.acceptance) : [];
  const hints = splitHints(s);
  return (
    <div className="grid g2">
      <Card title="INVEST" icon="list-checks">
        <div className="col" style={{ gap: 6 }}>{inv.map((c) => <div key={c.key} className="row small"><Badge tone={c.ok ? 'green' : 'amber'}>{c.key}</Badge><span className="strong" style={{ width: 90 }}>{c.label}</span><span className="muted">{c.hint}</span></div>)}</div>
      </Card>
      <Card title="Definition of Ready" icon="clipboard-check" actions={<StatusBadge value={ready.ok ? 'ready' : 'not-run'} label={ready.ok ? 'Ready' : 'Not ready'} />}>
        {ready.ok ? <div className="small">Meets the Definition of Ready.</div> : <div className="col" style={{ gap: 4 }}>{ready.missing.map((m) => <div key={m} className="small row"><Icon name="circle-alert" size={13} className="err" />{m}</div>)}</div>}
        {gherkin.length > 0 && s.acceptance && <div className="mt12">{gherkin.map((x, i) => <div key={i} className="small" style={{ color: 'var(--amber)' }}>{x.message}</div>)}</div>}
        {hints.length > 0 && <div className="mt12"><div className="label mb8">Split it</div>{hints.map((h) => <div key={h} className="small">• {h}</div>)}</div>}
      </Card>
    </div>
  );
}

export function StoryPage({ id }: { id: string }) {
  const s = useEntity(id);
  if (!s) return <EntityPage id={id} />;
  return (
    <EntityPage id={id}>
      <StoryPanels s={s} />
    </EntityPage>
  );
}


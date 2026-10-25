import { useMemo, useState } from 'react';
import { analyzeDecisionTable, generateTests, type DTAction, type DTCondition, type DTRule, type HitPolicy } from '../../../../core/engines/decisionTable.ts';
import { analyzeStateModel, type Transition } from '../../../../core/engines/stateModel.ts';
import { batch, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link } from '../../router.tsx';
import { Badge, Card, Empty, PageHead, Seg, Stat, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { useTooltip } from '../../ui/charts.tsx';
import { EntityPage, EntityTable } from '../../entity/views.tsx';
import { RefChip } from '../../entity/fields.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';

// ---------------- Decision tables ----------------

export function DecisionTablesPage() {
  const g = useGraph();
  return (
    <div className="page">
      <PageHead title="Decision tables" sub="Business rules as tables (DMN-style): every combination checked for gaps and conflicts, and tests generated automatically." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'decisionTable', defaults: { conditions: [{ name: 'Condition', values: ['yes', 'no'] }], actions: [{ name: 'Outcome' }], rules: [] } })}><Icon name="plus" size={14} />New table</button>} />
      <Card flush>
        <EntityTable type="decisionTable" columns={['title', 'requirementId', 'hitPolicy', { key: 'state', label: 'Analysis', render: (d) => {
          const a = analyzeDecisionTable(d.conditions ?? [], d.actions ?? [], d.rules ?? [], d.hitPolicy);
          return <span className="chips">{a.complete ? <Badge tone="green">complete</Badge> : <Badge tone="red">{a.gaps.length} gaps</Badge>}{a.consistent ? <Badge tone="green">consistent</Badge> : <Badge tone="red">{a.overlaps.length} overlaps</Badge>}</span>;
        } }]} />
      </Card>
      {!g.all('decisionTable').length && <Empty icon="table-2">No decision tables yet.</Empty>}
    </div>
  );
}

export function DecisionTablePage({ id }: { id: string }) {
  const dt = useEntity(id);
  const g = useGraph();
  const [mode, setMode] = useState<'pairwise' | 'all'>('pairwise');
  if (!dt) return <EntityPage id={id} />;
  const conditions: DTCondition[] = dt.conditions ?? [];
  const actions: DTAction[] = dt.actions ?? [];
  const rules: DTRule[] = dt.rules ?? [];
  const policy: HitPolicy = dt.hitPolicy ?? 'unique';
  const analysis = analyzeDecisionTable(conditions, actions, rules, policy);
  const tests = generateTests(conditions, actions, rules, policy, mode);
  const save = (patch: Record<string, unknown>) => updateEntity(dt.id, patch).catch(errorToast);
  const setRule = (i: number, part: 'when' | 'then', key: string, v: string) => save({ rules: rules.map((r, k) => (k === i ? { ...r, [part]: { ...r[part], [key]: v } } : r)) });
  const nextId = () => `R${Math.max(0, ...rules.map((r) => Number(r.id.replace(/\D/g, '')) || 0)) + 1}`;
  const addRule = (when: Record<string, string> = {}) => save({ rules: [...rules, { id: nextId(), when: Object.fromEntries(conditions.map((c) => [c.name, when[c.name] ?? '-'])), then: Object.fromEntries(actions.map((a) => [a.name, ''])) }] });
  const editCondition = (i: number) => {
    const c = conditions[i];
    const name = prompt('Condition name', c.name)?.trim();
    if (!name) return;
    const values = prompt('Possible values (comma-separated)', c.values.join(', '))?.split(',').map((x) => x.trim()).filter(Boolean);
    if (!values?.length) return;
    save({ conditions: conditions.map((x, k) => (k === i ? { name, values } : x)), rules: rules.map((r) => { const { [c.name]: v, ...rest } = r.when; return { ...r, when: { ...rest, [name]: v ?? '-' } }; }) });
  };
  const addCondition = () => {
    const name = prompt('Condition name')?.trim();
    const values = prompt('Possible values (comma-separated)', 'yes, no')?.split(',').map((x) => x.trim()).filter(Boolean);
    if (!name || !values?.length) return;
    save({ conditions: [...conditions, { name, values }], rules: rules.map((r) => ({ ...r, when: { ...r.when, [name]: '-' } })) });
  };
  const addAction = () => {
    const name = prompt('Action / outcome name')?.trim();
    if (!name) return;
    save({ actions: [...actions, { name }] });
  };
  const createTests = async () => {
    try {
      await batch(tests.map((t) => ({ op: 'create' as const, type: 'testCase', data: {
        title: `${dt.title}: ${Object.entries(t.inputs).map(([k, v]) => `${k}=${v}`).join(', ')}`, kind: 'acceptance',
        requirementIds: dt.requirementId ? [dt.requirementId] : [], steps: Object.entries(t.inputs).map(([k, v]) => `Given ${k} is ${v}`).join('\n'),
        expected: t.expected ? Object.entries(t.expected).map(([k, v]) => `${k}: ${v}`).join('\n') : 'UNDEFINED — no rule covers this combination', status: 'not-run',
      } })));
      toast(`${tests.length} test cases created`);
    } catch (err) { errorToast(err); }
  };
  const gapRule = (gap: Record<string, string>) => addRule(gap);
  return (
    <div className="page page-wide">
      <PageHead
        crumbs={<><Icon name="table-2" size={13} /><Link to="/define/decision-tables">Decision tables</Link></>}
        title={dt.title}
        sub={<span className="row-wrap">{dt.requirementId && <>Implements <RefChip id={dt.requirementId} /></>} <span className="small muted">{analysis.combinations} combinations</span></span>}
        actions={<><span className="small muted">Hit policy</span><Seg value={policy} onChange={(v) => save({ hitPolicy: v })} options={[{ id: 'unique', label: 'Unique' }, { id: 'first', label: 'First' }, { id: 'any', label: 'Any' }]} /><button className="btn" onClick={() => openEditor({ type: 'decisionTable', id: dt.id })}>Edit</button></>}
      />
      <div className="grid g4 mb16">
        <Stat label="Rules" value={rules.length} />
        <Stat label="Gaps" value={analysis.gaps.length} tone={analysis.gaps.length ? 'red' : 'green'} sub="combinations no rule covers" />
        <Stat label="Overlaps" value={analysis.overlaps.length} tone={analysis.overlaps.length ? 'red' : 'green'} sub={`${analysis.overlaps.filter((o) => o.conflicting).length} with conflicting outcomes`} />
        <Stat label="Unused rules" value={analysis.unusedRules.length} sub="never fire" />
      </div>
      <Card flush className="mb16">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rule</th>
                {conditions.map((c, i) => <th key={c.name} style={{ background: 'var(--blue-soft)', cursor: 'pointer' }} onClick={() => editCondition(i)} title="Click to edit">IF {c.name}<div className="tiny muted">{c.values.join(' · ')}</div></th>)}
                {actions.map((a) => <th key={a.name} style={{ background: 'var(--green-soft)' }}>THEN {a.name}</th>)}
                <th className="tight"><div className="row"><button className="btn btn-sm" onClick={addCondition}>+ IF</button><button className="btn btn-sm" onClick={addAction}>+ THEN</button></div></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => {
                const overlapping = analysis.overlaps.some((o) => o.ruleIds.includes(r.id));
                const unused = analysis.unusedRules.includes(r.id);
                return (
                  <tr key={r.id} style={overlapping ? { background: 'var(--red-soft)' } : unused ? { opacity: 0.6 } : undefined}>
                    <td className="key">{r.id}{overlapping && <Icon name="circle-alert" size={12} className="err" />}</td>
                    {conditions.map((c) => (
                      <td key={c.name}>
                        <select className="select input-sm" value={r.when[c.name] ?? '-'} onChange={(e) => setRule(i, 'when', c.name, e.target.value)}>
                          <option value="-">– (any)</option>{c.values.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                    ))}
                    {actions.map((a) => <td key={a.name}><input className="input input-sm" defaultValue={r.then[a.name] ?? ''} onBlur={(e) => e.target.value !== (r.then[a.name] ?? '') && setRule(i, 'then', a.name, e.target.value)} /></td>)}
                    <td className="tight"><button className="btn btn-ghost btn-sm btn-icon" onClick={() => save({ rules: rules.filter((_, k) => k !== i) })}><Icon name="trash-2" size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 10 }}><button className="btn btn-sm" onClick={() => addRule()}><Icon name="plus" size={13} />Add rule</button></div>
      </Card>
      <div className="grid g2">
        <Card title={`Gaps · ${analysis.gaps.length}`} icon="circle-alert" sub="Combinations that no rule covers — the system has no defined behaviour." flush>
          {analysis.gaps.length === 0 ? <Empty icon="circle-check">Complete: every combination is covered.</Empty> : (
            <div className="list">{analysis.gaps.slice(0, 30).map((gp, i) => (
              <div key={i} className="list-item" style={{ alignItems: 'center' }}>
                <div className="grow small">{Object.entries(gp).map(([k, v]) => <span key={k} className="chip" style={{ marginRight: 4 }}>{k} = {v === '-' ? 'any' : v}</span>)}</div>
                <button className="btn btn-sm" onClick={() => gapRule(gp)}>Add rule</button>
              </div>
            ))}</div>
          )}
        </Card>
        <Card title={`Overlaps · ${analysis.overlaps.length}`} icon="split" sub={policy === 'unique' ? 'Unique hit policy: at most one rule may match.' : 'Rules that match the same input with different outcomes.'} flush>
          {analysis.overlaps.length === 0 ? <Empty icon="circle-check">Consistent.</Empty> : (
            <div className="list">{analysis.overlaps.slice(0, 30).map((o, i) => (
              <div key={i} className="list-item small"><div className="grow">{Object.entries(o.combo).map(([k, v]) => `${k}=${v}`).join(', ')}</div><span>{o.ruleIds.join(' & ')}</span>{o.conflicting && <Badge tone="red">conflict</Badge>}</div>
            ))}</div>
          )}
          {analysis.invalidValues.length > 0 && <div className="small err" style={{ padding: 12 }}>Invalid values: {analysis.invalidValues.map((v) => `${v.ruleId}.${v.condition}=${v.value}`).join(', ')}</div>}
        </Card>
      </div>
      <Card title={`Generated tests · ${tests.length}`} icon="circle-check" className="mt16" sub={mode === 'pairwise' ? 'Pairwise: every pair of condition values appears in at least one test — far fewer tests, same pair coverage.' : 'Every combination.'}
        actions={<><Seg value={mode} onChange={setMode} options={[{ id: 'pairwise', label: 'Pairwise' }, { id: 'all', label: `All (${analysis.combinations})` }]} /><button className="btn btn-sm btn-primary" onClick={createTests}>Create {tests.length} test cases</button></>} flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Test</th>{conditions.map((c) => <th key={c.name}>{c.name}</th>)}<th>Expected</th><th>Rule</th></tr></thead>
            <tbody>{tests.map((t) => (
              <tr key={t.id}><td className="key">{t.id}</td>{conditions.map((c) => <td key={c.name}>{t.inputs[c.name]}</td>)}<td>{t.expected ? Object.entries(t.expected).map(([k, v]) => `${k}: ${v || '–'}`).join(' · ') : <Badge tone="red">undefined</Badge>}</td><td className="key">{t.ruleId ?? '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------- Process models ----------------

interface Step { id: string; lane: string; label: string; kind: 'start' | 'task' | 'decision' | 'end'; next: string[] }

function layout(steps: Step[]) {
  const col = new Map<string, number>();
  const start = steps.find((s) => s.kind === 'start') ?? steps[0];
  if (start) {
    col.set(start.id, 0);
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      const s = steps.find((x) => x.id === id);
      for (const n of s?.next ?? []) if (!col.has(n)) { col.set(n, (col.get(id) ?? 0) + 1); queue.push(n); }
    }
  }
  let extra = Math.max(0, ...col.values()) + 1;
  for (const s of steps) if (!col.has(s.id)) col.set(s.id, extra++);
  return col;
}

export function processMetrics(steps: Step[]) {
  const byId = new Map(steps.map((s) => [s.id, s]));
  let handoffs = 0, loops = 0;
  const col = layout(steps);
  for (const s of steps) for (const n of s.next) {
    const t = byId.get(n);
    if (!t) continue;
    if (t.lane !== s.lane) handoffs++;
    if ((col.get(n) ?? 0) <= (col.get(s.id) ?? 0)) loops++;
  }
  return { steps: steps.filter((s) => s.kind === 'task').length, decisions: steps.filter((s) => s.kind === 'decision').length, handoffs, loops, lanes: new Set(steps.map((s) => s.lane)).size };
}

export function Swimlane({ lanes, steps }: { lanes: string[]; steps: Step[] }) {
  const tt = useTooltip();
  const col = layout(steps);
  const LW = 120, CW = 176, LH = 92, BW = 144, BH = 46;
  const cols = Math.max(1, ...[...col.values()].map((c) => c + 1));
  // Avoid two steps in the same lane+column.
  const pos = new Map<string, { x: number; y: number }>();
  const taken = new Set<string>();
  for (const s of [...steps].sort((a, b) => (col.get(a.id) ?? 0) - (col.get(b.id) ?? 0))) {
    let c = col.get(s.id) ?? 0;
    const li = Math.max(0, lanes.indexOf(s.lane));
    while (taken.has(`${li}:${c}`)) c++;
    taken.add(`${li}:${c}`);
    pos.set(s.id, { x: LW + c * CW + (CW - BW) / 2, y: li * LH + (LH - BH) / 2 });
  }
  const W = LW + Math.max(cols, ...[...taken].map((k) => Number(k.split(':')[1]) + 1)) * CW + 20, H = lanes.length * LH;
  return (
    <div className="chart" style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W, width: W, height: H }} role="img" aria-label="Swimlane process diagram">
        <defs><marker id="parrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--text-2)" /></marker></defs>
        {lanes.map((l, i) => (
          <g key={l}>
            <rect x={0} y={i * LH} width={W} height={LH} fill={i % 2 ? 'var(--surface-2)' : 'transparent'} />
            <line x1={0} x2={W} y1={(i + 1) * LH} y2={(i + 1) * LH} className="grid-line" />
            <text x={10} y={i * LH + LH / 2 + 4} style={{ fill: 'var(--text)', fontWeight: 600, fontSize: 12 }}>{l}</text>
          </g>
        ))}
        <line x1={LW - 8} x2={LW - 8} y1={0} y2={H} className="axis-line" />
        {steps.flatMap((s) => s.next.map((n) => {
          const a = pos.get(s.id), b = pos.get(n);
          if (!a || !b) return null;
          const back = b.x <= a.x;
          const x1 = a.x + BW, y1 = a.y + BH / 2, x2 = b.x, y2 = b.y + BH / 2;
          const d = back ? `M${a.x + BW / 2},${a.y + BH} C${a.x + BW / 2},${a.y + BH + 40} ${b.x + BW / 2},${b.y + BH + 40} ${b.x + BW / 2},${b.y + BH + 2}` : `M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2 - 2},${y2}`;
          return <path key={`${s.id}-${n}`} d={d} fill="none" stroke="var(--text-2)" strokeWidth={1.5} markerEnd="url(#parrow)" strokeDasharray={back ? '4 3' : undefined} />;
        }))}
        {steps.map((s) => {
          const p = pos.get(s.id)!;
          const cx = p.x + BW / 2, cy = p.y + BH / 2;
          const tip = <><div className="t-title">{s.label}</div><div>{s.lane} · {s.kind}</div></>;
          return (
            <g key={s.id} onPointerMove={(e) => tt.show(e, tip)} onPointerLeave={tt.hide}>
              {s.kind === 'start' || s.kind === 'end' ? (
                <circle cx={cx} cy={cy} r={18} fill={s.kind === 'start' ? 'var(--green-soft)' : 'var(--red-soft)'} stroke={s.kind === 'start' ? 'var(--good)' : 'var(--critical)'} strokeWidth={s.kind === 'end' ? 3 : 2} />
              ) : s.kind === 'decision' ? (
                <path d={`M${cx},${p.y - 4} L${p.x + BW - 30},${cy} L${cx},${p.y + BH + 4} L${p.x + 30},${cy} Z`} fill="var(--amber-soft)" stroke="var(--warning)" strokeWidth={1.5} />
              ) : (
                <rect x={p.x} y={p.y} width={BW} height={BH} rx={8} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={1.5} />
              )}
              <foreignObject x={s.kind === 'start' || s.kind === 'end' ? cx - 70 : p.x + 4} y={s.kind === 'start' || s.kind === 'end' ? cy + 18 : p.y + 2} width={s.kind === 'start' || s.kind === 'end' ? 140 : BW - 8} height={s.kind === 'start' || s.kind === 'end' ? 30 : BH - 4}>
                <div style={{ fontSize: 11, lineHeight: 1.25, height: '100%', display: 'flex', alignItems: s.kind === 'start' || s.kind === 'end' ? 'flex-start' : 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text)', overflow: 'hidden' }}>{s.label}</div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      {tt.node}
    </div>
  );
}

export function ProcessListPage() {
  return (
    <div className="page">
      <PageHead title="Process models" sub="Swimlane models of how work flows today (as-is) and after the change (to-be) — compared step by step." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'processModel', defaults: { lanes: ['User', 'System'], steps: [{ id: 's1', lane: 'User', label: 'Start', kind: 'start', next: ['s2'] }, { id: 's2', lane: 'System', label: 'Do something', kind: 'task', next: ['s3'] }, { id: 's3', lane: 'User', label: 'Done', kind: 'end', next: [] }] } })}><Icon name="plus" size={14} />New process</button>} />
      <Card flush><EntityTable type="processModel" columns={['title', 'variant', 'counterpartId', { key: 'm', label: 'Steps · handoffs', render: (p) => { const m = processMetrics(p.steps ?? []); return `${m.steps} · ${m.handoffs}`; } }]} /></Card>
    </div>
  );
}

export function ProcessPage({ id }: { id: string }) {
  const pm = useEntity(id);
  const g = useGraph();
  if (!pm) return <EntityPage id={id} />;
  const steps: Step[] = pm.steps ?? [];
  const lanes: string[] = pm.lanes ?? [];
  const other = g.get(pm.counterpartId);
  const save = (patch: Record<string, unknown>) => updateEntity(pm.id, patch).catch(errorToast);
  const setStep = (i: number, k: keyof Step, v: unknown) => save({ steps: steps.map((s, x) => (x === i ? { ...s, [k]: v } : s)) });
  const addStep = () => {
    const id = `s${Date.now().toString(36)}`;
    save({ steps: [...steps, { id, lane: lanes[0] ?? 'Lane', label: 'New step', kind: 'task', next: [] }] });
  };
  const removeStep = (sid: string) => save({ steps: steps.filter((s) => s.id !== sid).map((s) => ({ ...s, next: s.next.filter((n) => n !== sid) })) });
  const m = processMetrics(steps);
  const om = other ? processMetrics(other.steps ?? []) : null;
  const labels = new Set(steps.map((s) => s.label.toLowerCase()));
  const otherLabels = new Set(((other?.steps ?? []) as Step[]).map((s) => s.label.toLowerCase()));
  return (
    <EntityPage id={id} hideFields>
      <Card title={`${pm.title} (${pm.variant})`} icon="workflow" sub={pm.notes}><Swimlane lanes={lanes} steps={steps} /></Card>
      {other && om && (
        <Card title={`Compared with ${other.variant}`} icon="git-compare" actions={<Link className="btn btn-sm" to={hrefOf(other)}>Open {other.variant}</Link>}>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Measure</th><th className="num">{pm.variant}</th><th className="num">{other.variant}</th><th className="num">Δ</th></tr></thead>
            <tbody>{(['steps', 'handoffs', 'decisions', 'loops', 'lanes'] as const).map((k) => <tr key={k}><td>{k === 'steps' ? 'Task steps' : k === 'handoffs' ? 'Handoffs between lanes' : k === 'decisions' ? 'Decision points' : k === 'loops' ? 'Rework loops' : 'Lanes involved'}</td><td className="num">{m[k]}</td><td className="num">{om[k]}</td><td className="num">{m[k] - om[k] > 0 ? '+' : ''}{m[k] - om[k]}</td></tr>)}</tbody>
          </table></div>
          <div className="grid g2 mt12">
            <div><div className="label mb8">Only in {pm.variant}</div>{steps.filter((s) => s.kind === 'task' && !otherLabels.has(s.label.toLowerCase())).map((s) => <div key={s.id} className="small">• {s.label} <span className="muted">({s.lane})</span></div>)}</div>
            <div><div className="label mb8">Only in {other.variant}</div>{((other.steps ?? []) as Step[]).filter((s) => s.kind === 'task' && !labels.has(s.label.toLowerCase())).map((s) => <div key={s.id} className="small">• {s.label} <span className="muted">({s.lane})</span></div>)}</div>
          </div>
        </Card>
      )}
      <Card title="Steps" icon="list-checks" actions={<><button className="btn btn-sm" onClick={() => { const l = prompt('New lane name'); if (l) save({ lanes: [...lanes, l] }); }}>+ Lane</button><button className="btn btn-sm" onClick={addStep}>+ Step</button></>} flush>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Step</th><th>Lane</th><th>Kind</th><th>Goes to</th><th /></tr></thead>
          <tbody>{steps.map((s, i) => (
            <tr key={s.id}>
              <td><input className="input input-sm" defaultValue={s.label} onBlur={(e) => e.target.value !== s.label && setStep(i, 'label', e.target.value)} /></td>
              <td><select className="select input-sm" value={s.lane} onChange={(e) => setStep(i, 'lane', e.target.value)}>{lanes.map((l) => <option key={l}>{l}</option>)}</select></td>
              <td><select className="select input-sm" value={s.kind} onChange={(e) => setStep(i, 'kind', e.target.value)}>{['start', 'task', 'decision', 'end'].map((k) => <option key={k}>{k}</option>)}</select></td>
              <td><div className="row-wrap" style={{ gap: 4 }}>{steps.filter((x) => x.id !== s.id).map((x) => <label key={x.id} className="chip" style={{ cursor: 'pointer', background: s.next.includes(x.id) ? 'var(--accent-soft)' : undefined }}><input type="checkbox" checked={s.next.includes(x.id)} onChange={(e) => setStep(i, 'next', e.target.checked ? [...s.next, x.id] : s.next.filter((n) => n !== x.id))} style={{ display: 'none' }} />{x.label}</label>)}</div></td>
              <td className="tight"><button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeStep(s.id)}><Icon name="trash-2" size={13} /></button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
    </EntityPage>
  );
}

// ---------------- State models ----------------

export function StateModelPage({ id }: { id: string }) {
  const sm = useEntity(id);
  const [tr, setTr] = useState<Transition>({ from: '', to: '', trigger: '' });
  if (!sm) return <EntityPage id={id} />;
  const states: string[] = sm.states ?? [];
  const finals: string[] = sm.finals ?? [];
  const transitions: Transition[] = sm.transitions ?? [];
  const issues = analyzeStateModel(states, sm.initial, finals, transitions);
  const save = (patch: Record<string, unknown>) => updateEntity(sm.id, patch).catch(errorToast);
  return (
    <EntityPage id={id} hideFields>
      <Card title="Lifecycle" icon="circle-dot"><StateDiagram states={states} initial={sm.initial} finals={finals} transitions={transitions} problem={new Set(issues.filter((i) => i.state && i.severity !== 'info').map((i) => i.state!))} /></Card>
      <div className="grid g2">
        <Card title={`Checks · ${issues.length}`} icon="list-checks" flush>
          {issues.length === 0 ? <Empty icon="circle-check">Every state is reachable, nothing is stuck, transitions are deterministic.</Empty> : <div className="list">{issues.map((i, k) => <div key={k} className="list-item small"><Badge tone={i.severity === 'error' ? 'red' : i.severity === 'warning' ? 'amber' : ''}>{i.severity}</Badge><span className="grow">{i.message}</span></div>)}</div>}
        </Card>
        <Card title="States" icon="circle-dot">
          <div className="col" style={{ gap: 6 }}>
            {states.map((s) => (
              <div key={s} className="row small">
                <span className="grow strong">{s}</span>
                <label className="check"><input type="radio" name="initial" checked={sm.initial === s} onChange={() => save({ initial: s })} />initial</label>
                <label className="check"><input type="checkbox" checked={finals.includes(s)} onChange={(e) => save({ finals: e.target.checked ? [...finals, s] : finals.filter((x) => x !== s) })} />final</label>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => save({ states: states.filter((x) => x !== s), transitions: transitions.filter((t) => t.from !== s && t.to !== s) })}><Icon name="trash-2" size={12} /></button>
              </div>
            ))}
            <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { const s = prompt('State name')?.trim(); if (s && !states.includes(s)) save({ states: [...states, s] }); }}>+ State</button>
          </div>
        </Card>
      </div>
      <Card title="Transitions" icon="arrow-right" flush>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>From</th><th>To</th><th>Trigger</th><th>Guard</th><th /></tr></thead>
          <tbody>
            {transitions.map((t, i) => <tr key={i}><td>{t.from}</td><td>{t.to}</td><td>{t.trigger}</td><td className="muted">{t.guard ?? '—'}</td><td className="tight"><button className="btn btn-ghost btn-sm btn-icon" onClick={() => save({ transitions: transitions.filter((_, k) => k !== i) })}><Icon name="trash-2" size={12} /></button></td></tr>)}
            <tr>
              <td><select className="select input-sm" value={tr.from} onChange={(e) => setTr({ ...tr, from: e.target.value })}><option value="">from…</option>{states.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><select className="select input-sm" value={tr.to} onChange={(e) => setTr({ ...tr, to: e.target.value })}><option value="">to…</option>{states.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><input className="input input-sm" placeholder="trigger" value={tr.trigger} onChange={(e) => setTr({ ...tr, trigger: e.target.value })} /></td>
              <td><input className="input input-sm" placeholder="guard (optional)" value={tr.guard ?? ''} onChange={(e) => setTr({ ...tr, guard: e.target.value || undefined })} /></td>
              <td className="tight"><button className="btn btn-sm" disabled={!tr.from || !tr.to || !tr.trigger} onClick={() => { save({ transitions: [...transitions, tr] }); setTr({ from: '', to: '', trigger: '' }); }}>Add</button></td>
            </tr>
          </tbody>
        </table></div>
      </Card>
    </EntityPage>
  );
}

function StateDiagram({ states, initial, finals, transitions, problem }: { states: string[]; initial?: string; finals: string[]; transitions: Transition[]; problem: Set<string> }) {
  const depth = useMemo(() => {
    const d = new Map<string, number>();
    if (initial) {
      d.set(initial, 0);
      const q = [initial];
      while (q.length) {
        const s = q.shift()!;
        for (const t of transitions) if (t.from === s && !d.has(t.to)) { d.set(t.to, d.get(s)! + 1); q.push(t.to); }
      }
    }
    let extra = Math.max(0, ...d.values()) + 1;
    for (const s of states) if (!d.has(s)) d.set(s, extra++);
    return d;
  }, [states, initial, transitions]);
  const cols = new Map<number, string[]>();
  for (const s of states) cols.set(depth.get(s)!, [...(cols.get(depth.get(s)!) ?? []), s]);
  const CW = 170, RH = 80, BW = 120, BH = 38;
  const maxRows = Math.max(1, ...[...cols.values()].map((c) => c.length));
  const W = Math.max(1, cols.size) * CW + 40, H = maxRows * RH + 40;
  const pos = new Map<string, { x: number; y: number }>();
  [...cols.entries()].sort((a, b) => a[0] - b[0]).forEach(([c, list], ci) => list.forEach((s, ri) => pos.set(s, { x: 20 + ci * CW, y: 20 + ri * RH + ((maxRows - list.length) * RH) / 2 })));
  return (
    <div className="chart" style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W, width: W, height: H }} role="img" aria-label="State diagram">
        <defs><marker id="sarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--text-2)" /></marker></defs>
        {transitions.map((t, i) => {
          const a = pos.get(t.from), b = pos.get(t.to);
          if (!a || !b) return null;
          const back = b.x <= a.x;
          const x1 = back ? a.x + BW / 2 : a.x + BW, y1 = back ? a.y + BH : a.y + BH / 2, x2 = back ? b.x + BW / 2 : b.x, y2 = back ? b.y + BH : b.y + BH / 2;
          const mx = (x1 + x2) / 2, my = back ? Math.max(y1, y2) + 34 : (y1 + y2) / 2 - (a.y === b.y ? 0 : 0);
          const d = back ? `M${x1},${y1} Q${mx},${my} ${x2},${y2 + 2}` : `M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2 - 2},${y2}`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--text-2)" strokeWidth={1.5} markerEnd="url(#sarrow)" strokeDasharray={back ? '4 3' : undefined} />
              <text x={mx} y={back ? my - 2 : my - 6} textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--text-2)' }}>{t.trigger}{t.guard ? ` [${t.guard}]` : ''}</text>
            </g>
          );
        })}
        {states.map((s) => {
          const p = pos.get(s)!;
          const final = finals.includes(s), init = s === initial;
          return (
            <g key={s}>
              <rect x={p.x} y={p.y} width={BW} height={BH} rx={19} fill={init ? 'var(--accent-soft)' : 'var(--surface)'} stroke={problem.has(s) ? 'var(--critical)' : final ? 'var(--text)' : 'var(--border-strong)'} strokeWidth={final ? 3 : 1.5} />
              <text x={p.x + BW / 2} y={p.y + BH / 2 + 4} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 12, fontWeight: 600 }}>{s}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


import { useMemo, useState } from 'react';
import { analyzeDecisionTable, generateTests, type DTAction, type DTCondition, type DTRule, type HitPolicy } from '../../../../core/engines/decisionTable.ts';
import { analyzeStateModel, type Transition } from '../../../../core/engines/stateModel.ts';
import { batch, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link } from '../../router.tsx';
import { Badge, Card, Empty, PageHead, Seg, Stat, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
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
      <PageHead guide={<ToolGuide id="decision-tables" title="Business rules as tables" steps={[
        <>Each column is a condition and each row a rule. Goldthread checks every combination of inputs.</>,
        <><b>Gaps</b> (no rule applies) and <b>overlaps</b> (two rules disagree) are flagged with the exact inputs.</>,
        <>Test cases are generated for you — hand them to QA as they are.</>,
      ]} />} title="Decision tables" sub="Business rules as tables (DMN-style): every combination checked for gaps and conflicts, and tests generated automatically." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'decisionTable', defaults: { conditions: [{ name: 'Condition', values: ['yes', 'no'] }], actions: [{ name: 'Outcome' }], rules: [] } })}><Icon name="plus" size={14} />New table</button>} />
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
                        <select aria-label={`Rule ${i + 1}: ${c.name}`} className="select input-sm" value={r.when[c.name] ?? '-'} onChange={(e) => setRule(i, 'when', c.name, e.target.value)}>
                          <option value="-">– (any)</option>{c.values.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                    ))}
                    {actions.map((a) => <td key={a.name}><input aria-label={`Rule ${i + 1}: ${a.name}`} className="input input-sm" defaultValue={r.then[a.name] ?? ''} onBlur={(e) => e.target.value !== (r.then[a.name] ?? '') && setRule(i, 'then', a.name, e.target.value)} /></td>)}
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
              <td><select aria-label="From state" className="select input-sm" value={tr.from} onChange={(e) => setTr({ ...tr, from: e.target.value })}><option value="">from…</option>{states.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><select aria-label="To state" className="select input-sm" value={tr.to} onChange={(e) => setTr({ ...tr, to: e.target.value })}><option value="">to…</option>{states.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><input aria-label="Trigger" className="input input-sm" placeholder="trigger" value={tr.trigger} onChange={(e) => setTr({ ...tr, trigger: e.target.value })} /></td>
              <td><input aria-label="Guard" className="input input-sm" placeholder="guard (optional)" value={tr.guard ?? ''} onChange={(e) => setTr({ ...tr, guard: e.target.value || undefined })} /></td>
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


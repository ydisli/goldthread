import { useMemo, useState } from 'react';
import { nameOf, type Entity } from '../../../../core/schema.ts';
import { extractFromNotes } from '../../../../core/engines/extract.ts';
import { analyzeStateModel } from '../../../../core/engines/stateModel.ts';
import { escapeRegex, isoDate } from '../../../../core/util.ts';
import { batch, now, updateEntity, useEntity, useGraph } from '../../store.ts';
import { Link, setQuery, useRoute } from '../../router.tsx';
import { Badge, Card, Empty, PageHead, Tabs, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { EntityPage, EntityTable } from '../../entity/views.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';

type Tool = 'elicitation' | 'usecases' | 'states' | 'data' | 'gap' | 'capability' | 'swot' | 'rootcause';
const TOOLS: { id: Tool; label: string; icon: string; type: string; blurb: string }[] = [
  { id: 'elicitation', label: 'Elicitation', icon: 'users', type: 'elicitation', blurb: 'Plan interviews, workshops and observation; turn notes into requirements, decisions and actions.' },
  { id: 'usecases', label: 'Use cases', icon: 'list-tree', type: 'useCase', blurb: 'Actor goals with main, alternate and exception flows.' },
  { id: 'states', label: 'State models', icon: 'circle-dot', type: 'stateModel', blurb: 'Entity lifecycles, checked for unreachable states and dead ends.' },
  { id: 'data', label: 'Data dictionary', icon: 'boxes', type: 'dataEntity', blurb: 'Entities and attributes with PII classification.' },
  { id: 'gap', label: 'Gap analysis', icon: 'split', type: 'gapItem', blurb: 'Current state vs future state, and the actions that close the gap.' },
  { id: 'capability', label: 'Capability map', icon: 'combine', type: 'capability', blurb: 'Business capabilities with maturity now vs target and importance.' },
  { id: 'swot', label: 'SWOT', icon: 'grid-3x3', type: 'swot', blurb: 'Strengths, weaknesses, opportunities and threats.' },
  { id: 'rootcause', label: 'Root cause', icon: 'search', type: 'rootCause', blurb: '5 whys and fishbone categories.' },
];

export function ToolkitPage() {
  const { query } = useRoute();
  const g = useGraph();
  const tab = (query.get('tab') ?? 'elicitation') as Tool;
  const tool = TOOLS.find((t) => t.id === tab)!;
  return (
    <div className="page">
      <PageHead title="BA toolkit" sub="The analysis techniques business analysts use every day (BABOK), connected to the rest of the graph." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: tool.type })}><Icon name="plus" size={14} />New {tool.label.toLowerCase().replace(/s$/, '')}</button>} />
      <Tabs value={tab} onChange={(t) => setQuery({ tab: t })} tabs={TOOLS.map((t) => ({ id: t.id, label: <><Icon name={t.icon} size={14} />{t.label}</>, count: g.all(t.type).length }))} />
      <p className="muted small mb12">{tool.blurb}</p>
      {tab === 'capability' ? <CapabilityMap /> : tab === 'swot' ? <SwotView /> : tab === 'states' ? <StatesList /> : (
        <Card flush><EntityTable type={tool.type} /></Card>
      )}
    </div>
  );
}

function StatesList() {
  const g = useGraph();
  return (
    <Card flush>
      <EntityTable type="stateModel" columns={['title', { key: 'n', label: 'States', render: (s) => (s.states ?? []).length }, { key: 'checks', label: 'Checks', render: (s) => {
        const issues = analyzeStateModel(s.states ?? [], s.initial, s.finals ?? [], s.transitions ?? []).filter((i) => i.severity !== 'info');
        return issues.length ? <Badge tone="amber">{issues.length} issues</Badge> : <Badge tone="green">valid</Badge>;
      } }]} />
      {!g.all('stateModel').length && <Empty icon="circle-dot">No state models yet.</Empty>}
    </Card>
  );
}

function CapabilityMap() {
  const g = useGraph();
  const caps = g.all('capability');
  const roots = caps.filter((c) => !c.parentId || !g.get(c.parentId));
  const color = (gap: number) => (gap >= 3 ? 'var(--critical)' : gap === 2 ? 'var(--serious)' : gap === 1 ? 'var(--warning)' : 'var(--good)');
  return (
    <div className="col" style={{ gap: 14 }}>
      {roots.map((r) => {
        const kids = caps.filter((c) => c.parentId === r.id);
        return (
          <Card key={r.id} title={r.name} icon="combine" sub={r.description} actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'capability', defaults: { parentId: r.id } })}>+ Capability</button>}>
            <div className="grid g3">
              {kids.map((c) => {
                const gap = (Number(c.maturityTarget) || 0) - (Number(c.maturityNow) || 0);
                const gaps = g.referencing(c.id, 'gapItem', 'capabilityId');
                return (
                  <button key={c.id} className="card pad" style={{ textAlign: 'left', cursor: 'pointer', borderLeft: `4px solid ${color(gap)}` }} onClick={() => openEditor({ type: 'capability', id: c.id })}>
                    <div className="row"><span className="strong grow">{c.name}</span><Badge title="Strategic importance">imp {c.importance}</Badge></div>
                    <div className="small mt8">Maturity {c.maturityNow} → {c.maturityTarget} {gap > 0 ? <Badge tone={gap >= 2 ? 'red' : 'amber'}>gap {gap}</Badge> : <Badge tone="green">at target</Badge>}</div>
                    <div className="row mt8" style={{ gap: 3 }}>{[1, 2, 3, 4, 5].map((v) => <span key={v} style={{ flex: 1, height: 6, borderRadius: 3, background: v <= (c.maturityNow ?? 0) ? 'var(--s1)' : v <= (c.maturityTarget ?? 0) ? 'var(--seq-2)' : 'var(--surface-3)' }} />)}</div>
                    {gaps.length > 0 && <div className="small muted mt8">{gaps.length} gap actions</div>}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
      <div className="small muted">Bar: dark = maturity today, light = target. Border colour = size of the gap. Importance × gap tells you where to invest.</div>
    </div>
  );
}

function SwotView() {
  const g = useGraph();
  const list = g.all('swot');
  if (!list.length) return <Empty icon="grid-3x3">No SWOT yet.</Empty>;
  const QUAD: [string, string, string][] = [['strengths', 'Strengths', 'var(--green-soft)'], ['weaknesses', 'Weaknesses', 'var(--red-soft)'], ['opportunities', 'Opportunities', 'var(--blue-soft)'], ['threats', 'Threats', 'var(--amber-soft)']];
  return (
    <div className="col" style={{ gap: 14 }}>
      {list.map((s) => (
        <Card key={s.id} title={s.title} icon="grid-3x3" actions={<button className="btn btn-sm" onClick={() => openEditor({ type: 'swot', id: s.id })}>Edit</button>}>
          <div className="grid g2">
            {QUAD.map(([k, label, bg]) => (
              <div key={k} style={{ background: bg, borderRadius: 8, padding: 12, minHeight: 110 }}>
                <div className="label mb8">{label}</div>
                {String(s[k] ?? '').split('\n').filter(Boolean).map((l) => <div key={l} className="small">• {l}</div>)}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------- Elicitation detail with extraction ----------------

export function ElicitationPage({ id }: { id: string }) {
  const e = useEntity(id);
  if (!e) return <EntityPage id={id} />;
  return <EntityPage id={id}><ExtractPanel e={e} field="notes" /></EntityPage>;
}

/** Turn free-form notes into decisions, actions, risks and requirement candidates. */
export function ExtractPanel({ e, field }: { e: Entity; field: string }) {
  const g = useGraph();
  const x = useMemo(() => extractFromNotes(String(e[field] ?? ''), g.all('stakeholder'), now()), [e, field, g]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const total = x.decisions.length + x.actions.length + x.risks.length + x.requirements.length + x.questions.length;
  const keyOf = (kind: string, i: number) => `${kind}:${i}`;
  const create = async () => {
    const ops: Parameters<typeof batch>[0] = [];
    const people = e.stakeholderIds ?? e.attendeeIds ?? [];
    x.decisions.forEach((d, i) => picked[keyOf('d', i)] !== false && ops.push({ op: 'create', type: 'decision', data: { title: d, date: e.date ?? isoDate(now()), status: 'decided', relatedIds: [e.id, ...(e.relatedIds ?? [])], consultedIds: people } }));
    x.risks.forEach((r, i) => picked[keyOf('r', i)] !== false && ops.push({ op: 'create', type: 'raid', data: { kind: 'risk', title: r, status: 'open', relatedIds: [e.id] } }));
    x.requirements.forEach((r, i) => picked[keyOf('q', i)] !== false && ops.push({ op: 'create', type: 'requirement', data: { title: r.slice(0, 80), statement: r, status: 'draft', sourceIds: [e.id, ...people.filter((p: string) => g.get(p)?.type === 'stakeholder')] } }));
    if (e.type === 'meeting') {
      const acts = [...(e.actions ?? []), ...x.actions.filter((_, i) => picked[keyOf('a', i)] !== false).map((a, i) => ({ id: `x${Date.now().toString(36)}${i}`, text: a.text, ownerId: a.ownerId, due: a.due, done: false }))];
      ops.push({ op: 'update', id: e.id, data: { actions: acts } });
    }
    if (!ops.length) return;
    try { await batch(ops); toast(`Created ${ops.length} items from the notes`); } catch (err) { errorToast(err); }
  };
  if (!total) return <Card title="Extract from notes" icon="wand-sparkles"><div className="small muted">Write notes with lines like “Decision: …”, “Action: @name … by Friday”, “Risk: …”, or sentences with “must/shall” — they will be picked up here.</div></Card>;
  const Row = ({ k, text, sub }: { k: string; text: string; sub?: string }) => (
    <label className="row small" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
      <input type="checkbox" checked={picked[k] !== false} onChange={(ev) => setPicked((p) => ({ ...p, [k]: ev.target.checked }))} style={{ accentColor: 'var(--accent)', marginTop: 3 }} />
      <span className="grow">{text}{sub && <span className="muted"> · {sub}</span>}</span>
    </label>
  );
  return (
    <Card title={`Extracted from notes · ${total}`} icon="wand-sparkles" actions={<button className="btn btn-sm btn-primary" onClick={create}>Create selected</button>}>
      <div className="grid g2">
        {x.decisions.length > 0 && <div className="col" style={{ gap: 6 }}><div className="label">Decisions → decision log</div>{x.decisions.map((d, i) => <Row key={i} k={keyOf('d', i)} text={d} />)}</div>}
        {x.actions.length > 0 && <div className="col" style={{ gap: 6 }}><div className="label">Actions{e.type === 'meeting' ? ' → action items' : ''}</div>{x.actions.map((a, i) => <Row key={i} k={keyOf('a', i)} text={a.text} sub={[a.ownerName, a.due].filter(Boolean).join(', ')} />)}</div>}
        {x.risks.length > 0 && <div className="col" style={{ gap: 6 }}><div className="label">Risks → RAID log</div>{x.risks.map((r, i) => <Row key={i} k={keyOf('r', i)} text={r} />)}</div>}
        {x.requirements.length > 0 && <div className="col" style={{ gap: 6 }}><div className="label">Requirement candidates</div>{x.requirements.map((r, i) => <Row key={i} k={keyOf('q', i)} text={r} />)}</div>}
        {x.questions.length > 0 && <div className="col" style={{ gap: 6 }}><div className="label">Open questions</div>{x.questions.map((q) => <div key={q} className="small">? {q}</div>)}</div>}
      </div>
    </Card>
  );
}

// ---------------- Data dictionary ----------------

interface Attr { name: string; type: string; required: boolean; pii: boolean; description: string }

export function DataEntityPage({ id }: { id: string }) {
  const d = useEntity(id);
  const g = useGraph();
  if (!d) return <EntityPage id={id} />;
  const attrs: Attr[] = d.attributes ?? [];
  const save = (next: Attr[]) => updateEntity(d.id, { attributes: next }).catch(errorToast);
  const set = (i: number, k: keyof Attr, v: unknown) => save(attrs.map((a, x) => (x === i ? { ...a, [k]: v } : a)));
  const glossary = g.referencing(d.id, 'glossaryTerm', 'dataEntityId');
  return (
    <EntityPage id={id}>
      <Card title={`Attributes · ${attrs.length}`} icon="boxes" sub={`${attrs.filter((a) => a.pii).length} contain personal data — exports, logs and retention rules must account for them.`} actions={<button className="btn btn-sm" onClick={() => save([...attrs, { name: 'new_attribute', type: 'string', required: false, pii: false, description: '' }])}>+ Attribute</button>} flush>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>PII</th><th>Description</th><th /></tr></thead>
          <tbody>{attrs.map((a, i) => (
            <tr key={i}>
              <td><input className="input input-sm mono" defaultValue={a.name} onBlur={(e) => e.target.value !== a.name && set(i, 'name', e.target.value)} /></td>
              <td><input className="input input-sm mono" defaultValue={a.type} onBlur={(e) => e.target.value !== a.type && set(i, 'type', e.target.value)} /></td>
              <td className="center"><input type="checkbox" checked={a.required} onChange={(e) => set(i, 'required', e.target.checked)} /></td>
              <td className="center"><input type="checkbox" checked={a.pii} onChange={(e) => set(i, 'pii', e.target.checked)} />{a.pii && <Badge tone="red">PII</Badge>}</td>
              <td><input className="input input-sm" defaultValue={a.description} onBlur={(e) => e.target.value !== a.description && set(i, 'description', e.target.value)} /></td>
              <td className="tight"><button className="btn btn-ghost btn-sm btn-icon" onClick={() => save(attrs.filter((_, x) => x !== i))}><Icon name="trash-2" size={12} /></button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      {glossary.length > 0 && <Card title="Glossary terms" icon="book-open">{glossary.map((t) => <div key={t.id} className="small"><strong>{t.term}</strong> — {t.definition}</div>)}</Card>}
    </EntityPage>
  );
}

// ---------------- Root cause ----------------

export function RootCausePage({ id }: { id: string }) {
  const r = useEntity(id);
  if (!r) return <EntityPage id={id} />;
  const whys: string[] = r.whys ?? [];
  const fish: Record<string, string[]> = r.fishbone ?? {};
  const CATS = ['People', 'Process', 'Technology', 'Data', 'Policy', 'Environment'];
  const save = (patch: Record<string, unknown>) => updateEntity(r.id, patch).catch(errorToast);
  return (
    <EntityPage id={id} hideFields>
      <Card title="5 whys" icon="search" sub={`Problem: ${r.title}`}>
        <div className="col" style={{ gap: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="row" style={{ marginLeft: i * 18 }}>
              <Badge tone="accent">Why {i + 1}</Badge>
              <input className="input input-sm" defaultValue={whys[i] ?? ''} placeholder="Because…" onBlur={(e) => { const next = [...whys]; next[i] = e.target.value; if (e.target.value !== (whys[i] ?? '')) save({ whys: next }); }} />
            </div>
          ))}
          <div className="row mt8"><Badge tone="red">Root cause</Badge><input className="input input-sm strong" defaultValue={r.rootCause ?? ''} onBlur={(e) => e.target.value !== (r.rootCause ?? '') && save({ rootCause: e.target.value })} /></div>
        </div>
      </Card>
      <Card title="Fishbone" icon="combine" sub="Contributing causes by category.">
        <div className="grid g3">
          {CATS.map((c) => (
            <div key={c} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 10 }}>
              <div className="label mb8">{c}</div>
              {(fish[c] ?? []).map((x, i) => <div key={i} className="small row">• <span className="grow">{x}</span><button className="btn btn-ghost btn-sm btn-icon" onClick={() => save({ fishbone: { ...fish, [c]: (fish[c] ?? []).filter((_, k) => k !== i) } })}><Icon name="x" size={11} /></button></div>)}
              <input className="input input-sm mt8" placeholder="Add cause, Enter" onKeyDown={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (e.key === 'Enter' && v) { save({ fishbone: { ...fish, [c]: [...(fish[c] ?? []), v] } }); (e.target as HTMLInputElement).value = ''; } }} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Countermeasures" icon="list-checks"><div className="pre small">{r.countermeasures ?? <span className="muted">Edit to add countermeasures.</span>}</div></Card>
    </EntityPage>
  );
}

// ---------------- Glossary ----------------

export function GlossaryPage() {
  const g = useGraph();
  const terms = g.all('glossaryTerm');
  const corpus = [...g.all('spec').map((s) => ({ e: s, text: String(s.body ?? '') })), ...g.all('requirement').map((r) => ({ e: r, text: `${r.title} ${r.statement ?? ''}` }))];
  const usage = terms.map((t) => {
    const hits = (re: RegExp) => corpus.reduce((n, c) => n + (c.text.match(re)?.length ?? 0), 0);
    const term = hits(new RegExp(`\\b${escapeRegex(t.term)}s?\\b`, 'gi'));
    const syn = (t.synonyms ?? []).map((s: string) => ({ s, n: hits(new RegExp(`\\b${escapeRegex(s)}s?\\b`, 'gi')) })).filter((x: { n: number }) => x.n > 0);
    return { t, term, syn };
  });
  const known = new Set(terms.flatMap((t) => [t.term.toLowerCase(), ...(t.synonyms ?? []).map((s: string) => s.toLowerCase())]));
  const candidates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of corpus) for (const m of c.text.matchAll(/(?<![.#\n]\s)(?<!^)\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/gm)) {
      const w = m[1];
      if (w.length < 4 || known.has(w.toLowerCase()) || ['The', 'This', 'When', 'Given', 'Then', 'Users', 'Each', 'Design', 'Feature'].includes(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page">
      <PageHead title="Glossary" sub="Ubiquitous language: one term, one meaning. The Spec Studio linter flags discouraged synonyms wherever they appear." actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'glossaryTerm' })}><Icon name="plus" size={14} />New term</button>} />
      <div className="grid g-side">
        <Card flush>
          <div className="list">
            {usage.map(({ t, term, syn }) => (
              <div key={t.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => openEditor({ type: 'glossaryTerm', id: t.id })}>
                <div className="grow">
                  <div className="row-wrap"><span className="strong">{t.term}</span>{t.domain && <Badge>{t.domain}</Badge>}{t.dataEntityId && <Link to={hrefOf(g.get(t.dataEntityId) ?? t)} onClick={(e) => e.stopPropagation()} className="small">{nameOf(g.get(t.dataEntityId))}</Link>}</div>
                  <div className="small">{t.definition}</div>
                  {(t.synonyms ?? []).length > 0 && <div className="small muted">Avoid: {(t.synonyms as string[]).join(', ')}</div>}
                </div>
                <div className="right small">
                  <div>{term} uses</div>
                  {syn.map((x: { s: string; n: number }) => <Badge key={x.s} tone="amber">“{x.s}” ×{x.n}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Possibly undefined terms" icon="book-open" sub="Capitalised terms used repeatedly in specs and requirements but not in the glossary." flush>
          {candidates.length === 0 ? <div className="empty">None found.</div> : <div className="list">{candidates.map(([w, n]) => (
            <div key={w} className="list-item" style={{ alignItems: 'center' }}><span className="grow">{w} <span className="muted small">×{n}</span></span><button className="btn btn-sm" onClick={() => openEditor({ type: 'glossaryTerm', defaults: { term: w } })}>Define</button></div>
          ))}</div>}
        </Card>
      </div>
    </div>
  );
}


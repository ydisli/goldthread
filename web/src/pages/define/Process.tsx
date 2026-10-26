import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { Entity } from '../../../../core/schema.ts';
import { checkProcess, freeSlot, placeSteps, processMetrics, tidy, type Step, type StepKind } from '../../../../core/engines/process.ts';
import { conflictOf, updateEntity, useCan, useEntity, useGraph } from '../../store.ts';
import { mergeById, mergeList } from '../../../../core/engines/merge.ts';
import { Link } from '../../router.tsx';
import { Card, PageHead, Seg, downloadFile, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { ToolGuide } from '../../ui/guide.tsx';
import { EntityPage, EntityTable } from '../../entity/views.tsx';
import { openEditor } from '../../entity/editor.tsx';
import { hrefOf } from '../../entity/links.ts';

export { processMetrics };

type Orientation = 'horizontal' | 'vertical';
interface Model { lanes: string[]; steps: Step[] }

// ---------------- geometry ----------------

const H_HEAD = 136, H_LANE = 108, H_SLOT = 188;
const V_LANE = 200, V_HEAD = 46, V_SLOT = 112;
const TASK = { w: 150, h: 52 }, DECISION = { w: 132, h: 74 }, EVENT_R = 17;

function half(kind: StepKind) {
  if (kind === 'task') return { w: TASK.w / 2, h: TASK.h / 2 };
  if (kind === 'decision') return { w: DECISION.w / 2, h: DECISION.h / 2 };
  return { w: EVENT_R, h: EVENT_R };
}

function centerOf(o: Orientation, lane: number, pos: number) {
  return o === 'horizontal'
    ? { x: H_HEAD + pos * H_SLOT + H_SLOT / 2, y: lane * H_LANE + H_LANE / 2 }
    : { x: lane * V_LANE + V_LANE / 2, y: V_HEAD + pos * V_SLOT + V_SLOT / 2 };
}

function slotAt(o: Orientation, x: number, y: number, laneCount: number) {
  const clampLane = (n: number) => Math.max(0, Math.min(laneCount - 1, n));
  return o === 'horizontal'
    ? { lane: clampLane(Math.floor(y / H_LANE)), pos: Math.max(0, Math.round((x - H_HEAD - H_SLOT / 2) / H_SLOT)) }
    : { lane: clampLane(Math.floor(x / V_LANE)), pos: Math.max(0, Math.round((y - V_HEAD - V_SLOT / 2) / V_SLOT)) };
}

function sizeOf(o: Orientation, laneCount: number, maxPos: number) {
  return o === 'horizontal'
    ? { w: H_HEAD + (maxPos + 2) * H_SLOT, h: Math.max(1, laneCount) * H_LANE }
    : { w: Math.max(1, laneCount) * V_LANE, h: V_HEAD + (maxPos + 2) * V_SLOT };
}

type Pt = { x: number; y: number };

/** A smooth connector between two steps, routed along the flow; loops go around. */
function connector(o: Orientation, a: Pt & { pos: number; lane: number; kind: StepKind }, b: Pt & { pos: number; lane: number; kind: StepKind }) {
  const ha = half(a.kind), hb = half(b.kind);
  let p0: Pt, p1: Pt, p2: Pt, p3: Pt, back = false;
  if (o === 'horizontal') {
    if (b.pos > a.pos) {
      p0 = { x: a.x + ha.w, y: a.y }; p3 = { x: b.x - hb.w - 2, y: b.y };
      const dx = Math.max(28, (p3.x - p0.x) / 2);
      p1 = { x: p0.x + dx, y: p0.y }; p2 = { x: p3.x - dx, y: p3.y };
    } else if (b.pos === a.pos) {
      const down = b.y > a.y;
      p0 = { x: a.x, y: a.y + (down ? ha.h : -ha.h) }; p3 = { x: b.x, y: b.y + (down ? -hb.h - 2 : hb.h + 2) };
      p1 = p0; p2 = p3;
    } else {
      back = true;
      p0 = { x: a.x, y: a.y + ha.h }; p3 = { x: b.x, y: b.y + hb.h + 2 };
      const dip = Math.max(p0.y, p3.y) + 30;
      p1 = { x: p0.x, y: dip }; p2 = { x: p3.x, y: dip };
    }
  } else if (b.pos > a.pos) {
    p0 = { x: a.x, y: a.y + ha.h }; p3 = { x: b.x, y: b.y - hb.h - 2 };
    const dy = Math.max(24, (p3.y - p0.y) / 2);
    p1 = { x: p0.x, y: p0.y + dy }; p2 = { x: p3.x, y: p3.y - dy };
  } else if (b.pos === a.pos) {
    const right = b.x > a.x;
    p0 = { x: a.x + (right ? ha.w : -ha.w), y: a.y }; p3 = { x: b.x + (right ? -hb.w - 2 : hb.w + 2), y: b.y };
    p1 = p0; p2 = p3;
  } else {
    back = true;
    p0 = { x: a.x + ha.w, y: a.y }; p3 = { x: b.x + hb.w + 2, y: b.y };
    const out = Math.max(p0.x, p3.x) + 34;
    p1 = { x: out, y: p0.y }; p2 = { x: out, y: p3.y };
  }
  const mid = { x: 0.125 * p0.x + 0.375 * p1.x + 0.375 * p2.x + 0.125 * p3.x, y: 0.125 * p0.y + 0.375 * p1.y + 0.375 * p2.y + 0.125 * p3.y };
  return { d: `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`, mid, back };
}

function wrap(text: string, max: number, lines = 3): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if (`${cur} ${w}`.length <= max) cur += ` ${w}`;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  const clipped = out.map((l) => (l.length > max ? `${l.slice(0, max - 1)}…` : l));
  if (clipped.length > lines) {
    const keep = clipped.slice(0, lines);
    keep[lines - 1] = `${keep[lines - 1].slice(0, max - 1)}…`;
    return keep;
  }
  return clipped;
}

function handlePoint(o: Orientation, c: Pt, kind: StepKind): Pt {
  const h = half(kind);
  return o === 'horizontal' ? { x: c.x + h.w, y: c.y } : { x: c.x, y: c.y + h.h };
}

const uid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const KIND_LABEL: Record<StepKind, string> = { task: 'Task', decision: 'Decision', start: 'Start', end: 'End' };
const DEFAULT_LABEL: Record<StepKind, string> = { task: 'New step', decision: 'Is it OK?', start: 'Start', end: 'Done' };

// ---------------- pages ----------------

export function ProcessListPage() {
  const create = () => openEditor({
    type: 'processModel',
    defaults: {
      variant: 'to-be', orientation: 'horizontal', lanes: ['Requester', 'Service desk', 'System'],
      steps: [
        { id: 's1', lane: 'Requester', label: 'Need arises', kind: 'start', next: ['s2'], pos: 0 },
        { id: 's2', lane: 'Requester', label: 'Submit request', kind: 'task', next: ['s3'], pos: 1 },
        { id: 's3', lane: 'Service desk', label: 'Triage request', kind: 'task', next: ['s4'], pos: 2 },
        { id: 's4', lane: 'System', label: 'Request fulfilled', kind: 'end', next: [], pos: 3 },
      ],
    },
    only: ['title', 'variant', 'orientation', 'counterpartId', 'notes'],
  });
  return (
    <div className="page">
      <PageHead title="Process models" sub="Draw how work flows today (as-is) and after the change (to-be) — in horizontal or vertical swimlanes — and compare them step by step." actions={<button className="btn btn-primary" onClick={create}><Icon name="plus" size={14} />New process</button>} />
      <Card flush><EntityTable type="processModel" columns={['title', 'variant', 'orientation', 'counterpartId', { key: 'm', label: 'Steps · handoffs', render: (p) => { const m = processMetrics(p.steps ?? []); return `${m.steps} · ${m.handoffs}`; } }]} /></Card>
    </div>
  );
}

export function ProcessPage({ id }: { id: string }) {
  const pm = useEntity(id);
  const g = useGraph();
  if (!pm) return <EntityPage id={id} />;
  const other = g.get(pm.counterpartId);
  const steps: Step[] = pm.steps ?? [];
  const m = processMetrics(steps);
  const om = other ? processMetrics(other.steps ?? []) : null;
  const labels = new Set(steps.map((s) => s.label.toLowerCase()));
  const otherLabels = new Set(((other?.steps ?? []) as Step[]).map((s) => s.label.toLowerCase()));
  return (
    <EntityPage id={id} hideFields wide={<>
      <ToolGuide id="process-canvas" title="Drawing a process" steps={[
        <>Drag a <b>Task</b>, <b>Decision</b>, <b>Start</b> or <b>End</b> from the bar onto a lane — or select a step and click one to add it right after.</>,
        <>Drag any step to move it; it snaps to the lane and position under your pointer.</>,
        <>Drag the small dot on a step's edge onto another step to connect them. Drop it on empty space to create and connect a new step.</>,
        <>Double-click to rename. <kbd>Delete</kbd> removes, arrow keys nudge, <kbd>⌘Z</kbd> undoes.</>,
      ]} />
      <ProcessCanvas key={pm.id} pm={pm} />
    </>}>
      {other && om && (
        <Card title={`Compared with ${other.variant}`} actions={<Link className="btn btn-sm" to={hrefOf(other)}>Open {other.variant}</Link>}>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Measure</th><th className="num">{pm.variant}</th><th className="num">{other.variant}</th><th className="num">Difference</th></tr></thead>
            <tbody>{(['steps', 'handoffs', 'decisions', 'loops', 'lanes'] as const).map((k) => <tr key={k}><td>{k === 'steps' ? 'Task steps' : k === 'handoffs' ? 'Handoffs between lanes' : k === 'decisions' ? 'Decision points' : k === 'loops' ? 'Rework loops' : 'Lanes involved'}</td><td className="num">{m[k]}</td><td className="num">{om[k]}</td><td className="num">{m[k] - om[k] > 0 ? '+' : ''}{m[k] - om[k]}</td></tr>)}</tbody>
          </table></div>
          <div className="grid g2 mt12">
            <div><div className="label mb8">Only in {pm.variant}</div>{steps.filter((s) => s.kind === 'task' && !otherLabels.has(s.label.toLowerCase())).map((s) => <div key={s.id} className="small">• {s.label} <span className="muted">({s.lane})</span></div>)}</div>
            <div><div className="label mb8">Only in {other.variant}</div>{((other.steps ?? []) as Step[]).filter((s) => s.kind === 'task' && !labels.has(s.label.toLowerCase())).map((s) => <div key={s.id} className="small">• {s.label} <span className="muted">({s.lane})</span></div>)}</div>
          </div>
        </Card>
      )}
    </EntityPage>
  );
}

// ---------------- canvas ----------------

type Sel = { type: 'step'; id: string } | { type: 'edge'; from: string; to: string } | { type: 'lane'; index: number } | null;
type Drag =
  | { kind: 'move'; id: string; offX: number; offY: number; x: number; y: number; startX: number; startY: number; moved: boolean }
  | { kind: 'connect'; from: string; x: number; y: number }
  | { kind: 'new'; nodeKind: StepKind; clientX: number; clientY: number; startClientX: number; startClientY: number; x: number; y: number; inside: boolean };

function ProcessCanvas({ pm }: { pm: Entity }) {
  const editable = useCan('editor');
  const orientation: Orientation = pm.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const [model, setModel] = useState<Model>({ lanes: pm.lanes ?? [], steps: pm.steps ?? [] });
  const [sel, setSel] = useState<Sel>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: 'step' | 'lane'; key: string; value: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const history = useRef<{ past: Model[]; future: Model[] }>({ past: [], future: [] });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cancelEdit = useRef(false);
  const modelRef = useRef(model);
  modelRef.current = model;

  // The model as the server last had it: the base for merging with someone else's edits.
  const remote = useRef<Model>({ lanes: pm.lanes ?? [], steps: pm.steps ?? [] });

  // Follow changes made elsewhere (another person, the list editor) unless we have unsaved edits.
  useEffect(() => {
    if (!dirty.current) { setModel({ lanes: pm.lanes ?? [], steps: pm.steps ?? [] }); remote.current = { lanes: pm.lanes ?? [], steps: pm.steps ?? [] }; }
  }, [pm.lanes, pm.steps]);

  /** Save; if someone else changed the model meanwhile, merge step by step instead of overwriting. */
  const persist = useCallback(async (next: Model) => {
    const base = remote.current;
    try {
      await updateEntity(pm.id, { lanes: next.lanes, steps: next.steps }, { prev: { lanes: base.lanes, steps: base.steps } });
      remote.current = next;
    } catch (err) {
      const c = conflictOf(err);
      if (!c) throw err;
      const theirs: Model = { lanes: c.current.lanes ?? [], steps: c.current.steps ?? [] };
      const steps = mergeById(base.steps, next.steps, theirs.steps);
      const merged: Model = { lanes: mergeList(base.lanes, next.lanes, theirs.lanes), steps: steps.items };
      await updateEntity(pm.id, { lanes: merged.lanes, steps: merged.steps }, { prev: { lanes: theirs.lanes, steps: theirs.steps } });
      remote.current = merged;
      if (modelRef.current === next) setModel(merged);
      toast(steps.conflicts
        ? `Merged with ${c.by}'s changes. You both changed ${steps.conflicts === 1 ? 'one step' : `${steps.conflicts} steps`}; your version was kept.`
        : `Merged with ${c.by}'s changes to this model.`);
    }
  }, [pm.id]);

  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); if (dirty.current) void persist(modelRef.current).catch(() => {}); }
  }, [pm.id, persist]);

  const save = useCallback((next: Model) => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      persist(next).then(() => { if (!timer.current) dirty.current = false; }).catch(errorToast);
    }, 450);
  }, [persist]);

  const commit = useCallback((next: Model) => {
    if (!editable) return;
    history.current.past.push(modelRef.current);
    if (history.current.past.length > 100) history.current.past.shift();
    history.current.future = [];
    setModel(next);
    save(next);
  }, [editable, save]);

  const undo = () => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push(model);
    setModel(prev); save(prev); setSel(null);
  };
  const redo = () => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(model);
    setModel(next); save(next);
  };

  const { lanes, steps } = model;
  const placed = useMemo(() => placeSteps(steps, lanes), [steps, lanes]);
  const maxPos = Math.max(0, ...[...placed.values()].map((p) => p.pos));
  const size = sizeOf(orientation, lanes.length, maxPos + (drag ? 1 : 0));
  const issues = useMemo(() => checkProcess(steps, lanes), [steps, lanes]);
  const fit = useCallback(() => {
    const avail = wrapRef.current?.clientWidth ?? 0;
    if (avail > 0) setZoom(Math.max(0.5, Math.min(1, +((avail - 8) / size.w).toFixed(2))));
  }, [size.w]);
  // Fit the diagram to the available width when it opens or the lanes flip.
  useEffect(fit, [orientation]); // eslint-disable-line react-hooks/exhaustive-deps
  const issueSteps = new Set(issues.filter((i) => i.severity !== 'info' && i.stepId).map((i) => i.stepId!));
  const byId = new Map(steps.map((s) => [s.id, s]));
  const centers = new Map(steps.map((s) => { const p = placed.get(s.id)!; return [s.id, { ...centerOf(orientation, p.lane, p.pos), ...p, kind: s.kind }]; }));

  // ---------- model operations ----------
  const updateStep = (sid: string, patch: Partial<Step>) => commit({ lanes, steps: steps.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  const removeStep = (sid: string) => {
    commit({ lanes, steps: steps.filter((s) => s.id !== sid).map((s) => ({ ...s, next: s.next.filter((n) => n !== sid), labels: s.labels ? Object.fromEntries(Object.entries(s.labels).filter(([k]) => k !== sid)) : undefined })) });
    setSel(null);
  };
  const connect = (from: string, to: string, base: Step[] = steps) => {
    const src = base.find((s) => s.id === from);
    if (!src || from === to || src.next.includes(to)) return base;
    const labels = { ...(src.labels ?? {}) };
    if (src.kind === 'decision') {
      const used = Object.values(labels);
      labels[to] = !used.includes('Yes') ? 'Yes' : !used.includes('No') ? 'No' : '';
    }
    return base.map((s) => (s.id === from ? { ...s, next: [...s.next, to], labels } : s));
  };
  const disconnect = (from: string, to: string) => {
    commit({ lanes, steps: steps.map((s) => (s.id === from ? { ...s, next: s.next.filter((n) => n !== to), labels: s.labels ? Object.fromEntries(Object.entries(s.labels).filter(([k]) => k !== to)) : undefined } : s)) });
    setSel(null);
  };
  const addStep = (kind: StepKind, lane: string, pos: number, connectFrom?: string) => {
    const nid = uid();
    let next: Step[] = [...steps, { id: nid, lane, label: DEFAULT_LABEL[kind], kind, next: [], pos: freeSlot(steps, lanes, lane, pos) }];
    if (connectFrom && byId.get(connectFrom)?.kind !== 'end') next = connect(connectFrom, nid, next);
    commit({ lanes, steps: next });
    setSel({ type: 'step', id: nid });
    setEditing({ kind: 'step', key: nid, value: DEFAULT_LABEL[kind] });
    return nid;
  };
  const addAfterSelection = (kind: StepKind) => {
    if (!lanes.length) { addLane(); return; }
    const cur = sel?.type === 'step' ? byId.get(sel.id) : undefined;
    if (cur) {
      const p = placed.get(cur.id)!;
      addStep(kind, cur.lane, p.pos + 1, kind === 'start' ? undefined : cur.id);
    } else {
      addStep(kind, lanes[0], steps.length ? maxPos + 1 : 0);
    }
  };
  const moveStepTo = (sid: string, laneIdx: number, pos: number) => {
    const lane = lanes[laneIdx];
    if (!lane) return;
    const p = placed.get(sid);
    if (p && p.lane === laneIdx && p.pos === pos) return;
    updateStep(sid, { lane, pos: freeSlot(steps, lanes, lane, pos, sid) });
  };
  const addLane = () => {
    let name = 'New lane', n = 2;
    while (lanes.includes(name)) name = `New lane ${n++}`;
    commit({ lanes: [...lanes, name], steps });
    setSel({ type: 'lane', index: lanes.length });
    setEditing({ kind: 'lane', key: String(lanes.length), value: name });
  };
  const renameLane = (index: number, name: string) => {
    const clean = name.trim();
    const old = lanes[index];
    if (!clean || clean === old) return;
    if (lanes.includes(clean)) { errorToast(new Error(`There is already a lane called “${clean}”.`)); return; }
    commit({ lanes: lanes.map((l, i) => (i === index ? clean : l)), steps: steps.map((s) => (s.lane === old ? { ...s, lane: clean } : s)) });
  };
  const moveLane = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= lanes.length) return;
    const next = [...lanes];
    [next[index], next[j]] = [next[j], next[index]];
    commit({ lanes: next, steps });
    setSel({ type: 'lane', index: j });
  };
  const removeLane = (index: number) => {
    const name = lanes[index];
    const inLane = steps.filter((s) => s.lane === name);
    const target = lanes[index === 0 ? 1 : index - 1];
    if (inLane.length && !target) return;
    if (inLane.length && !confirm(`Move the ${inLane.length} step${inLane.length > 1 ? 's' : ''} in “${name}” to “${target}” and remove the lane?`)) return;
    commit({ lanes: lanes.filter((_, i) => i !== index), steps: steps.map((s) => (s.lane === name ? { ...s, lane: target } : s)) });
    setSel(null);
  };
  const setOrientation = (o: Orientation) => updateEntity(pm.id, { orientation: o }).catch(errorToast);

  // ---------- pointer handling ----------
  const toSvg = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom, inside: clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom };
  };
  const stepAt = (x: number, y: number, except?: string) => {
    for (const s of steps) {
      if (s.id === except) continue;
      const c = centers.get(s.id)!;
      const h = half(s.kind);
      if (Math.abs(x - c.x) <= h.w + 8 && Math.abs(y - c.y) <= h.h + 8) return s.id;
    }
    return null;
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      setDrag((d) => {
        if (!d) return d;
        if (d.kind === 'move') return { ...d, x: p.x, y: p.y, moved: d.moved || Math.hypot(p.x - d.startX, p.y - d.startY) > 4 };
        if (d.kind === 'connect') return { ...d, x: p.x, y: p.y };
        return { ...d, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, inside: p.inside };
      });
    };
    const onUp = (e: PointerEvent) => {
      const d = drag;
      const p = toSvg(e.clientX, e.clientY);
      setDrag(null);
      if (d.kind === 'move') {
        if (!d.moved) return;
        const slot = slotAt(orientation, p.x - d.offX, p.y - d.offY, lanes.length);
        moveStepTo(d.id, slot.lane, slot.pos);
      } else if (d.kind === 'connect') {
        const target = stepAt(p.x, p.y, d.from);
        if (target) commit({ lanes, steps: connect(d.from, target) });
        else if (p.inside && lanes.length) {
          const slot = slotAt(orientation, p.x, p.y, lanes.length);
          addStep('task', lanes[slot.lane], slot.pos, d.from);
        }
      } else if (d.kind === 'new' && Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY) < 5) {
        addAfterSelection(d.nodeKind);
      } else if (d.kind === 'new' && p.inside && lanes.length) {
        const slot = slotAt(orientation, p.x, p.y, lanes.length);
        const over = stepAt(p.x, p.y);
        addStep(d.nodeKind, lanes[slot.lane], slot.pos, over && d.nodeKind !== 'start' ? over : undefined);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }); // re-bound each render so handlers see the latest model

  const startMove = (e: ReactPointerEvent, sid: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel({ type: 'step', id: sid });
    wrapRef.current?.focus({ preventScroll: true });
    if (!editable) return;
    const p = toSvg(e.clientX, e.clientY);
    const c = centers.get(sid)!;
    setDrag({ kind: 'move', id: sid, offX: p.x - c.x, offY: p.y - c.y, x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false });
  };
  const startConnect = (e: ReactPointerEvent, sid: string) => {
    if (!editable || e.button !== 0) return;
    e.stopPropagation();
    const p = toSvg(e.clientX, e.clientY);
    setDrag({ kind: 'connect', from: sid, x: p.x, y: p.y });
  };
  const startNew = (e: ReactPointerEvent, kind: StepKind) => {
    if (!editable || e.button !== 0) return;
    e.preventDefault();
    setDrag({ kind: 'new', nodeKind: kind, clientX: e.clientX, clientY: e.clientY, startClientX: e.clientX, startClientY: e.clientY, x: 0, y: 0, inside: false });
  };

  // ---------- keyboard ----------
  const onKey = (e: ReactKeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (e.key === 'Escape') { setSel(null); return; }
    if (!editable || !sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (sel.type === 'step') removeStep(sel.id);
      else if (sel.type === 'edge') disconnect(sel.from, sel.to);
      else if (sel.type === 'lane') removeLane(sel.index);
      return;
    }
    if (sel.type === 'step') {
      const s = byId.get(sel.id);
      if (!s) return;
      if (e.key === 'Enter') { e.preventDefault(); setEditing({ kind: 'step', key: s.id, value: s.label }); return; }
      const p = placed.get(s.id)!;
      const along: Record<string, number> = orientation === 'horizontal' ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
      const across: Record<string, number> = orientation === 'horizontal' ? { ArrowUp: -1, ArrowDown: 1 } : { ArrowLeft: -1, ArrowRight: 1 };
      const a = along[e.key];
      const c = across[e.key];
      if (a) { e.preventDefault(); moveStepTo(s.id, p.lane, Math.max(0, p.pos + a)); }
      else if (c) { e.preventDefault(); const l = Math.max(0, Math.min(lanes.length - 1, p.lane + c)); moveStepTo(s.id, l, p.pos); }
    }
  };

  // ---------- export ----------
  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-ui]').forEach((n) => n.remove());
    const css = getComputedStyle(svg);
    const resolve = (v: string) => v.replace(/var\((--[\w-]+)\)/g, (_, name) => css.getPropertyValue(name).trim() || '#888');
    clone.querySelectorAll('*').forEach((el) => {
      for (const attr of ['fill', 'stroke', 'style']) {
        const v = el.getAttribute(attr);
        if (v?.includes('var(')) el.setAttribute(attr, resolve(v));
      }
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(size.w));
    clone.setAttribute('height', String(size.h));
    clone.setAttribute('style', `background:${css.getPropertyValue('--chart-surface').trim()};font-family:${css.getPropertyValue('--font').trim() || 'sans-serif'}`);
    downloadFile(`${pm.title.replace(/[^\w-]+/g, '-').toLowerCase()}-${pm.variant ?? 'process'}.svg`, new XMLSerializer().serializeToString(clone), 'image/svg+xml');
  };

  // ---------- render helpers ----------
  const dragPos = (sid: string) => {
    if (drag?.kind === 'move' && drag.id === sid && drag.moved) return { x: drag.x - drag.offX, y: drag.y - drag.offY };
    return centers.get(sid)!;
  };
  const target = (() => {
    if (!drag || !lanes.length) return null;
    if (drag.kind === 'move' && drag.moved) return slotAt(orientation, drag.x - drag.offX, drag.y - drag.offY, lanes.length);
    if (drag.kind === 'new' && drag.inside) return slotAt(orientation, drag.x, drag.y, lanes.length);
    if (drag.kind === 'connect' && !stepAt(drag.x, drag.y, drag.from)) return slotAt(orientation, drag.x, drag.y, lanes.length);
    return null;
  })();
  const connectTarget = drag?.kind === 'connect' ? stepAt(drag.x, drag.y, drag.from) : null;
  const selStep = sel?.type === 'step' ? byId.get(sel.id) : undefined;

  const laneBands = lanes.map((l, i) => {
    const on = sel?.type === 'lane' && sel.index === i;
    if (orientation === 'horizontal') {
      return (
        <g key={`lane-${i}`}>
          <rect x={0} y={i * H_LANE} width={size.w} height={H_LANE} fill={i % 2 ? 'var(--surface-2)' : 'var(--chart-surface)'} />
          <rect x={0} y={i * H_LANE} width={H_HEAD - 10} height={H_LANE} fill={on ? 'var(--accent-soft)' : 'var(--surface-3)'} style={{ cursor: 'pointer' }}
            onPointerDown={(e) => { e.stopPropagation(); setSel({ type: 'lane', index: i }); wrapRef.current?.focus({ preventScroll: true }); }}
            onDoubleClick={() => editable && setEditing({ kind: 'lane', key: String(i), value: l })} />
          {wrap(l, 16, 3).map((line, k, arr) => (
            <text key={k} x={14} y={i * H_LANE + H_LANE / 2 + (k - (arr.length - 1) / 2) * 15 + 4} style={{ fill: 'var(--text)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>{line}</text>
          ))}
          <line x1={0} x2={size.w} y1={(i + 1) * H_LANE} y2={(i + 1) * H_LANE} stroke="var(--border)" />
        </g>
      );
    }
    return (
      <g key={`lane-${i}`}>
        <rect x={i * V_LANE} y={0} width={V_LANE} height={size.h} fill={i % 2 ? 'var(--surface-2)' : 'var(--chart-surface)'} />
        <rect x={i * V_LANE} y={0} width={V_LANE} height={V_HEAD - 8} fill={on ? 'var(--accent-soft)' : 'var(--surface-3)'} style={{ cursor: 'pointer' }}
          onPointerDown={(e) => { e.stopPropagation(); setSel({ type: 'lane', index: i }); wrapRef.current?.focus({ preventScroll: true }); }}
          onDoubleClick={() => editable && setEditing({ kind: 'lane', key: String(i), value: l })} />
        <text x={i * V_LANE + V_LANE / 2} y={V_HEAD / 2} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>{wrap(l, 26, 1)[0]}</text>
        <line x1={(i + 1) * V_LANE} x2={(i + 1) * V_LANE} y1={0} y2={size.h} stroke="var(--border)" />
      </g>
    );
  });

  const edges = steps.flatMap((s) => s.next.map((n) => {
    const a = centers.get(s.id), b = centers.get(n);
    if (!a || !b) return null;
    const ap = dragPos(s.id), bp = dragPos(n);
    const c = connector(orientation, { ...a, ...ap }, { ...b, ...bp });
    const on = sel?.type === 'edge' && sel.from === s.id && sel.to === n;
    const label = s.labels?.[n];
    return (
      <g key={`${s.id}>${n}`}>
        <path d={c.d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }} onPointerDown={(e) => { e.stopPropagation(); setSel({ type: 'edge', from: s.id, to: n }); wrapRef.current?.focus({ preventScroll: true }); }} />
        <path d={c.d} fill="none" stroke={on ? 'var(--accent)' : 'var(--text-3)'} strokeWidth={on ? 2.2 : 1.5} markerEnd={on ? 'url(#pm-arrow-on)' : 'url(#pm-arrow)'} strokeDasharray={c.back ? '5 4' : undefined} style={{ pointerEvents: 'none' }} />
        {label && (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={c.mid.x - label.length * 3.4 - 6} y={c.mid.y - 9} width={label.length * 6.8 + 12} height={18} rx={9} fill="var(--surface)" stroke="var(--border)" />
            <text x={c.mid.x} y={c.mid.y + 4} textAnchor="middle" style={{ fill: 'var(--text-2)', fontSize: 11, fontWeight: 560 }}>{label}</text>
          </g>
        )}
      </g>
    );
  }));

  const nodes = steps.map((s) => {
    const c = dragPos(s.id);
    const on = sel?.type === 'step' && sel.id === s.id;
    const flagged = issueSteps.has(s.id);
    const isTarget = connectTarget === s.id;
    const stroke = on || isTarget ? 'var(--accent)' : flagged ? 'var(--warning)' : s.kind === 'decision' ? 'var(--warning)' : s.kind === 'start' ? 'var(--good)' : s.kind === 'end' ? 'var(--critical)' : 'var(--border-strong)';
    const sw = on || isTarget ? 2.4 : s.kind === 'end' ? 3 : 1.5;
    const lifted = drag?.kind === 'move' && drag.id === s.id && drag.moved;
    const showHandle = editable && (on || hover === s.id) && !drag && s.kind !== 'end';
    const hp = handlePoint(orientation, c, s.kind);
    let shape;
    let text;
    if (s.kind === 'task') {
      shape = <rect x={c.x - TASK.w / 2} y={c.y - TASK.h / 2} width={TASK.w} height={TASK.h} rx={9} fill="var(--surface)" stroke={stroke} strokeWidth={sw} />;
      const lines = wrap(s.label, 22, 3);
      text = lines.map((l, k) => <text key={k} x={c.x} y={c.y + (k - (lines.length - 1) / 2) * 14 + 4} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 11.5 }}>{l}</text>);
    } else if (s.kind === 'decision') {
      shape = <path d={`M${c.x},${c.y - DECISION.h / 2} L${c.x + DECISION.w / 2},${c.y} L${c.x},${c.y + DECISION.h / 2} L${c.x - DECISION.w / 2},${c.y} Z`} fill="var(--amber-soft)" stroke={stroke} strokeWidth={sw} />;
      const lines = wrap(s.label, 14, 3);
      text = lines.map((l, k) => <text key={k} x={c.x} y={c.y + (k - (lines.length - 1) / 2) * 13 + 4} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 11 }}>{l}</text>);
    } else {
      shape = <circle cx={c.x} cy={c.y} r={EVENT_R} fill={s.kind === 'start' ? 'var(--green-soft)' : 'var(--red-soft)'} stroke={stroke} strokeWidth={sw} />;
      if (orientation === 'horizontal') {
        const lines = wrap(s.label, 22, 2);
        text = lines.map((l, k) => <text key={k} x={c.x} y={c.y + EVENT_R + 15 + k * 13} textAnchor="middle" style={{ fill: 'var(--text-2)', fontSize: 11 }}>{l}</text>);
      } else {
        const lines = wrap(s.label, 13, 3);
        text = lines.map((l, k) => <text key={k} x={c.x + EVENT_R + 8} y={c.y + (k - (lines.length - 1) / 2) * 13 + 4} style={{ fill: 'var(--text-2)', fontSize: 11 }}>{l}</text>);
      }
    }
    return (
      <g key={s.id}
        className="pm-node"
        style={{ cursor: editable ? (lifted ? 'grabbing' : 'grab') : 'pointer', opacity: lifted ? 0.85 : 1 }}
        onPointerDown={(e) => startMove(e, s.id)}
        onPointerEnter={() => setHover(s.id)}
        onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
        onDoubleClick={() => editable && setEditing({ kind: 'step', key: s.id, value: s.label })}
        role="button" aria-label={`${KIND_LABEL[s.kind]}: ${s.label}, lane ${s.lane}`}
      >
        {shape}
        <g style={{ pointerEvents: 'none' }}>{text}</g>
        {showHandle && (
          <circle data-ui="1" cx={hp.x} cy={hp.y} r={6} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} style={{ cursor: 'crosshair' }} onPointerDown={(e) => startConnect(e, s.id)}>
            <title>Drag to connect</title>
          </circle>
        )}
      </g>
    );
  });

  const slotRect = target && (() => {
    const c = centerOf(orientation, target.lane, target.pos);
    return <rect data-ui="1" x={c.x - TASK.w / 2 - 6} y={c.y - TASK.h / 2 - 8} width={TASK.w + 12} height={TASK.h + 16} rx={11} fill="var(--accent-soft)" stroke="var(--accent)" strokeDasharray="5 4" style={{ pointerEvents: 'none' }} />;
  })();

  const connectLine = drag?.kind === 'connect' && (() => {
    const c = centers.get(drag.from)!;
    const hp = handlePoint(orientation, c, c.kind);
    return <line data-ui="1" x1={hp.x} y1={hp.y} x2={drag.x} y2={drag.y} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" style={{ pointerEvents: 'none' }} />;
  })();

  // Inline editor overlay position (in scaled pixels inside the scroll area).
  const overlay = (() => {
    if (!editing) return null;
    if (editing.kind === 'step') {
      const c = centers.get(editing.key);
      if (!c) return null;
      return { left: (c.x - 90) * zoom, top: (c.y - 16) * zoom, width: 180 * zoom };
    }
    const i = Number(editing.key);
    if (orientation === 'horizontal') return { left: 4 * zoom, top: (i * H_LANE + H_LANE / 2 - 16) * zoom, width: (H_HEAD - 18) * zoom };
    return { left: (i * V_LANE + 8) * zoom, top: 4 * zoom, width: (V_LANE - 16) * zoom };
  })();
  const finishEdit = (keep: boolean) => {
    if (!editing) return;
    if (keep) {
      if (editing.kind === 'step') { const v = editing.value.trim(); if (v && v !== byId.get(editing.key)?.label) updateStep(editing.key, { label: v }); }
      else renameLane(Number(editing.key), editing.value);
    }
    setEditing(null);
    wrapRef.current?.focus({ preventScroll: true });
  };

  const counts = { errors: issues.filter((i) => i.severity === 'error').length, warnings: issues.filter((i) => i.severity === 'warning').length };

  return (
    <div className="pm">
      <div className="canvas-wrap">
        <div className="canvas-tools">
          {editable && (
            <>
              <span className="small muted hide-mobile">Add</span>
              {(['task', 'decision', 'start', 'end'] as StepKind[]).map((k) => (
                <button key={k} className="palette-chip" onPointerDown={(e) => startNew(e, k)} onClick={(e) => { if (e.detail === 0) addAfterSelection(k); }} title={`Drag onto a lane, or click to add ${selStep ? `after “${selStep.label}”` : 'at the end'}`}>
                  <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
                    {k === 'task' && <rect x="1" y="2" width="14" height="10" rx="2.5" fill="var(--surface)" stroke="var(--text-2)" strokeWidth="1.4" />}
                    {k === 'decision' && <path d="M8,1 L15,7 L8,13 L1,7 Z" fill="var(--amber-soft)" stroke="var(--warning)" strokeWidth="1.4" />}
                    {k === 'start' && <circle cx="8" cy="7" r="5.5" fill="var(--green-soft)" stroke="var(--good)" strokeWidth="1.4" />}
                    {k === 'end' && <circle cx="8" cy="7" r="5.5" fill="var(--red-soft)" stroke="var(--critical)" strokeWidth="2.2" />}
                  </svg>
                  {KIND_LABEL[k]}
                </button>
              ))}
              <button className="btn btn-sm btn-ghost" onClick={addLane}><Icon name={orientation === 'horizontal' ? 'rows-3' : 'columns-3'} size={14} />Lane</button>
              <span className="tool-sep" />
            </>
          )}
          <Seg options={[{ id: 'horizontal', label: 'Horizontal' }, { id: 'vertical', label: 'Vertical' }]} value={orientation} onChange={(o) => editable && setOrientation(o)} />
          <span className="spacer" />
          {editable && (
            <>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={undo} disabled={!history.current.past.length} title="Undo (⌘Z)" aria-label="Undo"><Icon name="undo-2" size={14} /></button>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={redo} disabled={!history.current.future.length} title="Redo (⇧⌘Z)" aria-label="Redo"><Icon name="redo-2" size={14} /></button>
              <button className="btn btn-sm btn-ghost" onClick={() => commit({ lanes, steps: tidy(steps, lanes) })} title="Re-space steps along the flow"><Icon name="wand-sparkles" size={14} />Tidy</button>
            </>
          )}
          <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} aria-label="Zoom out"><Icon name="zoom-out" size={14} /></button>
          <button className="btn btn-sm btn-ghost" style={{ minWidth: 48 }} onClick={() => (zoom === 1 ? fit() : setZoom(1))} title={zoom === 1 ? 'Fit to width' : 'Actual size'}>{Math.round(zoom * 100)}%</button>
          <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} aria-label="Zoom in"><Icon name="zoom-in" size={14} /></button>
          <button className="btn btn-sm btn-ghost" onClick={exportSvg} title="Download as SVG (opens in PowerPoint, Visio, Confluence, Figma)"><Icon name="download" size={14} />SVG</button>
        </div>
        <div className="pm-body">
          <div className="canvas-scroll" ref={wrapRef} tabIndex={0} onKeyDown={onKey} aria-label={`Process diagram: ${pm.title}. Arrow keys move the selected step.`}>
            <div style={{ position: 'relative', width: size.w * zoom, height: size.h * zoom }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${size.w} ${size.h}`}
                width={size.w * zoom}
                height={size.h * zoom}
                role="img"
                aria-label={`Swimlane diagram with ${lanes.length} lanes and ${steps.length} steps`}
                onPointerDown={() => { setSel(null); wrapRef.current?.focus({ preventScroll: true }); }}
                style={{ fontFamily: 'var(--font)' }}
              >
                <defs>
                  <marker id="pm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)" /></marker>
                  <marker id="pm-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" /></marker>
                </defs>
                {laneBands}
                {slotRect}
                {edges}
                {connectLine}
                {nodes}
              </svg>
              {editing && overlay && (
                <input
                  className="input pm-inline"
                  autoFocus
                  style={{ position: 'absolute', left: overlay.left, top: overlay.top, width: overlay.width }}
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => { finishEdit(!cancelEdit.current); cancelEdit.current = false; }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { cancelEdit.current = true; e.currentTarget.blur(); } e.stopPropagation(); }}
                  aria-label={editing.kind === 'step' ? 'Step name' : 'Lane name'}
                />
              )}
              {!lanes.length && (
                <div className="pm-empty">
                  <div className="strong">Start with your lanes</div>
                  <div className="small muted">One lane per role, team or system that does part of the work.</div>
                  {editable && <button className="btn btn-primary btn-sm mt8" onClick={addLane}><Icon name="plus" size={13} />Add a lane</button>}
                </div>
              )}
            </div>
          </div>
          <Inspector
            editable={editable}
            sel={sel}
            model={model}
            issues={issues}
            counts={counts}
            onSelect={setSel}
            onUpdateStep={updateStep}
            onRemoveStep={removeStep}
            onDisconnect={disconnect}
            onConnect={(from, to) => commit({ lanes, steps: connect(from, to) })}
            onLabel={(from, to, label) => { const s = byId.get(from); if (s) updateStep(from, { labels: { ...(s.labels ?? {}), [to]: label } }); }}
            onAddAfter={(k) => addAfterSelection(k)}
            onRenameLane={(i) => setEditing({ kind: 'lane', key: String(i), value: lanes[i] })}
            onMoveLane={moveLane}
            onRemoveLane={removeLane}
            orientation={orientation}
          />
        </div>
      </div>
      {drag?.kind === 'new' && Math.hypot(drag.clientX - drag.startClientX, drag.clientY - drag.startClientY) >= 5 && (
        <div className="pm-ghost" style={{ left: drag.clientX + 10, top: drag.clientY + 10 }}>{KIND_LABEL[drag.nodeKind]}</div>
      )}
    </div>
  );
}

function Inspector(props: {
  editable: boolean; sel: Sel; model: Model; orientation: Orientation;
  issues: ReturnType<typeof checkProcess>; counts: { errors: number; warnings: number };
  onSelect: (s: Sel) => void; onUpdateStep: (id: string, p: Partial<Step>) => void; onRemoveStep: (id: string) => void;
  onDisconnect: (from: string, to: string) => void; onConnect: (from: string, to: string) => void; onLabel: (from: string, to: string, label: string) => void;
  onAddAfter: (k: StepKind) => void; onRenameLane: (i: number) => void; onMoveLane: (i: number, d: -1 | 1) => void; onRemoveLane: (i: number) => void;
}) {
  const { editable, sel, model, issues } = props;
  const byId = new Map(model.steps.map((s) => [s.id, s]));
  const step = sel?.type === 'step' ? byId.get(sel.id) : undefined;
  const earlier = props.orientation === 'horizontal' ? 'Move up' : 'Move left';
  const later = props.orientation === 'horizontal' ? 'Move down' : 'Move right';

  return (
    <aside className="pm-inspector" aria-label="Inspector">
      {step && (
        <fieldset disabled={!editable} className="col" style={{ gap: 12, border: 0, padding: 0, margin: 0 }}>
          <div className="row"><span className="eyebrow" style={{ margin: 0 }}>{KIND_LABEL[step.kind]}</span><span className="spacer" />{editable && <button className="btn btn-ghost btn-sm" onClick={() => props.onRemoveStep(step.id)}><Icon name="trash-2" size={13} />Delete</button>}</div>
          <div className="field"><label>Name</label><input aria-label="Step name" key={step.id + step.label} className="input" defaultValue={step.label} onBlur={(e) => e.target.value.trim() && e.target.value !== step.label && props.onUpdateStep(step.id, { label: e.target.value.trim() })} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></div>
          <div className="field"><label>Type</label><Seg options={(['task', 'decision', 'start', 'end'] as StepKind[]).map((k) => ({ id: k, label: KIND_LABEL[k] }))} value={step.kind} onChange={(k) => props.onUpdateStep(step.id, { kind: k })} /></div>
          <div className="field"><label>Lane</label><select aria-label="Lane" className="select" value={step.lane} onChange={(e) => props.onUpdateStep(step.id, { lane: e.target.value })}>{model.lanes.map((l) => <option key={l}>{l}</option>)}</select></div>
          <div className="field">
            <label>Goes to</label>
            {step.next.length === 0 && <div className="small muted">Nothing yet — drag the dot on the step's edge, or pick below.</div>}
            {step.next.map((n) => (
              <div key={n} className="row" style={{ gap: 6 }}>
                <Icon name="arrow-right" size={13} className="muted" />
                <button className="btn-link grow ellipsis" style={{ textAlign: 'left' }} onClick={() => props.onSelect({ type: 'step', id: n })}>{byId.get(n)?.label ?? 'missing step'}</button>
                {(step.kind === 'decision' || step.labels?.[n]) && <input aria-label="Connection label" key={n + (step.labels?.[n] ?? '')} className="input input-sm" style={{ width: 70 }} placeholder="label" defaultValue={step.labels?.[n] ?? ''} onBlur={(e) => e.target.value !== (step.labels?.[n] ?? '') && props.onLabel(step.id, n, e.target.value)} />}
                {editable && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => props.onDisconnect(step.id, n)} aria-label="Remove connection"><Icon name="x" size={13} /></button>}
              </div>
            ))}
            {editable && (
              <select aria-label="Connect to" className="select input-sm mt8" value="" onChange={(e) => e.target.value && props.onConnect(step.id, e.target.value)}>
                <option value="">Connect to…</option>
                {model.steps.filter((s) => s.id !== step.id && !step.next.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.label} ({s.lane})</option>)}
              </select>
            )}
          </div>
          {editable && step.kind !== 'end' && (
            <div className="row-wrap" style={{ gap: 6 }}>
              <span className="small muted">Add after:</span>
              <button className="btn btn-sm" onClick={() => props.onAddAfter('task')}>Task</button>
              <button className="btn btn-sm" onClick={() => props.onAddAfter('decision')}>Decision</button>
              <button className="btn btn-sm" onClick={() => props.onAddAfter('end')}>End</button>
            </div>
          )}
        </fieldset>
      )}
      {sel?.type === 'edge' && (() => {
        const from = byId.get(sel.from), to = byId.get(sel.to);
        if (!from || !to) return null;
        return (
          <fieldset disabled={!editable} className="col" style={{ gap: 12, border: 0, padding: 0, margin: 0 }}>
            <div className="row"><span className="eyebrow" style={{ margin: 0 }}>Connection</span><span className="spacer" />{editable && <button className="btn btn-ghost btn-sm" onClick={() => props.onDisconnect(from.id, to.id)}><Icon name="trash-2" size={13} />Delete</button>}</div>
            <div className="small"><b>{from.label}</b> → <b>{to.label}</b></div>
            <div className="field"><label>Label</label><input aria-label="Connection label" key={sel.from + sel.to} className="input" placeholder={from.kind === 'decision' ? 'e.g. Yes, No, Over £5k' : 'optional'} defaultValue={from.labels?.[to.id] ?? ''} onBlur={(e) => props.onLabel(from.id, to.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></div>
          </fieldset>
        );
      })()}
      {sel?.type === 'lane' && model.lanes[sel.index] !== undefined && (
        <div className="col" style={{ gap: 12 }}>
          <div className="eyebrow" style={{ margin: 0 }}>Lane</div>
          <div className="strong">{model.lanes[sel.index]}</div>
          <div className="small muted">{model.steps.filter((s) => s.lane === model.lanes[sel.index]).length} steps</div>
          {editable && (
            <div className="row-wrap" style={{ gap: 6 }}>
              <button className="btn btn-sm" onClick={() => props.onRenameLane(sel.index)}><Icon name="pencil" size={13} />Rename</button>
              <button className="btn btn-sm" onClick={() => props.onMoveLane(sel.index, -1)} disabled={sel.index === 0}>{earlier}</button>
              <button className="btn btn-sm" onClick={() => props.onMoveLane(sel.index, 1)} disabled={sel.index === model.lanes.length - 1}>{later}</button>
              <button className="btn btn-sm btn-ghost btn-danger" onClick={() => props.onRemoveLane(sel.index)} disabled={model.lanes.length < 2 && model.steps.length > 0}>Remove</button>
            </div>
          )}
        </div>
      )}
      {!sel && (
        <div className="col" style={{ gap: 10 }}>
          <div className="eyebrow" style={{ margin: 0 }}>Checks</div>
          {issues.length === 0 ? <div className="small">Looks well-formed: one start, every step reachable, every decision has labelled outcomes.</div> : (
            <>
              <div className="small muted">{props.counts.errors ? `${props.counts.errors} to fix · ` : ''}{props.counts.warnings ? `${props.counts.warnings} to look at · ` : ''}{issues.length - props.counts.errors - props.counts.warnings} suggestions</div>
              <div className="col" style={{ gap: 6 }}>
                {issues.slice(0, 12).map((i, k) => (
                  <button key={k} className="pm-issue" onClick={() => i.stepId && props.onSelect({ type: 'step', id: i.stepId })} disabled={!i.stepId}>
                    <span className={`dot ${i.severity}`} />
                    <span>{i.message}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="small muted" style={{ marginTop: 6 }}>Select a step, connection or lane to edit it.</div>
        </div>
      )}
    </aside>
  );
}

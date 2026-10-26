// Process models: layout, metrics and modelling checks for swimlane diagrams.
// Pure functions: used by the web canvas, the MCP server and tests.

export type StepKind = 'start' | 'task' | 'decision' | 'end';

export interface Step {
  id: string;
  lane: string;
  label: string;
  kind: StepKind;
  next: string[];
  /** Label per outgoing connection, keyed by target id (used on decisions). */
  labels?: Record<string, string>;
  /** Position along the flow (column when lanes are horizontal, row when vertical). */
  pos?: number;
}

/** Flow position by breadth-first order from the start; used when steps have no stored position. */
export function flowOrder(steps: Step[]): Map<string, number> {
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
  let extra = Math.max(-1, ...col.values()) + 1;
  for (const s of steps) if (!col.has(s.id)) col.set(s.id, extra++);
  return col;
}

/**
 * Every step's slot: its lane and position. Stored positions win; missing ones
 * come from the flow order. Two steps never share a lane + position.
 */
export function placeSteps(steps: Step[], lanes: string[]): Map<string, { lane: number; pos: number }> {
  const order = flowOrder(steps);
  const out = new Map<string, { lane: number; pos: number }>();
  const taken = new Set<string>();
  const sorted = [...steps].sort((a, b) => (a.pos ?? order.get(a.id)!) - (b.pos ?? order.get(b.id)!));
  for (const s of sorted) {
    const lane = Math.max(0, lanes.indexOf(s.lane));
    let pos = s.pos ?? order.get(s.id)!;
    while (taken.has(`${lane}:${pos}`)) pos += 1;
    taken.add(`${lane}:${pos}`);
    out.set(s.id, { lane, pos });
  }
  return out;
}

/** Recompute positions from the flow, keeping lanes. Returns new steps. */
export function tidy(steps: Step[], lanes: string[]): Step[] {
  const order = flowOrder(steps);
  const cleared = steps.map((s) => ({ ...s, pos: order.get(s.id)! }));
  const placed = placeSteps(cleared, lanes);
  return cleared.map((s) => ({ ...s, pos: placed.get(s.id)!.pos }));
}

/** Nearest free position in a lane, preferring later positions on ties. */
export function freeSlot(steps: Step[], lanes: string[], lane: string, pos: number, ignoreId?: string): number {
  const placed = placeSteps(steps, lanes);
  const li = lanes.indexOf(lane);
  const used = new Set(steps.filter((s) => s.id !== ignoreId).map((s) => placed.get(s.id)!).filter((p) => p.lane === li).map((p) => p.pos));
  const want = Math.max(0, Math.round(pos));
  for (let d = 0; d < 500; d++) {
    if (!used.has(want + d)) return want + d;
    if (d > 0 && want - d >= 0 && !used.has(want - d)) return want - d;
  }
  return want;
}

export function processMetrics(steps: Step[]) {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const order = flowOrder(steps);
  let handoffs = 0, loops = 0;
  for (const s of steps) for (const n of s.next) {
    const t = byId.get(n);
    if (!t) continue;
    if (t.lane !== s.lane) handoffs++;
    if ((order.get(n) ?? 0) <= (order.get(s.id) ?? 0)) loops++;
  }
  return {
    steps: steps.filter((s) => s.kind === 'task').length,
    decisions: steps.filter((s) => s.kind === 'decision').length,
    handoffs,
    loops,
    lanes: new Set(steps.map((s) => s.lane)).size,
  };
}

export interface ProcessIssue { severity: 'error' | 'warning' | 'info'; message: string; stepId?: string }

/** Modelling checks a reviewer would raise: missing start, dead ends, unlabelled branches, unreachable steps. */
export function checkProcess(steps: Step[], lanes: string[]): ProcessIssue[] {
  const issues: ProcessIssue[] = [];
  const byId = new Map(steps.map((s) => [s.id, s]));
  const starts = steps.filter((s) => s.kind === 'start');
  if (steps.length && !starts.length) issues.push({ severity: 'error', message: 'There is no start event. Add one so readers know where the process begins.' });
  if (starts.length > 1) issues.push({ severity: 'warning', message: `There are ${starts.length} start events. If these are different triggers, say so in their labels.` });
  if (steps.length && !steps.some((s) => s.kind === 'end')) issues.push({ severity: 'error', message: 'There is no end event. Where does the process finish?' });

  const reached = new Set<string>();
  const queue = starts.map((s) => s.id);
  while (queue.length) {
    const id = queue.shift()!;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const n of byId.get(id)?.next ?? []) queue.push(n);
  }
  for (const s of steps) {
    for (const n of s.next) if (!byId.has(n)) issues.push({ severity: 'error', message: `“${s.label}” points to a step that no longer exists.`, stepId: s.id });
    if (starts.length && !reached.has(s.id)) issues.push({ severity: 'warning', message: `“${s.label}” can't be reached from the start.`, stepId: s.id });
    if (s.kind !== 'end' && s.next.length === 0) issues.push({ severity: 'warning', message: `“${s.label}” is a dead end: connect it to the next step or make it an end event.`, stepId: s.id });
    if (s.kind === 'end' && s.next.length) issues.push({ severity: 'info', message: `End event “${s.label}” has outgoing connections.`, stepId: s.id });
    if (s.kind === 'decision') {
      if (s.next.length < 2) issues.push({ severity: 'warning', message: `Decision “${s.label}” has ${s.next.length === 0 ? 'no' : 'only one'} outcome. A decision needs at least two.`, stepId: s.id });
      const unlabelled = s.next.filter((n) => !s.labels?.[n]?.trim());
      if (s.next.length >= 2 && unlabelled.length) issues.push({ severity: 'info', message: `Label the outcomes of “${s.label}” (e.g. Yes / No) so the branches read clearly.`, stepId: s.id });
      if (!s.label.trim().endsWith('?')) issues.push({ severity: 'info', message: `Phrase decision “${s.label}” as a question.`, stepId: s.id });
    }
    if (!lanes.includes(s.lane)) issues.push({ severity: 'warning', message: `“${s.label}” is in lane “${s.lane}”, which doesn't exist any more.`, stepId: s.id });
  }
  for (const l of lanes) if (!steps.some((s) => s.lane === l)) issues.push({ severity: 'info', message: `Lane “${l}” has no steps.` });
  const order = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

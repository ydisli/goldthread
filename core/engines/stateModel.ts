export interface Transition { from: string; to: string; trigger: string; guard?: string }

export interface StateIssue { severity: 'error' | 'warning' | 'info'; message: string; state?: string }

/** Validate a state machine: reachability, dead ends, unknown states, nondeterminism. */
export function analyzeStateModel(states: string[], initial: string | undefined, finals: string[], transitions: Transition[]): StateIssue[] {
  const issues: StateIssue[] = [];
  const set = new Set(states);
  if (!initial) issues.push({ severity: 'error', message: 'No initial state defined.' });
  else if (!set.has(initial)) issues.push({ severity: 'error', message: `Initial state "${initial}" is not in the state list.`, state: initial });

  for (const t of transitions) {
    if (!set.has(t.from)) issues.push({ severity: 'error', message: `Transition "${t.trigger}" starts from unknown state "${t.from}".`, state: t.from });
    if (!set.has(t.to)) issues.push({ severity: 'error', message: `Transition "${t.trigger}" goes to unknown state "${t.to}".`, state: t.to });
    if (!t.trigger?.trim()) issues.push({ severity: 'warning', message: `Transition ${t.from} → ${t.to} has no trigger.` });
  }

  if (initial && set.has(initial)) {
    const reach = new Set([initial]);
    const queue = [initial];
    while (queue.length) {
      const s = queue.shift()!;
      for (const t of transitions) if (t.from === s && !reach.has(t.to)) { reach.add(t.to); queue.push(t.to); }
    }
    for (const s of states) if (!reach.has(s)) issues.push({ severity: 'error', message: `"${s}" is unreachable from "${initial}".`, state: s });
  }

  for (const s of states) {
    const outgoing = transitions.filter((t) => t.from === s);
    if (!finals.includes(s) && outgoing.length === 0) issues.push({ severity: 'warning', message: `"${s}" is a dead end — no way out and not marked final.`, state: s });
    if (finals.includes(s) && outgoing.length > 0) issues.push({ severity: 'info', message: `Final state "${s}" has outgoing transitions.`, state: s });
    const byTrigger = new Map<string, Transition[]>();
    for (const t of outgoing) {
      const k = `${t.trigger}|${t.guard ?? ''}`;
      byTrigger.set(k, [...(byTrigger.get(k) ?? []), t]);
    }
    for (const [k, ts] of byTrigger) {
      if (ts.length > 1 && new Set(ts.map((t) => t.to)).size > 1) {
        issues.push({ severity: 'error', message: `"${s}" on "${k.split('|')[0]}" can go to ${ts.map((t) => t.to).join(' or ')} — add guards.`, state: s });
      }
    }
  }
  if (!finals.length) issues.push({ severity: 'info', message: 'No final states — is this lifecycle endless by design?' });
  return issues;
}

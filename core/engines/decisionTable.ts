export interface DTCondition { name: string; values: string[] }
export interface DTAction { name: string }
export interface DTRule { id: string; when: Record<string, string>; then: Record<string, string> }
export type HitPolicy = 'unique' | 'first' | 'any';

export interface DTAnalysis {
  combinations: number;
  gaps: Record<string, string>[];
  overlaps: { combo: Record<string, string>; ruleIds: string[]; conflicting: boolean }[];
  unusedRules: string[];
  invalidValues: { ruleId: string; condition: string; value: string }[];
  complete: boolean;
  consistent: boolean;
}

const ANY = new Set(['', '-', '*', 'any']);

export function matches(rule: DTRule, combo: Record<string, string>): boolean {
  return Object.entries(combo).every(([k, v]) => {
    const want = (rule.when[k] ?? '-').trim();
    if (ANY.has(want.toLowerCase())) return true;
    return want.split(/\s*,\s*/).includes(v);
  });
}

export function allCombinations(conditions: DTCondition[]): Record<string, string>[] {
  let combos: Record<string, string>[] = [{}];
  for (const c of conditions) {
    const vals = c.values.length ? c.values : ['(none)'];
    const next: Record<string, string>[] = [];
    for (const combo of combos) for (const v of vals) next.push({ ...combo, [c.name]: v });
    combos = next;
    if (combos.length > 20000) break;
  }
  return combos;
}

/** Check a decision table for gaps (missing combinations), overlaps and conflicts. */
export function analyzeDecisionTable(conditions: DTCondition[], actions: DTAction[], rules: DTRule[], hitPolicy: HitPolicy = 'unique'): DTAnalysis {
  const combos = allCombinations(conditions);
  const gaps: Record<string, string>[] = [];
  const overlaps: DTAnalysis['overlaps'] = [];
  const used = new Set<string>();
  for (const combo of combos) {
    const hits = rules.filter((r) => matches(r, combo));
    if (!hits.length) { gaps.push(combo); continue; }
    if (hitPolicy === 'first') { used.add(hits[0].id); } else hits.forEach((h) => used.add(h.id));
    if (hits.length > 1) {
      const outputs = new Set(hits.map((h) => JSON.stringify(actions.map((a) => h.then[a.name] ?? ''))));
      const conflicting = outputs.size > 1;
      if (hitPolicy === 'unique' || (hitPolicy === 'any' && conflicting)) {
        overlaps.push({ combo, ruleIds: hits.map((h) => h.id), conflicting });
      }
    }
  }
  const invalidValues: DTAnalysis['invalidValues'] = [];
  for (const r of rules) {
    for (const c of conditions) {
      const v = (r.when[c.name] ?? '-').trim();
      if (ANY.has(v.toLowerCase())) continue;
      for (const part of v.split(/\s*,\s*/)) if (!c.values.includes(part)) invalidValues.push({ ruleId: r.id, condition: c.name, value: part });
    }
  }
  return {
    combinations: combos.length,
    gaps: compressGaps(gaps, conditions),
    overlaps,
    unusedRules: rules.filter((r) => !used.has(r.id)).map((r) => r.id),
    invalidValues,
    complete: gaps.length === 0,
    consistent: overlaps.filter((o) => o.conflicting || hitPolicy === 'unique').length === 0,
  };
}

/** Merge gap rows that differ in only one condition covering all its values into "-". */
function compressGaps(gaps: Record<string, string>[], conditions: DTCondition[]): Record<string, string>[] {
  let rows = gaps.map((g) => ({ ...g }));
  for (const c of conditions) {
    const groups = new Map<string, Record<string, string>[]>();
    for (const r of rows) {
      const key = JSON.stringify(Object.entries(r).filter(([k]) => k !== c.name));
      const list = groups.get(key);
      if (list) list.push(r);
      else groups.set(key, [r]);
    }
    const next: Record<string, string>[] = [];
    for (const list of groups.values()) {
      const vals = new Set(list.map((r) => r[c.name]));
      if (c.values.length > 1 && c.values.every((v) => vals.has(v))) next.push({ ...list[0], [c.name]: '-' });
      else next.push(...list);
    }
    rows = next;
  }
  return rows;
}

export interface DTTest { id: string; inputs: Record<string, string>; expected: Record<string, string> | null; ruleId: string | null }

/** Generate test cases: every combination, or a pairwise covering set. */
export function generateTests(conditions: DTCondition[], actions: DTAction[], rules: DTRule[], hitPolicy: HitPolicy = 'unique', mode: 'all' | 'pairwise' = 'pairwise'): DTTest[] {
  const combos = mode === 'all' || conditions.length <= 2 ? allCombinations(conditions) : pairwise(conditions);
  return combos.map((inputs, i) => {
    const hit = rules.find((r) => matches(r, inputs)) ?? null;
    return {
      id: `T${i + 1}`,
      inputs,
      expected: hit ? Object.fromEntries(actions.map((a) => [a.name, hit.then[a.name] ?? ''])) : null,
      ruleId: hit?.id ?? null,
    };
  });
}

/** Greedy pairwise (all-pairs) covering array. */
export function pairwise(conditions: DTCondition[]): Record<string, string>[] {
  const all = allCombinations(conditions);
  const pairKey = (a: string, va: string, b: string, vb: string) => `${a}=${va}|${b}=${vb}`;
  const uncovered = new Set<string>();
  for (let i = 0; i < conditions.length; i++)
    for (let j = i + 1; j < conditions.length; j++)
      for (const va of conditions[i].values) for (const vb of conditions[j].values) uncovered.add(pairKey(conditions[i].name, va, conditions[j].name, vb));
  const pairsOf = (combo: Record<string, string>) => {
    const out: string[] = [];
    for (let i = 0; i < conditions.length; i++)
      for (let j = i + 1; j < conditions.length; j++) out.push(pairKey(conditions[i].name, combo[conditions[i].name], conditions[j].name, combo[conditions[j].name]));
    return out;
  };
  const chosen: Record<string, string>[] = [];
  while (uncovered.size) {
    let best = all[0], bestGain = -1;
    for (const c of all) {
      const gain = pairsOf(c).filter((p) => uncovered.has(p)).length;
      if (gain > bestGain) { best = c; bestGain = gain; }
    }
    if (bestGain <= 0) break;
    chosen.push(best);
    for (const p of pairsOf(best)) uncovered.delete(p);
  }
  return chosen;
}

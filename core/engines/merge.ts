// Three-way merges for things two people edit at once: text (specs, meeting notes)
// and lists of items with ids (process steps). Base = what both started from.

/** Longest-common-subsequence match of b's lines onto a's: out[i] = index in b, or -1. */
function lcsMatch(a: string[], b: string[]): number[] {
  const n = a.length, m = b.length;
  const out = new Array<number>(n).fill(-1);
  // Trim the common prefix and suffix first; most edits are local.
  let lo = 0;
  while (lo < n && lo < m && a[lo] === b[lo]) { out[lo] = lo; lo++; }
  let hiA = n, hiB = m;
  while (hiA > lo && hiB > lo && a[hiA - 1] === b[hiB - 1]) { hiA--; hiB--; out[hiA] = hiB; }
  const rows = hiA - lo, cols = hiB - lo;
  if (!rows || !cols) return out;
  const w = cols + 1;
  const dp = new Uint32Array((rows + 1) * w);
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      dp[i * w + j] = a[lo + i] === b[lo + j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < rows && j < cols) {
    if (a[lo + i] === b[lo + j]) { out[lo + i] = lo + j; i++; j++; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++;
    else j++;
  }
  return out;
}

const sameLines = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export interface TextMerge {
  /** The merged text; where both changed the same lines, yours come first, then theirs. */
  text: string;
  /** How many places both of you changed the same lines. */
  conflicts: number;
}

/** Line-based three-way merge (diff3): non-overlapping edits combine; overlapping ones are counted. */
export function mergeText(base: string, mine: string, theirs: string): TextMerge {
  if (mine === theirs) return { text: mine, conflicts: 0 };
  if (mine === base) return { text: theirs, conflicts: 0 };
  if (theirs === base) return { text: mine, conflicts: 0 };
  const B = base.split('\n'), M = mine.split('\n'), T = theirs.split('\n');
  const toM = lcsMatch(B, M), toT = lcsMatch(B, T);
  const out: string[] = [];
  let conflicts = 0;
  let b = 0, m = 0, t = 0;
  while (b < B.length || m < M.length || t < T.length) {
    if (b < B.length && toM[b] === m && toT[b] === t) { out.push(B[b]); b++; m++; t++; continue; }
    // Next base line both sides kept: everything before it is one changed region.
    let j = b;
    while (j < B.length && !(toM[j] >= m && toT[j] >= t)) j++;
    const mEnd = j < B.length ? toM[j] : M.length, tEnd = j < B.length ? toT[j] : T.length;
    const bs = B.slice(b, j), ms = M.slice(m, mEnd), ts = T.slice(t, tEnd);
    if (sameLines(ms, bs)) out.push(...ts);
    else if (sameLines(ts, bs) || sameLines(ms, ts)) out.push(...ms);
    else { out.push(...ms, ...ts); conflicts++; }
    b = j; m = mEnd; t = tEnd;
  }
  return { text: out.join('\n'), conflicts };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Merge two edited copies of a list of `{id}` items: additions and deletions from both sides
 * are kept; an item both changed differently keeps your version and counts as a conflict.
 * Order follows yours, with their new items after the item they followed.
 */
export function mergeById<T extends { id: string }>(base: T[], mine: T[], theirs: T[]): { items: T[]; conflicts: number } {
  const byB = new Map(base.map((x) => [x.id, x])), byM = new Map(mine.map((x) => [x.id, x])), byT = new Map(theirs.map((x) => [x.id, x]));
  let conflicts = 0;
  const pick = (id: string): T | null => {
    const b = byB.get(id), mi = byM.get(id), th = byT.get(id);
    if (!b) return mi ?? th ?? null; // added on one side (or both)
    if (!mi || !th) { // deleted on at least one side
      const kept = mi ?? th;
      if (!kept || same(kept, b)) return null;
      conflicts++; // one side deleted it, the other changed it: keep the change
      return kept;
    }
    if (same(mi, b)) return th;
    if (same(th, b) || same(mi, th)) return mi;
    conflicts++;
    return mi;
  };
  const order: string[] = mine.map((x) => x.id);
  theirs.forEach((x, i) => {
    if (order.includes(x.id) || byB.has(x.id)) return;
    const prevId = theirs[i - 1]?.id;
    const at = prevId ? order.indexOf(prevId) : -1;
    order.splice(at + 1, 0, x.id);
  });
  const items: T[] = [];
  for (const id of order) { const x = pick(id); if (x) items.push(x); }
  // Items they kept that you deleted are gone unless they changed them (handled in pick); none left to add.
  return { items, conflicts };
}

/** Merge a plain list of strings (e.g. lane names): keep both sides' additions and both sides' removals. */
export function mergeList(base: string[], mine: string[], theirs: string[]): string[] {
  if (same(mine, base)) return theirs;
  if (same(theirs, base)) return mine;
  const kept = mine.filter((x) => theirs.includes(x) || !base.includes(x));
  return [...kept, ...theirs.filter((x) => !base.includes(x) && !kept.includes(x))];
}

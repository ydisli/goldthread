import type { Entity } from '../schema.ts';
import { escapeRegex } from '../util.ts';

export type Severity = 'info' | 'warning' | 'error';

export interface LintIssue {
  rule: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  /** Offsets into the original text. */
  start: number;
  end: number;
  line: number;
  excerpt: string;
}

const VAGUE: Record<string, string> = {
  fast: 'State a measurable threshold, e.g. "p95 < 2 s".',
  quick: 'State a measurable threshold, e.g. "within 3 clicks" or "< 1 s".',
  quickly: 'State a measurable threshold.',
  slow: 'Quantify: how slow is too slow?',
  easy: 'Define "easy": task success rate, time on task, steps.',
  easily: 'Define how ease will be verified (e.g. 90% task success in usability test).',
  simple: 'Define what makes it simple, or remove.',
  simply: 'Usually filler — remove or make specific.',
  'user-friendly': 'Not testable. Specify usability criteria (task success, time, errors).',
  'user friendly': 'Not testable. Specify usability criteria (task success, time, errors).',
  intuitive: 'Not testable. Specify usability criteria.',
  seamless: 'Describe the actual behaviour (no reload? no re-login?).',
  seamlessly: 'Describe the actual behaviour.',
  robust: 'Specify failure modes and expected behaviour.',
  flexible: 'Name the variations that must be supported.',
  efficient: 'Quantify (time, cost, steps).',
  efficiently: 'Quantify (time, cost, steps).',
  scalable: 'State the load: users, rows, requests per second.',
  modern: 'Not testable — describe the attribute you mean.',
  optimal: 'Define the optimisation criterion.',
  appropriate: 'Define what is appropriate in this context.',
  appropriately: 'Define what is appropriate in this context.',
  adequate: 'Quantify what is adequate.',
  reasonable: 'Quantify what is reasonable.',
  sufficient: 'Quantify what is sufficient.',
  'as needed': 'Who decides when it is needed?',
  'if possible': 'Is it required or not? Make a decision or mark as "could".',
  'where possible': 'Is it required or not? Make a decision or mark as "could".',
  'as appropriate': 'Define the conditions explicitly.',
  'as soon as possible': 'Give a time bound.',
  asap: 'Give a time bound.',
  'state-of-the-art': 'Not testable — remove or specify.',
  'best-in-class': 'Not testable — remove or specify.',
  'world-class': 'Not testable — remove or specify.',
  'high quality': 'Specify the quality attribute and threshold.',
  lightweight: 'Quantify (bundle size, memory, steps).',
  'real-time': 'Give a latency bound (e.g. updates within 5 s).',
  realtime: 'Give a latency bound (e.g. updates within 5 s).',
  responsive: 'Give a response-time bound or name the breakpoints.',
  'in a timely manner': 'Give a time bound.',
  minimal: 'Quantify.',
  'easy to use': 'Specify usability criteria (task success, time, errors).',
};

const UNBOUNDED: Record<string, string> = {
  large: 'How large? Give a maximum (rows, MB, items).',
  huge: 'Give a number.',
  big: 'Give a number.',
  small: 'How small? Give a bound.',
  many: 'How many? Give a number or range.',
  few: 'How few? Give a number.',
  several: 'How many exactly?',
  'lots of': 'Give a number.',
  'a lot of': 'Give a number.',
  numerous: 'Give a number.',
  multiple: 'Give a minimum/maximum if it matters.',
  various: 'List them.',
  most: 'Which ones are excluded?',
};

const OPEN_ENDED: Record<string, string> = {
  etc: 'Open-ended list — enumerate all items or define the rule.',
  'and so on': 'Open-ended list — enumerate all items.',
  'such as': 'Is the list exhaustive? If not, define the rule.',
  'including but not limited to': 'Open-ended — define the rule or the complete list.',
  'and/or': 'Ambiguous — is it "and", "or", or both?',
  'among others': 'Open-ended list — enumerate.',
};

const WEAK_MODALS: Record<string, string> = {
  should: 'Is this mandatory? Use "must" (required) or mark MoSCoW priority explicitly.',
  may: 'Ambiguous: permission or possibility? Use "can" / "must" / "could".',
  might: 'Speculative — decide, or move to open questions.',
  could: 'Optional? Mark as a "could" with MoSCoW, or make it a must.',
};

const ABSOLUTES: Record<string, string> = {
  always: 'Absolutes are hard to verify — confirm there are no exceptions.',
  never: 'Absolutes are hard to verify — confirm there are no exceptions.',
  'all users': 'Really all? Including suspended, guests, API clients?',
  every: 'Really every? List exceptions if any.',
};

const PLACEHOLDERS = /\b(TBD|TBC|TODO|FIXME|XXX)\b|\?\?+|\bto be (decided|defined|confirmed)\b/g;
const PASSIVE = /\b(is|are|was|were|be|been|being|gets|get)\s+((?:automatically\s+)?[a-z]+(?:ed|en)|sent|done|made|shown|given|taken|written|seen|built|set|kept|held|paid|sold|told|found|brought|run|shut)\b(?!\s+by\b)/gi;
const COMPARATIVE = /\b(faster|quicker|easier|better|improved|cheaper|smoother|more efficient|more intuitive)\b/gi;

export interface LintOptions {
  glossary?: Entity[];
  /** Skip lower-signal rules (passive voice, weak modals) */
  strictOnly?: boolean;
}

/** Lint requirement / spec text for ambiguity and testability problems. */
export function lint(text: string, opts: LintOptions = {}): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = text.split('\n');
  let offset = 0;
  let inCode = false;

  const synonymRules: { re: RegExp; term: string; syn: string }[] = [];
  for (const g of opts.glossary ?? []) {
    for (const syn of (g.synonyms as string[] | undefined) ?? []) {
      if (!syn?.trim()) continue;
      synonymRules.push({ re: new RegExp(`\\b${escapeRegex(syn.trim())}\\b`, 'gi'), term: g.term, syn });
    }
  }

  lines.forEach((rawLine, i) => {
    const lineStart = offset;
    offset += rawLine.length + 1;
    if (/^\s*```/.test(rawLine)) { inCode = !inCode; return; }
    if (inCode) return;
    // Headings, blockquotes (customer quotes) and tables of evidence are not requirements.
    if (/^\s*(#|>)/.test(rawLine)) return;
    // Mask inline code and links' URLs so they are not linted.
    const line = rawLine.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length)).replace(/\]\([^)]*\)/g, (m) => ' '.repeat(m.length));

    const add = (rule: string, severity: Severity, idx: number, len: number, message: string, suggestion?: string) => {
      issues.push({
        rule, severity, message, suggestion,
        start: lineStart + idx, end: lineStart + idx + len, line: i + 1,
        excerpt: rawLine.trim().slice(0, 160),
      });
    };

    scanDictionary(line, VAGUE, (idx, w, hint) => add('vague-term', 'warning', idx, w.length, `"${w}" is not testable.`, hint));
    scanDictionary(line, UNBOUNDED, (idx, w, hint) => add('unbounded-quantity', w === 'multiple' || w === 'most' ? 'info' : 'warning', idx, w.length, `"${w}" is an unbounded quantity.`, hint));
    scanDictionary(line, OPEN_ENDED, (idx, w, hint) => add('open-ended', 'warning', idx, w.length, `"${w}" leaves the scope open.`, hint));
    scanDictionary(line, ABSOLUTES, (idx, w, hint) => add('absolute', 'info', idx, w.length, `"${w}" is an absolute.`, hint));
    if (!opts.strictOnly) {
      scanDictionary(line, WEAK_MODALS, (idx, w, hint) => add('weak-modal', 'info', idx, w.length, `"${w}" makes the obligation unclear.`, hint));
    }

    for (const m of line.matchAll(PLACEHOLDERS)) {
      add('placeholder', 'error', m.index!, m[0].length, `Unresolved placeholder "${m[0]}".`, 'Resolve it or move it to Open questions with an owner and a date.');
    }
    if (!opts.strictOnly) {
      for (const m of line.matchAll(PASSIVE)) {
        add('passive-voice', 'info', m.index!, m[0].length, `Passive voice hides the actor: "${m[0]}".`, 'Name who or what performs the action (user role or system).');
      }
    }
    for (const m of line.matchAll(COMPARATIVE)) {
      const rest = line.slice(m.index! + m[0].length);
      if (!/\bthan\b/i.test(rest.split(/[.;]/)[0] ?? '')) {
        add('comparative', 'warning', m.index!, m[0].length, `"${m[0]}" than what?`, 'Give the baseline and the target (e.g. "from 12 min to < 2 min").');
      }
    }
    const modals = line.match(/\b(shall|must|will|should)\b/gi);
    if (modals && modals.length >= 2 && /\band\b/i.test(line)) {
      const idx = line.search(/\b(shall|must|will|should)\b/i);
      add('compound', 'info', idx, modals[0].length, 'Compound requirement — several obligations in one statement.', 'Split into one requirement per obligation so each can be tested and traced.');
    }
    for (const r of synonymRules) {
      for (const m of line.matchAll(r.re)) {
        add('glossary', 'warning', m.index!, m[0].length, `"${m[0]}" — the glossary term is "${r.term}".`, `Use "${r.term}" consistently.`);
      }
    }
  });

  // Overlapping hits of the same rule ("easy" inside "easy to use"): keep the longest.
  issues.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: LintIssue[] = [];
  for (const i of issues) {
    if (out.some((o) => o.rule === i.rule && i.start < o.end && o.start < i.end)) continue;
    out.push(i);
  }
  return out;
}

function scanDictionary(line: string, dict: Record<string, string>, onHit: (idx: number, word: string, hint: string) => void) {
  const lower = line.toLowerCase();
  for (const [word, hint] of Object.entries(dict)) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}/-])(${escapeRegex(word)})(?=$|[^\\p{L}\\p{N}/-])`, 'giu');
    for (const m of lower.matchAll(re)) {
      onHit(m.index! + m[1].length, line.slice(m.index! + m[1].length, m.index! + m[1].length + word.length), hint);
    }
  }
}

export interface LintSummary {
  score: number;
  errors: number;
  warnings: number;
  infos: number;
  words: number;
  byRule: Record<string, number>;
}

/** 0–100 clarity score: penalties per issue, normalised by length. */
export function lintSummary(text: string, issues: LintIssue[]): LintSummary {
  const words = (text.match(/\b\w+\b/g) ?? []).length;
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;
  const penalty = errors * 6 + warnings * 3 + infos * 0.75;
  const per100 = words ? (penalty / words) * 100 : 0;
  const score = Math.round(Math.max(0, 100 - per100 * 4));
  const byRule: Record<string, number> = {};
  for (const i of issues) byRule[i.rule] = (byRule[i.rule] ?? 0) + 1;
  return { score, errors, warnings, infos, words, byRule };
}

export const RULE_LABELS: Record<string, string> = {
  'vague-term': 'Vague term',
  'unbounded-quantity': 'Unbounded quantity',
  'open-ended': 'Open-ended list',
  absolute: 'Absolute',
  'weak-modal': 'Weak modal',
  placeholder: 'Placeholder',
  'passive-voice': 'Passive voice',
  comparative: 'Comparative without baseline',
  compound: 'Compound requirement',
  glossary: 'Glossary synonym',
};

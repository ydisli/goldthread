import type { Entity } from '../schema.ts';
import { addDays, isoDate } from '../util.ts';

export interface Extracted {
  decisions: string[];
  actions: { text: string; ownerId?: string; ownerName?: string; due?: string }[];
  risks: string[];
  requirements: string[];
  questions: string[];
}

const DECISION = /^(?:decision|decided|we decided(?: to)?|agreed|we agreed(?: to)?|we(?:'ll| will) go with|going with|resolution)\s*[:\-–]?\s*(.+)$/i;
const DECISION_INLINE = /\b(we decided to|we agreed to|decision is to|agreed that)\b\s*(.+)$/i;
const ACTION = /^(?:action(?: item)?|todo|ai|follow[- ]?up|next step)\s*[:\-–]\s*(.+)$/i;
const RISK = /^(?:risk|concern|issue)\s*[:\-–]\s*(.+)$/i;
const RISK_INLINE = /\b(risk (?:is |that )|we are worried|concerned that|might slip|could block)\b/i;
const REQUIREMENT = /\b(must|shall|needs? to|has to|should be able to|is required to)\b/i;
const QUESTION = /^(?:open question|question|q)\s*[:\-–]\s*(.+)$/i;
const KEYWORD_PREFIX = /^(decision|decided|agreed|resolution|action|action item|todo|ai|follow[- ]?up|next step|risk|concern|issue|open question|question|q)$/i;

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseDue(s: string, now: Date): string | undefined {
  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(s);
  if (iso) return iso[1];
  const lower = s.toLowerCase();
  if (/\btomorrow\b/.test(lower)) return addDays(now, 1);
  if (/\btoday\b|\beod\b/.test(lower)) return isoDate(now);
  if (/\bnext week\b/.test(lower)) return addDays(now, 7);
  if (/\bend of (the )?month\b/.test(lower)) return isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const wd = WEEKDAYS.findIndex((d) => new RegExp(`\\b(by |on |before )?${d}\\b`).test(lower));
  if (wd >= 0) {
    const diff = (wd - now.getDay() + 7) % 7 || 7;
    return addDays(now, diff);
  }
  return undefined;
}

function findOwner(s: string, people: Entity[]): Entity | undefined {
  const lower = s.toLowerCase();
  // Prefer "@Name" mentions, then full names, then first names at the start.
  for (const p of people) {
    const full = String(p.name ?? '').toLowerCase();
    if (!full) continue;
    const first = full.split(' ')[0];
    if (lower.includes(`@${first}`) || lower.includes(full)) return p;
  }
  for (const p of people) {
    const first = String(p.name ?? '').toLowerCase().split(' ')[0];
    if (first && new RegExp(`^${first}\\b`).test(lower)) return p;
  }
  return undefined;
}

/** Extract decisions, actions, risks, requirements and questions from notes. */
export function extractFromNotes(notes: string, people: Entity[] = [], now = new Date()): Extracted {
  const out: Extracted = { decisions: [], actions: [], risks: [], requirements: [], questions: [] };
  for (const raw of notes.split('\n')) {
    let line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/, '').trim();
    // Transcript lines look like "Speaker Name: text": drop the speaker label.
    const speaker = /^([A-Z][\w .'-]{1,30}):\s+(.+)$/.exec(line);
    if (speaker && !KEYWORD_PREFIX.test(speaker[1].trim())) line = speaker[2].trim();
    if (!line) continue;
    let m: RegExpExecArray | null;
    if ((m = DECISION.exec(line))) { out.decisions.push(clean(m[1])); continue; }
    if ((m = ACTION.exec(line))) { out.actions.push(action(m[1], people, now)); continue; }
    if ((m = RISK.exec(line))) { out.risks.push(clean(m[1])); continue; }
    if ((m = QUESTION.exec(line))) { out.questions.push(clean(m[1])); continue; }
    if ((m = DECISION_INLINE.exec(line))) { out.decisions.push(clean(m[2])); continue; }
    const owner = findOwner(line, people);
    const assigned = /@\w+/.test(line) || /^[A-Z]\w+(?: [A-Z]\w+)? (?:will|to) \w+/.test(line);
    if (owner && assigned) { out.actions.push(action(line, people, now)); continue; }
    if (RISK_INLINE.test(line)) { out.risks.push(clean(line)); continue; }
    if (line.endsWith('?')) { out.questions.push(clean(line)); continue; }
    if (REQUIREMENT.test(line) && line.split(' ').length >= 5) out.requirements.push(clean(line));
  }
  return out;
}

function action(text: string, people: Entity[], now: Date) {
  const owner = findOwner(text, people);
  return { text: clean(text), ownerId: owner?.id, ownerName: owner?.name, due: parseDue(text, now) };
}

function clean(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ').replace(/[.;]+$/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Pull candidate requirement statements out of a spec body. */
export function extractRequirements(markdown: string): { title: string; statement: string; section: string }[] {
  const out: { title: string; statement: string; section: string }[] = [];
  let section = '';
  let inReqSection = false;
  for (const raw of markdown.split('\n')) {
    const h = /^#{1,4}\s+(.+)$/.exec(raw);
    if (h) {
      section = h[1].trim();
      inReqSection = /requirement|functional|rules|acceptance|scope/i.test(section) && !/non-goal|out of scope/i.test(section);
      continue;
    }
    const bullet = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/.exec(raw);
    const line = (bullet ? bullet[1] : raw).trim();
    if (!line) continue;
    const isReq = /\b(the system|users? (?:can|must|shall)|shall|must)\b/i.test(line) || (inReqSection && !!bullet);
    if (!isReq || line.length < 12) continue;
    const statement = line.replace(/\*\*/g, '');
    const title = statement.replace(/^(the system (shall|must|will)|users? (can|must|shall)|an? \w+ (can|must|shall))\s+/i, '').split(/[.;,:]/)[0].slice(0, 80);
    out.push({ title: title.charAt(0).toUpperCase() + title.slice(1), statement, section });
  }
  return out;
}

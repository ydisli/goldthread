// The Field Guide: chapters are Markdown files with a small front matter block.
// Shared by the web reader, the MCP server (so assistants can teach from it) and tests.

export type BookPart = 'craft' | 'tool' | 'appendix';

export interface ChapterMeta {
  id: string;
  title: string;
  part: BookPart;
  /** Position in the book, from the file name (e.g. 03). */
  order: number;
  minutes: number;
  summary: string;
  /** Tool ids (see web/src/nav.ts) this chapter teaches or uses. */
  tools: string[];
}

export interface Chapter extends ChapterMeta {
  body: string;
}

export interface Quiz {
  question: string;
  options: { text: string; correct: boolean }[];
  why: string;
}

export const PARTS: { id: BookPart; label: string; title: string; blurb: string }[] = [
  { id: 'craft', label: 'Part I', title: 'The craft', blurb: 'How to be a good Product Owner or Business Analyst: in any tool, or none.' },
  { id: 'tool', label: 'Part II', title: 'Working in Goldthread', blurb: 'How the craft maps onto Goldthread, tool by tool, with recipes for a real week.' },
  { id: 'appendix', label: 'Appendices', title: 'Templates & reference', blurb: 'Fill-in templates and a glossary of the terms used in the book.' },
];

/** Parse `---\nkey: value\n---` front matter; arrays are written `[a, b]`. */
export function parseChapter(raw: string, fileName: string): Chapter {
  const text = raw.replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const base = fileName.split('/').pop()!.replace(/\.md$/, '');
  const order = Number(/^(\d+)/.exec(base)?.[1] ?? 999);
  const list = (v: string | undefined) => (v ?? '').replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean);
  const unquote = (v: string | undefined) => (v ?? '').replace(/^["']|["']$/g, '');
  return {
    id: meta.id || base.replace(/^\d+-/, ''),
    title: unquote(meta.title) || base,
    part: (['craft', 'tool', 'appendix'].includes(meta.part) ? meta.part : 'craft') as BookPart,
    order,
    minutes: Number(meta.minutes) || Math.max(3, Math.round(text.split(/\s+/).length / 220)),
    summary: unquote(meta.summary),
    tools: list(meta.tools),
    body: m ? text.slice(m[0].length) : text,
  };
}

export function sortChapters(chapters: Chapter[]): Chapter[] {
  const partOrder = PARTS.map((p) => p.id);
  return [...chapters].sort((a, b) => partOrder.indexOf(a.part) - partOrder.indexOf(b.part) || a.order - b.order);
}

/**
 * Quiz blocks look like:
 *
 *     ```quiz
 *     Q: Which of these is an outcome?
 *     - Ship the portal
 *     - * Cut password tickets by half
 *     Why: An outcome is a change in behaviour or results, not a deliverable.
 *     ```
 */
export function parseQuiz(block: string): Quiz | null {
  let question = '', why = '';
  const options: Quiz['options'] = [];
  for (const line of block.split('\n')) {
    const t = line.trim();
    if (/^Q:/i.test(t)) question = t.slice(2).trim();
    else if (/^Why:/i.test(t)) why = t.slice(4).trim();
    else if (/^-\s+/.test(t)) {
      const body = t.replace(/^-\s+/, '');
      const correct = body.startsWith('* ');
      options.push({ text: correct ? body.slice(2) : body, correct });
    } else if (t && why) why += ` ${t}`;
  }
  if (!question || options.length < 2 || !options.some((o) => o.correct)) return null;
  return { question, options, why };
}

export function quizzesOf(body: string): Quiz[] {
  return [...body.matchAll(/```quiz\n([\s\S]*?)```/g)].map((m) => parseQuiz(m[1])).filter((q): q is Quiz => !!q);
}

/** "## Heading" → stable anchor id. */
export function slug(s: string): string {
  return s.toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

/** Plain text for search and for assistants: front matter and quiz answers removed. */
export function chapterText(c: Chapter): string {
  return c.body.replace(/```quiz\n[\s\S]*?```/g, '').replace(/^>\s?\[!(\w+)\]\s*/gm, '> ').trim();
}

export interface BookCheck { file: string; problem: string }

/** Structural checks used by the test-suite: unique ids, known tools, valid quizzes and links. */
export function checkBook(chapters: Chapter[], knownTools: string[]): BookCheck[] {
  const out: BookCheck[] = [];
  const ids = new Set<string>();
  for (const c of chapters) {
    if (ids.has(c.id)) out.push({ file: c.id, problem: 'duplicate id' });
    ids.add(c.id);
    if (!c.summary) out.push({ file: c.id, problem: 'missing summary' });
    for (const t of c.tools) if (!knownTools.includes(t)) out.push({ file: c.id, problem: `unknown tool "${t}"` });
    const blocks = [...c.body.matchAll(/```quiz\n([\s\S]*?)```/g)];
    for (const b of blocks) if (!parseQuiz(b[1])) out.push({ file: c.id, problem: `bad quiz: ${b[1].split('\n')[0]}` });
  }
  for (const c of chapters) {
    for (const m of c.body.matchAll(/\]\(guide:([\w-]+)/g)) if (!ids.has(m[1])) out.push({ file: c.id, problem: `link to missing chapter "${m[1]}"` });
    for (const m of c.body.matchAll(/\]\(tool:([\w-]+)/g)) if (!knownTools.includes(m[1])) out.push({ file: c.id, problem: `link to unknown tool "${m[1]}"` });
  }
  return out;
}

const CALLOUT_LABEL: Record<string, string> = { tip: 'Tip', trap: 'Common trap', example: 'Example', try: 'Try it in Goldthread', note: 'Note', exercise: 'Exercise' };

/**
 * A chapter as self-contained Markdown for exporting (Word, print): title and summary on top,
 * callouts labelled, links to tools and chapters as plain text, quizzes with their answers.
 */
export function chapterMarkdown(c: Chapter, label?: string): string {
  let n = 0;
  const body = c.body
    .replace(/```quiz\n([\s\S]*?)```/g, (_, q: string) => {
      const quiz = parseQuiz(q);
      if (!quiz) return '';
      n++;
      const right = quiz.options.find((o) => o.correct)?.text ?? '';
      return `**${n}. ${quiz.question}**\n\n${quiz.options.map((o, i) => `- ${String.fromCharCode(65 + i)}. ${o.text}`).join('\n')}\n\n*Answer: ${right}. ${quiz.why}*\n`;
    })
    .replace(/^>\s?\[!(\w+)\]\s*(.*)$/gm, (_, kind: string, title: string) => `> **${title.trim() || CALLOUT_LABEL[kind.toLowerCase()] || 'Note'}**`)
    .replace(/\]\((?:tool|guide):[\w-]+\)/g, ']');
  // "[Process models]" left over from a tool link reads fine as plain words.
  const cleaned = body.replace(/\[([^\]]+)\](?!\()/g, '$1');
  return `# ${label ? `${label}: ` : ''}${c.title}\n\n${c.summary ? `*${c.summary}*\n\n` : ''}${cleaned.trim()}\n`;
}

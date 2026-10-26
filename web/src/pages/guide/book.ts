import { PARTS, parseChapter, sortChapters, type BookPart, type Chapter } from '../../../../core/book.ts';

// Chapters are plain Markdown in /book (numbered files only), bundled into the guide's own chunk.
const files = import.meta.glob('../../../../book/**/[0-9]*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const CHAPTERS: Chapter[] = sortChapters(Object.entries(files).map(([path, raw]) => parseChapter(raw, path)));
export const CHAPTER_MAP = new Map(CHAPTERS.map((c) => [c.id, c]));

export function chaptersIn(part: BookPart): Chapter[] {
  return CHAPTERS.filter((c) => c.part === part);
}

/** "Chapter 7" in Part I and II (numbered through), "Appendix A" after. */
export function chapterLabel(c: Chapter): string {
  if (c.part === 'appendix') return `Appendix ${String.fromCharCode(65 + chaptersIn('appendix').indexOf(c))}`;
  return `Chapter ${CHAPTERS.filter((x) => x.part !== 'appendix').indexOf(c) + 1}`;
}

export function partOf(c: Chapter) {
  return PARTS.find((p) => p.id === c.part)!;
}

export interface ReadingPath { id: string; title: string; blurb: string; chapters: string[] }

/** Suggested routes through the book. Ids that don't exist are ignored. */
export const PATHS: ReadingPath[] = [
  { id: 'new', title: 'New to the role', blurb: 'The whole craft, in order. Two or three chapters a week is plenty.', chapters: chaptersIn('craft').map((c) => c.id) },
  { id: 'po', title: 'Experienced Product Owner', blurb: 'Sharpen the parts POs most often skip: evidence, honest forecasts and outcomes.', chapters: ['problems-first', 'stakeholders', 'discovery', 'strategy', 'prioritisation', 'forecasting', 'outcomes', 'tour', 'stakeholders-in-goldthread', 'delivery-in-goldthread'] },
  { id: 'ba', title: 'Experienced Business Analyst', blurb: 'From good requirements to traceable, testable, audit-ready ones — and the people side.', chapters: ['elicitation', 'requirements', 'modelling', 'specs-and-reviews', 'governance', 'relationships', 'tour', 'specs-in-goldthread', 'delivery-in-goldthread'] },
  { id: 'tool', title: 'Just show me the tool', blurb: 'Part II on its own: set up, then one chapter per area, then real-week recipes.', chapters: chaptersIn('tool').map((c) => c.id) },
].map((p) => ({ ...p, chapters: p.chapters.filter((id) => CHAPTER_MAP.has(id)) }));

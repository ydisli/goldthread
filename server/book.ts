import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChapter, sortChapters, type Chapter } from '../core/book.ts';

// The Field Guide lives in /book as Markdown; the server reads it for MCP clients.
export const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'book');

export function loadBook(dir = BOOK_DIR): Chapter[] {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.md')) files.push(p);
    }
  };
  try { walk(dir); } catch { return []; }
  return sortChapters(files.map((f) => parseChapter(readFileSync(f, 'utf8'), f)));
}

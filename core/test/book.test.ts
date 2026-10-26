import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkBook, chapterText, parseChapter, parseQuiz, quizzesOf, slug } from '../book.ts';
import { loadBook } from '../../server/book.ts';

const book = loadBook();
const navSource = readFileSync(new URL('../../web/src/nav.ts', import.meta.url), 'utf8');
const toolIds = [...navSource.matchAll(/id: '([a-z0-9-]+)', label:/g)].map((m) => m[1]);

test('front matter, order and parts are read from each chapter file', () => {
  const c = parseChapter('---\nid: x\ntitle: "A: B"\npart: tool\nminutes: 7\nsummary: S\ntools: [a, b]\n---\nBody', 'book/part-2/18-x.md');
  assert.deepEqual({ id: c.id, title: c.title, part: c.part, order: c.order, minutes: c.minutes, tools: c.tools, body: c.body }, { id: 'x', title: 'A: B', part: 'tool', order: 18, minutes: 7, tools: ['a', 'b'], body: 'Body' });
  assert.equal(slug('Two roles, one purpose'), 'two-roles-one-purpose');
});

test('quiz blocks need a question, two options and a right answer', () => {
  const q = parseQuiz('Q: Which?\n- No\n- * Yes\nWhy: Because.');
  assert.deepEqual(q, { question: 'Which?', options: [{ text: 'No', correct: false }, { text: 'Yes', correct: true }], why: 'Because.' });
  assert.equal(parseQuiz('Q: Which?\n- No\n- Also no'), null);
});

test('the Field Guide has both parts and the appendices, in order', () => {
  const parts = book.map((c) => c.part);
  assert.ok(parts.filter((p) => p === 'craft').length >= 16);
  assert.ok(parts.filter((p) => p === 'tool').length >= 10);
  assert.ok(parts.includes('appendix'));
  assert.deepEqual(parts, [...parts].sort((a, b) => ['craft', 'tool', 'appendix'].indexOf(a) - ['craft', 'tool', 'appendix'].indexOf(b)), 'craft, then tool, then appendices');
  assert.equal(book[0].id, 'the-job');
});

test('every chapter is well formed: unique ids, summaries, valid quizzes, known tools and links', () => {
  assert.ok(toolIds.length > 30, 'tool ids are read from nav.ts');
  assert.deepEqual(checkBook(book, toolIds), []);
});

test('craft chapters end with three questions; tool chapters have at least two', () => {
  for (const c of book) {
    const n = quizzesOf(c.body).length;
    if (c.part === 'craft') assert.ok(n >= 3, `${c.id} has ${n} questions`);
    if (c.part === 'tool') assert.ok(n >= 2, `${c.id} has ${n} questions`);
  }
});

test('reading paths only point at chapters that exist', () => {
  const src = readFileSync(new URL('../../web/src/pages/guide/book.ts', import.meta.url), 'utf8');
  const ids = new Set(book.map((c) => c.id));
  for (const m of src.matchAll(/chapters: \[([^\]]*)\]/g)) {
    for (const id of m[1].match(/'([a-z0-9-]+)'/g) ?? []) assert.ok(ids.has(id.slice(1, -1)), `path chapter ${id}`);
  }
});

test('plain text for assistants drops quiz answers and callout markers', () => {
  const c = book.find((x) => x.id === 'stakeholders')!;
  const text = chapterText(c);
  assert.ok(!text.includes('```quiz'));
  assert.ok(!/\[!(tip|trap|example|try|exercise)\]/.test(text));
  assert.ok(text.includes('power–interest grid') || text.includes('Power–interest'));
});

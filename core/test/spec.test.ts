import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint, lintSummary } from '../engines/lint.ts';
import { completeness, completenessScore } from '../engines/completeness.ts';
import { findContradictions } from '../engines/contradictions.ts';
import { extractFromNotes, extractRequirements } from '../engines/extract.ts';
import { reviewSpec } from '../engines/review.ts';
import { e, NOW } from './helpers.ts';

test('lint flags vague terms, unbounded quantities, placeholders and glossary synonyms', () => {
  const text = 'The export should be fast and handle large files, etc.\nLimit is TBD.\nThe client can download it.';
  const glossary = [e('glossaryTerm', { term: 'Customer', synonyms: ['client'] })];
  const issues = lint(text, { glossary });
  const rules = issues.map((i) => i.rule);
  assert.ok(rules.includes('vague-term'));
  assert.ok(rules.includes('unbounded-quantity'));
  assert.ok(rules.includes('open-ended'));
  assert.ok(rules.includes('placeholder'));
  assert.ok(rules.includes('glossary'));
  assert.ok(rules.includes('weak-modal'));
  const fast = issues.find((i) => i.rule === 'vague-term')!;
  assert.equal(text.slice(fast.start, fast.end).toLowerCase(), 'fast');
  assert.equal(fast.line, 1);
});

test('lint ignores headings, quotes and code', () => {
  const text = '# Fast export\n> "It is slow and not user-friendly"\n```\nfast\n```\nThe system shall export within 30 seconds.';
  assert.equal(lint(text).filter((i) => i.rule === 'vague-term').length, 0);
});

test('lint does not double-flag overlapping phrases', () => {
  const issues = lint('It must be easy to use.');
  assert.equal(issues.filter((i) => i.rule === 'vague-term').length, 1);
});

test('lint summary penalises issues', () => {
  const clean = 'The system shall export up to 50,000 rows within 30 seconds at p95.';
  const dirty = 'It should be fast, intuitive, robust and scalable, etc. TBD.';
  assert.ok(lintSummary(clean, lint(clean)).score > lintSummary(dirty, lint(dirty)).score);
});

test('completeness finds relevant but uncovered topics', () => {
  const items = completeness('Users can export invoices to CSV on a monthly schedule.');
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(byId.timezone.relevant, true);
  assert.equal(byId.timezone.covered, false);
  assert.equal(byId.currency.relevant, true);
  assert.equal(byId.concurrency.relevant, false);
  assert.ok(completenessScore(items) < 50);
});

test('contradiction detection: antonyms, polarity and numbers', () => {
  const reqs = [
    e('requirement', { id: 'a', title: 'Admins can delete invoices', statement: 'Admins can delete invoices at any time.' }),
    e('requirement', { id: 'b', title: 'Invoice retention', statement: 'Invoices must be retained immutable for 7 years.' }),
    e('requirement', { id: 'c', title: 'Export speed', statement: 'Export of invoices completes within 30 seconds.' }),
    e('requirement', { id: 'd', title: 'Export SLA', statement: 'Export of invoices completes within 60 seconds.' }),
    e('requirement', { id: 'x', title: 'Dark mode', statement: 'The app supports dark mode.' }),
  ];
  const found = findContradictions(reqs);
  assert.ok(found.some((c) => [c.aId, c.bId].sort().join() === 'a,b'), 'delete vs retain');
  assert.ok(found.some((c) => [c.aId, c.bId].sort().join() === 'c,d' && c.kind === 'numeric'), '30 vs 60 seconds');
  assert.ok(!found.some((c) => c.aId === 'x' || c.bId === 'x'));
});

test('extract decisions, actions with owner and due, risks, questions from notes', () => {
  const people = [e('stakeholder', { id: 'p1', name: 'Maya Chen' }), e('stakeholder', { id: 'p2', name: 'Tom Okafor' })];
  const notes = [
    '- Decision: ship XLSX only in v1',
    '- Action: @maya to draft the retention policy by Friday',
    '- Tom will check index performance tomorrow',
    '- Risk: payments API change might slip',
    '- What is the max file size?',
    '- The system must mask customer emails in exports',
  ].join('\n');
  const x = extractFromNotes(notes, people, NOW);
  assert.deepEqual(x.decisions, ['Ship XLSX only in v1']);
  assert.equal(x.actions.length, 2);
  assert.equal(x.actions[0].ownerId, 'p1');
  assert.equal(x.actions[0].due, '2026-10-30');
  assert.equal(x.actions[1].ownerId, 'p2');
  assert.equal(x.actions[1].due, '2026-10-26');
  assert.equal(x.risks.length, 1);
  assert.equal(x.questions.length, 1);
  assert.equal(x.requirements.length, 1);
});

test('extract requirements from a spec body', () => {
  const md = '# Spec\n## Problem\nFinance teams struggle.\n## Requirements\n- Users can schedule a monthly export\n- The system shall email a signed link\n## Non-goals\n- PDF export';
  const reqs = extractRequirements(md);
  assert.equal(reqs.length, 2);
  assert.match(reqs[1].statement, /signed link/);
});

test('review board raises role-specific questions and respects coverage', () => {
  const qs = reviewSpec('Users can export invoices with customer names to CSV on a monthly schedule.');
  const titles = qs.map((q) => q.title);
  assert.ok(titles.includes('Who is allowed to do this?'));
  assert.ok(titles.includes('In which time zone do schedules run?'));
  assert.ok(titles.includes('CSV/XLSX formula injection'));
  assert.equal(qs[0].severity, 'critical');
  const covered = reviewSpec('Only admins with the export permission (role-based access control) can export. Schedules run in the account time zone.');
  assert.ok(!covered.map((q) => q.title).includes('Who is allowed to do this?'));
  assert.ok(!covered.map((q) => q.title).includes('In which time zone do schedules run?'));
});

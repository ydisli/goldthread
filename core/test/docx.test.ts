import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, markdownToDocx, zip } from '../engines/docx.ts';
import { parseInline, parseMarkdown } from '../markdown.ts';
import { chapterMarkdown, parseChapter } from '../book.ts';

/** Read a stored (uncompressed) zip: name → text, checking each entry's CRC. */
function unzip(data: Uint8Array): Map<string, string> {
  const out = new Map<string, string>();
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let p = 0;
  while (dv.getUint32(p, true) === 0x04034b50) {
    const crc = dv.getUint32(p + 14, true), size = dv.getUint32(p + 18, true), nameLen = dv.getUint16(p + 26, true), extra = dv.getUint16(p + 28, true);
    const name = new TextDecoder().decode(data.subarray(p + 30, p + 30 + nameLen));
    const body = data.subarray(p + 30 + nameLen + extra, p + 30 + nameLen + extra + size);
    assert.equal(crc32(body), crc, `CRC of ${name}`);
    out.set(name, new TextDecoder().decode(body));
    p += 30 + nameLen + extra + size;
  }
  assert.equal(dv.getUint32(data.length - 22, true), 0x06054b50, 'end of central directory');
  return out;
}

/** Every opened tag is closed, in order (enough to catch broken XML). */
function wellFormed(xml: string) {
  const stack: string[] = [];
  for (const m of xml.replace(/<\?[^>]*\?>/g, '').matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) assert.equal(stack.pop(), m[2], `closing ${m[2]}`);
    else stack.push(m[2]);
  }
  assert.deepEqual(stack, []);
}

test('crc32 and zip agree with the standard', () => {
  assert.equal(crc32(new TextEncoder().encode('The quick brown fox jumps over the lazy dog')), 0x414fa339);
  const z = zip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
  assert.equal(unzip(z).get('a.txt'), 'hello');
});

test('markdown parses into blocks: headings, nested lists, tasks, tables, quotes, code', () => {
  const b = parseMarkdown('# T\n\nPara **bold** and *it*.\n\n- a\n  - a1\n- [x] done\n\n1. one\n2. two\n\n| H1 | H2 |\n| --- | --- |\n| x | y |\n\n> quoted\n\n```\ncode\n```\n\n---');
  assert.deepEqual(b.map((x) => x.t), ['heading', 'para', 'list', 'list', 'table', 'quote', 'code', 'rule']);
  const list = b[2] as Extract<typeof b[number], { t: 'list' }>;
  assert.equal(list.items[0].children.length, 1, 'nested list under the first item');
  assert.equal(list.items[1].checked, true);
  assert.deepEqual(parseInline('a **b** [c](https://x.y) `d`').map((x) => x.t === 'link' ? `link:${x.href}` : `${x.text}${x.bold ? ':b' : ''}${x.code ? ':c' : ''}`), ['a ', 'b:b', ' ', 'link:https://x.y', ' ', 'd:c']);
});

test('a .docx has every part, valid XML, styles, numbering and hyperlinks', () => {
  const files = unzip(markdownToDocx('# Access portal\n\n## Problem\n\nRequests **bounce** & wait <46h>.\n\n1. First\n2. Second\n\n1. Again\n\n- Bullet\n\n| Rule | Approvals |\n| --- | --- |\n| R1 | none |\n\nSee [the guide](https://example.com/guide).'));
  assert.deepEqual([...files.keys()].sort(), ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/numbering.xml', 'word/styles.xml']);
  for (const [, xml] of files) wellFormed(xml);
  const doc = files.get('word/document.xml')!;
  assert.match(doc, /<w:pStyle w:val="Title"\/><\/w:pPr><w:r><w:t xml:space="preserve">Access portal<\/w:t>/);
  assert.match(doc, /<w:pStyle w:val="Heading2"\/>/);
  assert.match(doc, /wait &lt;46h&gt;/, 'text is escaped');
  assert.match(doc, /<w:b\/><\/w:rPr><w:t xml:space="preserve">bounce/);
  assert.match(doc, /<w:tbl>/);
  assert.match(files.get('docProps/core.xml')!, /<dc:title>Access portal<\/dc:title>/);
  assert.match(files.get('word/_rels/document.xml.rels')!, /Target="https:\/\/example.com\/guide" TargetMode="External"/);
  // Two ordered lists restart at 1: two numbering instances besides the bullets.
  assert.equal((files.get('word/numbering.xml')!.match(/<w:startOverride w:val="1"\/>/g) ?? []).length, 2);
});

test('book chapters export with labelled callouts and answered quizzes', () => {
  const c = parseChapter('---\nid: x\ntitle: Problems\nsummary: Why.\n---\nIntro [Signals](tool:signals) and [next](guide:y).\n\n> [!trap] The loud voice\n> Careful.\n\n```quiz\nQ: Which?\n- No\n- * Yes\nWhy: Because.\n```\n', '02-x.md');
  const md = chapterMarkdown(c, 'Chapter 2');
  assert.match(md, /^# Chapter 2: Problems\n\n\*Why\.\*/);
  assert.match(md, /Intro Signals and next\./);
  assert.match(md, /> \*\*The loud voice\*\*/);
  assert.match(md, /\*\*1\. Which\?\*\*\n\n- A\. No\n- B\. Yes\n\n\*Answer: Yes\. Because\.\*/);
});

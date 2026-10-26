// A small Markdown parser that produces a block tree, for exporters (Word) that need
// structure rather than HTML. Covers what Throughline writes: headings, paragraphs,
// lists (nested by indent), tables, code blocks, quotes, rules, bold, italic, code, links.

export type Inline =
  | { t: 'text'; text: string; bold?: boolean; italic?: boolean; code?: boolean }
  | { t: 'link'; text: string; href: string };

export type Block =
  | { t: 'heading'; level: 1 | 2 | 3 | 4; inline: Inline[] }
  | { t: 'para'; inline: Inline[] }
  | { t: 'list'; ordered: boolean; items: { inline: Inline[]; checked?: boolean; children: Block[] }[] }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'code'; text: string }
  | { t: 'quote'; blocks: Block[] }
  | { t: 'rule' };

/** Bold (**), italic (* or _), `code` and [links](url). */
export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*)|(\b_[^_\s][^_]*_\b)/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ t: 'text', text: s.slice(last, m.index) });
    const tok = m[0];
    if (m[1]) out.push({ t: 'text', text: tok.slice(1, -1), code: true });
    else if (m[2]) for (const x of parseInline(tok.slice(2, -2))) out.push(x.t === 'text' ? { ...x, bold: true } : x);
    else if (m[3]) { const l = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!; out.push({ t: 'link', text: l[1], href: l[2] }); }
    else for (const x of parseInline(tok.slice(1, -1))) out.push(x.t === 'text' ? { ...x, italic: true } : x);
    last = m.index! + tok.length;
  }
  if (last < s.length) out.push({ t: 'text', text: s.slice(last) });
  return out;
}

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  const blocks: Block[] = [];
  const isBlockStart = (l: string) => /^(#{1,4})\s/.test(l) || /^```/.test(l) || /^>/.test(l) || LIST.test(l) || /^\s*(---|\*\*\*)\s*$/.test(l) || /^\s*\|.*\|\s*$/.test(l);

  const parseList = (baseIndent: number): Block => {
    const first = LIST.exec(lines[i])!;
    const ordered = /\d/.test(first[2]);
    const items: { inline: Inline[]; checked?: boolean; children: Block[] }[] = [];
    while (i < lines.length) {
      const m = LIST.exec(lines[i]);
      if (!m) {
        // A continuation line belongs to the last item.
        if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length && !isBlockStart(lines[i].trim())) { items.at(-1)!.inline.push({ t: 'text', text: ` ${lines[i].trim()}` }); i++; continue; }
        break;
      }
      const indent = m[1].length;
      if (indent < baseIndent) break;
      if (indent > baseIndent && items.length) { items.at(-1)!.children.push(parseList(indent)); continue; }
      let text = m[3];
      const task = /^\[( |x|X)\]\s+/.exec(text);
      if (task) text = text.slice(task[0].length);
      items.push({ inline: parseInline(text), checked: task ? task[1].toLowerCase() === 'x' : undefined, children: [] });
      i++;
    }
    return { t: 'list', ordered, items };
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push({ t: 'code', text: buf.join('\n') });
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { blocks.push({ t: 'heading', level: h[1].length as 1 | 2 | 3 | 4, inline: parseInline(h[2].trim()) }); i++; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { blocks.push({ t: 'rule' }); i++; continue; }
    if (/^>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ t: 'quote', blocks: parseMarkdown(buf.join('\n')) });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = cells(line).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]).map(parseInline));
      blocks.push({ t: 'table', head, rows });
      continue;
    }
    if (LIST.test(line)) { blocks.push(parseList(LIST.exec(line)![1].length)); continue; }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) buf.push(lines[i++].trim());
    blocks.push({ t: 'para', inline: parseInline(buf.join(' ')) });
  }
  return blocks;
}

/** Plain text of some inline content. */
export const inlineText = (xs: Inline[]) => xs.map((x) => x.text).join('');

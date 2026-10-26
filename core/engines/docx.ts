// Markdown → Word (.docx), with no dependencies: a small zip writer and WordprocessingML.
// Used for generated documents, specs and the Field Guide. Opens in Word, Google Docs,
// LibreOffice and Pages.

import { inlineText, parseMarkdown, type Block, type Inline } from '../markdown.ts';

// ---------------- zip (stored, no compression) ----------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: { name: string; data: Uint8Array }[], date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
  const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true); lv.setUint16(12, day, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, f.data.length, true); lv.setUint32(22, f.data.length, true); lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
    local.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true); cv.setUint16(14, day, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, f.data.length, true); cv.setUint32(24, f.data.length, true); cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    locals.push(local, f.data);
    centrals.push(central);
    offset += local.length + f.data.length;
  }
  const cdSize = centrals.reduce((t, c) => t + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + cdSize + 22);
  let p = 0;
  for (const part of [...locals, ...centrals, end]) { out.set(part, p); p += part.length; }
  return out;
}

// ---------------- WordprocessingML ----------------

const esc = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

class Writer {
  rels: { id: string; target: string }[] = [];
  nums: number[] = []; // numIds of ordered lists (each restarts at 1)

  runs(xs: Inline[], extra = ''): string {
    return xs.map((x) => {
      if (x.t === 'link') {
        if (!/^https?:|^mailto:/.test(x.href)) return this.run(x.text, extra);
        const id = `rId${10 + this.rels.length}`;
        this.rels.push({ id, target: x.href });
        return `<w:hyperlink r:id="${id}" w:history="1">${this.run(x.text, `<w:rStyle w:val="Hyperlink"/>${extra}`)}</w:hyperlink>`;
      }
      const props = `${x.bold ? '<w:b/>' : ''}${x.italic ? '<w:i/>' : ''}${x.code ? '<w:rStyle w:val="CodeChar"/>' : ''}${extra}`;
      return this.run(x.text, props);
    }).join('');
  }

  run(text: string, props = ''): string {
    return text.split('\n').map((part, i) => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(part)}</w:t></w:r>`).join('');
  }

  para(content: string, style?: string, extraPPr = ''): string {
    return `<w:p>${style || extraPPr ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extraPPr}</w:pPr>` : ''}${content}</w:p>`;
  }

  block(b: Block, level = 0): string {
    switch (b.t) {
      case 'heading': return this.para(this.runs(b.inline), `Heading${b.level}`);
      case 'para': return this.para(this.runs(b.inline));
      case 'rule': return this.para('', undefined, '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D6D3CB"/></w:pBdr>');
      case 'code': return b.text.split('\n').map((l) => this.para(this.run(l), 'Code')).join('');
      case 'quote': return b.blocks.map((x) => (x.t === 'para' ? this.para(this.runs(x.inline), 'Quote') : this.block(x, level))).join('');
      case 'list': {
        let numId = 1;
        if (b.ordered) { numId = 2 + this.nums.length; this.nums.push(numId); }
        return b.items.map((it) => {
          const box = it.checked === undefined ? '' : this.run(it.checked ? '☑ ' : '☐ ');
          const p = this.para(box + this.runs(it.inline), 'ListParagraph', `<w:numPr><w:ilvl w:val="${Math.min(level, 3)}"/><w:numId w:val="${numId}"/></w:numPr>`);
          return p + it.children.map((c) => this.block(c, level + 1)).join('');
        }).join('');
      }
      case 'table': {
        const cols = Math.max(b.head.length, ...b.rows.map((r) => r.length));
        const w = Math.floor(9000 / Math.max(1, cols));
        const cell = (xs: Inline[] | undefined, head: boolean) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F3F2EE"/>' : ''}</w:tcPr>${this.para(this.runs(xs ?? [], head ? '<w:b/>' : ''), 'TableText')}</w:tc>`;
        const row = (r: Inline[][], head: boolean) => `<w:tr>${head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${Array.from({ length: cols }, (_, i) => cell(r[i], head)).join('')}</w:tr>`;
        return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${row(b.head, true)}${b.rows.map((r) => row(r, false)).join('')}</w:tbl>${this.para('', undefined, '<w:spacing w:after="0"/>')}`;
      }
    }
  }
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos" w:cs="Aptos"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="0F6A55"/></w:pBdr></w:pPr><w:rPr><w:color w:val="55534D"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:shd w:val="clear" w:color="auto" w:fill="F3F2EE"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0F6A55"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D6D3CB"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D6D3CB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D6D3CB"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D6D3CB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D6D3CB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D6D3CB"/></w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

function numbering(ordered: number[]): string {
  const bullets = ['•', '◦', '▪', '•'];
  const lvl = (i: number, ordered_: boolean) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${ordered_ ? (i % 2 ? 'lowerLetter' : 'decimal') : 'bullet'}"/><w:lvlText w:val="${ordered_ ? `%${i + 1}.` : bullets[i]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + i * 360}" w:hanging="360"/></w:pPr></w:lvl>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${[0, 1, 2, 3].map((i) => lvl(i, false)).join('')}</w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${[0, 1, 2, 3].map((i) => lvl(i, true)).join('')}</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
${ordered.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('\n')}
</w:numbering>`;
}

/** Turn Markdown into a .docx file. A leading `# Title` becomes the document title. */
export function markdownToDocx(md: string, opts: { title?: string; author?: string; breakBeforeH1?: boolean } = {}): Uint8Array {
  const blocks = parseMarkdown(md);
  const w = new Writer();
  let title = opts.title;
  if (blocks[0]?.t === 'heading' && blocks[0].level === 1) title ??= inlineText(blocks[0].inline);
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const body = blocks.map((b, i) => {
    if (i === 0 && b.t === 'heading' && b.level === 1) return w.para(w.runs(b.inline), 'Title');
    if (opts.breakBeforeH1 && b.t === 'heading' && b.level === 1) return pageBreak + w.para(w.runs(b.inline), 'Title');
    return w.block(b);
  }).join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1300" w:right="1300" w:bottom="1300" w:left="1300" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${w.rels.map((r) => `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(r.target)}" TargetMode="External"/>`).join('')}</Relationships>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title ?? 'Document')}</dc:title><dc:creator>${esc(opts.author ?? 'Throughline')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const root = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const enc = new TextEncoder();
  return zip([
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(root) },
    { name: 'docProps/core.xml', data: enc.encode(core) },
    { name: 'word/document.xml', data: enc.encode(doc) },
    { name: 'word/styles.xml', data: enc.encode(STYLES) },
    { name: 'word/numbering.xml', data: enc.encode(numbering(w.nums)) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(rels) },
  ]);
}

// Meeting transcripts → "Speaker: text" notes, ready for decision/action/risk extraction.
// Handles WebVTT (Teams and Zoom), SubRip (.srt), Teams' .docx transcripts and plain text.

const TIMING = /^\s*(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d{1,3})?\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}([.,]\d{1,3})?/;

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

/** Merge consecutive lines from the same speaker; keep the order. */
function merge(lines: { speaker?: string; text: string }[]): string {
  const out: { speaker?: string; text: string }[] = [];
  for (const l of lines) {
    const text = l.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const last = out.at(-1);
    if (last && l.speaker && last.speaker === l.speaker) last.text += ` ${text}`;
    else out.push({ speaker: l.speaker, text });
  }
  return out.map((l) => (l.speaker ? `${l.speaker}: ${l.text}` : l.text)).join('\n');
}

/** "Name: text" at the start of a cue (Zoom), or <v Name>text</v> (Teams). */
function cueLine(raw: string): { speaker?: string; text: string } {
  const v = /^<v(?:\.[\w.]+)?\s+([^>]+)>([\s\S]*?)(?:<\/v>)?$/.exec(raw.trim());
  if (v) return { speaker: decode(v[1]).trim(), text: decode(v[2].replace(/<[^>]+>/g, '')) };
  const clean = decode(raw.replace(/<[^>]+>/g, ''));
  const named = /^([A-Z][\w .'’-]{1,40}):\s+(.+)$/.exec(clean.trim());
  return named ? { speaker: named[1].trim(), text: named[2] } : { text: clean };
}

export function parseVtt(text: string): string {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const lines: { speaker?: string; text: string }[] = [];
  for (const block of blocks) {
    const rows = block.split('\n').filter((r) => r.trim());
    const t = rows.findIndex((r) => TIMING.test(r));
    if (t < 0) continue; // WEBVTT header, NOTE, STYLE, or a stray cue id
    let speaker: string | undefined;
    const parts: string[] = [];
    for (const r of rows.slice(t + 1)) {
      const c = cueLine(r);
      speaker ??= c.speaker;
      parts.push(c.text);
    }
    lines.push({ speaker, text: parts.join(' ') });
  }
  return merge(lines);
}

/** Text of a Word document's paragraphs (word/document.xml). */
export function docxParagraphs(xml: string): string[] {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => decode([...p[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(br|tab)\/>/g)].map((m) => (m[2] === 'tab' ? ' ' : m[2] === 'br' ? '\n' : m[1])).join('')).trim());
}

/**
 * Teams .docx transcripts alternate a header line ("Priya Nair   3:41") with what they said.
 * Other documents come through as paragraphs.
 */
export function parseDocxTranscript(xml: string): string {
  const paras = docxParagraphs(xml).filter(Boolean);
  const header = /^(.+?)\s{2,}(\d{1,2}:)?\d{1,2}:\d{2}$|^(.+?)\s+(\d{1,2}:)?\d{1,2}:\d{2}$/;
  const lines: { speaker?: string; text: string }[] = [];
  let speaker: string | undefined;
  for (const p of paras) {
    const h = header.exec(p);
    if (h && (h[1] ?? h[3]).length <= 60) { speaker = (h[1] ?? h[3]).trim(); continue; }
    if (/^\s*(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?\s*$/.test(p)) continue;
    lines.push({ speaker, text: p });
  }
  return merge(lines);
}

/** Pick the parser from the file name or the content. */
export function parseTranscript(text: string, fileName = ''): string {
  if (/^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName)) return parseVtt(text);
  if (/\.srt$/i.test(fileName) || /^\d+\s*\n\s*\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(text)) return parseVtt(text.replace(/(\d),(\d{3})/g, '$1.$2'));
  return text.replace(/\r\n/g, '\n').trim();
}

// ---------------- reading a .docx (zip) ----------------

/** Find one file in a zip and return its bytes; `inflate` handles compressed entries (deflate-raw). */
export async function readZipEntry(data: Uint8Array, name: string, inflate: (b: Uint8Array) => Promise<Uint8Array>): Promise<Uint8Array | null> {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65_557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This is not a .docx (zip) file.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const entry = dec.decode(data.subarray(p + 46, p + 46 + nameLen));
    if (entry === name) {
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const raw = data.subarray(start, start + size);
      if (method === 0) return raw;
      if (method === 8) return inflate(raw);
      throw new Error(`Unsupported compression in ${name}.`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

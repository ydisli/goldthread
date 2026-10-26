import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { docxParagraphs, parseDocxTranscript, parseTranscript, readZipEntry } from '../engines/transcript.ts';
import { extractFromNotes } from '../engines/extract.ts';
import { crc32 } from '../engines/docx.ts';

const TEAMS_VTT = `WEBVTT

0f1e2d3c-1
00:00:03.120 --> 00:00:06.400
<v Alex Rivera>Okay, let's start with the January cohort.</v>

0f1e2d3c-2
00:00:06.400 --> 00:00:09.000
<v Alex Rivera>Decision: batch-provision the cohort the week before.</v>

0f1e2d3c-3
00:00:09.500 --> 00:00:12.000
<v Hannah Lee>Action: I&#39;ll send the final list by 1 December.</v>
`;

const ZOOM_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Priya Nair: Risk: the CRM connector rate-limits bulk provisioning.

2
00:00:04.500 --> 00:00:06.000
Dana Whitfield: Can contractors wait until Q1?
`;

test('Teams WebVTT: speakers kept, consecutive cues merged, entities decoded', () => {
  const notes = parseTranscript(TEAMS_VTT, 'meeting.vtt');
  assert.equal(notes, "Alex Rivera: Okay, let's start with the January cohort. Decision: batch-provision the cohort the week before.\nHannah Lee: Action: I'll send the final list by 1 December.");
});

test('Zoom WebVTT and SubRip become speaker lines that extraction understands', () => {
  const zoom = parseTranscript(ZOOM_VTT, 'zoom.vtt');
  assert.equal(zoom, 'Priya Nair: Risk: the CRM connector rate-limits bulk provisioning.\nDana Whitfield: Can contractors wait until Q1?');
  const x = extractFromNotes(zoom);
  assert.equal(x.risks.length, 1);
  assert.equal(x.questions.length, 1);
  const srt = parseTranscript('1\n00:00:01,000 --> 00:00:02,000\nHello there\n\n2\n00:00:02,500 --> 00:00:03,000\nGeneral greeting', 'x.srt');
  assert.equal(srt, 'Hello there\nGeneral greeting');
  assert.equal(parseTranscript('Just notes\r\nfrom a call', 'notes.txt'), 'Just notes\nfrom a call');
});

test('Teams .docx transcripts: header lines name the speaker', () => {
  const p = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const xml = `<w:document><w:body>${p('Steering — transcript')}${p('Alex Rivera   0:03')}${p('We agreed to defer contractors.')}${p('Dana Whitfield   1:12')}${p('Fine, if audit is told.')}${p('Dana Whitfield   1:20')}${p('Action: I&apos;ll tell Kim.')}</w:body></w:document>`;
  assert.deepEqual(docxParagraphs(xml).slice(0, 2), ['Steering — transcript', 'Alex Rivera   0:03']);
  assert.equal(parseDocxTranscript(xml), "Steering — transcript\nAlex Rivera: We agreed to defer contractors.\nDana Whitfield: Fine, if audit is told. Action: I'll tell Kim.");
});

test('reading word/document.xml out of a compressed .docx', async () => {
  // A minimal zip with one deflated entry, built the way Word does.
  const body = new TextEncoder().encode('<w:document>hello</w:document>');
  const comp = deflateRawSync(body);
  const name = new TextEncoder().encode('word/document.xml');
  const local = Buffer.alloc(30 + name.length); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc32(body), 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(name.length, 26); Buffer.from(name).copy(local, 30);
  const central = Buffer.alloc(46 + name.length); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(crc32(body), 16); central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 42); Buffer.from(name).copy(central, 46);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(local.length + comp.length, 16);
  const zipped = new Uint8Array(Buffer.concat([local, comp, central, end]));
  const out = await readZipEntry(zipped, 'word/document.xml', async (b) => new Uint8Array(inflateRawSync(b)));
  assert.equal(new TextDecoder().decode(out!), '<w:document>hello</w:document>');
  assert.equal(await readZipEntry(zipped, 'nope.xml', async (b) => b), null);
});

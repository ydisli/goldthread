import { parseDocxTranscript, parseTranscript, readZipEntry } from '../../../core/engines/transcript.ts';

const inflateRaw = async (b: Uint8Array) =>
  new Uint8Array(await new Response(new Blob([b as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());

/** Read a transcript file (Teams .docx or .vtt, Zoom .vtt or .txt, .srt) as "Speaker: text" lines. */
export async function readTranscript(file: File): Promise<string> {
  if (/\.docx$/i.test(file.name)) {
    const xml = await readZipEntry(new Uint8Array(await file.arrayBuffer()), 'word/document.xml', inflateRaw);
    if (!xml) throw new Error(`${file.name} has no document text.`);
    return parseDocxTranscript(new TextDecoder().decode(xml));
  }
  return parseTranscript(await file.text(), file.name);
}

import { markdownToDocx } from '../../../core/engines/docx.ts';
import { renderMarkdown } from './markdown.ts';
import { toast } from './kit.tsx';

const fileSafe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80) || 'document';

/** Download Markdown as a Word document. */
export function downloadDocx(title: string, md: string, opts: { breakBeforeH1?: boolean } = {}) {
  const bytes = markdownToDocx(md, { title, ...opts });
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileSafe(title)}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const PRINT_CSS = `
  @page { margin: 18mm 16mm; }
  body { font: 11pt/1.55 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1c1b18; margin: 0; }
  main { max-width: 760px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 22pt; line-height: 1.2; margin: 0 0 10pt; }
  h1:not(:first-child) { break-before: page; }
  h2 { font-size: 15pt; margin: 18pt 0 6pt; break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 14pt 0 4pt; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  table { border-collapse: collapse; margin: 6pt 0 12pt; font-size: 9.5pt; width: 100%; break-inside: avoid; }
  th, td { border: 1px solid #d6d3cb; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f3f2ee; }
  blockquote { margin: 8pt 0; padding: 2pt 12pt; border-left: 3px solid #0f6a55; color: #55534d; break-inside: avoid; }
  pre { background: #f3f2ee; padding: 8pt 10pt; border-radius: 4px; white-space: pre-wrap; font-size: 9pt; break-inside: avoid; }
  code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9.5pt; }
  a { color: #0f6a55; }
  hr { border: 0; border-top: 1px solid #d6d3cb; }
  @media screen { body { background: #f7f6f3; } main { background: #fff; margin: 24px auto; box-shadow: 0 1px 4px rgba(0,0,0,.08); } }
`;

/** Open a clean, printable page for Markdown and start the browser's print dialog (Save as PDF works there). */
export function printMarkdown(title: string, md: string) {
  const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups for this site to print or save as PDF', 'error'); return; }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body><main>${renderMarkdown(md)}</main></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

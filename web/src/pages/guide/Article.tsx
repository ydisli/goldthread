import { useEffect, useRef, useState, type ReactNode } from 'react';
import { parseQuiz, slug, type Quiz } from '../../../../core/book.ts';
import { ALL_TOOLS } from '../../nav.ts';
import { renderMarkdown } from '../../ui/markdown.ts';
import { Icon } from '../../ui/icons.tsx';
import { copyText } from '../../ui/kit.tsx';

export type Block =
  | { kind: 'md'; text: string }
  | { kind: 'heading'; level: 2 | 3; text: string; id: string }
  | { kind: 'callout'; variant: string; title: string; text: string }
  | { kind: 'quiz'; quiz: Quiz };

const CALLOUTS: Record<string, { icon: string; label: string }> = {
  tip: { icon: 'lightbulb', label: 'Tip' },
  trap: { icon: 'triangle-alert', label: 'Common trap' },
  example: { icon: 'briefcase-business', label: 'At Ashgrove' },
  try: { icon: 'play', label: 'Try it in Goldthread' },
  note: { icon: 'bookmark', label: 'Note' },
  exercise: { icon: 'notebook-pen', label: 'Exercise' },
};

/** `tool:process` and `guide:stakeholders` links become app routes. */
function resolveLinks(md: string): string {
  return md
    .replace(/\]\(tool:([\w-]+)\)/g, (_, id) => `](#${ALL_TOOLS.find((t) => t.id === id)?.to ?? '/tools'})`)
    .replace(/\]\(guide:([\w-]+)\)/g, (_, id) => `](#/guide/${id})`);
}

export function parseBlocks(body: string): Block[] {
  const lines = body.split('\n');
  const out: Block[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.join('').trim()) out.push({ kind: 'md', text: buf.join('\n') }); buf = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = /^(##|###)\s+(.+)$/.exec(line);
    if (h) { flush(); out.push({ kind: 'heading', level: h[1].length as 2 | 3, text: h[2].trim(), id: slug(h[2]) }); continue; }
    if (line.startsWith('```quiz')) {
      flush();
      const q: string[] = [];
      while (++i < lines.length && !lines[i].startsWith('```')) q.push(lines[i]);
      const quiz = parseQuiz(q.join('\n'));
      if (quiz) out.push({ kind: 'quiz', quiz });
      continue;
    }
    const c = /^>\s?\[!(\w+)\]\s*(.*)$/.exec(line);
    if (c) {
      flush();
      const inner: string[] = [];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) inner.push(lines[++i].replace(/^>\s?/, ''));
      out.push({ kind: 'callout', variant: c[1].toLowerCase(), title: c[2].trim(), text: inner.join('\n') });
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}

function Md({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Templates and commands get a copy button.
  useEffect(() => {
    for (const pre of ref.current?.querySelectorAll('pre') ?? []) {
      if (pre.querySelector('.copy-code')) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'copy-code';
      b.textContent = 'Copy';
      b.onclick = () => { void copyText(pre.querySelector('code')?.textContent ?? '', 'Copied'); };
      pre.appendChild(b);
    }
  }, [text]);
  return <div ref={ref} className="md book-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(resolveLinks(text)) }} />;
}

export function QuizCard({ quiz, n }: { quiz: Quiz; n: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked !== null && quiz.options[picked].correct;
  return (
    <div className="quiz">
      <div className="quiz-q"><span className="quiz-n">{n}</span><span>{quiz.question}</span></div>
      <div className="quiz-options">
        {quiz.options.map((o, i) => {
          const state = picked === null ? '' : o.correct ? 'right' : picked === i ? 'wrong' : 'dim';
          return (
            <button key={i} className={`quiz-option ${state}`} onClick={() => setPicked(i)} aria-pressed={picked === i}>
              <span className="quiz-mark">{state === 'right' ? <Icon name="check" size={13} /> : state === 'wrong' ? <Icon name="x" size={13} /> : String.fromCharCode(65 + i)}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={`quiz-why ${right ? 'right' : 'wrong'}`}>
          <strong>{right ? 'Right.' : 'Not quite.'}</strong> {quiz.why}
          {!right && <button className="btn-link" style={{ marginLeft: 6 }} onClick={() => setPicked(null)}>Try again</button>}
        </div>
      )}
    </div>
  );
}

export function Article({ blocks }: { blocks: Block[] }) {
  let quizN = 0;
  const nodes: ReactNode[] = blocks.map((b, i) => {
    if (b.kind === 'md') return <Md key={i} text={b.text} />;
    if (b.kind === 'heading') return b.level === 2 ? <h2 key={i} id={b.id} className="book-h2">{b.text}</h2> : <h3 key={i} id={b.id} className="book-h3">{b.text}</h3>;
    if (b.kind === 'quiz') return <QuizCard key={i} quiz={b.quiz} n={++quizN} />;
    const meta = CALLOUTS[b.variant] ?? CALLOUTS.note;
    return (
      <aside key={i} className={`callout callout-${b.variant}`}>
        <div className="callout-head"><Icon name={meta.icon} size={15} />{b.title || meta.label}</div>
        <Md text={b.text} />
      </aside>
    );
  });
  return <article className="book-article">{nodes}</article>;
}

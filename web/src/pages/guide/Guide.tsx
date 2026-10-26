import { useEffect, useMemo, useState } from 'react';
import { PARTS, chapterMarkdown, chapterText, quizzesOf, type Chapter } from '../../../../core/book.ts';
import { isoDate } from '../../../../core/util.ts';
import { ALL_TOOLS } from '../../nav.ts';
import { now, updateMe, useMe } from '../../store.ts';
import { Link, navigate } from '../../router.tsx';
import { Empty, errorToast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { fmtDate } from '../../ui/format.ts';
import { Article, parseBlocks } from './Article.tsx';
import { downloadDocx, printMarkdown } from '../../ui/export.ts';
import { CHAPTERS, CHAPTER_MAP, PATHS, chapterLabel, chaptersIn, partOf } from './book.ts';

function useProgress(): [Record<string, string>, (id: string, done: boolean) => void] {
  const me = useMe();
  const read = me?.prefs.book ?? {};
  const set = (id: string, done: boolean) => {
    const next = { ...read };
    if (done) next[id] = isoDate(now()); else delete next[id];
    updateMe({ prefs: { book: next } }).catch(errorToast);
  };
  return [read, set];
}

const nextUnread = (ids: string[], read: Record<string, string>) => ids.find((id) => !read[id]) ?? ids[0];
const minutesOf = (ids: string[]) => ids.reduce((t, id) => t + (CHAPTER_MAP.get(id)?.minutes ?? 0), 0);

function ChapterRow({ c, done }: { c: Chapter; done: boolean }) {
  return (
    <Link to={`/guide/${c.id}`} className={`chapter-row ${done ? 'done' : ''}`}>
      <span className="chapter-num">{c.part === 'appendix' ? chapterLabel(c).replace('Appendix ', '') : chapterLabel(c).replace('Chapter ', '')}</span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="chapter-title">{c.title}</div>
        <div className="small muted">{c.summary}</div>
      </div>
      <span className="tiny muted nowrap">{c.minutes} min</span>
      <span className={`chapter-check ${done ? 'on' : ''}`} aria-label={done ? 'Finished' : 'Not read yet'}>{done && <Icon name="check" size={12} />}</span>
    </Link>
  );
}

export function GuidePage() {
  const [read] = useProgress();
  const [q, setQ] = useState('');
  const main = CHAPTERS.filter((c) => c.part !== 'appendix');
  const doneCount = main.filter((c) => read[c.id]).length;
  const continueId = nextUnread(main.map((c) => c.id), read);
  const started = doneCount > 0;
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return null;
    return CHAPTERS.map((c) => {
      const text = chapterText(c).toLowerCase();
      const hits = text.split(t).length - 1;
      const inTitle = c.title.toLowerCase().includes(t) || c.summary.toLowerCase().includes(t);
      return { c, score: hits + (inTitle ? 50 : 0), snippet: snippet(chapterText(c), t) };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
  }, [q]);

  return (
    <div className="page guide-page">
      <header className="guide-cover">
        <div className="eyebrow">Field guide</div>
        <h1>The Field Guide</h1>
        <p className="guide-lede">A practical book for Product Owners and Business Analysts. Part I teaches the craft, in any tool or none. Part II shows how to do it in Goldthread. Every chapter uses the same running example: ServiceHub, Ashgrove's internal IT service platform.</p>
        <div className="guide-progress">
          <div className="meter" style={{ maxWidth: 320 }}><span style={{ width: `${(doneCount / Math.max(1, main.length)) * 100}%` }} /></div>
          <span className="small muted">{doneCount} of {main.length} chapters finished</span>
          <span className="spacer" />
          <Link to={`/guide/${continueId}`} className="btn btn-primary"><Icon name="book-open" size={14} />{started ? 'Continue reading' : 'Start reading'}</Link>
        </div>
        <div className="row-wrap small" style={{ marginTop: 14, gap: 6 }}>
          <span className="muted">The whole book:</span>
          <button className="btn btn-sm" onClick={() => downloadDocx('The Field Guide', bookMarkdown(), { breakBeforeH1: true })}><Icon name="download" size={13} />Word</button>
          <button className="btn btn-sm" onClick={() => printMarkdown('The Field Guide', bookMarkdown())}><Icon name="file-text" size={13} />Print or save as PDF</button>
          <span className="muted">· CC BY 4.0</span>
        </div>
        <div className="guide-search">
          <Icon name="search" size={15} className="muted" />
          <input aria-label="Search the book" className="input" placeholder="Search the book — try “acceptance criteria”, “RACI”, “Monte Carlo”…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      {results ? (
        <section className="guide-part">
          <h2>{results.length ? `Found in ${results.length} chapter${results.length === 1 ? '' : 's'}` : 'Nothing found'}</h2>
          <div className="chapter-list">
            {results.map(({ c, snippet: s }) => (
              <Link key={c.id} to={`/guide/${c.id}`} className="chapter-row">
                <span className="chapter-num">{chapterLabel(c).split(' ')[1]}</span>
                <div className="grow" style={{ minWidth: 0 }}><div className="chapter-title">{c.title}</div><div className="small muted">{s}</div></div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="guide-part">
            <h2>Reading paths</h2>
            <div className="path-grid">
              {PATHS.map((p) => {
                const done = p.chapters.filter((id) => read[id]).length;
                return (
                  <Link key={p.id} to={`/guide/${nextUnread(p.chapters, read)}?path=${p.id}`} className="path-card">
                    <div className="strong">{p.title}</div>
                    <div className="small muted grow">{p.blurb}</div>
                    <div className="row small"><span className="muted">{p.chapters.length} chapters · ~{Math.round(minutesOf(p.chapters) / 5) * 5} min</span><span className="spacer" />{done > 0 && <span className="muted">{done}/{p.chapters.length}</span>}<Icon name="arrow-right" size={14} /></div>
                  </Link>
                );
              })}
            </div>
          </section>
          {PARTS.map((part) => {
            const list = chaptersIn(part.id);
            if (!list.length) return null;
            return (
              <section key={part.id} className="guide-part">
                <div className="eyebrow">{part.label}</div>
                <h2>{part.title}</h2>
                <p className="small muted" style={{ marginTop: 2 }}>{part.blurb}</p>
                <div className="chapter-list">{list.map((c) => <ChapterRow key={c.id} c={c} done={!!read[c.id]} />)}</div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function snippet(text: string, term: string): string {
  const i = text.toLowerCase().indexOf(term);
  if (i < 0) return '';
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, i - 70)));
  return `${start > 0 ? '…' : ''}${text.slice(start, i + term.length + 90).replace(/\|[\s|:-]*\|/g, ' · ').replace(/[#>*_`[\]|]/g, ' ').replace(/\((?:guide|tool):[\w-]+\)/g, '').replace(/\s+/g, ' ').trim()}…`;
}

export function ChapterPage({ id, pathId }: { id: string; pathId?: string }) {
  const c = CHAPTER_MAP.get(id);
  const [read, setRead] = useProgress();
  const blocks = useMemo(() => (c ? parseBlocks(c.body) : []), [c]);
  const headings = blocks.filter((b): b is Extract<typeof b, { kind: 'heading' }> => b.kind === 'heading' && b.level === 2);
  const [activeH, setActiveH] = useState<string | null>(null);
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => {
      let cur: string | null = null;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 140) cur = h.id;
      }
      setActiveH(cur);
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => main.removeEventListener('scroll', onScroll);
  }, [id, headings]);

  if (!c) return <div className="page"><Empty icon="book-open">That chapter doesn't exist. <Link to="/guide">Back to the Field Guide</Link></Empty></div>;
  const path = PATHS.find((p) => p.id === pathId && p.chapters.includes(c.id));
  const order = path ? path.chapters.map((x) => CHAPTER_MAP.get(x)!) : CHAPTERS;
  const at = order.findIndex((x) => x.id === c.id);
  const prev = order[at - 1];
  const next = order[at + 1];
  const done = !!read[c.id];
  const quizzes = quizzesOf(c.body).length;
  const tools = c.tools.map((t) => ALL_TOOLS.find((x) => x.id === t)).filter((t): t is NonNullable<typeof t> => !!t);
  const part = partOf(c);
  const go = (to: Chapter) => navigate(`/guide/${to.id}${path ? `?path=${path.id}` : ''}`);
  const finish = () => { setRead(c.id, true); if (next) go(next); };

  return (
    <div className="page guide-page">
      <div className="reader">
        <div className="reader-main">
          <div className="crumbs small"><Link to="/guide">Field guide</Link><Icon name="chevron-right" size={12} /><span className="muted">{part.label} · {part.title}</span>{path && <><Icon name="chevron-right" size={12} /><span className="muted">{path.title} path · {at + 1} of {order.length}</span></>}</div>
          <header className="chapter-head">
            <div className="eyebrow">{chapterLabel(c)}</div>
            <h1>{c.title}</h1>
            {c.summary && <p className="guide-lede">{c.summary}</p>}
            <div className="row-wrap small muted" style={{ gap: 6 }}>
              <span>{c.minutes} min read</span>
              {quizzes > 0 && <span>· {quizzes} check-yourself questions</span>}
              {done && <span className="badge green">Finished {fmtDate(read[c.id])}</span>}
              <span className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => downloadDocx(c.title, chapterMarkdown(c, chapterLabel(c)))} title="Download this chapter as a Word document"><Icon name="download" size={13} />Word</button>
              <button className="btn btn-ghost btn-sm" onClick={() => printMarkdown(c.title, chapterMarkdown(c, chapterLabel(c)))} title="Print this chapter or save it as PDF"><Icon name="file-text" size={13} />Print</button>
            </div>
            {tools.length > 0 && (
              <div className="chips" style={{ marginTop: 10 }}>
                {tools.map((t) => <Link key={t.id} to={t.to} className="chip-link"><Icon name={t.icon} size={13} />{t.label}</Link>)}
              </div>
            )}
          </header>
          <Article blocks={blocks} />
          <footer className="chapter-foot">
            <div className="finish-card">
              <div className="grow">
                <div className="strong">{done ? 'You finished this chapter.' : 'Finished reading?'}</div>
                <div className="small muted">{done ? 'It counts towards your progress. You can come back any time.' : 'Mark it so the Field Guide knows where you are.'}</div>
              </div>
              {done
                ? <button className="btn" onClick={() => setRead(c.id, false)}>Mark as unread</button>
                : <button className="btn btn-primary" onClick={finish}><Icon name="check" size={14} />{next ? 'Finish and continue' : 'Finish'}</button>}
            </div>
            <div className="chapter-nav">
              {prev ? <button className="chapter-nav-btn" onClick={() => go(prev)}><span className="tiny muted"><Icon name="arrow-left" size={12} /> Previous</span><span className="strong">{prev.title}</span></button> : <span />}
              {next ? <button className="chapter-nav-btn next" onClick={() => go(next)}><span className="tiny muted">Next <Icon name="arrow-right" size={12} /></span><span className="strong">{next.title}</span></button> : <Link to="/guide" className="chapter-nav-btn next"><span className="tiny muted">Done</span><span className="strong">Back to the contents</span></Link>}
            </div>
          </footer>
        </div>
        {headings.length > 2 && (
          <nav className="reader-toc" aria-label="On this page">
            <div className="eyebrow">On this page</div>
            {headings.map((h) => (
              <button key={h.id} className={activeH === h.id ? 'on' : ''} onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{h.text}</button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

/** Every chapter in order, as one Markdown document for Word or print. */
function bookMarkdown(): string {
  const intro = `# The Field Guide\n\n*A practical book for Product Owners and Business Analysts. Part I teaches the craft; Part II shows how to do it in Goldthread.*\n\nLicensed under Creative Commons Attribution 4.0 (CC BY 4.0). All people, companies and products in the running example are fictional.\n`;
  return [intro, ...CHAPTERS.map((c) => chapterMarkdown(c, chapterLabel(c)))].join('\n\n');
}

/** Compact "continue reading" card for Home. */
export function GuideCard() {
  const [read] = useProgress();
  const main = CHAPTERS.filter((c) => c.part !== 'appendix');
  const doneCount = main.filter((c) => read[c.id]).length;
  if (!main.length || doneCount === main.length) return null;
  const c = CHAPTER_MAP.get(nextUnread(main.map((x) => x.id), read))!;
  return (
    <Link to={`/guide/${c.id}`} className="guide-card">
      <Icon name="graduation-cap" size={18} className="lead" />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="tiny muted">{doneCount ? `Field guide · ${doneCount} of ${main.length} read` : 'Field guide · new to the role, or to Goldthread?'}</div>
        <div className="strong">{doneCount ? `Continue: ${c.title}` : `Start with “${c.title}”`}</div>
        <div className="small muted">{chapterLabel(c)} · {c.minutes} min</div>
      </div>
      <Icon name="arrow-right" size={15} className="muted" />
    </Link>
  );
}

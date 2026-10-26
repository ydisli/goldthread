import { useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createEntity, updateEntity, useCan, useGraph, useMe, useStore, type Member } from '../store.ts';
import { Avatar, Card, errorToast } from '../ui/kit.tsx';
import { fmtDateTime } from '../ui/format.ts';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Comment text with @Name mentions of workspace members highlighted. */
export function MentionText({ body, members }: { body: string; members: Member[] }) {
  const names = members.map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{body}</>;
  const re = new RegExp(`@(${names.map(escapeRe).join('|')})`, 'g');
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of body.matchAll(re)) {
    out.push(body.slice(last, m.index));
    out.push(<span key={m.index} className="mention">@{m[1]}</span>);
    last = m.index! + m[0].length;
  }
  out.push(body.slice(last));
  return <>{out}</>;
}

export function Comments({ entityId }: { entityId: string }) {
  const g = useGraph();
  const me = useMe();
  const members = useStore().members;
  const canResolve = useCan('editor');
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<Member[]>([]);
  const [query, setQuery] = useState<{ text: string; at: number } | null>(null);
  const [hl, setHl] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const comments = g.referencing(entityId, 'comment', 'entityId').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const others = members.filter((m) => m.userId !== me?.id);

  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.text.toLowerCase();
    return others.filter((m) => m.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || m.name.toLowerCase().startsWith(q)).slice(0, 5);
  }, [query, others]);

  const onChange = (value: string, caret: number) => {
    setBody(value);
    const m = value.slice(0, caret).match(/(^|\s)@([\p{L}\p{N}.'-]{0,24})$/u);
    setQuery(m ? { text: m[2], at: caret - m[2].length - 1 } : null);
    setHl(0);
  };

  const pick = (m: Member) => {
    if (!query) return;
    const caret = query.at + query.text.length + 1;
    const next = `${body.slice(0, query.at)}@${m.name} ${body.slice(caret)}`;
    // Commit the text now and put the caret after the name, so whatever is typed next lands there.
    flushSync(() => {
      setBody(next);
      setPicked((p) => (p.some((x) => x.userId === m.userId) ? p : [...p, m]));
      setQuery(null);
    });
    const pos = query.at + m.name.length + 2;
    area.current?.focus();
    area.current?.setSelectionRange(pos, pos);
  };

  const add = async () => {
    const text = body.trim();
    if (!text) return;
    const mentions = picked.filter((m) => text.includes(`@${m.name}`)).map((m) => m.userId);
    try {
      await createEntity('comment', { entityId, body: text, mentions });
      setBody('');
      setPicked([]);
    } catch (err) { errorToast(err); }
  };

  return (
    <Card title={`Comments${comments.length ? ` · ${comments.length}` : ''}`} icon="message-square" flush>
      <div className="list">
        {comments.map((c) => (
          <div key={c.id} className="list-item" style={{ opacity: c.resolved ? 0.55 : 1 }}>
            <Avatar name={c.author} size="sm" />
            <div className="grow">
              <div className="small"><span className="strong">{c.author}</span> <span className="muted">{fmtDateTime(c.createdAt)}</span></div>
              <div className="pre"><MentionText body={c.body} members={members} /></div>
            </div>
            {canResolve && <button className="btn btn-ghost btn-sm" onClick={() => updateEntity(c.id, { resolved: !c.resolved }).catch(errorToast)}>{c.resolved ? 'Reopen' : 'Resolve'}</button>}
          </div>
        ))}
        <div className="list-item comment-new">
          <div className="grow" style={{ position: 'relative' }}>
            <textarea
              ref={area}
              aria-label="Add a comment"
              className="textarea"
              rows={2}
              style={{ minHeight: 44 }}
              placeholder={others.length ? 'Add a comment… type @ to mention someone (⌘↵ to post)' : 'Add a comment… (⌘↵ to post)'}
              value={body}
              onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
              onBlur={() => setTimeout(() => setQuery(null), 120)}
              onKeyDown={(e) => {
                if (suggestions.length) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => (h + 1) % suggestions.length); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => (h - 1 + suggestions.length) % suggestions.length); return; }
                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(suggestions[hl]); return; }
                  if (e.key === 'Escape') { e.preventDefault(); setQuery(null); return; }
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void add();
              }}
            />
            {suggestions.length > 0 && (
              <div className="mention-menu" role="listbox">
                {suggestions.map((m, i) => (
                  <button key={m.userId} type="button" role="option" aria-selected={i === hl} className={i === hl ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); pick(m); }}>
                    <Avatar name={m.name} size="sm" /><span>{m.name}</span><span className="tiny muted">{m.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn" onClick={add} disabled={!body.trim()}>Post</button>
        </div>
      </div>
    </Card>
  );
}

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ENTITY_MAP, nameOf, refTargets, type Entity, type FieldDef } from '../../../core/schema.ts';
import { createEntity, useGraph } from '../store.ts';
import { Link } from '../router.tsx';
import { Icon } from '../ui/icons.tsx';
import { StatusBadge, Badge, Markdown, errorToast, useOutsideClick } from '../ui/kit.tsx';
import { fmtDate, humanize, money, relDays, toneOf } from '../ui/format.ts';
import { hrefOf } from './links.ts';

// ---------------- display ----------------

export function RefChip({ e, id, showType }: { e?: Entity; id?: string; showType?: boolean }) {
  const g = useGraph();
  const ent = e ?? g.get(id);
  if (!ent) return id ? <span className="chip muted" title={id}>missing</span> : <span className="muted">–</span>;
  const def = ENTITY_MAP[ent.type];
  return (
    <Link to={hrefOf(ent)} className="chip" title={`${def?.label ?? ent.type}: ${nameOf(ent)}`}>
      <Icon name={def?.icon ?? 'circle-dot'} size={13} />
      {ent.key && <span className="key">{ent.key}</span>}
      <span className="ellipsis">{nameOf(ent)}</span>
      {showType && <span className="muted tiny">· {def?.label}</span>}
    </Link>
  );
}

export function RefChips({ ids, max = 6 }: { ids: string[] | undefined; max?: number }) {
  if (!ids?.length) return <span className="muted">–</span>;
  return (
    <span className="chips">
      {ids.slice(0, max).map((id) => <RefChip key={id} id={id} />)}
      {ids.length > max && <span className="badge">+{ids.length - max}</span>}
    </span>
  );
}

export function FieldValue({ f, value, compact }: { f: FieldDef; value: any; compact?: boolean }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return <span className="muted">–</span>;
  switch (f.kind) {
    case 'ref': return <RefChip id={value} />;
    case 'refs': return <RefChips ids={value} max={compact ? 3 : 20} />;
    case 'enum': return toneOf(value) || f.key === 'status' ? <StatusBadge value={value} /> : <span>{humanize(value)}</span>;
    case 'date': return <span className="nowrap" title={relDays(value)}>{fmtDate(value)}{!compact && <span className="muted small"> · {relDays(value)}</span>}</span>;
    case 'money': return <span className="num">{money(value)}</span>;
    case 'percent': return <span className="num">{value}%</span>;
    case 'number': return <span className="num">{Number(value).toLocaleString()}</span>;
    case 'scale': return f.min === -2 ? <SentimentValue v={value} /> : <span className="num">{value}<span className="muted">/{f.max}</span></span>;
    case 'bool': return <span>{value ? 'Yes' : 'No'}</span>;
    case 'tags': return <span className="chips">{(value as string[]).map((t) => <Badge key={t}>{t}</Badge>)}</span>;
    case 'url': return <a href={value} target="_blank" rel="noreferrer" className="ellipsis">{String(value).replace(/^https?:\/\//, '')}</a>;
    case 'markdown': return compact ? <span className="ellipsis">{String(value).slice(0, 120)}</span> : <Markdown text={value} />;
    case 'longtext': return compact ? <span className="ellipsis" style={{ display: 'block', maxWidth: 360 }}>{String(value)}</span> : <span className="pre">{String(value)}</span>;
    case 'json': return <span className="muted">…</span>;
    default: return <span>{String(value)}</span>;
  }
}

export function SentimentValue({ v }: { v: number }) {
  const labels: Record<string, string> = { '-2': 'Very negative', '-1': 'Negative', '0': 'Neutral', '1': 'Positive', '2': 'Very positive' };
  const tone = v <= -1 ? 'red' : v >= 1 ? 'green' : '';
  return <Badge tone={tone as any}>{v > 0 ? `+${v}` : v} {labels[String(v)]}</Badge>;
}

// ---------------- inputs ----------------

export function FieldInput({ f, value, onChange, entityId, id }: { f: FieldDef; value: any; onChange: (v: any) => void; entityId?: string; id?: string }) {
  switch (f.kind) {
    case 'text':
      return <input id={id} className="input" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'url':
      // "staging.example.com" means https://staging.example.com.
      return <input id={id} className="input" inputMode="url" value={value ?? ''} placeholder={f.placeholder ?? 'https://…'} onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => { const v = e.target.value.trim(); if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) onChange(`https://${v}`); }} />;
    case 'longtext':
      return <textarea id={id} className="textarea" rows={3} value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'markdown':
      return <textarea id={id} className="textarea mono" rows={8} value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'number': case 'money': case 'percent':
      return (
        <div className="row">
          <input id={id} className="input" type="number" step="any" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
          {f.kind === 'percent' && <span className="muted">%</span>}
        </div>
      );
    case 'enum':
      return (
        <select id={id} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {!f.default && <option value="">–</option>}
          {f.options!.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
        </select>
      );
    case 'date':
      return <input id={id} className="input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'bool':
      return <label className="check"><input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}</label>;
    case 'scale': {
      const vals: number[] = [];
      for (let i = f.min ?? 1; i <= (f.max ?? 5); i++) vals.push(i);
      return (
        <div className="scale" role="group" aria-label={f.label}>
          {vals.map((v) => <button type="button" aria-pressed={value === v} key={v} className={value === v ? 'on' : ''} onClick={() => onChange(value === v ? '' : v)}>{v > 0 && f.min === -2 ? `+${v}` : v}</button>)}
        </div>
      );
    }
    case 'tags':
      return <TagsInput id={id} value={value ?? []} onChange={onChange} />;
    case 'ref':
      return <EntityPicker inputId={id} targets={refTargets(f)} value={value ? [value] : []} onChange={(ids) => onChange(ids[0] ?? '')} single excludeId={entityId} />;
    case 'refs':
      return <EntityPicker inputId={id} targets={refTargets(f)} value={value ?? []} onChange={onChange} excludeId={entityId} />;
    default:
      return null;
  }
}

export function TagsInput({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((x) => x.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <div className="input row-wrap" style={{ gap: 4, padding: '4px 6px' }}>
      {value.map((t) => (
        <span className="chip" key={t}>{t}<button type="button" className="x" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><Icon name="x" size={12} /></button></span>
      ))}
      <input
        id={id} style={{ border: 0, outline: 'none', flex: 1, minWidth: 80, background: 'transparent' }} value={draft} placeholder="Add, press Enter"
        onChange={(e) => setDraft(e.target.value)} onBlur={add}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)); }}
      />
    </div>
  );
}

/** Search-as-you-type picker for references, with inline creation. */
export function EntityPicker({ targets, value, onChange, single, excludeId, placeholder, inputId }: { targets: string[] | '*'; value: string[]; onChange: (ids: string[]) => void; single?: boolean; excludeId?: string; placeholder?: string; inputId?: string }) {
  const g = useGraph();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));
  const pool = useMemo(() => {
    const list = targets === '*' ? [...g.byId.values()].filter((e) => !['comment', 'interaction'].includes(e.type)) : targets.flatMap((t) => g.all(t));
    return list.filter((e) => e.id !== excludeId);
  }, [g, targets, excludeId]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = pool.filter((e) => !value.includes(e.id) && (!t || `${e.key ?? ''} ${nameOf(e)}`.toLowerCase().includes(t)));
    return list.sort((a, b) => nameOf(a).localeCompare(nameOf(b))).slice(0, 40);
  }, [pool, q, value]);
  const singleTarget = targets !== '*' && targets.length === 1 ? targets[0] : null;
  const canCreate = !!singleTarget && q.trim().length > 1 && !matches.some((m) => nameOf(m).toLowerCase() === q.trim().toLowerCase());

  const pick = (id: string) => {
    onChange(single ? [id] : [...value, id]);
    setQ('');
    setHl(0);
    if (single) setOpen(false);
    else inputRef.current?.focus();
  };
  const create = async () => {
    if (!singleTarget) return;
    try {
      const def = ENTITY_MAP[singleTarget];
      const e = await createEntity(singleTarget, { [def.titleField]: q.trim() });
      pick(e.id);
    } catch (err) { errorToast(err); }
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const total = matches.length + (canCreate ? 1 : 0);
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHl((h) => Math.min(total - 1, h + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hl < matches.length && matches[hl]) pick(matches[hl].id);
      else if (canCreate) void create();
    }
    if (e.key === 'Backspace' && !q && value.length && !single) onChange(value.slice(0, -1));
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="picker" ref={ref}>
      <div className="input row-wrap" style={{ gap: 4, padding: '4px 6px' }} onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        {value.map((id) => {
          const e = g.get(id);
          return (
            <span className="chip" key={id}>
              <Icon name={ENTITY_MAP[e?.type ?? '']?.icon ?? 'circle-dot'} size={12} />
              <span className="ellipsis" style={{ maxWidth: 220 }}>{e ? (e.key ? `${e.key} ` : '') + nameOf(e) : 'missing'}</span>
              <button type="button" className="x" aria-label="Remove" onClick={(ev) => { ev.stopPropagation(); onChange(value.filter((x) => x !== id)); }}><Icon name="x" size={12} /></button>
            </span>
          );
        })}
        {(!single || !value.length) && (
          <input
            id={inputId} ref={inputRef} value={q} placeholder={value.length ? '' : placeholder ?? `Search ${targets === '*' ? 'anything' : targets.map((t) => ENTITY_MAP[t]?.plural.toLowerCase()).join(', ')}…`}
            style={{ border: 0, outline: 'none', flex: 1, minWidth: 120, background: 'transparent' }}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setHl(0); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          />
        )}
      </div>
      {open && (matches.length > 0 || canCreate) && (
        <div className="picker-pop" role="listbox">
          {matches.map((m, i) => (
            <div key={m.id} className={`picker-item ${i === hl ? 'hl' : ''}`} onMouseEnter={() => setHl(i)} onMouseDown={(e) => { e.preventDefault(); pick(m.id); }} role="option" aria-selected={i === hl}>
              <Icon name={ENTITY_MAP[m.type]?.icon ?? 'circle-dot'} size={14} />
              {m.key && <span className="key">{m.key}</span>}
              <span className="ellipsis">{nameOf(m)}</span>
              {targets === '*' || targets.length > 1 ? <span className="muted tiny" style={{ marginLeft: 'auto' }}>{ENTITY_MAP[m.type]?.label}</span> : null}
            </div>
          ))}
          {canCreate && (
            <div className={`picker-item ${hl === matches.length ? 'hl' : ''}`} onMouseDown={(e) => { e.preventDefault(); void create(); }}>
              <Icon name="plus" size={14} /> Create {ENTITY_MAP[singleTarget!].label.toLowerCase()} “{q.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}

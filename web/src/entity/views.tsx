import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ENTITY_MAP, nameOf, type Entity, type FieldDef } from '../../../core/schema.ts';
import { api, useEntity, useGraph, useStore, type Activity } from '../store.ts';
import { Link, navigate } from '../router.tsx';
import { Icon } from '../ui/icons.tsx';
import { Avatar, Card, Empty, PageHead, StatusBadge, copyText, errorToast } from '../ui/kit.tsx';
import { fmtDateTime, humanize, relDays } from '../ui/format.ts';
import { FieldValue, RefChip } from './fields.tsx';
import { openEditor } from './editor.tsx';
import { hrefOf } from './links.ts';
import { Comments } from './comments.tsx';
import { Attachments } from './attachments.tsx';
import { customLabel, customOf, useDef, useEntityDef } from './custom.ts';

export { Comments, Attachments };

// ---------------- Entity table ----------------

export interface Column {
  key: string;
  label?: string;
  render?: (e: Entity) => ReactNode;
  sort?: (e: Entity) => string | number;
  className?: string;
}

export function EntityTable({ type, recordType, rows, columns, onRowClick, empty, filterable = true, initialSort }: {
  type: string; recordType?: string; rows?: Entity[]; columns?: (string | Column)[]; onRowClick?: (e: Entity) => void; empty?: ReactNode; filterable?: boolean; initialSort?: { key: string; dir: 1 | -1 };
}) {
  const g = useGraph();
  const def = useDef(type, recordType);
  const data = rows ?? (recordType ? g.all(type).filter((e) => e.recordType === recordType) : g.all(type));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(initialSort ?? null);
  const cols: Column[] = (columns ?? def.columns).map((c) => (typeof c === 'string' ? { key: c } : c));
  const statusField = def.fields.find((f) => f.key === (def.statusField ?? 'status') && f.kind === 'enum');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = data.filter((e) => (!status || e[statusField?.key ?? 'status'] === status) && (!t || JSON.stringify(e).toLowerCase().includes(t)));
    if (sort) {
      const col = cols.find((c) => c.key === sort.key);
      const f = def.fields.find((x) => x.key === sort.key);
      const val = (e: Entity) => {
        if (col?.sort) return col.sort(e);
        const v = e[sort.key];
        if (f?.kind === 'ref') return nameOf(g.get(v)).toLowerCase();
        if (f?.kind === 'enum') return f.options!.indexOf(v);
        if (typeof v === 'number') return v;
        return String(v ?? '').toLowerCase();
      };
      list = [...list].sort((a, b) => {
        const x = val(a), y = val(b);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
    }
    return list;
  }, [data, q, status, sort, g]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (c: Column) => c.label ?? (c.key === 'key' ? 'Key' : def.fields.find((f) => f.key === c.key)?.label ?? humanize(c.key));
  const cell = (c: Column, e: Entity) => {
    if (c.render) return c.render(e);
    if (c.key === 'key') return <span className="key">{e.key}</span>;
    const f = def.fields.find((x) => x.key === c.key);
    if (!f) return String(e[c.key] ?? '—');
    if (f.key === def.titleField) return <Link to={hrefOf(e)} className="strong" onClick={(ev) => ev.stopPropagation()} style={{ color: 'var(--text)' }}>{nameOf(e)}</Link>;
    return <FieldValue f={f} value={e[c.key]} compact />;
  };

  return (
    <div>
      {filterable && (
        <div className="row-wrap" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ flex: 1, minWidth: 180, maxWidth: 360 }}>
            <Icon name="search" size={14} className="muted" />
            <input className="input input-sm" placeholder={`Filter ${def.plural.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {statusField && (
            <select className="select input-sm" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All {statusField.label.toLowerCase()}</option>
              {statusField.options!.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
            </select>
          )}
          <span className="muted small">{filtered.length} of {data.length}</span>
        </div>
      )}
      {filtered.length === 0 ? (
        empty ?? <Empty icon={def.icon}>No {def.plural.toLowerCase()} {q || status ? 'match the filter' : 'yet'}.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={`sortable ${c.className ?? ''}`} onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}>
                    {header(c)}{sort?.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="clickable" onClick={() => (onRowClick ? onRowClick(e) : navigate(hrefOf(e)))}>
                  {cols.map((c) => <td key={c.key} className={c.className}>{cell(c, e)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Generic list page for any entity type: /e/:type */
export function EntityListPage({ type }: { type: string }) {
  const def = ENTITY_MAP[type];
  if (!def) return <div className="page"><Empty>Unknown type “{type}”.</Empty></div>;
  return (
    <div className="page">
      <PageHead title={def.plural} sub={def.description} actions={<button className="btn btn-primary" onClick={() => openEditor({ type })}><Icon name="plus" size={14} />New {def.label.toLowerCase()}</button>} />
      <Card flush><EntityTable type={type} /></Card>
    </div>
  );
}

/** Items of one of the workspace's own types: /r/:typeId */
export function RecordListPage({ typeId }: { typeId: string }) {
  const def = useDef('record', typeId);
  if (def === ENTITY_MAP.record) return <div className="page"><Empty icon="boxes">This item type was removed. <Link to="/workspace/settings?tab=workspace">Workspace settings</Link></Empty></div>;
  const extra = def.fields.filter((f) => f.key.startsWith('cf_') && !['longtext', 'markdown'].includes(f.kind)).slice(0, 3).map((f) => f.key);
  return (
    <div className="page">
      <PageHead title={def.plural} sub={def.description} actions={<button className="btn btn-primary" onClick={() => openEditor({ type: 'record', defaults: { recordType: typeId } })}><Icon name="plus" size={14} />New {def.label.toLowerCase()}</button>} />
      <Card flush><EntityTable type="record" recordType={typeId} columns={['title', ...extra, 'ownerId', { key: 'updatedAt', label: 'Updated', render: (e) => <span className="muted nowrap">{relDays(e.updatedAt.slice(0, 10))}</span>, sort: (e) => e.updatedAt }]} /></Card>
    </div>
  );
}

// ---------------- Entity detail ----------------

export function EntityHeader({ e, actions, sub }: { e: Entity; actions?: ReactNode; sub?: ReactNode }) {
  const def = useEntityDef(e);
  const status = def.statusField ? e[def.statusField] : undefined;
  return (
    <PageHead
      crumbs={<><Icon name={def.icon} size={13} /><Link to={listHref(e.type, e.recordType)}>{def.plural}</Link>{e.key && <><span>/</span><span className="key">{e.key}</span></>}</>}
      title={<span className="row-wrap" style={{ gap: 10 }}>{nameOf(e)}{status && <StatusBadge value={status} />}</span>}
      sub={sub}
      actions={
        <>
          {actions}
          <button className="btn" onClick={() => openEditor({ type: e.type, id: e.id })}><Icon name="pencil" size={14} />Edit</button>
          <Link className="btn btn-ghost" to={`/deliver/trace?impact=${e.id}`} title="What is affected if this changes?"><Icon name="network" size={14} />Impact</Link>
          <button className="btn btn-ghost btn-icon" title="Copy link" onClick={() => copyText(`${location.origin}/#${hrefOf(e)}`, 'Link copied')}><Icon name="link" size={14} /></button>
        </>
      }
    />
  );
}

export function listHref(type: string, recordType?: string): string {
  if (type === 'record' && recordType) return `/r/${recordType}`;
  const special: Record<string, string> = {
    stakeholder: '/stakeholders', evidence: '/discover/signals', opportunity: '/discover/opportunities', bet: '/discover/bets', assumption: '/discover/assumptions',
    experiment: '/discover/experiments', persona: '/discover/customers', journey: '/discover/customers', spec: '/define/specs', requirement: '/define/requirements',
    decision: '/define/decisions', decisionTable: '/define/decision-tables', processModel: '/define/process', storyMap: '/define/story-map', story: '/deliver/backlog',
    glossaryTerm: '/define/glossary', release: '/deliver/releases', raid: '/deliver/raid', testCase: '/deliver/uat', defect: '/deliver/uat', feature: '/learn/features',
    request: '/stakeholders/requests', commitment: '/stakeholders/commitments', raci: '/stakeholders/raci', approval: '/stakeholders/approvals', conflict: '/stakeholders/conflicts',
    commsItem: '/stakeholders/engagement', interaction: '/stakeholders/engagement', objective: '/strategy', keyResult: '/strategy', vision: '/strategy', metric: '/strategy/metrics',
    businessCase: '/strategy/business-cases', competitor: '/strategy/market', winLoss: '/strategy/market', team: '/strategy/capacity', techDebt: '/strategy/capacity',
    meeting: '/workspace/meetings', baseline: '/define/requirements', changeRequest: '/define/requirements',
  };
  return special[type] ?? `/e/${type}`;
}

/** Field grid for an entity — skips the title and empty values. */
export function FieldGrid({ e, skip = [], include }: { e: Entity; skip?: string[]; include?: string[] }) {
  const def = useEntityDef(e);
  const fields = def.fields.filter((f) => !f.hidden && f.kind !== 'json' && f.key !== def.titleField && !skip.includes(f.key) && (!include || include.includes(f.key)));
  const filled = fields.filter((f) => isFilled(e[f.key]));
  const longKinds = ['longtext', 'markdown'];
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="form-grid" style={{ gap: '12px 18px' }}>
        {filled.filter((f) => !longKinds.includes(f.kind)).map((f) => <Prop key={f.key} f={f} value={e[f.key]} />)}
      </div>
      {filled.filter((f) => longKinds.includes(f.kind)).map((f) => (
        <div key={f.key} className="field">
          <span className="label">{f.label}</span>
          <FieldValue f={f} value={e[f.key]} />
        </div>
      ))}
      {!filled.length && <span className="muted small">No details yet — click Edit to add them.</span>}
    </div>
  );
}

function Prop({ f, value }: { f: FieldDef; value: unknown }) {
  return (
    <div className="field" style={{ gap: 3 }}>
      <span className="label">{f.label}</span>
      <div><FieldValue f={f} value={value} /></div>
    </div>
  );
}

export const isFilled = (v: unknown) => !(v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));

/** Everything that references this entity, grouped by type. */
export function Backlinks({ id, exclude = [] }: { id: string; exclude?: string[] }) {
  const g = useGraph();
  const links = g.linksTo(id).filter((l) => !exclude.includes(l.from.type) && l.from.type !== 'comment' && l.from.type !== 'attachment');
  const groups = new Map<string, { label: string; items: Entity[] }>();
  for (const l of links) {
    const key = `${l.from.type}`;
    const grp = groups.get(key) ?? { label: ENTITY_MAP[l.from.type]?.plural ?? l.from.type, items: [] };
    if (!grp.items.includes(l.from)) grp.items.push(l.from);
    groups.set(key, grp);
  }
  return (
    <Card title="Linked from" icon="link" flush>
      {groups.size === 0 ? <Empty icon="link">Nothing links here yet.</Empty> : (
        <div className="list">
          {[...groups.values()].map((grp) => (
            <div key={grp.label} className="list-item" style={{ flexDirection: 'column', gap: 6 }}>
              <span className="small strong muted">{grp.label} · {grp.items.length}</span>
              <div className="chips">{grp.items.slice(0, 24).map((x) => <RefChip key={x.id} e={x} />)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ActivityFeed({ entityId, limit = 30 }: { entityId?: string; limit?: number }) {
  const s = useStore();
  const [items, setItems] = useState<Activity[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    api<Activity[]>(`/api/activity?limit=${limit}${entityId ? `&entityId=${encodeURIComponent(entityId)}` : ''}`)
      .then((a) => { if (!cancelled) setItems(a); })
      .catch(() => setItems([]));
    return () => { cancelled = true; };
  }, [entityId, limit, s.version]);
  if (!items) return <div className="empty">Loading…</div>;
  if (!items.length) return <Empty icon="history">No changes recorded yet.</Empty>;
  return (
    <div className="list">
      {items.map((a) => (
        <div key={a.id} className="list-item" style={{ fontSize: 13 }}>
          <Avatar name={a.actor} size="sm" />
          <div className="grow">
            <div><span className="strong">{a.actor}</span> <span className="muted">·</span> {a.summary}{!entityId && a.entityId !== '-' && <> <RefChip id={a.entityId} /></>}</div>
            {a.changes && (
              <div className="small muted">
                {Object.entries(a.changes).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="ellipsis">{ENTITY_MAP[a.entityType]?.fields.find((f) => f.key === k)?.label ?? customLabel(customOf(s.settings), k) ?? k}: {fmtChange(v.from)} → {fmtChange(v.to)}</div>
                ))}
              </div>
            )}
          </div>
          <span className="small muted nowrap">{fmtDateTime(a.at)}</span>
        </div>
      ))}
    </div>
  );
}

function fmtChange(v: unknown): string {
  if (v === undefined || v === null || v === '') return '∅';
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return '{…}';
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 39)}…` : s;
}

/** Generic detail page: /e/:type/:id — also used as the base for specialised pages. */
export function EntityPage({ id, children, side, headerActions, sub, hideFields, wide }: { id: string; children?: ReactNode; side?: ReactNode; headerActions?: ReactNode; sub?: ReactNode; hideFields?: boolean; wide?: ReactNode }) {
  const e = useEntity(id);
  const icon = useDef(e?.type && ENTITY_MAP[e.type] ? e.type : 'story', e?.recordType).icon;
  if (!e) return <div className="page"><Empty icon="search">This item does not exist or was deleted. <Link to="/today">Back to today</Link></Empty></div>;
  return (
    <div className={`page ${wide ? 'page-wide' : ''}`}>
      <EntityHeader e={e} actions={headerActions} sub={sub} />
      {wide}
      <div className="grid g-side">
        <div className="stack">
          {!hideFields && <Card title="Details" icon={icon}><FieldGrid e={e} /></Card>}
          {children}
        </div>
        <div className="stack">
          {side}
          <Backlinks id={e.id} />
          <Attachments entityId={e.id} />
          <Comments entityId={e.id} />
          <Card title="History" icon="history" flush><ActivityFeed entityId={e.id} limit={20} /></Card>
        </div>
      </div>
    </div>
  );
}

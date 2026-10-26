import { useEffect, useState } from 'react';
import { ENTITIES, ENTITY_MAP } from '../../../../core/schema.ts';
import { CUSTOM_ICONS, CUSTOM_KINDS, type CustomField, type CustomKind, type CustomType, type Customisation } from '../../../../core/custom.ts';
import { can, updateSettings, useGraph, useSettings } from '../../store.ts';
import { Link } from '../../router.tsx';
import { Card, errorToast, toast } from '../../ui/kit.tsx';
import { Icon } from '../../ui/icons.tsx';
import { customOf } from '../../entity/custom.ts';

// Settings → Workspace: fields of your own on any item type, and item types of your own.
// The server cleans whatever is sent (keys, kinds, limits), so the form can stay simple.

const KIND_LABEL: Record<CustomKind, string> = { text: 'Short text', longtext: 'Long text', number: 'Number', date: 'Date', enum: 'Pick one', bool: 'Yes / no', url: 'Link' };
const HIDDEN = new Set(['comment', 'attachment', 'record']);
const TYPES = ENTITIES.filter((d) => !HIDDEN.has(d.type)).sort((a, b) => a.label.localeCompare(b.label));

const blankField = (): CustomField => ({ key: '', label: '', kind: 'text' });

function FieldsEditor({ fields, onChange, disabled }: { fields: CustomField[]; onChange: (f: CustomField[]) => void; disabled: boolean }) {
  const set = (i: number, patch: Partial<CustomField>) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="col" style={{ gap: 8 }}>
      {fields.map((f, i) => (
        <div key={f.key || `new-${i}`} className="custom-field">
          <input className="input input-sm" aria-label="Field name" placeholder="Field name, e.g. Vendor" value={f.label} disabled={disabled} onChange={(e) => set(i, { label: e.target.value })} />
          <select className="select input-sm" aria-label="Kind of value" value={f.kind} disabled={disabled} onChange={(e) => set(i, { kind: e.target.value as CustomKind })}>
            {CUSTOM_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          {f.kind === 'enum'
            ? <input className="input input-sm" aria-label="Choices" placeholder="Choices, comma separated" value={(f.options ?? []).join(', ')} disabled={disabled} onChange={(e) => set(i, { options: e.target.value.split(',').map((o) => o.trimStart()) })} />
            : <input className="input input-sm" aria-label="Help text" placeholder="Help text (optional)" value={f.help ?? ''} disabled={disabled} onChange={(e) => set(i, { help: e.target.value })} />}
          <label className="check small"><input type="checkbox" checked={!!f.required} disabled={disabled} onChange={(e) => set(i, { required: e.target.checked })} />Required</label>
          {!disabled && <button className="btn btn-ghost btn-sm btn-icon" title={`Remove ${f.label || 'field'}`} aria-label={`Remove ${f.label || 'field'}`} onClick={() => onChange(fields.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>}
        </div>
      ))}
      {!disabled && <div><button className="btn btn-sm" onClick={() => onChange([...fields, blankField()])}><Icon name="plus" size={13} />Add field</button></div>}
    </div>
  );
}

export function Customise() {
  const settings = useSettings();
  const g = useGraph();
  const saved = customOf(settings);
  const isAdmin = can('admin');
  const [draft, setDraft] = useState<Customisation>(() => structuredClone(saved ?? {}));
  const [type, setType] = useState(TYPES.find((d) => d.type === 'story')?.type ?? TYPES[0].type);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(structuredClone(saved ?? {})); }, [saved]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved ?? {});

  const fieldsOf = (t: string) => draft.fields?.[t] ?? [];
  const setFields = (t: string, list: CustomField[]) => setDraft((d) => ({ ...d, fields: { ...d.fields, [t]: list } }));
  const setType_ = (i: number, patch: Partial<CustomType>) => setDraft((d) => ({ ...d, types: (d.types ?? []).map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const removeType = (i: number) => {
    const t = draft.types![i];
    const n = t.id ? g.all('record').filter((r) => r.recordType === t.id).length : 0;
    if (n && !confirm(`Remove “${t.label}”? Its ${n} item${n === 1 ? '' : 's'} stay in the workspace (under All tools → Records) and come back if you add the type again with the same name.`)) return;
    setDraft((d) => ({ ...d, types: (d.types ?? []).filter((_, j) => j !== i) }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateSettings({ custom: draft });
      toast('Customisation saved');
    } catch (err) { errorToast(err); } finally { setBusy(false); }
  };
  const footer = (note: string) => isAdmin && (
    <div className="row mt12">
      <span className="small muted grow">{dirty ? 'Unsaved changes.' : note}</span>
      {dirty && <button className="btn" onClick={() => setDraft(structuredClone(saved ?? {}))}>Discard</button>}
      <button className="btn btn-primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
  const counts = Object.entries(saved?.fields ?? {}).filter(([, l]) => l.length).map(([t, l]) => `${ENTITY_MAP[t]?.plural ?? t} (${l.length})`);

  return (
    <>
      <Card title="Fields of your own" sub="Add what your team tracks that Throughline doesn't: a vendor on requirements, a regulatory reference on decisions, a cost centre on requests. They show in forms, on the item, in the workspace export and to AI assistants.">
        <div className="row-wrap" style={{ marginBottom: 12 }}>
          <label className="small strong" htmlFor="custom-type">On</label>
          <select id="custom-type" className="select input-sm" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((d) => <option key={d.type} value={d.type}>{d.plural}{fieldsOf(d.type).length ? ` · ${fieldsOf(d.type).length}` : ''}</option>)}
          </select>
          {counts.length > 0 && <span className="small muted">Customised: {counts.join(', ')}</span>}
        </div>
        {!fieldsOf(type).length && !isAdmin ? <div className="small muted">No fields of your own on {ENTITY_MAP[type].plural.toLowerCase()}.</div> : <FieldsEditor fields={fieldsOf(type)} onChange={(l) => setFields(type, l)} disabled={!isAdmin} />}
        {footer('Removing a field hides it; values stay on the items and return if you add it back with the same name.')}
      </Card>
      <Card title="Item types of your own" sub="For things the built-in types don't cover — vendors, environments, controls, contracts. Each gets its own list, form and fields, and links to everything else like any other item.">
        <div className="col" style={{ gap: 14 }}>
          {(draft.types ?? []).map((t, i) => {
            const n = t.id ? g.all('record').filter((r) => r.recordType === t.id).length : 0;
            return (
              <div key={t.id || `new-${i}`} className="custom-type">
                <div className="custom-type-head">
                  <Icon name={t.icon || 'boxes'} size={16} />
                  <input className="input input-sm" aria-label="Type name" placeholder="Name, e.g. Vendor" value={t.label} disabled={!isAdmin} onChange={(e) => setType_(i, { label: e.target.value })} />
                  <input className="input input-sm" aria-label="Plural" placeholder={t.label ? `${t.label}s` : 'Plural'} value={t.plural} disabled={!isAdmin} onChange={(e) => setType_(i, { plural: e.target.value })} />
                  <select className="select input-sm" aria-label="Icon" value={t.icon} disabled={!isAdmin} onChange={(e) => setType_(i, { icon: e.target.value })}>
                    {CUSTOM_ICONS.map((ic) => <option key={ic} value={ic}>{ic.replace(/-/g, ' ')}</option>)}
                  </select>
                  {t.id && saved?.types?.some((s) => s.id === t.id) && <Link className="btn btn-ghost btn-sm" to={`/r/${t.id}`}>{n} item{n === 1 ? '' : 's'}<Icon name="arrow-right" size={13} /></Link>}
                  {isAdmin && <button className="btn btn-ghost btn-sm btn-icon" title={`Remove ${t.label || 'type'}`} aria-label={`Remove ${t.label || 'type'}`} onClick={() => removeType(i)}><Icon name="trash-2" size={14} /></button>}
                </div>
                <input className="input input-sm mt8" aria-label="Description" placeholder="What is one of these? (optional)" value={t.description ?? ''} disabled={!isAdmin} onChange={(e) => setType_(i, { description: e.target.value })} />
                <div className="small muted mt12" style={{ marginBottom: 6 }}>Every {t.label ? t.label.toLowerCase() : 'item'} has a title, description, owner, related items and tags. Add its own fields:</div>
                <FieldsEditor fields={t.fields} onChange={(l) => setType_(i, { fields: l })} disabled={!isAdmin} />
              </div>
            );
          })}
          {!draft.types?.length && <div className="small muted">None yet.</div>}
          {isAdmin && <div><button className="btn btn-sm" onClick={() => setDraft((d) => ({ ...d, types: [...(d.types ?? []), { id: '', label: '', plural: '', icon: 'boxes', fields: [] }] }))}><Icon name="plus" size={13} />Add item type</button></div>}
        </div>
        {footer('Removing a type keeps its items; they come back if you add the type again with the same name.')}
      </Card>
    </>
  );
}

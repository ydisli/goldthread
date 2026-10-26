import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { defaultsFor, defOf, nameOf, type Entity } from '../../../core/schema.ts';
import { can, conflictOf, createEntity, deleteEntity, restoreEntity, updateEntity, useEntity, type Conflict } from '../store.ts';
import { navigate } from '../router.tsx';
import { Drawer, errorToast, toast } from '../ui/kit.tsx';
import { Icon } from '../ui/icons.tsx';
import { FieldInput, FieldValue } from './fields.tsx';
import { hrefOf } from './links.ts';

export interface EditorRequest {
  type: string;
  id?: string;
  defaults?: Record<string, unknown>;
  onSaved?: (e: Entity) => void;
  /** Navigate to the entity after creating it. */
  open?: boolean;
  /** Restrict the form to these fields (quick forms). */
  only?: string[];
}

let current: EditorRequest | null = null;
const listeners = new Set<() => void>();
export function openEditor(req: EditorRequest) {
  current = req;
  listeners.forEach((l) => l());
}
function closeEditor() {
  current = null;
  listeners.forEach((l) => l());
}

export function EditorHost() {
  const req = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current);
  if (!req) return null;
  return <EntityForm key={`${req.type}:${req.id ?? 'new'}`} req={req} onClose={closeEditor} />;
}

function EntityForm({ req, onClose }: { req: EditorRequest; onClose: () => void }) {
  const def = defOf(req.type);
  const existing = useEntity(req.id);
  const initial = useMemo(() => (existing ? { ...existing } : { ...defaultsFor(req.type), ...req.defaults }) as Record<string, any>, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [data, setData] = useState<Record<string, any>>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [choice, setChoice] = useState<Record<string, 'mine' | 'theirs'>>({});
  // What this form started from. Only fields you change are sent, so other people's edits to the rest survive.
  const base = useRef<Record<string, any>>(initial);
  useEffect(() => { setData(initial); base.current = initial; }, [initial]);
  const changedElsewhere = !!existing && existing.updatedAt !== initial.updatedAt;

  const readOnly = !can('editor') && req.type !== 'comment';
  const fields = def.fields.filter((f) => !f.hidden && f.kind !== 'json' && (!req.only || req.only.includes(f.key)));
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  const save = async (override?: Record<string, any>) => {
    const data_ = override ?? data;
    setBusy(true);
    setErrors([]);
    try {
      let e: Entity;
      if (existing) {
        const patch: Record<string, unknown> = {};
        const prev: Record<string, unknown> = {};
        for (const f of def.fields) {
          if (JSON.stringify(data_[f.key] ?? null) !== JSON.stringify(base.current[f.key] ?? null)) {
            patch[f.key] = data_[f.key] === '' ? null : data_[f.key];
            prev[f.key] = base.current[f.key] ?? null;
          }
        }
        e = Object.keys(patch).length ? await updateEntity(existing.id, patch, { prev }) : existing;
        toast(`${def.label} saved`);
      } else {
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data_)) if (v !== '' && v !== undefined) payload[k] = v;
        e = await createEntity(req.type, payload);
        toast(`${def.label} created`, 'info', req.open === false ? undefined : { label: 'Open', run: () => navigate(hrefOf(e)) });
      }
      req.onSaved?.(e);
      onClose();
    } catch (err) {
      const c = conflictOf(err);
      if (c) {
        setConflict(c);
        setChoice(Object.fromEntries(c.fields.map((f) => [f.key, 'mine'])));
        return;
      }
      const x = err as { errors?: string[]; message: string };
      setErrors(x.errors ?? [x.message]);
    } finally {
      setBusy(false);
    }
  };

  /** Apply the person's choices: "theirs" takes the other value, "mine" overwrites it knowingly. Then save again. */
  const resolve = () => {
    if (!conflict) return;
    const next = { ...data };
    for (const f of conflict.fields) {
      base.current = { ...base.current, [f.key]: f.theirs };
      if (choice[f.key] === 'theirs') next[f.key] = f.theirs;
    }
    setData(next);
    setConflict(null);
    void save(next);
  };

  const remove = async () => {
    if (!existing || !confirm(`Delete ${def.label.toLowerCase()} "${nameOf(existing)}"? You can undo this or restore it later from Settings → Data.`)) return;
    try {
      await deleteEntity(existing.id);
      toast(`${def.label} deleted`, 'info', { label: 'Undo', run: () => { restoreEntity(existing.id).then(() => toast(`${def.label} restored`)).catch(errorToast); } });
      onClose();
    } catch (err) { errorToast(err); }
  };

  return (
    <Drawer
      title={<span className="row">{readOnly ? def.label : existing ? `Edit ${def.label.toLowerCase()}` : `New ${def.label.toLowerCase()}`}{existing?.key && <span className="key">{existing.key}</span>}</span>}
      onClose={onClose}
      footer={readOnly ? <><span className="spacer" /><button className="btn" onClick={onClose}>Close</button></> : (
        <>
          {existing && <button className="btn btn-ghost btn-danger" onClick={remove}><Icon name="trash-2" size={14} />Delete</button>}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : existing ? 'Save' : 'Create'}</button>
        </>
      )}
    >
      {readOnly && <div className="readonly-note" style={{ marginBottom: 14 }}><Icon name="eye" size={14} />You have view access here. Ask an admin for editor access to make changes.</div>}
      {changedElsewhere && !conflict && !readOnly && <div className="readonly-note" role="status" style={{ marginBottom: 14 }}><Icon name="refresh-cw" size={14} />Someone else saved this while you had it open. Saving keeps their changes to fields you haven't touched.</div>}
      {conflict && (
        <div className="conflict" role="alert">
          <div className="strong"><Icon name="triangle-alert" size={14} /> {conflict.by} changed {conflict.fields.length === 1 ? 'a field' : `${conflict.fields.length} fields`} you were editing</div>
          <div className="small muted">Nothing was saved yet. Choose which version to keep for each.</div>
          {conflict.fields.map((cf) => {
            const fd = def.fields.find((x) => x.key === cf.key);
            return (
              <div key={cf.key} className="conflict-field">
                <div className="label">{cf.label}</div>
                <div className="conflict-options">
                  <label className={choice[cf.key] === 'theirs' ? 'on' : ''}><input type="radio" name={`c-${cf.key}`} checked={choice[cf.key] === 'theirs'} onChange={() => setChoice({ ...choice, [cf.key]: 'theirs' })} /><span className="tiny muted">Theirs</span>{fd ? <FieldValue f={fd} value={cf.theirs} compact /> : String(cf.theirs ?? '—')}</label>
                  <label className={choice[cf.key] === 'mine' ? 'on' : ''}><input type="radio" name={`c-${cf.key}`} checked={choice[cf.key] === 'mine'} onChange={() => setChoice({ ...choice, [cf.key]: 'mine' })} /><span className="tiny muted">Yours</span>{fd ? <FieldValue f={fd} value={cf.yours} compact /> : String(cf.yours ?? '—')}</label>
                </div>
              </div>
            );
          })}
          <div className="row"><span className="spacer" /><button className="btn" onClick={() => setConflict(null)}>Keep editing</button><button className="btn btn-primary" onClick={resolve}>Save with these choices</button></div>
        </div>
      )}
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); if (!readOnly) void save(); }}>
        {!existing && <p className="full small muted" style={{ margin: 0 }}>{def.description}</p>}
        {fields.map((f) => {
          const wide = ['longtext', 'markdown', 'refs', 'tags', 'scale'].includes(f.kind) || f.key === def.titleField || (f.kind === 'ref' && f.ref === '*');
          return (
            <div key={f.key} className={`field ${wide ? 'full' : ''}`}>
              {f.kind !== 'bool' && <label>{f.label}{f.required && <span className="muted"> *</span>}</label>}
              <FieldInput f={f} value={data[f.key]} onChange={(v) => set(f.key, v)} entityId={existing?.id} />
              {f.help && <span className="help">{f.help}</span>}
            </div>
          );
        })}
        {errors.length > 0 && <div className="full err">{errors.join(' · ')}</div>}
        <button type="submit" hidden />
      </form>
      </fieldset>
    </Drawer>
  );
}

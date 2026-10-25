import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { defaultsFor, defOf, nameOf, type Entity } from '../../../core/schema.ts';
import { can, createEntity, deleteEntity, restoreEntity, updateEntity, useEntity } from '../store.ts';
import { navigate } from '../router.tsx';
import { Drawer, errorToast, toast } from '../ui/kit.tsx';
import { Icon } from '../ui/icons.tsx';
import { FieldInput } from './fields.tsx';
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
  useEffect(() => setData(initial), [initial]);

  const readOnly = !can('editor') && req.type !== 'comment';
  const fields = def.fields.filter((f) => !f.hidden && f.kind !== 'json' && (!req.only || req.only.includes(f.key)));
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErrors([]);
    try {
      let e: Entity;
      if (existing) {
        const patch: Record<string, unknown> = {};
        for (const f of def.fields) {
          if (JSON.stringify(data[f.key] ?? null) !== JSON.stringify(existing[f.key] ?? null)) patch[f.key] = data[f.key] === '' ? null : data[f.key];
        }
        e = Object.keys(patch).length ? await updateEntity(existing.id, patch) : existing;
        toast(`${def.label} saved`);
      } else {
        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) if (v !== '' && v !== undefined) payload[k] = v;
        e = await createEntity(req.type, payload);
        toast(`${def.label} created`, 'info', req.open === false ? undefined : { label: 'Open', run: () => navigate(hrefOf(e)) });
      }
      req.onSaved?.(e);
      onClose();
    } catch (err) {
      const x = err as { errors?: string[]; message: string };
      setErrors(x.errors ?? [x.message]);
    } finally {
      setBusy(false);
    }
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
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : existing ? 'Save' : 'Create'}</button>
        </>
      )}
    >
      {readOnly && <div className="readonly-note" style={{ marginBottom: 14 }}><Icon name="eye" size={14} />You have view access here. Ask an admin for editor access to make changes.</div>}
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

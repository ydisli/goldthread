import { useRef, useState, type DragEvent } from 'react';
import type { Entity } from '../../../core/schema.ts';
import { ApiError, deleteEntity, getState, restoreEntity, useCan, useGraph } from '../store.ts';
import { Card, errorToast, toast } from '../ui/kit.tsx';
import { Icon } from '../ui/icons.tsx';
import { fmtDateTime } from '../ui/format.ts';

const MAX = 25 * 1_048_576;
const isImage = (m: string) => /^image\/(png|jpeg|gif|webp)$/.test(m);
const size = (n: number) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${Math.round(n / 1024)} KB` : `${(n / 1_048_576).toFixed(1)} MB`);

/** The URL of a stored file; `ws` lets the browser load it in an <img> or a new tab. */
export const fileUrl = (a: Entity, download = false) => `/api/files/${encodeURIComponent(a.id)}?ws=${encodeURIComponent(getState().auth?.current?.id ?? '')}${download ? '&download=1' : ''}`;

export async function uploadFile(entityId: string, file: File): Promise<Entity> {
  if (file.size > MAX) throw new Error(`${file.name} is larger than 25 MB.`);
  const ws = getState().auth?.current?.id;
  const res = await fetch(`/api/files?entityId=${encodeURIComponent(entityId)}&name=${encodeURIComponent(file.name)}`, {
    method: 'POST', credentials: 'same-origin', body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream', ...(ws ? { 'X-TL-Workspace': ws } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? res.statusText);
  return body as Entity;
}

export function Attachments({ entityId }: { entityId: string }) {
  const g = useGraph();
  const canEdit = useCan('editor');
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const files = g.referencing(entityId, 'attachment', 'entityId').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!canEdit && !files.length) return null;

  const upload = async (list: FileList | File[]) => {
    const arr = [...list];
    setBusy((n) => n + arr.length);
    for (const f of arr) {
      try { await uploadFile(entityId, f); } catch (err) { errorToast(err); } finally { setBusy((n) => n - 1); }
    }
  };
  const remove = async (a: Entity) => {
    try {
      await deleteEntity(a.id);
      toast(`Removed ${a.name}`, 'info', { label: 'Undo', run: () => { restoreEntity(a.id).catch(errorToast); } });
    } catch (err) { errorToast(err); }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (canEdit && e.dataTransfer.files.length) void upload(e.dataTransfer.files); };
  const images = files.filter((a) => isImage(String(a.mime)));

  return (
    <div onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <Card title={`Files${files.length ? ` · ${files.length}` : ''}`} icon="paperclip" flush className={over ? 'drop-over' : ''}
        actions={canEdit && <button className="btn btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={busy > 0}><Icon name="plus" size={13} />{busy ? 'Uploading…' : 'Add'}</button>}>
        <input ref={input} type="file" multiple hidden onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = ''; }} />
        {images.length > 0 && (
          <div className="thumbs">
            {images.map((a) => <a key={a.id} href={fileUrl(a)} target="_blank" rel="noreferrer" title={a.name}><img src={fileUrl(a)} alt={a.name} loading="lazy" /></a>)}
          </div>
        )}
        {files.length === 0 ? (
          <div className="empty small">Drop files here, or use Add. Up to 25 MB each.</div>
        ) : (
          <div className="list">{files.map((a) => (
            <div key={a.id} className="list-item" style={{ alignItems: 'center' }}>
              <Icon name={isImage(String(a.mime)) ? 'file-image' : 'file-text'} size={15} className="muted" />
              <a className="grow ellipsis" href={fileUrl(a)} target="_blank" rel="noreferrer" style={{ minWidth: 0 }}>{a.name}</a>
              <span className="tiny muted nowrap" title={`${a.uploadedBy ?? ''} · ${fmtDateTime(a.createdAt)}`}>{size(Number(a.size) || 0)}</span>
              <a className="btn btn-ghost btn-sm btn-icon" href={fileUrl(a, true)} aria-label={`Download ${a.name}`}><Icon name="download" size={13} /></a>
              {canEdit && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(a)} aria-label={`Remove ${a.name}`}><Icon name="x" size={13} /></button>}
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons.tsx';
import { avatarColor, humanize, initials, toneOf, type Tone } from './format.ts';
import { renderMarkdown } from './markdown.ts';

export function Badge({ children, tone, title }: { children: ReactNode; tone?: Tone; title?: string }) {
  return <span className={`badge ${tone ?? ''}`} title={title}>{children}</span>;
}

/** Badge for an enum/status value, coloured by meaning. */
export function StatusBadge({ value, label }: { value: unknown; label?: string }) {
  if (value === undefined || value === null || value === '') return <span className="muted">—</span>;
  return <span className={`status ${toneOf(value)}`}>{label ?? humanize(value)}</span>;
}

/** A card. `icon` is accepted for compatibility but intentionally not drawn — headings carry the meaning. */
export function Card({ title, actions, children, flush, className, sub }: { title?: ReactNode; icon?: string; actions?: ReactNode; children?: ReactNode; flush?: boolean; className?: string; sub?: ReactNode }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || actions) && (
        <div className="card-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {typeof title === 'string' ? <h2>{title}</h2> : title}
            {sub && <div className="small muted">{sub}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className={`card-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  );
}

export function Empty({ icon = 'sparkles', children }: { icon?: string; children: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={22} />{children}</div>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone ? { color: `var(--${tone === 'accent' ? 'accent-text' : tone})` } : undefined}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Meter({ value, color = 'var(--s1)', title }: { value: number; color?: string; title?: string }) {
  return <div className="meter" title={title}><span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} /></div>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className="nav-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => <button key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function Avatar({ name, size }: { name?: string; size?: 'sm' | 'lg' }) {
  return <span className={`avatar ${size ?? ''}`} style={{ background: avatarColor(name ?? '?') }} title={name}>{initials(name)}</span>;
}

export function Markdown({ text, className }: { text: string | undefined; className?: string }) {
  return <div className={`md ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}

export function Drawer({ title, onClose, children, footer, width }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" style={width ? { width: `min(${width}px, 100vw)` } : undefined}>
        <div className="drawer-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}

export function Modal({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </>,
    document.body,
  );
}

// ---------------- toasts ----------------

type Toast = { id: number; text: string; kind: 'info' | 'error'; action?: { label: string; run: () => void } };
let toasts: Toast[] = [];
const toastListeners = new Set<(t: Toast[]) => void>();
let toastId = 0;

export function toast(text: string, kind: Toast['kind'] = 'info', action?: Toast['action']) {
  const t = { id: ++toastId, text, kind, action };
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l(toasts));
  }, kind === 'error' ? 6000 : 3500);
}

export function errorToast(err: unknown) {
  const e = err as { message?: string; errors?: string[] };
  toast(e.errors?.length ? e.errors.join(' · ') : e.message ?? 'Something went wrong', 'error');
}

export function Toasts() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => { toastListeners.add(setList); return () => { toastListeners.delete(setList); }; }, []);
  return createPortal(
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>
          {t.text}
          {t.action && <button className="btn btn-sm" onClick={t.action.run}>{t.action.label}</button>}
        </div>
      ))}
    </div>,
    document.body,
  );
}

/** Copy text to clipboard with a toast. */
export async function copyText(text: string, what = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} to clipboard`);
  } catch {
    toast('Clipboard not available', 'error');
  }
}

export function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onOutside]);
  return ref;
}

export function downloadFile(name: string, content: string, type = 'text/markdown') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function PageHead({ title, sub, actions, crumbs, guide }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: ReactNode; guide?: ReactNode }) {
  return (
    <>
    <div className="page-head">
      <div style={{ minWidth: 0, flex: 1 }}>
        {crumbs && <div className="crumbs">{crumbs}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="row-wrap">{actions}</div>}
    </div>
    {guide}
    </>
  );
}

// ---------------- menus ----------------

/** A dropdown anchored to a trigger; closes on outside click or Escape. */
export function Dropdown({ trigger, children, align = 'left', up = false, width }: { trigger: (open: () => void, isOpen: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; up?: boolean; width?: number }) {
  const [isOpen, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger(() => setOpen((o) => !o), isOpen)}
      {isOpen && (
        <div className="menu" style={{ [align]: 0, ...(up ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }), ...(width ? { width } : {}) }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

// ---------------- guides & terms ----------------

/**
 * A short "how this works" panel at the top of a tool. Dismissed per person;
 * the state lives in their account preferences.
 */
export function Guide({ id, title, steps, dismissed, onDismiss }: { id: string; title: string; steps: ReactNode[]; dismissed: boolean; onDismiss: (id: string) => void }) {
  if (dismissed) return null;
  return (
    <div className="guide" role="note">
      <Icon name="lightbulb" size={18} className="muted" />
      <div style={{ flex: 1 }}>
        <div className="t">{title}</div>
        <ol>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => onDismiss(id)}>Got it</button>
    </div>
  );
}

/** A jargon term with an explanation on hover. */
export function Term({ children, explain }: { children: ReactNode; explain: string }) {
  return <span className="term" tabIndex={0} data-tip={explain} aria-label={`${typeof children === 'string' ? children : ''}: ${explain}`}>{children}</span>;
}

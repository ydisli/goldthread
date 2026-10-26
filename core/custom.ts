// Workspace customisation: extra fields on any item type, and item types of your own
// (stored as `record` items with a `recordType`). Kept in workspace settings, so the
// server, the web app, the CLI and MCP all read the same definition.

import type { FieldDef, FieldKind } from './schema.ts';

export type CustomKind = 'text' | 'longtext' | 'number' | 'date' | 'enum' | 'bool' | 'url';
export const CUSTOM_KINDS: CustomKind[] = ['text', 'longtext', 'number', 'date', 'enum', 'bool', 'url'];

export interface CustomField { key: string; label: string; kind: CustomKind; options?: string[]; help?: string; required?: boolean }
export interface CustomType { id: string; label: string; plural: string; icon: string; description?: string; fields: CustomField[] }
export interface Customisation { fields?: Record<string, CustomField[]>; types?: CustomType[] }

export const CUSTOM_ICONS = ['boxes', 'star', 'flag', 'shield', 'server', 'puzzle', 'layers', 'briefcase-business', 'book-open', 'target', 'workflow', 'users'];

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanFields(list: unknown, taken = new Set<string>()): CustomField[] {
  const out: CustomField[] = [];
  for (const raw of Array.isArray(list) ? list.slice(0, 40) : []) {
    const f = raw as Record<string, unknown>;
    const label = str(f.label, 60);
    if (!label) continue;
    const kind = CUSTOM_KINDS.includes(f.kind as CustomKind) ? (f.kind as CustomKind) : 'text';
    let key = typeof f.key === 'string' && /^cf_[a-z0-9_]{1,44}$/.test(f.key) ? f.key : `cf_${slug(label) || 'field'}`;
    while (taken.has(key)) key = `${key}_2`;
    taken.add(key);
    const options = kind === 'enum' ? [...new Set((Array.isArray(f.options) ? f.options : String(f.options ?? '').split(',')).map((o) => str(o, 40)).filter(Boolean))].slice(0, 30) : undefined;
    if (kind === 'enum' && !options?.length) continue;
    out.push({ key, label, kind, ...(options ? { options } : {}), ...(str(f.help, 200) ? { help: str(f.help, 200) } : {}), ...(f.required === true ? { required: true } : {}) });
  }
  return out;
}

/** Make whatever a client sent safe to store: known kinds, unique cf_ keys, sensible limits. */
export function cleanCustomisation(input: unknown, knownTypes: string[]): Customisation {
  const c = (input ?? {}) as Customisation;
  const fields: Record<string, CustomField[]> = {};
  for (const [type, list] of Object.entries(c.fields ?? {})) {
    if (!knownTypes.includes(type) || type === 'record') continue;
    const clean = cleanFields(list);
    if (clean.length) fields[type] = clean;
  }
  const types: CustomType[] = [];
  const ids = new Set<string>();
  for (const raw of Array.isArray(c.types) ? c.types.slice(0, 30) : []) {
    const t = raw as Partial<CustomType>;
    const label = str(t.label, 40);
    if (!label) continue;
    let id = typeof t.id === 'string' && /^ct_[a-z0-9_]{1,44}$/.test(t.id) ? t.id : `ct_${slug(label) || 'type'}`;
    while (ids.has(id)) id = `${id}_2`;
    ids.add(id);
    types.push({ id, label, plural: str(t.plural, 40) || `${label}s`, icon: CUSTOM_ICONS.includes(String(t.icon)) ? String(t.icon) : 'boxes', ...(str(t.description, 300) ? { description: str(t.description, 300) } : {}), fields: cleanFields(t.fields) });
  }
  return { fields, types };
}

const toDef = (f: CustomField): FieldDef => ({
  key: f.key, label: f.label, kind: f.kind as FieldKind, options: f.options, help: f.help, required: f.required,
  placeholder: f.kind === 'url' ? 'https://…' : undefined,
});

/** The extra fields for an item: the type's custom fields, or a custom type's fields for records. */
export function customFieldDefs(type: string, custom: Customisation | undefined, recordType?: string): FieldDef[] {
  if (!custom) return [];
  if (type === 'record') return (custom.types?.find((t) => t.id === recordType)?.fields ?? []).map(toDef);
  return (custom.fields?.[type] ?? []).map(toDef);
}

export const customType = (custom: Customisation | undefined, id: unknown) => custom?.types?.find((t) => t.id === id);

/**
 * Check custom values the way the schema checks built-in ones. For an edit, pass the changed
 * keys: a field made required later shouldn't block unrelated edits to older items.
 */
export function validateCustom(type: string, data: Record<string, unknown>, custom: Customisation | undefined, changed?: string[]): string[] {
  const errors: string[] = [];
  if (type === 'record' && (!changed || changed.includes('recordType')) && !customType(custom, data.recordType)) errors.push('Choose one of this workspace\'s item types.');
  for (const f of customFieldDefs(type, custom, data.recordType as string)) {
    if (changed && !changed.includes(f.key)) continue;
    const v = data[f.key];
    if (v === undefined || v === null || v === '') { if (f.required) errors.push(`${f.label} is required`); continue; }
    if (f.kind === 'number' && (typeof v !== 'number' || Number.isNaN(v))) errors.push(`${f.label} must be a number`);
    if (f.kind === 'enum' && !f.options?.includes(v as string)) errors.push(`${f.label} must be one of ${f.options?.join(', ')}`);
    if (f.kind === 'date' && !(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))) errors.push(`${f.label} must be a date (YYYY-MM-DD)`);
    if (f.kind === 'bool' && typeof v !== 'boolean') errors.push(`${f.label} must be yes or no`);
    if (f.kind === 'url' && !(typeof v === 'string' && /^https?:\/\//.test(v))) errors.push(`${f.label} must be a web address`);
  }
  return errors;
}

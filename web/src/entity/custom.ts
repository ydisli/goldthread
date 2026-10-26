import { useMemo } from 'react';
import { defOf, type Entity, type EntityDef } from '../../../core/schema.ts';
import { customFieldDefs, customType, type Customisation, type CustomType } from '../../../core/custom.ts';
import { useSettings, type Settings } from '../store.ts';

export const customOf = (s: Settings) => s.custom as Customisation | undefined;

/**
 * The definition an item is shown and edited with: its type plus this workspace's own fields.
 * A record takes its label, icon and fields from the workspace type it belongs to.
 */
export function effectiveDef(type: string, custom: Customisation | undefined, recordType?: unknown): EntityDef {
  const base = defOf(type);
  const extra = customFieldDefs(type, custom, recordType as string);
  const ct = type === 'record' ? customType(custom, recordType) : undefined;
  if (!extra.length && !ct) return base;
  return {
    ...base,
    ...(ct ? { label: ct.label, plural: ct.plural, icon: ct.icon, description: ct.description || `${ct.plural} this workspace keeps track of.` } : {}),
    fields: [...base.fields, ...extra],
  };
}

export function useDef(type: string, recordType?: unknown): EntityDef {
  const custom = customOf(useSettings());
  return useMemo(() => effectiveDef(type, custom, recordType), [type, custom, recordType]);
}

export const useEntityDef = (e: Entity) => useDef(e.type, e.recordType);

export function useCustomTypes(): CustomType[] {
  return customOf(useSettings())?.types ?? [];
}

/** Label of a custom field key, wherever it's defined (for history lines). */
export function customLabel(custom: Customisation | undefined, key: string): string | undefined {
  if (!key.startsWith('cf_') || !custom) return undefined;
  for (const list of [...Object.values(custom.fields ?? {}), ...(custom.types ?? []).map((t) => t.fields)]) {
    const f = list.find((x) => x.key === key);
    if (f) return f.label;
  }
  return undefined;
}

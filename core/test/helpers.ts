import type { Entity } from '../schema.ts';

let n = 0;
export function e(type: string, fields: Record<string, unknown> = {}): Entity {
  n++;
  return { id: (fields.id as string) ?? `${type}_${n}`, type, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...fields };
}

export const NOW = new Date(2026, 9, 25); // 2026-10-25

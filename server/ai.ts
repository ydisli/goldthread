import type { Store } from './db.ts';

export function aiStatus(): { enabled: boolean; model?: string } {
  return { enabled: false };
}

export function aiRoutes(_store: Store): { method: string; path: string; handler: (ctx: any) => unknown }[] {
  return [];
}

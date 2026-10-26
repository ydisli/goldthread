import { mergeText } from '../../../core/engines/merge.ts';
import { conflictOf, updateEntity } from '../store.ts';

export interface TextSave {
  /** The text now stored on the server. Differs from what you sent when it was merged. */
  saved: string;
  merged?: { by: string; conflicts: number };
}

/**
 * Save a text field that is edited as you type (a spec, meeting notes). If someone else
 * changed it since `base`, their edits are merged in line by line instead of overwritten;
 * where you both changed the same lines, both versions are kept, yours first.
 */
export async function saveText(id: string, field: string, base: string, mine: string): Promise<TextSave> {
  try {
    await updateEntity(id, { [field]: mine }, { prev: { [field]: base } });
    return { saved: mine };
  } catch (err) {
    const c = conflictOf(err);
    if (!c) throw err;
    const theirs = String(c.current[field] ?? '');
    const m = mergeText(base, mine, theirs);
    await updateEntity(id, { [field]: m.text }, { prev: { [field]: theirs } });
    return { saved: m.text, merged: { by: c.by, conflicts: m.conflicts } };
  }
}

export function mergedMessage(m: NonNullable<TextSave['merged']>, what: string): string {
  return m.conflicts
    ? `Merged with ${m.by}'s edits to the ${what}. In ${m.conflicts === 1 ? 'one place' : `${m.conflicts} places`} you both changed the same lines, so both versions are there — tidy up.`
    : `Merged with ${m.by}'s edits to the ${what}.`;
}

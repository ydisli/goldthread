import { backup, DatabaseSync } from 'node:sqlite';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A consistent copy of the data folder that is safe to take while the server runs: every
 * SQLite file through SQLite's online backup, plus the encryption key and uploaded files.
 * `npm run backup -- /path/to/folder`. Restore by stopping the server and copying it back.
 */
export async function backupData(dataDir: string, outDir: string): Promise<{ databases: number; files: boolean }> {
  if (existsSync(outDir) && readdirSync(outDir).length) throw new Error(`${outDir} is not empty; choose a new folder.`);
  mkdirSync(join(outDir, 'workspaces'), { recursive: true });
  const wsDir = join(dataDir, 'workspaces');
  const dbs = ['system.db', ...(existsSync(wsDir) ? readdirSync(wsDir).filter((f) => f.endsWith('.db')).map((f) => join('workspaces', f)) : [])];
  for (const rel of dbs) {
    const src = new DatabaseSync(join(dataDir, rel), { readOnly: true });
    try { await backup(src, join(outDir, rel)); } finally { src.close(); }
  }
  if (existsSync(join(dataDir, 'secret.key'))) cpSync(join(dataDir, 'secret.key'), join(outDir, 'secret.key'));
  const files = existsSync(join(dataDir, 'files'));
  if (files) cpSync(join(dataDir, 'files'), join(outDir, 'files'), { recursive: true });
  return { databases: dbs.length, files };
}

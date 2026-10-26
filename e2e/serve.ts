// Starts a throwaway Goldthread for the browser tests: fresh data, demo accounts on.
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
if (!existsSync(join(root, 'web/dist/index.html'))) {
  console.error('Build the web app first: npm run build');
  process.exit(1);
}
const data = join(import.meta.dirname, '.data');
rmSync(data, { recursive: true, force: true });
process.env.GT_DATA = data;
process.env.GT_DEMO = '1';
process.env.PORT = process.env.GT_E2E_PORT ?? '4391';
process.env.HOST = '127.0.0.1';
await import('../server/index.ts');

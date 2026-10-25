import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const webDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: webDir,
  plugins: [react()],
  server: { fs: { allow: [resolve(webDir, '..')] } },
  build: { outDir: resolve(webDir, 'dist'), emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});

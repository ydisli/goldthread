import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.GT_E2E_PORT ?? 4391);

// One worker against one server: the tests share the demo workspace and run in order.
// GT_E2E_CHROMIUM points at an already-installed Chromium; otherwise run `npx playwright install chromium`.
export default defineConfig({
  testDir: '.',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: './.results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env.GT_E2E_CHROMIUM ? { executablePath: process.env.GT_E2E_CHROMIUM } : {},
  },
  webServer: {
    command: 'node e2e/serve.ts',
    cwd: '..',
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { GT_E2E_PORT: String(PORT) },
  },
});

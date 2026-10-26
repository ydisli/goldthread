import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// README screenshots from the demo workspace. Not part of the normal run:
//   TL_SCREENSHOTS=1 npm run e2e -- screenshots
test.skip(!process.env.TL_SCREENSHOTS, 'Set TL_SCREENSHOTS=1 to refresh docs/screenshots');

const OUT = join(import.meta.dirname, '..', 'docs', 'screenshots');

test('README screenshots', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: /Alex Rivera/ }).click();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    const ws = await (await page.request.get('/api/workspace')).json();
    const first = (type: string, where: (e: any) => boolean = () => true) => ws.entities.find((e: any) => e.type === type && where(e));
    const shots: [string, string][] = scheme === 'dark'
      ? [['home-dark', '/#/today']]
      : [
          ['home', '/#/today'],
          ['spec-studio', `/#/define/specs/${first('spec').id}`],
          ['process-modeller', `/#/define/process/${first('processModel').id}`],
          ['stakeholder', `/#/stakeholders/p/${first('stakeholder', (s) => /CISO|Security/i.test(s.title ?? s.role ?? ''))?.id ?? first('stakeholder').id}`],
          ['roadmap', '/#/deliver/roadmap'],
          ['field-guide', '/#/guide'],
        ];
    for (const [name, url] of shots) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(OUT, `${name}.png`) });
    }
    await ctx.close();
  }
});

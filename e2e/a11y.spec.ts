import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Automated WCAG 2.1 A/AA checks on the main pages, in light and dark themes.
// Automated checks find roughly a third of problems; see docs/ACCESSIBILITY.md for the rest.

const PAGES = [
  '/#/today', '/#/inbox', '/#/tools', '/#/stakeholders', '/#/discover/signals', '/#/discover/bets',
  '/#/define/specs', '/#/define/requirements', '/#/define/process', '/#/deliver/backlog', '/#/deliver/roadmap',
  '/#/deliver/releases', '/#/workspace/meetings', '/#/workspace/settings?tab=workspace', '/#/guide', '/#/ask',
];

for (const scheme of ['light', 'dark'] as const) {
  test(`no WCAG A/AA violations (${scheme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('main, .auth-card').first()).toBeVisible();
    const found: string[] = [];
    const scan = async (where: string) => {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const v of r.violations) found.push(`${where} · ${v.id} (${v.impact}) × ${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    };
    await scan('sign-in');
    await page.getByRole('button', { name: /Alex Rivera/ }).click();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    for (const p of PAGES) {
      await page.goto(p);
      await page.waitForTimeout(400);
      await scan(p);
    }
    await ctx.close();
    expect(found, found.join('\n')).toEqual([]);
  });
}

test('keyboard: skip link, page titles, and focus moves to the new page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Alex Rivera/ }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('button', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  await page.getByRole('link', { name: /Inbox/ }).first().click();
  await expect(page.locator('main h1')).toHaveText('Inbox');
  await expect(page.locator('main h1')).toBeFocused();
  await expect(page).toHaveTitle('Inbox · Goldthread');

  // Escape closes drawers and dialogs, and the editor's fields are labelled.
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog', { name: 'Quick capture' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Quick capture' })).toBeHidden();
});

test('keyboard: the editor drawer keeps focus inside and gives it back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Alex Rivera/ }).click();
  await page.goto('/#/define/requirements');
  const open = page.getByRole('button', { name: /New requirement/ });
  await open.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: /New requirement/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel(/^Title/)).toBeFocused();
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
  expect(await drawer.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(open).toBeFocused();
});

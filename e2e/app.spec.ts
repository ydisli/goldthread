import { test, expect, type Browser, type Page } from '@playwright/test';

// End-to-end checks of the main journeys, in a real browser against a throwaway server
// (see serve.ts). They run in order and share the demo workspace.

async function asDemo(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

async function demoPage(browser: Browser, name: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await asDemo(page, name);
  return page;
}

/** First item of a type in the open workspace, through the same API the app uses. */
async function firstOf(page: Page, type: string, where: (e: any) => boolean = () => true) {
  const ws = await (await page.request.get('/api/workspace', { headers: await workspaceHeader(page) })).json();
  return ws.entities.find((e: any) => e.type === type && where(e));
}
async function workspaceHeader(page: Page): Promise<Record<string, string>> {
  const ws = await page.evaluate(() => localStorage.getItem('gt.workspace'));
  return ws ? { 'x-gt-workspace': ws } : {};
}

test('sign in from the demo list and see the day', async ({ page }) => {
  await asDemo(page, 'Alex Rivera');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByText('ServiceHub')).toBeVisible();
  await expect(page.locator('main h1')).toBeVisible();
  await page.getByRole('link', { name: /Field guide/ }).first().click();
  await expect(page).toHaveURL(/#\/guide/);
});

test('capture a signal with the keyboard and find it', async ({ page }) => {
  await asDemo(page, 'Alex Rivera');
  await page.locator('body').press('c');
  const dialog = page.getByRole('dialog', { name: 'Quick capture' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').first().fill('Contractors wait two days for a laptop\nHeard at the service desk stand-up.');
  await dialog.getByRole('button', { name: 'Capture', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.goto('/#/discover/signals');
  await expect(page.getByText('Contractors wait two days for a laptop').first()).toBeVisible();
});

test('a spec opens, and prints to PDF', async ({ page }) => {
  await asDemo(page, 'Alex Rivera');
  await page.goto('/#/define/specs');
  await page.locator('main a[href^="#/define/specs/"]').first().click();
  await expect(page).toHaveURL(/#\/define\/specs\/.+/);
  await expect(page.locator('main h1')).toBeVisible();
  const pdf = await page.pdf({ format: 'A4' });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(20_000);
});

test('the process modeller draws a model', async ({ page }) => {
  await asDemo(page, 'Jordan Kim');
  await page.goto('/#/define/process');
  await page.locator('main a[href^="#/define/process/"]').first().click();
  await expect(page).toHaveURL(/#\/define\/process\/.+/);
  const canvas = page.locator('main svg').filter({ has: page.locator('text') }).first();
  await expect(canvas).toBeVisible();
  expect(await canvas.locator('text').count()).toBeGreaterThan(3);
});

test('import a Jira CSV into the backlog, then re-import without duplicates', async ({ page }) => {
  await asDemo(page, 'Alex Rivera');
  await page.goto('/#/deliver/backlog');
  const csv = 'Issue key,Summary,Issue Type,Status,Story Points\nE2E-1,Self-service device return,Story,To Do,3\nE2E-2,Return label email,Story,In Progress,2\n';
  for (const round of [1, 2]) {
    await page.getByRole('button', { name: /Import/ }).first().click();
    await page.locator('input[type=file]').setInputFiles({ name: 'jira.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    const go = page.getByRole('button', { name: /^Import \d+/ });
    if (round === 1) {
      await expect(go).toHaveText('Import 2');
      await go.click();
      await expect(page.getByText('Self-service device return').first()).toBeVisible();
    } else {
      // Nothing changed, so nothing to import.
      await expect(page.getByRole('button', { name: /^Import/ }).last()).toBeDisabled();
      await page.getByRole('button', { name: 'Cancel' }).click();
    }
  }
  const stories = await page.evaluate(async () => (await (await fetch('/api/workspace')).json()).entities.filter((e: any) => e.type === 'story' && e.externalKey?.startsWith('E2E-')).length);
  expect(stories).toBe(2);
});

test('mention someone and it reaches their inbox', async ({ browser }) => {
  const alex = await demoPage(browser, 'Alex Rivera');
  const req = await firstOf(alex, 'requirement');
  await alex.goto(`/#/define/requirements/${req.id}`);
  const box = alex.getByPlaceholder(/Add a comment/);
  await box.click();
  await box.pressSequentially('Can you check this with audit, @Jor');
  await expect(alex.getByRole('option', { name: /Jordan Kim/ })).toBeVisible();
  await box.press('Enter');
  await box.pressSequentially('please?');
  await box.press('ControlOrMeta+Enter');
  await expect(alex.getByText('Can you check this with audit, @Jordan Kim please?').first()).toBeVisible();

  const jordan = await demoPage(browser, 'Jordan Kim');
  await jordan.goto('/#/inbox');
  await expect(jordan.getByText(/Can you check this with audit/).first()).toBeVisible();
  await alex.context().close();
  await jordan.context().close();
});

test('two people edit the same field: the second gets a choice, not a silent overwrite', async ({ browser }) => {
  const alex = await demoPage(browser, 'Alex Rivera');
  const priya = await demoPage(browser, 'Priya Nair');
  const req = await firstOf(alex, 'requirement', (e) => !!e.statement);
  for (const p of [alex, priya]) {
    await p.goto(`/#/define/requirements/${req.id}`);
    await p.getByRole('button', { name: 'Edit', exact: true }).click();
  }
  const statement = (p: Page) => p.locator('.drawer .field').filter({ has: p.locator('label', { hasText: /^Statement/ }) }).locator('textarea, input').first();
  await statement(alex).fill('Alex wording');
  await alex.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(alex.locator('.drawer')).toBeHidden();

  await statement(priya).fill('Priya wording');
  await priya.getByRole('button', { name: 'Save', exact: true }).click();
  const conflict = priya.getByRole('alert').filter({ hasText: 'you were editing' });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText('Alex wording');
  await conflict.getByRole('button', { name: 'Save with these choices' }).click();
  await expect(priya.locator('.drawer')).toBeHidden();
  const saved = await priya.evaluate(async (id) => (await (await fetch(`/api/entities/${id}`)).json()).statement, req.id);
  expect(saved).toBe('Priya wording');
  await alex.context().close();
  await priya.context().close();
});

test('sign up, invite a teammate, and reset their password with a link', async ({ browser }) => {
  const stamp = Date.now();
  const owner = await (await browser.newContext()).newPage();
  await owner.goto('/');
  await owner.getByRole('button', { name: 'Create account' }).first().click();
  await owner.getByLabel('Your name').fill('Sam Okafor');
  await owner.getByLabel('Work email').fill(`sam.${stamp}@example.test`);
  await owner.getByLabel(/^Password/).fill('e2e-test-password-1');
  await owner.locator('form').getByRole('button', { name: 'Create account' }).click();
  await expect(owner.getByRole('navigation', { name: 'Main' })).toBeVisible();

  // Invite a teammate by link (no email server here).
  await owner.goto('/#/workspace/settings?tab=members');
  await owner.getByLabel('Email to invite').fill(`lee.${stamp}@example.test`);
  await owner.getByRole('button', { name: 'Create invite link' }).click();
  const inviteUrl = await owner.locator('.invite-link input').inputValue();

  const lee = await (await browser.newContext()).newPage();
  await lee.goto(inviteUrl);
  await lee.getByLabel('Your name').fill('Lee Moreau');
  await lee.getByLabel('Choose a password').fill('e2e-test-password-2');
  await lee.getByRole('button', { name: /^Join / }).click();
  await expect(lee.getByRole('navigation', { name: 'Main' })).toBeVisible();

  // Lee forgets the password; the owner creates a reset link.
  await owner.reload();
  await owner.getByRole('button', { name: 'Reset password' }).first().click();
  const resetUrl = await owner.getByLabel('Reset link').inputValue();

  const leeAgain = await (await browser.newContext()).newPage();
  await leeAgain.goto(resetUrl);
  await leeAgain.getByLabel('New password').fill('e2e-test-password-3');
  await leeAgain.getByRole('button', { name: 'Save and sign in' }).click();
  await expect(leeAgain.getByRole('navigation', { name: 'Main' })).toBeVisible();
  // The old password no longer works.
  const old = await leeAgain.request.post('/api/auth/login', { data: { email: `lee.${stamp}@example.test`, password: 'e2e-test-password-2' } });
  expect(old.status()).toBe(401);
  for (const p of [owner, lee, leeAgain]) await p.context().close();
});

test('the field guide: open a chapter and answer a quiz question', async ({ page }) => {
  await asDemo(page, 'Alex Rivera');
  await page.goto('/#/guide');
  await page.locator('main a[href^="#/guide/"]').first().click();
  await expect(page.locator('main h1')).toBeVisible();
  const quiz = page.locator('.quiz').first();
  await quiz.scrollIntoViewIfNeeded();
  await quiz.locator('.quiz-option').first().click();
  await expect(quiz.locator('.quiz-why')).toBeVisible();
});

test('custom fields appear in forms and on the item', async ({ page }) => {
  await asDemo(page, 'Alex Rivera');
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ custom: { fields: { requirement: [{ label: 'Vendor', kind: 'text' }] }, types: [{ label: 'Environment', fields: [{ label: 'Address', kind: 'url' }] }] } }) });
    return r.status;
  });
  expect(res).toBe(200);
  await page.goto('/#/r/ct_environment');
  await page.getByRole('button', { name: 'New environment' }).click();
  await page.getByLabel(/^Title/).fill('Production (EU)');
  await page.getByLabel('Address').fill('prod.example.com');
  await page.getByLabel('Address').blur();
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('link', { name: 'Production (EU)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'prod.example.com' })).toHaveAttribute('href', 'https://prod.example.com');
});

#!/usr/bin/env node
// Throughline CLI — capture, brief, search, prep and spec linting from the terminal.
// Uses the same platform-agnostic core as the web app; `tl lint` runs fully offline.

import { readFileSync } from 'node:fs';
import { Graph } from '../core/graph.ts';
import type { Entity } from '../core/schema.ts';
import { lint, lintSummary, RULE_LABELS } from '../core/engines/lint.ts';
import { completeness, completenessScore } from '../core/engines/completeness.ts';
import { reviewSpec, ROLE_INFO } from '../core/engines/review.ts';
import { prepBrief } from '../core/engines/stakeholders.ts';
import { parseCsv, planIssueImport } from '../core/engines/importers.ts';

const URL_BASE = (process.env.TL_URL ?? 'http://127.0.0.1:4300').replace(/\/$/, '');
const TOKEN = process.env.TL_TOKEN ?? '';
const tty = process.stdout.isTTY;
const c = (code: number) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = c(31), yellow = c(33), green = c(32), dim = c(2), bold = c(1), cyan = c(36);

function parse(argv: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++; } else flags[key] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${URL_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', 'X-TL-Token': TOKEN, 'X-TL-Actor': 'cli' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new Error(`Cannot reach Throughline at ${URL_BASE}. Is the server running (npm run dev)? Set TL_URL if it runs elsewhere.`);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error(json?.error ?? `${res.status} ${res.statusText}`);
  return json as T;
}

const HELP = `${bold('tl')} — Throughline from the terminal

${bold('Usage')}
  tl capture "<text>" [--kind evidence|request|interaction|decision] [--account Contoso]
                      [--source support|sales-call|interview|…] [--from "Stakeholder name"] [--url URL]
  tl brief [--all]                 Today's brief (high and critical by default)
  tl search "<query>"              Search the whole workspace (supports type:decision, REQ-12)
  tl prep "<stakeholder name>"     Meeting prep brief for someone
  tl lint <spec.md> [--json] [--max-errors N] [--min-score S]
                                   Lint a spec offline; exits 1 when thresholds are exceeded (CI)
  tl import <export.csv> [--dry-run] [--no-bugs]
                                   Import a Jira or Azure DevOps CSV export into the backlog;
                                   re-running updates stories by key (good for a nightly job)
  tl export                        Print the workspace as JSON

${bold('Environment')}
  TL_URL    server URL (default ${URL_BASE})
  TL_TOKEN  personal access token (web app → Settings → Tokens & integrations;
            use a read & write token for capture)
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags } = parse(rest);
  switch (cmd) {
    case 'capture': {
      const text = pos.join(' ').trim();
      if (!text) throw new Error('Nothing to capture. Usage: tl capture "text"');
      const out = await call<{ entity: Entity; similar: { title: string; similarity: number }[] }>('/api/capture', {
        method: 'POST',
        body: { text, kind: flags.kind ?? 'evidence', account: flags.account, source: flags.source, from: flags.from, url: flags.url, actor: 'cli' },
      });
      console.log(`${green('✓')} Captured ${out.entity.type} ${dim(out.entity.id)}`);
      console.log(`  ${URL_BASE}/#/e/${out.entity.type}/${out.entity.id}`);
      if (out.similar.length) {
        console.log(yellow('  Similar items already exist:'));
        for (const s of out.similar) console.log(`   · ${s.title} ${dim(`(${Math.round(s.similarity * 100)}%)`)}`);
      }
      return;
    }
    case 'brief': {
      const items = await call<{ severity: string; title: string; detail?: string; area: string }[]>('/api/brief');
      const shown = flags.all ? items : items.filter((i) => i.severity === 'critical' || i.severity === 'high');
      console.log(bold(`Today — ${shown.length} of ${items.length} items${flags.all ? '' : ' (critical & high; --all for everything)'}`));
      for (const i of shown) {
        const tag = i.severity === 'critical' ? red('CRIT') : i.severity === 'high' ? yellow('HIGH') : i.severity === 'medium' ? cyan(' MED') : dim(' LOW');
        console.log(`${tag}  ${i.title}`);
        if (i.detail) console.log(`      ${dim(i.detail)}`);
      }
      return;
    }
    case 'search': {
      const q = pos.join(' ');
      const hits = await call<{ id: string; type: string; key?: string; title: string; snippet: string }[]>(`/api/search?q=${encodeURIComponent(q)}`);
      if (!hits.length) console.log(dim('No results.'));
      for (const h of hits) console.log(`${cyan(h.type.padEnd(14))} ${h.key ? `${bold(h.key)} ` : ''}${h.title}\n${' '.repeat(15)}${dim(h.snippet.slice(0, 110))}`);
      return;
    }
    case 'prep': {
      const name = pos.join(' ').toLowerCase();
      const ws = await call<{ entities: Entity[] }>('/api/workspace');
      const g = new Graph(ws.entities);
      const s = g.all('stakeholder').find((x) => String(x.name).toLowerCase().includes(name));
      if (!s) throw new Error(`No stakeholder matching "${name}"`);
      const b = prepBrief(s, g, new Date());
      console.log(bold(`Prep: ${s.name}`));
      console.log(b.headline);
      if (b.caresAbout.length) console.log(`\n${bold('Cares about')}\n${b.caresAbout.map((x) => `  · ${x}`).join('\n')}`);
      if (b.concerns.length) console.log(`\n${bold('Concerns')}\n${b.concerns.map((x) => `  · ${x}`).join('\n')}`);
      console.log(`\n${bold('Talking points')}`);
      for (const t of b.talkingPoints) console.log(`  [ ] ${t.text}`);
      if (!b.talkingPoints.length) console.log(dim('  Nothing pending — use the time to build the relationship.'));
      return;
    }
    case 'lint': {
      const file = pos[0];
      if (!file) throw new Error('Usage: tl lint <spec.md>');
      const text = readFileSync(file, 'utf8');
      const issues = lint(text);
      const summary = lintSummary(text, issues);
      const items = completeness(text);
      const comp = completenessScore(items);
      const review = reviewSpec(text);
      if (flags.json) {
        console.log(JSON.stringify({ summary, issues, completeness: { score: comp, missing: items.filter((i) => i.relevant && !i.covered) }, review }, null, 2));
      } else {
        console.log(bold(`${file}: clarity ${summary.score}/100 · completeness ${comp}% · ${summary.errors} errors, ${summary.warnings} warnings`));
        for (const i of issues.filter((x) => x.severity !== 'info')) {
          const tag = i.severity === 'error' ? red('error  ') : yellow('warning');
          console.log(`  ${dim(`${file}:${i.line}`)} ${tag} ${RULE_LABELS[i.rule] ?? i.rule}: ${i.message}${i.suggestion ? dim(` — ${i.suggestion}`) : ''}`);
        }
        const missing = items.filter((i) => i.relevant && !i.covered);
        if (missing.length) {
          console.log(bold('\n  Missing topics'));
          for (const m of missing) console.log(`  · ${m.label} — ${dim(m.question)}`);
        }
        if (review.length) {
          console.log(bold('\n  Review board'));
          for (const r of review) console.log(`  · [${ROLE_INFO[r.role].name}] ${r.severity === 'critical' ? red(r.title) : r.title}`);
        }
      }
      const maxErrors = Number(flags['max-errors'] ?? 0);
      const minScore = Number(flags['min-score'] ?? 0);
      if (summary.errors > maxErrors || summary.score < minScore) process.exitCode = 1;
      return;
    }
    case 'import': {
      const file = pos[0];
      if (!file) throw new Error('Usage: tl import <export.csv> [--dry-run] [--no-bugs]');
      const stories = await call<Entity[]>('/api/entities?type=story');
      const plan = planIssueImport(parseCsv(readFileSync(file, 'utf8')), stories, { bugsAsDefects: !flags['no-bugs'] });
      const source = { jira: 'Jira', ado: 'Azure DevOps', generic: 'CSV' }[plan.source];
      console.log(`${bold(source)} export: ${green(`${plan.creates.length} new`)}, ${plan.updates.length} updates${plan.defects.length && !flags['no-bugs'] ? `, ${yellow(`${plan.defects.length} defects`)}` : ''}`);
      for (const s of plan.skipped) console.log(dim(`  skipped ${s.count}: ${s.reason}`));
      for (const w of plan.warnings) console.log(yellow(`  ! ${w}`));
      if (flags['dry-run']) { console.log(dim('Dry run — nothing written.')); return; }
      const ops = [
        ...plan.creates.map((data) => ({ op: 'create', type: 'story', data })),
        ...plan.updates.map((u) => ({ op: 'update', id: u.id, data: u.data })),
        ...(flags['no-bugs'] ? [] : plan.defects.map((data) => ({ op: 'create', type: 'defect', data }))),
      ];
      for (let i = 0; i < ops.length; i += 500) await call('/api/batch', { method: 'POST', body: ops.slice(i, i + 500) });
      console.log(green(`✓ ${ops.length} changes written`));
      return;
    }
    case 'export': {
      console.log(JSON.stringify(await call('/api/export'), null, 2));
      return;
    }
    case undefined: case 'help': case '--help': case '-h':
      console.log(HELP);
      return;
    default:
      throw new Error(`Unknown command "${cmd}".\n\n${HELP}`);
  }
}

main().catch((err) => {
  console.error(red(`✗ ${(err as Error).message}`));
  process.exitCode = 1;
});

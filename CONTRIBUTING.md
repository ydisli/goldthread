# Contributing to Throughline

Thanks for helping. Throughline is for product owners and business analysts, so contributions from people who do that work are as valuable as code. That includes bug reports, reports from trying an integration for real, Field Guide corrections and accessibility testing.

## The most useful things right now

1. **Try an integration against the real service** and report what happened, using the "Tried it with a real service" issue template. Email, SSO, Jira, Azure DevOps, Slack, Teams, inbound email and AI providers have only been tested against local stand-ins.
2. **Screen-reader and zoom testing.** See [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).
3. **Translations.** The interface and the Field Guide are English-only. If you'd like to translate, open an issue first so we can agree on how strings are extracted.
4. **Field Guide feedback** from working POs and BAs. Tell us where the advice is wrong, missing or too generic.

## Getting set up

You need Node.js 24 or newer.

```bash
npm install
npm run dev          # http://127.0.0.1:4300, with one-click demo accounts
```

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript over everything |
| `npm test` | Unit and integration tests: engines, server, accounts, integrations against local stand-ins |
| `npm run build && npm run e2e` | Browser tests and accessibility scans in Chromium (run `npx playwright install chromium` once, or set `TL_E2E_CHROMIUM` to an installed Chromium) |
| `npm run seed` | Put the demo workspace back to how it started |

## How the code is organised

```
core/       Everything that doesn't need a server: the schema, the graph, and the analysis engines.
            Runs in Node and the browser. No dependencies.
server/     HTTP server, accounts and roles, one SQLite file per workspace, REST, live updates,
            MCP, email, SSO, integrations.
web/        The React app.
book/       The Field Guide in Markdown.
cli/  mcp/  extension/   The other ways in.
e2e/        Browser tests.
```

Read [docs/CONCEPT.md](docs/CONCEPT.md) for why it's shaped this way, and [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the architecture.

## Principles

- **Deterministic first.** Every check and analysis works without AI and can explain its answer. AI is an optional extra layer, and it only proposes; people decide.
- **Few dependencies.** The server uses Node's built-ins (`node:sqlite`, `node:crypto`, `node:http`, native TypeScript). Adding a runtime dependency needs a good reason.
- **Plain, specific words in the interface.** Write "3 stories have no acceptance criteria", not "Validation issues detected". Say what happened and what to do next. Explain jargon on first use. Don't use exclamation marks or hype.
- **Accessible by default.** Every control has a label. Everything works with a keyboard. Colour is never the only signal. The axe scan in `e2e/a11y.spec.ts` must stay clean.
- **Nothing lost by accident.** Deletes are soft, edits are attributed, and conflicting edits ask instead of overwriting.
- **Tests sit next to behaviour.** Engines get unit tests in `core/test`, server behaviour gets tests in `server/test` (the in-process harness makes them quick), and user journeys go in `e2e/`. Test external services against a local stand-in (see `server/test/standin.ts`), never against the real thing.

## Pull requests

- Keep each PR to one change, and say why it's needed as well as what it does.
- Run `npm run typecheck && npm test`, and `npm run e2e` if you touched the web app.
- If behaviour changes, update the Field Guide chapter or docs page that describes it.
- Don't include real customer data, names or credentials in code, tests, fixtures or screenshots. The samples use fictional companies.

## Licences

- Code is licensed under [Apache-2.0](LICENSE).
- The Field Guide (`book/`) is licensed under [CC BY 4.0](book/LICENSE.md).

By submitting a contribution, you agree it's licensed under the same terms as the part of the project it changes.

## Conduct

Everyone in this project follows the [code of conduct](CODE_OF_CONDUCT.md).

# Running Goldthread for a team

Goldthread is one Node.js process with its data in one folder. It runs on a laptop, on a small VM or in a container. This guide covers what a team server needs.

> **Status.** The production start (`npm run build && npm start`) is covered by the browser tests. The Docker image and the Caddy example have **not been built or run yet**. Email, single sign-on, Jira, Azure DevOps, Slack, Teams and inbound email are tested only against local stand-ins of those services, not against the real ones. See [What has been tested](#what-has-been-tested).

## 1. Requirements

- **Node.js 24 or newer.** Goldthread uses Node's built-in TypeScript support and SQLite, so there is no database server to run and nothing to compile on the server side.
- About 200 MB of disk for the app and its dependencies, plus your data.
- **HTTPS in front of it** for anything other than your own machine (see step 4).

## 2. Install and start

```bash
git clone <your fork or the release> goldthread && cd goldthread
npm ci
npm run build
GT_PUBLIC_URL=https://goldthread.example.com GT_SIGNUP=invite-only npm start
```

The first person to create an account gets a personal workspace and can create team workspaces from the switcher at the top of the sidebar. If you set `GT_SIGNUP=invite-only`, create the first account before you switch it on, or start once with `GT_SIGNUP=open`.

**Demo accounts are off unless you ask for them.** `npm start` sets `GT_DEMO=0`, so the ServiceHub demo workspace and its one-click accounts cannot be used. `npm run dev` turns them on for local evaluation.

## 3. Configuration

Everything is set with environment variables. All of them are optional.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `4300` | Port to listen on |
| `HOST` | `127.0.0.1` | Interface to bind. Use `0.0.0.0` in a container. Keep `127.0.0.1` behind a reverse proxy on the same machine. |
| `GT_DATA` | `./data` | Where everything is stored (see step 5) |
| `GT_PUBLIC_URL` | `http://HOST:PORT` | The address people use. **Set it on a server.** It is used in links in emails, invite and reset links, and the SSO callback. |
| `GT_SIGNUP` | `open` | `invite-only` means people can only join through an invite link or SSO |
| `GT_DEMO` | `0` (`1` under `npm run dev`) | `1` turns on the demo workspace and its one-click accounts. Never use it on a shared server. |
| `GT_SMTP_URL` | not set | Turns email on (see [Email](#email)) |
| `GT_MAIL_FROM` | `Goldthread <goldthread@HOST>` | The From address |
| `GT_SMTP_INSECURE` | not set | `1` lets mail go to a relay that offers no TLS. Only for a relay on a trusted network. |
| `GT_OIDC_ISSUER`, `GT_OIDC_CLIENT_ID`, `GT_OIDC_CLIENT_SECRET`, `GT_OIDC_NAME`, `GT_OIDC_DOMAINS` | not set | Turn single sign-on on (see [Single sign-on](#single-sign-on)) |
| `ANTHROPIC_API_KEY` | not set | Server-wide default key for Claude. Each workspace can also save its own key, or choose another provider, under **Settings → AI**. |
| `GT_MODEL` | `claude-opus-5-5` | Default Claude model |

### Email

Without email, Goldthread still works: admins copy invite and reset links and share them by hand, and notifications appear only in each person's Inbox.

To turn email on, point it at any SMTP server, such as your company relay, Microsoft 365, Google Workspace, Postmark, SES, Mailgun or SendGrid:

```bash
GT_SMTP_URL=smtp://user:password@smtp.example.com:587   # STARTTLS
GT_SMTP_URL=smtps://user:password@smtp.example.com:465  # TLS from the start
GT_MAIL_FROM="Goldthread <goldthread@example.com>"
```

Goldthread will then email invites, password reset links ("Forgot password?" appears on the sign-in page), @mentions, sign-off requests and an optional weekly digest. Each person chooses which of these they get under **Settings → Profile → Notifications**. Mail is queued and retried, and admins can send a test message and see recent sends under **Settings → Workspace**.

If the SMTP server doesn't offer encryption, Goldthread refuses to send a password over it.

### Single sign-on

Goldthread supports any OpenID Connect provider, including Microsoft Entra ID, Okta, Google Workspace, Auth0 and Keycloak. It uses the authorization-code flow with PKCE and verifies the ID token signature against the provider's published keys.

1. Register an application (a "web" app) with your provider. Set its redirect URI to `GT_PUBLIC_URL` + `/api/auth/oidc/callback`, for example `https://goldthread.example.com/api/auth/oidc/callback`.
2. Set:
   ```bash
   GT_OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0
   GT_OIDC_CLIENT_ID=<application id>
   GT_OIDC_CLIENT_SECRET=<secret>        # leave out for public clients
   GT_OIDC_NAME=Microsoft                # the button says "Continue with Microsoft"
   GT_OIDC_DOMAINS=example.com           # optional: only these email domains may sign up through SSO
   ```
3. Restart. The sign-in page shows the SSO button.

Someone who already has an account with the same verified email address is signed in to that account. New people get an account if signup is open or their domain is in `GT_OIDC_DOMAINS`. Access to team workspaces still comes from invites.

### AI

AI is optional; every check and analysis also works without it. Admins choose a provider for each workspace under **Settings → AI**: Claude, any OpenAI-compatible endpoint (including a local Ollama or LM Studio), or none. Keys are encrypted at rest with `data/secret.key` and are never sent back to the browser. Emails, phone numbers and account numbers are redacted before text leaves the server.

### Integrations

Jira Cloud, Azure DevOps, Slack, Microsoft Teams and inbound email are set up per workspace by an admin under **Settings → Jira, ADO & more**. Each card shows the exact URLs to paste into the other system and has a **Test** button. Credentials are encrypted like AI keys. Jira and Azure DevOps sync on a schedule you choose (checked every five minutes) and on demand from the backlog.

These integrations need your server to be reachable from the internet:

- the Slack slash command;
- the Teams outgoing webhook;
- inbound email.

Jira and Azure DevOps sync, and posting to Slack or Teams, only need outbound access.

## 4. HTTPS and a reverse proxy

Run Goldthread on `127.0.0.1` and put a reverse proxy in front of it to handle HTTPS:

**Caddy** (automatic certificates):

```
goldthread.example.com {
  reverse_proxy 127.0.0.1:4300
}
```

**nginx:**

```nginx
location / {
  proxy_pass http://127.0.0.1:4300;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_http_version 1.1;
  proxy_buffering off;            # live updates use server-sent events
  proxy_read_timeout 1h;
  client_max_body_size 30m;       # attachments are limited to 25 MB
}
```

Session cookies are `HttpOnly` and `SameSite=Lax`. Behind HTTPS they are also marked `Secure`.

### Docker

Use the `Dockerfile` and `docker-compose.yml` (Goldthread plus Caddy) as a starting point. **Neither has been built or run yet**, so try them on a test machine first:

```bash
docker compose up -d   # after setting your domain and GT_PUBLIC_URL in docker-compose.yml
```

The image runs as the unprivileged `node` user, keeps its data in the `/data` volume, has demo accounts off, and has a health check on `/api/health`.

## 5. Data, backups and restore

Everything lives in `GT_DATA`:

| Path | What |
|---|---|
| `system.db` | Accounts, sessions, workspaces, memberships, invites, hashed API tokens, the email queue, encrypted AI and integration settings |
| `workspaces/<id>.db` | One SQLite file per workspace: its items and its full activity history |
| `files/<workspace>/` | Uploaded attachments |
| `secret.key` | The key that encrypts stored AI keys and integration credentials. **Without it, those settings can't be read**; everything else is unaffected. |

**Back up while it runs:**

```bash
npm run backup -- /backups/goldthread-2026-10-26
```

This uses SQLite's online backup, so the copy is consistent even while people are working. It also copies the key and the uploaded files, and it refuses to write into a folder that isn't empty. Run it from cron, for example nightly, and keep the copies somewhere else. They contain everything, including `secret.key`, so protect them like the server itself.

**Restore:** stop the server, replace the contents of `GT_DATA` with a backup folder, and start it again.

**People can also take their own data:** **Settings → Profile → Your data** downloads everything about a person, and **Settings → Data** exports a whole workspace as JSON.

## 6. Upgrades

```bash
git pull            # or unpack the new release
npm ci && npm run build
# restart the process
```

Database changes are applied automatically when the server starts. Take a backup before upgrading.

## 7. Operator tasks

| Task | How |
|---|---|
| Someone is locked out and email is off | `npm run reset-password -- someone@example.com` prints a one-time reset link (valid 24 hours). Workspace admins can also create one under **Settings → People & access**. |
| Remove a person | An admin removes them from the workspace. People can delete their own account under **Settings → Profile**. Their comments stay, attributed to "Former member". |
| Recover a deleted item | **Settings → Data → Recently deleted**. Deletes are never final. |
| Health check | `GET /api/health` returns `{ "ok": true }` |

## What has been tested

| Area | Tested how | Not yet tested against |
|---|---|---|
| Web app, accounts, roles, invites, password reset, workspace data | Unit, integration and browser tests (`npm test`, `npm run e2e`) |: |
| Production start (`npm start`) | Browser tests run against it |: |
| Email (SMTP, STARTTLS, AUTH) | A local SMTP stand-in | Real providers (Microsoft 365, Google, SES, Postmark…) |
| Single sign-on (OIDC + PKCE, JWKS) | A local identity-provider stand-in | Entra ID, Okta, Google, Auth0, Keycloak |
| Jira Cloud and Azure DevOps sync | Local stand-ins of both REST APIs | Real Jira Cloud and Azure DevOps organisations |
| Slack and Teams (posting, slash command, outgoing webhook, signatures) | Local stand-ins | Real Slack and Teams workspaces |
| Inbound email (Postmark/Mailgun-style webhooks) | Requests in the formats those services document | Real Postmark, Mailgun or SendGrid accounts |
| Claude and OpenAI-compatible AI | A local stand-in of each API | Live model calls |
| Docker image and Caddy example | Not built |: |

If you connect one of these for real, expect to fix a few things: the stand-ins follow each provider's documentation, and real services rarely match it exactly.

# Security

## Reporting a vulnerability

Please report vulnerabilities **privately**, not in a public issue. Use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**.

Include what an attacker could do, the steps to reproduce, and the version or commit you tested. You should hear back within a week. We'll work with you on a fix and credit you in the release notes, unless you'd rather not be named.

## Supported versions

Only the latest release gets security fixes.

## How Goldthread protects data

- **Passwords** are hashed with scrypt. After eight failed sign-ins to one account from one address, further attempts are refused for a minute.
- **Sessions** are random tokens in `HttpOnly`, `SameSite=Lax` cookies, marked `Secure` behind HTTPS.
- **API tokens** are stored only as SHA-256 hashes. Each one is scoped to read or write, and never exceeds its owner's role in the workspace.
- **Roles** (owner, admin, editor, viewer) are checked by the server on every request, per workspace.
- **Stored secrets** (AI keys, Jira, Azure DevOps, Slack and Teams credentials) are encrypted with AES-256-GCM using `data/secret.key`, and are never sent back to the browser.
- **Inbound webhooks** are verified: Slack with its signing secret and a five-minute replay window, Teams with its HMAC, inbound email with a long random token compared in constant time.
- **Single sign-on** uses the authorization-code flow with PKCE, state and nonce. The ID token's signature, issuer, audience and expiry are all verified.
- **Uploads** are limited to 25 MB and served with `X-Content-Type-Options: nosniff`. Only images, PDFs and plain text open in the browser; everything else downloads, so an upload can't run as a page on the Goldthread site.
- **AI:** emails, phone numbers and account numbers are redacted before text is sent to an AI provider. AI only proposes changes; a person applies them.
- **Deletes** are soft, and every change is attributed in an append-only activity trail.

The server binds to `127.0.0.1` by default. Put it behind HTTPS before exposing it (see [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)).

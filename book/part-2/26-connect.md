---
id: connect
title: Connecting AI assistants and other tools
part: tool
minutes: 13
summary: Adding Claude or another model to your workspace, letting your own AI assistant work with Throughline over MCP, personal tokens, the command line, the browser extension, the REST API and keeping data safe.
tools: [ask, specs, signals, backlog]
---

Throughline is designed to sit among the tools you already use rather than replace them. This chapter covers the two ways AI fits in, and the ways to get information in and out from the terminal, the browser and other systems.

## Two ways to use AI

There are two distinct ways AI can work with Throughline, and you can use either, both or neither.

1. **AI inside Throughline.** An admin connects a model provider to the workspace. Throughline then uses it for the **Review board** in Spec Studio and for answering questions in **Ask**, grounded in your workspace's items, with citations.
2. **Your assistant, using Throughline.** You connect your own AI assistant (Claude Desktop, Claude Code, Cursor, VS Code or any client that supports the Model Context Protocol) to Throughline. Your assistant can then search your workspace, prepare you for meetings, check specs, run forecasts and, if you allow it, capture and update items, all from the conversation you're already having.

Without any AI connected, everything in Throughline still works. Every analysis (linting, completeness, contradictions, review board, forecasts, decision tables, traceability) has a built-in engine that runs without a model.

## AI inside Throughline

Admins set this up in **Settings → AI**. Choose a provider:

- **Claude (Anthropic):** paste an Anthropic API key and choose a model.
- **OpenAI-compatible:** any service that speaks the OpenAI API format. Presets fill in the address for **OpenAI**, **Azure OpenAI**, **OpenRouter** and local models through **Ollama** or **LM Studio**. Local models keep everything on your own machine or network.
- **None:** built-in engines only.

Click **Test** to check the connection. Keys are encrypted at rest on the server and never shown again after saving. The setting applies per workspace, so a sensitive workspace can stay on a local model, or none.

### What gets sent

When the review board or Ask uses a model, Throughline sends only the relevant items (the spec being reviewed, related requirements and decisions, or the items most relevant to the question), and **redacts personal data** first: email addresses, phone numbers and bank account numbers are replaced before anything leaves the server. Check what your organisation allows before enabling a cloud provider, and prefer local models for sensitive workspaces.

## Your assistant, using Throughline (MCP)

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants use tools. Throughline is an MCP server. Connect your assistant once and you can say things like:

- *"What's waiting on me in ServiceHub today?"*
- *"Prepare me for my meeting with Daniel Brooks."*
- *"Check the access request portal spec for vague wording and missing sections."*
- *"When will the JML bet be done, at 85% confidence?"*
- *"What would changing REQ-4 affect?"*
- *"Which requirements have no tests?"*
- *"Review the new-hire onboarding to-be process."*
- *"Capture this as a signal from the service desk: warehouse scanners time out during unlock."*
- *"Create a decision record for what we just agreed."*

### Tools your assistant gets

| Tool | What it does |
|---|---|
| `search` | Search everything, with the same syntax as ⌘K |
| `get_item` | Read an item with its links |
| `list_items` | List items of a type |
| `workspace_schema` | Item types and their fields |
| `daily_brief` | What needs attention today |
| `prepare_meeting` | Meeting prep for a stakeholder |
| `forecast` | Monte Carlo forecast for a bet |
| `impact_analysis` | What a change would ripple into |
| `traceability_gaps` | Requirements missing stories, tests or releases |
| `lint_spec` | Check a spec's wording and completeness |
| `check_process` | Review a process model |
| `generate_document` | PRD, BRD, PR/FAQ, steering pack, release notes or stakeholder update |
| `capture` | Quickly capture a signal, request, interaction, decision, risk or idea (write token) |
| `create_item`, `update_item` | Create or change items (write token) |

Your assistant only gets what your role allows, and write tools need a token with write access.

### Setting it up

1. Open **Settings → Tokens & integrations** and create a **personal access token** for the workspace. Choose **read** (search, prepare, check) or **read & write** (also capture and update). Copy it; it's shown once.
2. Under **AI assistants (MCP)**, copy the snippet for your client. The snippets already include your server address and token:
   - **Claude Desktop:** add the snippet to `claude_desktop_config.json` (Settings → Developer → Edit config) and restart Claude Desktop. It uses a small bridge that ships with Throughline.
   - **Claude Code:** run the one-line `claude mcp add` command.
   - **Any client that supports Streamable HTTP** (Cursor, VS Code and others): use the server URL ending in `/mcp` with the Authorization header.
3. Ask your assistant something simple, such as *"Search ServiceHub for mailbox retention."*

> [!example] At Ashgrove
> Jordan keeps Claude open while writing the access request portal spec. After each section, Jordan asks Claude to run `lint_spec` on the draft and to list exceptions the approval routing might miss. Claude suggests the absent-approver case and an approver who is also the requester; Jordan adds both to the decision table. When the weekly steering meeting comes round, Alex asks Claude for the steering pack and a summary of what changed since last week.

> [!trap] Letting the assistant decide
> An assistant connected to your workspace knows your items, but not your stakeholders' moods, the politics or the hallway conversation from this morning. Use it to gather, check and draft. The decisions, priorities and promises stay yours ([Chapter 16](guide:growing)).

## Tokens

Personal access tokens let tools act as you in one workspace:

- **Read** tokens can search and read. Viewers can create these.
- **Read & write** tokens can also create and change items. They need editor access or above.
- Tokens are tied to you and to one workspace, and everything done with them is recorded in the activity trail as you (with the tool named).
- Create one token per tool so you can revoke them separately. Revoke unused tokens.

## Command line

The `tl` command-line tool works with the same server:

```bash
export TL_URL=https://throughline.example.com
export TL_TOKEN=tl_…
tl brief                                   # today's brief
tl search "mailbox retention"              # search everything
tl prep "Daniel Brooks"                    # meeting prep
tl capture "Scanner unlock times out" --source support
tl lint spec.md --max-errors 0             # check a spec offline; fails CI if it has errors
tl import jira-export.csv                  # import or refresh the backlog from Jira / ADO
tl export > backup.json                    # the whole workspace as JSON
```

Two uses are worth highlighting. **`tl lint`** runs fully offline, so you can check specs kept in a Git repository as part of a CI pipeline and fail the build when they contain errors. **`tl import`** can run on a schedule (a nightly job, say) so the backlog, defects and resolved dates stay current without anyone clicking import.

## Browser extension

The browser extension (Chrome and Edge) captures evidence from any web page. Highlight text in a ticket, a forum post, a webmail message or a survey result, click the extension, choose the source, and it lands in **Signals** with a link back to the page. Configure it with the server address and a read & write token in its options.

## REST API

Everything is also available over a simple HTTP API with the same token: read items, search, get the daily brief, and post captures. The **Tokens & integrations** page shows a ready-made example. Use it to send signals from a monitoring alert, a survey tool or a service desk webhook.

## Keeping data safe

- **Least privilege:** read tokens for read-only uses; write tokens only where needed.
- **One token per tool,** revoked when no longer used.
- **Local models** for sensitive workspaces, or no AI provider at all.
- **Personal data** is redacted before model calls, but don't rely on that alone: keep personal data you don't need out of the workspace in the first place.
- **Everything is logged.** The activity trail shows changes made by tokens, assistants and imports as clearly as changes made in the app.

> [!try]
> Create a read token in **Settings → Tokens & integrations**, connect Claude Code or Claude Desktop with the snippet, and ask: *"Using Throughline, what's waiting on me today, and who am I overdue to talk to?"*

## Check yourself

```quiz
Q: Your workspace holds sensitive HR data and policy forbids sending it to cloud AI services. What can you still use?
- Nothing involving AI or analysis
- * All built-in analyses, and optionally a local model through Ollama or LM Studio
- Only the review board
- Cloud AI with redaction switched on
Why: Every analysis has a built-in engine that needs no model, and a local OpenAI-compatible model keeps data on your own infrastructure. Redaction helps but doesn't override policy.
```

```quiz
Q: You want Claude Desktop to search your workspace and capture signals for you. Which token do you need?
- A read token
- * A read & write token, because capturing creates items
- An admin token
- No token; MCP doesn't need one
Why: Reading and searching only need read access, but capture, create and update are write tools. Tokens act as you, within your role.
```

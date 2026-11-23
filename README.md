# Paradigm

An AI-first, node-based workflow whiteboard. You draw a flow of steps (a prompt,
an AI step, a terminal command, a review gate, a page preview…), wire them
together, and run it. Agent steps run on real agent harnesses on the server:
our own agent built on [Pi](https://github.com/earendil-works/pi), the Claude
Agent SDK, Codex, or any agent that speaks the Agent Client Protocol.

This repository restores the design draft in `design/` as a working app with a
frontend and a server. See [docs/STATUS.md](docs/STATUS.md) for what matches
the draft today and what is still to come.

## Run it

```bash
npm install
cp .env.example apps/server/.env   # optional: add keys to turn real services on
npm run dev                        # server on :8787, web on :5173
```

Open http://localhost:5173. Create an account, or choose **Skip for now** to
work as a guest. Without any keys everything still runs: agent steps, the
toolbar chat, images and the terminal answer with stand-ins that say they are
simulated, and why.

For a single process that serves the built web app:

```bash
npm start          # builds apps/web, then serves it and the API on :8787
```

## What is where

| Path | What it is |
| --- | --- |
| `packages/shared` | Everything both sides use, in TypeScript: board geometry, node types and wiring rules, the board file format, document parsing and previews, templates, the market manifest check, harness event mapping, the run engine (`executeNode`), and the API contract. |
| `apps/server` | Fastify + SQLite. Accounts and sessions, workspaces, members and invites, boards with autosave and conflict checks, node pins, agent runs (streamed), permissions, the sandbox, the HTTP proxy, images and videos, Office export, the node market and its MCP server. |
| `apps/web` | React + Vite. Sign in, the workspace home, the whiteboard with live editing, and read-only view links (`/v/<token>`, `/embed/<token>`). |
| `packages/board` | `@paradigm/board`: the same whiteboard as a React component that shows a board file in your own product, with no server (the share dialog's "In your app"). See its README. |
| `design/` | The design draft this was built from: the three pages and the canvas, unchanged (see `design/README.md`). |
| `docs/` | `STATUS.md`, where the app stands against the design, and `technical-notes.md`, the design's technical doc. |
| `scripts/dc-to-jsx.py` | Carries the draft's markup into React components (`apps/web/src/views`). Run `npm run views` after changing a draft page. |
| `scripts/port-board.py` | Builds the whiteboard's logic (`apps/web/src/board/Board.tsx`) from the draft's own board class, swapping the methods the draft only simulated for the ones in `scripts/board-overrides`, which talk to the server. `Board.tsx` is generated: change an override and run `npm run board`. |

## Agents

| Node | Harness | Real when | Permissions |
| --- | --- | --- | --- |
| AI step | Our agent on Pi (`@earendil-works/pi-agent-core`) | Any of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | Every tool call passes `beforeToolCall`; "ask first" waits for the person |
| Claude | Claude Agent SDK | `ANTHROPIC_API_KEY` and `npm run agents:install` | A `PreToolUse` hook allows, denies or asks per call |
| Codex | The Codex app-server that ships with the Codex SDK | `OPENAI_API_KEY` and `npm run agents:install` (or `CODEX_BIN`) | Codex asks before each command or file change it needs approval for, and the board answers or asks the person (see `apps/server/src/agents/codex.ts`) |
| ACP agent | Any ACP agent over stdio | A command for it in `ACP_AGENTS` | `session/request_permission` is answered from the board; file reads and writes stay in the board folder |

Every run streams the same events (`run`, `tool_call`, `tool_call_update`,
`permission_request`, `message`, `result`), so the board does not care which
harness did the work. The toolbar chat is our Pi agent with four board tools;
what it draws arrives as a proposal you accept or reject.

## Other services

Each turns on when its settings are present (see `.env.example`); without
them the app still works and says what is a stand-in.

| Service | Real when | Without it |
| --- | --- | --- |
| Email (sign-in links, password resets, invites) | `SMTP_URL` and `MAIL_FROM` | Links are printed in the server log, and in development shown on the page |
| Single sign-on | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` for any OpenID Connect provider. Register `PUBLIC_URL/v1/auth/sso/callback` as its redirect address | The SSO button says it is not set up |
| Images | `OPENROUTER_API_KEY` or `OPENAI_API_KEY` | A placeholder picture |
| Videos | `VIDEO_API_URL` and `VIDEO_API_KEY` for a service with the OpenAI Videos API format (POST /videos, GET /videos/{id}, GET /videos/{id}/content). OpenAI closed its own in September 2026; several gateways still offer the format | A placeholder clip |

Agents, the terminal and Python run in a per-board folder under
`PARADIGM_DATA/sandboxes`. With `PARADIGM_SANDBOX=local` commands run on the
server machine without isolation; use `docker`, or run the server itself in a
container or VM, when people you do not trust can use it.

## Checks

```bash
npm test           # shared and server tests
npm run typecheck
npm run build
```

The server tests run real agent adapters without keys: Pi with pi-ai's
scripted provider, and ACP and Codex against small stand-ins in
`apps/server/test/fixtures` that speak their protocols. Email goes to a real
SMTP server on a local port, and single sign-on and video run against local
stand-ins of a provider.

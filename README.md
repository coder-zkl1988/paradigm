# Paradigm

An AI-first, node-based workflow whiteboard. You draw a flow of steps (a prompt,
an AI step, a terminal command, a review gate, a page preview…), wire them
together, and run it. Agent steps run on real agent harnesses on the server:
our own agent built on [Pi](https://github.com/earendil-works/pi), the Claude
Agent SDK, the Codex SDK, or any agent that speaks the Agent Client Protocol.

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
| `apps/web` | React + Vite. Sign in, the workspace home and the whiteboard. |
| `design/` | The design draft this was built from. |
| `scripts/dc-to-jsx.py` | Carries the draft's markup into React components (`apps/web/src/views`). The logic that fills those views is hand-written. Run `npm run views` after changing a draft page. |

## Agents

| Node | Harness | Real when | Permissions |
| --- | --- | --- | --- |
| AI step | Our agent on Pi (`@earendil-works/pi-agent-core`) | Any of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | Every tool call passes `beforeToolCall`; "ask first" waits for the person |
| Claude | Claude Agent SDK | `ANTHROPIC_API_KEY` and `npm run agents:install` | A `PreToolUse` hook allows, denies or asks per call |
| Codex | Codex SDK | `OPENAI_API_KEY` and `npm run agents:install` | Codex exec cannot pause one command, so permissions apply before the run starts (see `apps/server/src/agents/codex.ts`) |
| ACP agent | Any ACP agent over stdio | A command for it in `ACP_AGENTS` | `session/request_permission` is answered from the board; file reads and writes stay in the board folder |

Every run streams the same events (`run`, `tool_call`, `tool_call_update`,
`permission_request`, `message`, `result`), so the board does not care which
harness did the work. The toolbar chat is our Pi agent with four board tools;
what it draws arrives as a proposal you accept or reject.

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
scripted provider, and ACP against a small ACP agent in
`apps/server/test/fixtures`.

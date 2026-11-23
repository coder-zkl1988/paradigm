# Whiteboard App: technical implementation and notes

Nov 19, 2026

> A copy of the design doc "Whiteboard App: technical implementation and notes",
> exported on 23 November 2026. The live doc is
> [on Claude](https://claude.ai/artifact/NiAAZohsJMFpEfVBUoeHev). It describes the
> design draft before the app was built, so parts of "What is real in the draft"
> and "Suggested build order" are now done; `docs/STATUS.md` has where things
> stand today.

## Summary

The draft can be built as one browser app and one backend gateway. The board, the document nodes and most market nodes run in the browser. Anything an agent does, any command and any network call goes through the gateway.

The design draft is a working prototype in three pages: Whiteboard, Workspace and Sign in. This document describes how to turn it into the product, and what in it is real today.

Decisions the draft already makes:

- **Work is done by nodes.** A flow is nodes joined by arrows, run in order. Shapes, text and stickers are plain board items.
- **One agent runtime of our own, built on Pi.** It powers the AI step node and the toolbar chat. Claude Agent SDK, Codex and ACP agents are separate node types behind the same event contract.
- **Tool calls become nodes automatically.** Each harness sends its own events; one mapping layer turns them into the tool nodes shown around an agent step.
- **Market nodes are described, not drawn.** A node is a manifest and one function. The board draws all of its UI, so every node looks the same.
- **People approve what agents change.** Board edits from the chat arrive as a proposal. Tool use follows a per-tool setting: allow, ask first or blocked.
- **The toolbar is personal.** People pin up to six nodes. Other nodes sit in the Nodes panel or the market.

## System overview

*The system overview diagram (browser, gateway, four backend parts) is in the [live doc](https://claude.ai/artifact/NiAAZohsJMFpEfVBUoeHev).*

The board, the run engine, the document nodes and the script worker need no server. Agent runs, commands, media, office export and the market go through the gateway, which hides which harness or service does the work. The agent runtime uses the board's sandbox for every file, command and browser action.

## Board data and file format

A board is one JSON document, format `flowboard` version 1. It is what autosave stores, what Download and Import use, and what the chat agent reads.

| Key | Holds |
| --- | --- |
| `format`, `version` | `flowboard`, `1`. Import refuses anything else. |
| `nodes` | Every item except arrows: workflow nodes, shapes, text, stickies, frames, stickers, pen strokes. |
| `edges` | Arrows that join two items: `from`, `to`, the sides they attach to, the wire type they carry, and an optional hand-set route (`via`). |
| `lines` | Arrows with a free end, stored by their end points. |
| `order` | Workflow node ids in run order. Derived, written for readers of the file. |
| `packages` | The manifest of every market node the board uses, so the file opens on another machine. |

A workflow node entry carries `id`, `kind: "node"`, `ntype`, position and size, its `text`, and when set `cfg` (settings), `opt` and `optName` (option group), and `device` (HTML preview width). The file also writes `type`, `step`, `inputs`, `next` and `output` for each node. These are derived on save and ignored on load.

Rules the loader enforces:

- Every node id is unique and has numeric `x` and `y`.
- A workflow node's `ntype` must be a known type. Manifests in `packages` are checked first and registered only if they pass.
- Run status, results and pending proposals are never saved. A loaded board always starts idle.

Not in the file: per-person settings. Pinned nodes, the Nodes panel contents, installed market nodes and saved library snippets are stored per device today and belong on the account in the product.

## Nodes and the run engine

There are 19 built-in node types in four groups: information, function, render and auxiliary. Each gives one wire type, and that type decides what it may connect to.

| Node | Gives | Where it runs | Default place |
| --- | --- | --- | --- |
| Prompt | text | Holds content | Toolbar |
| Reference image | image | Holds content | Nodes panel |
| Data | data | Browser: parses JSON or CSV | Nodes panel |
| Palette | tokens | Browser | Nodes panel |
| AI step | text | Backend: our agent | Toolbar |
| Claude agent, Codex agent, ACP agent | text | Backend: that harness | Market |
| Image generation | image | Backend | Nodes panel |
| Video generation | video | Backend, as a job | Nodes panel |
| Terminal | logs | Backend sandbox | Nodes panel |
| Code | data | Browser worker for JavaScript, backend for Python | Nodes panel |
| API request | data | Backend proxy | Market |
| Doc, Slides, Markdown | file | Browser | Nodes panel |
| Sheet | file | Browser | Market |
| HTML preview | page | Browser | Toolbar |
| Review gate | approval | Waits for a person | Toolbar |

**Connection rules.** Information nodes take no input. Image generation takes text, image, tokens and data. Video generation takes text and image. Terminal, Code and Sheet take text, data, logs and file. API request takes text and data. Every other node takes anything. A rejected connection restores the arrow and says why.

**How a run works**

1. Order the workflow nodes so each runs after everything that feeds it.
2. For each node, gather the results of the nodes wired into it. Information nodes are read fresh every time. Options that were set aside are skipped.
3. Run it: in the page, in the worker, or through the gateway.
4. Keep the result in memory: type, value, display text, logs, a simulated flag, and for render nodes a view to draw.
5. Mark the node done and move on. An error stops the flow and shows the message on the node.

**Special steps**

- **Review gate** pauses the flow. Approve passes its input on; Send back reruns the agent step before it.
- **Options** are AI steps in one group. They run side by side, the person keeps one, and only that result flows on.
- **Run this node** runs a single node with the current inputs.

**Implementation notes**

- Every run carries a generation counter. A result that arrives after Stop or a new run is dropped.
- Node status is one of idle, queued, running, waiting, done or error. Status and results are runtime state, never saved.
- The product should keep the last result per node on the server, so a reopened board can show it. The draft loses results on reload.

## Agent harness layer

Every agent node sends the same request and gets back the same event stream. Only the adapter behind the gateway differs, so adding a harness means one adapter and one mapping table.

| Node | Harness | Native tool events | How "ask first" reaches us |
| --- | --- | --- | --- |
| AI step, and the toolbar chat | Our own, built on [Pi](https://www.mintlify.com/pt-act/pi-mono/concepts/extensions) | `tool_execution_start`, `tool_execution_end` | Pi's `tool_call` extension event, which can block a call |
| Claude agent | [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/permissions.md) | `tool_use` messages | A `PreToolUse` hook, or the `canUseTool` callback |
| Codex agent | [Codex](https://codex.danielvaughan.com/2026/04/08/codex-exec-jsonl-reference/) | `item.started`, `item.completed`, read by `item.type` | Approval requests from the Codex app server |
| ACP agent | Any agent that speaks the [Agent Client Protocol](https://agentclientprotocol.com/protocol/tool-calls.md) | `session/update` with `tool_call` and `tool_call_update` | `session/request_permission` |

**Why our own agent sits on Pi.** Pi keeps its core small and leaves the rest to extensions. An extension can register tools with `pi.registerTool`, block a call from the `tool_call` event, and change a result from the `tool_result` event. We add what the product needs as extensions:

- Permissions: answer `tool_call` from the board's per-tool setting, and pause for the person when it says ask first.
- Tools: `subagent`, `browser`, `device`, an `mcp` bridge, the board tools used by the chat, and one `node_*` tool per installed market node.

**Tool call to node mapping.** The adapter turns each native event into a board event naming one tool node. The board draws the ring around an agent step from board events only.

| Tool node | Pi (ours) | Claude Agent SDK | Codex | ACP `kind` |
| --- | --- | --- | --- | --- |
| Folder | `read`, `write`, `edit`, `grep`, `find`, `ls` | `Read`, `Glob`, `Grep`, `Write`, `Edit`, `NotebookEdit` | `file_change` | `read`, `search`, `edit`, `delete`, `move` |
| Terminal | `bash` | `Bash` | `command_execution` | `execute` |
| Browser | `browser` | `WebFetch`, `WebSearch`, browser MCP servers | `web_search`, browser MCP servers | `fetch` |
| Phone | `device` | device MCP servers | device MCP servers | none |
| Connector | `mcp` | other `mcp__*` tools | other `mcp_tool_call` items | none |
| Sub-agent | `subagent` | `Agent` | none | none |
| Whiteboard (chat only) | `board_*` | none | none | none |
| Other tool | `node_*`, anything unknown | anything unknown | anything unknown | `other` |
| Not shown | none | `TodoWrite`, `AskUserQuestion` | `agent_message`, `reasoning`, plan updates | `think`, `switch_mode` |

Calls made by a sub-agent carry the parent call's id and are grouped under the Sub-agent node.

**The event contract the browser sees.** It follows ACP's shape, because that is the most general of the four:

- `tool_call`: id, tool node, verb, title, native tool name, raw native event, parent id.
- `tool_call_update`: id and status (`pending`, `in_progress`, `completed`, `failed`).
- `permission_request`: id, tool call id, and the options allow once, always allow, deny.
- `message` and `result`.

**Permissions.** Each tool node on a board is set to allow, ask first or blocked. Defaults: Folder, Sub-agent, Terminal and Browser allow; Connector, Phone and Other tool ask first. "Always allow" flips that tool to allow for the board.

Notes for the adapters:

- Enforce the setting on the server. The board only displays it.
- Claude Agent SDK checks hooks, then deny rules, ask rules, the permission mode and allow rules, and only then calls `canUseTool`. A tool approved earlier never reaches the callback, so gate with a `PreToolUse` hook when every call must be checked. Map blocked to a deny rule.
- ACP gives a coarse `kind`, not a tool name. Show the optional `name` when the agent sends it, and expect many calls under Other tool.
- In Codex, file reads usually appear as shell commands, so they show under Terminal, not Folder.

## Chat and the selection box

The toolbar chat is not a second assistant. It is a run of our own agent with the surface set to `chat` and four tools that work on the board.

| Board tool | Does |
| --- | --- |
| `board_read` | Reads what is on the board and what is selected. |
| `board_add_shape` | Draws a box, a decision, or a start or end shape, with its text. |
| `board_add_node` | Adds a workflow node. |
| `board_connect` | Draws an arrow between two things. |

**What the request carries.** The instruction, the board file, the selected ids, the selection box if there is one (position, size and the ids inside it), the mode, and the tool list.

**Diagram or workflow.** A board with workflow nodes gets nodes; a board with only shapes gets shapes. On an empty board the wording decides. The person can force either with the "Draws as" switch. When a selection box exists, only the items inside it are considered.

**Changes arrive as a proposal.** Each item the agent adds is flagged as proposed and drawn dashed. Accept clears the flag. Reject removes the items. Stop does the same as Reject while the run is still going, and a new request replaces a running one. Proposed items are never saved.

**The selection box.** A drag with the select tool of at least 48 px on screen leaves a box on the board and opens the prompt. The box is stored in board coordinates, so it stays put when the view pans or zooms. New items go inside it, under anything already there, wrapping to new rows at its right edge. It is removed only by a click outside it, a new drag, or loading another board.

**While it works.** A card above the chat lists each step with the native tool name. The robot stands next to the item being drawn. The whole run is one undo step.

Notes for the product:

- The draft plans a request by splitting the text into steps. In the product the agent decides the calls; the board only applies them.
- Add tools to edit, move and delete items. The draft can only add.
- Decide how proposals behave with two people on one board: who can accept, and whether others see the dashed items.

## Document nodes

Doc, Sheet, Slides, Markdown and HTML preview run fully in the browser. Whatever flows in is parsed into plain blocks, and the board draws those blocks with its own templates.

| Node | Shows | Passes on | Downloads now | Needs the server |
| --- | --- | --- | --- | --- |
| Doc | A document: headings, text, lists, tables. Word count and reading time. | The text, unchanged | .md, .html | .docx |
| Sheet | A table sorted by any column, with sums for number columns. First 500 rows, 26 columns. | Rows as data | .csv | .xlsx |
| Slides | One slide per heading, at most six items a slide, with a pager. | The text, unchanged | Outline as .md | .pptx |
| Markdown | The Markdown text. Converts a page or data into Markdown. | Markdown text | .md | none |
| HTML preview | The page at phone or desktop width, and its source. | The page's HTML | .html | none |

**Parsers to port as they are**

- Markdown: headings, paragraphs, bullet and numbered lists, quotes, code blocks, rules and pipe tables.
- HTML: a tag tokenizer, not the browser's parser. It keeps text, order, lists, tables, buttons, links, form fields and image descriptions. It reads three colours from the page's style: background, text and accent.
- Tables: a list of objects, a list of lists, a single object, CSV or TSV with quoted cells, a Markdown table or an HTML table. Plain text falls back to one row per line.

**Safety rule.** Nothing from an input is inserted as markup. The HTML parser drops scripts, style sheets, comments, embedded frames and inline handlers. Colours are accepted only as hex values.

**HTML preview in the product.** The draft shows a structured preview: text, order and colours, with no CSS layout, scripts or images. For a true rendering, load the page in a sandboxed frame served from a separate origin, with scripts off by default. Keep the structured preview as the fallback and for thumbnails on the node.

**Office files.** `POST /v1/files/export` takes the format, a title and the same blocks, rows or slides the node drew, and returns a file address. The draft's buttons call it and report that no backend is connected.

## Node market

A market node is one JSON manifest, spec `flowboard-node/1`: what it takes, what it gives back, its settings and one function. It has no markup, styles or icons of its own, so the board draws every node the same way.

| Key | Rule |
| --- | --- |
| `spec` | Always `flowboard-node/1`. |
| `id` | 3 to 32 lower-case letters, digits and single dashes. Not a built-in type name and not already taken. |
| `name`, `author`, `version`, `summary` | Name up to 28 characters, author up to 32, version like `1.0.0`, summary 10 to 120 characters. |
| `category` | `function` or `render`. |
| `sticker` | Optional. One of the board's own: tool, text, table, document, data, code, palette, web. |
| `accepts` | 1 to 4 wire types from text, data, tokens, image, video, logs, page, file. |
| `output` | One wire type. |
| `field` | Optional. One text field: a label up to 60 characters and 1 to 4 rows. |
| `options` | Optional. Up to 3 settings, each with 2 to 5 choices. The first choice is the default. |
| `preview` | `text`, `table` or `document`. How the board shows the result. |
| `runs` | `browser` (include `run`) or `backend` (leave `run` out). |
| `run` | The function body, up to 8,000 characters. The whole manifest is at most 12,000. |

**How the same look is enforced.** The manifest has no key for looks. Keys such as `html`, `css`, `style`, `icon`, `color`, `font`, `width` and `theme` are rejected with a message that says why. Labels must be plain text.

**The function.** It is the body of `function (input, inputs, console, config, text)`. `input` is the first connection's value, `inputs` maps each connected node id to its value, `config` holds the chosen settings, and `text` is what the person typed. It returns plain data. To stop with a message, it throws an error; the message is shown on the node.

**Where it runs**

- Browser nodes run in the same isolated worker as the Code node, with a 3 second limit and no access to the page, the network or storage.
- The check also rejects code that names things like `fetch`, `document`, `window`, `eval` or `localStorage`. This gives authors a clear error early. It is not the security boundary; the worker is.
- Backend nodes go through `POST /v1/market/nodes/{id}/run`. Their code is uploaded separately and never sent to the browser.

**One check, four places.** The same rules run in the editor as the author types, in the MCP `validate_node` tool, on the server when a node is published, and when a board file brings its own manifests.

**For coding agents.** People build nodes with their own agent, so the rules reach it two ways. Both are generated from the same spec the check uses.

| MCP tool | Returns or does |
| --- | --- |
| `get_node_spec` | The manifest format: every key, its limits, the wire types. |
| `get_ui_rules` | What the board draws and what a node may not bring. |
| `list_stickers` | The sticker names a node can choose. |
| `validate_node` | Every problem in a manifest, with the key it is on. |
| `preview_node` | Runs the node on sample input and returns what the board would show. |
| `publish_node` | Uploads a manifest that passes the check, under the author's account. |

The skill file tells the agent the same steps in order: read the spec, write the manifest, validate until clean, preview, and ask the person before publishing.

**Agents can use market nodes.** Installed browser nodes are offered to our own agent as tools named `node_<id>`. They appear under Other tool and ask first by default.

Notes for the product:

- A board file carries a copy of each manifest it uses. Decide what happens when a newer version is published: keep the copy, or offer an update.
- Ids need an owner. Prefix them with the author's account, or reserve names on publish.
- Plan review and takedown before opening publishing to everyone. The draft's listings are samples.

## Toolbar, Nodes panel and templates

A node lives in one of three places, and each person moves nodes between them.

| Place | Holds | Default |
| --- | --- | --- |
| Toolbar | Up to six pinned nodes, one click to place | Prompt, AI step, HTML preview, Review gate |
| Nodes panel | Nodes the person has: "On the toolbar" and "Your nodes" | Ten more built-in nodes |
| Market | Every node, ours and other people's, not yet installed first | Claude agent, Codex agent, ACP agent, API request and Sheet are market only |

Rules to keep:

- Pinning a node installs it first. Removing a node unpins it.
- A node already on a board keeps working when its type is removed from the panel.
- Opening a template installs every node it uses.
- Pin and unpin are offered in the panel, on a node's right-click menu and on its market card.

Pins, panel contents, installed market nodes and a person's own nodes are stored per device in the draft. In the product they are account settings.

**Templates.** The Workspace gallery has 16 templates: 6 engineering, 6 product design and 4 visual. Each is data: a list of nodes (id, type, text, settings) and the wires between them. Positions are worked out on load, in columns by how far a node is from the start, with 80 px gaps.

**Opening a template.** In the draft, the Workspace page mounts the whiteboard inside itself and passes the template id and a way back. The two pages cannot share storage in the design canvas, so this is the only reliable route there. In the product this becomes a normal route: the server creates a board from the template and the app opens it.

## Backend interfaces

The draft reaches the backend through one function, `backendCall(kind, body, callback)`. Replacing its body with real requests connects everything below. All calls send `Authorization: Bearer <session token>`.

| Call | Used by | Sends | Returns |
| --- | --- | --- | --- |
| `POST /v1/agent/runs` | AI step, agent nodes, chat | `harness` (pi, claude, codex or acp), `instruction`, `inputs`, `permissions`, `workspace`. Chat adds `surface`, `mode`, `board`, `selected`, `area`, `tools`. | An event stream: `tool_call`, `tool_call_update`, `permission_request`, `message`, `result` |
| `POST /v1/agent/runs/{runId}/permissions` | The same | `requestId`, `decision` (allow once, always allow or deny) | `ok` |
| `POST /v1/sandbox/exec` | Terminal | `command`, `stdin`, `timeoutSec` (30, 120 or 600) | A stream of log lines, then the exit code |
| `POST /v1/sandbox/code` | Code, when not JavaScript or when the worker is blocked | `language`, `source`, `input` | `value`, `logs` |
| `POST /v1/http/proxy` | API request | `method`, `url`, `headers`, `body` | `status`, `statusText`, `headers`, `body` |
| `POST /v1/media/images` | Image generation | `prompt`, `ratio`, `references` | `url`, `width`, `height` |
| `POST /v1/media/videos` | Video generation | `prompt`, `ratio`, `seconds`, `references` | `jobId`, `status`, `url`. Poll `GET /v1/media/videos/{jobId}`. |
| `POST /v1/files/export` | Doc, Sheet, Slides | `format` (docx, xlsx or pptx), `title`, `content` | `url` |
| `GET /v1/market/nodes` | Node market | nothing | `nodes`: a list of manifests |
| `POST /v1/market/nodes` | Node market | `manifest` | `ok`, `problems` |
| `POST /v1/market/nodes/{id}/run` | Backend market nodes | `node`, `version`, `input`, `inputs`, `config`, `text` | `value`, `logs` |

Conventions:

- Each input is `{ from, type, value }`: the source node id, its wire type and its result.
- `workspace` names the board's sandbox. One board maps to one sandbox, shared by its agent steps and its Terminal nodes.
- An error returns a message a person can act on. The board shows it on the node and stops the flow.
- The draft marks every stand-in result as simulated and shows that on the node. Keep the flag for a demo mode.

The whiteboard has a "Backend interfaces" dialog (right-click the empty board) with a "Copy contract" button. It gives this table as JSON, with one example request and response per call, the harness mapping tables and the node manifest spec.

Still to define: accounts and sessions, saving and listing boards, sharing and invites, and live collaboration. The Workspace and Sign in pages use sample data for these.

## Security notes

The product runs other people's code and lets agents act, so four boundaries carry most of the risk.

| Boundary | Risk | What to build |
| --- | --- | --- |
| Agent sandbox | An agent runs commands and edits files | One isolated sandbox per board for files, terminal and browser. No host access, limited outbound network, time and resource limits, killed on Stop. |
| Tool permissions | A tool acts outside the sandbox | Enforce allow, ask first and blocked on the server. Connectors, phone and unknown tools ask first by default. Log every answer. |
| Market code | A node's function misbehaves | Browser nodes run only in the isolated worker: no page, network or storage, 3 second limit. The server repeats the manifest check on publish. Backend nodes run in a sandbox. |
| Network proxy | API request reaches internal systems | Block private and metadata addresses. Limit size and time. Never forward the person's session. |

Other points:

- **Treat content as data.** Board text, files, web pages and tool results can contain instructions aimed at the agent. They must never change permissions. Keep ask first on anything that acts outside the sandbox.
- **Board changes need approval.** The chat's proposal step is a control, not only a convenience. Do not add a way to skip it without a per-board setting.
- **HTML is never injected.** Show pages through the structured preview, or in a sandboxed frame on a separate origin.
- **Imported boards are checked.** Unknown formats are refused, and a manifest inside a file must pass the same check as a published one.
- **Keys stay on the server.** Credentials for Claude, Codex, media services and connectors are stored per workspace and never sent to the browser.
- **Claude Agent SDK runs each session as its own process.** Plan a container per running session, and confirm this against the SDK's hosting guide for the version you adopt.

## What is real in the draft

About half of the draft already works as designed; the rest is simulated behind the one backend function, or is a placeholder that says so.

| Area | State in the draft | To finish it |
| --- | --- | --- |
| Board editing: items, arrows, undo, zoom, two languages, file download and import | Works | Port to the product codebase |
| Run order, review gates, options, run one node | Works | Keep the logic |
| Data, Palette, Code in JavaScript | Works in the browser | Keep |
| Doc, Sheet, Slides, Markdown, HTML preview | Works in the browser | Add true HTML rendering and office export |
| Market: the check, install, pin, make your own, six sample nodes | Works | Add the registry server |
| Templates: 16 flows that load and run | Works | Serve them from the backend |
| Agent steps for all four harnesses, tool nodes, permissions | Simulated: events are scripted in each harness's real format | Build the four adapters |
| Chat drawing on the board | Simulated: the plan comes from splitting the request text | Let the agent call the board tools |
| Terminal, API request, image, video, Code in Python | Simulated | Build the endpoints |
| Office export, market publishing and listing, backend market nodes, MCP server | Placeholder | Build |
| Workspace and Sign in | Sample data | Build accounts, boards list, members |

How the draft was checked: about fifteen scripted simulations run the component's logic outside a browser. They cover flows, permissions, arrows, the run engine, document nodes, the market, chat, the selection box, pins and all 16 templates. Nothing was checked by eye.

Not yet confirmed in a browser:

- The isolated worker for Code and market nodes. If the page blocks workers, these nodes fall back to a simulated result.
- File downloads and copying to the clipboard.
- Opening a template from Workspace, which mounts the whiteboard inside that page.
- Layout and spacing of the newer dialogs and of content drawn inside nodes.

## Suggested build order

Build the parts that need no backend first, then our own agent, then the other harnesses and the market. Each step leaves something a person can use.

1. **Board and storage.** Port the editor, the file format and both languages. Add accounts and saving boards on the server. Done when a board survives a reload on another device.
2. **Run engine and browser nodes.** Data, Palette, Code in the worker, and the five document nodes. Done when the "Messy CSV to a clean report" template runs up to its AI step with real results.
3. **Gateway and sandbox.** One sandbox per board. Terminal, Code in Python and the API request proxy. Done when Terminal streams a real test run.
4. **Our agent on Pi.** The adapter, the permission extension, the event contract, and the tool nodes around a step. Done when an AI step edits a file in the sandbox and "ask first" pauses it.
5. **Chat on the board.** Board tools, proposals, the selection box. Done when a typed request draws a flowchart that can be accepted or rejected.
6. **Other harnesses.** Claude Agent SDK, then Codex, then ACP. Done when the same flow runs on each and shows the same tool nodes.
7. **Media and office files.** Image and video generation, and export to .docx, .xlsx and .pptx.
8. **Market.** Registry, publishing with the server-side check, the MCP server and the skill, then backend nodes.
9. **Working together.** Sharing, members and invites, and live editing if it is in scope.

Steps 2 and 3 can run side by side. Step 8 can start after step 2, because browser market nodes need only the registry.

## Notes, risks and open questions

**Notes on the draft**

- The whiteboard is one large component of about 540 KB. Split it by area when porting: board and items, run engine, harness mapping, document nodes, market, chat.
- Every value on screen is recomputed on each change. That is fine for the draft's small boards. Large boards will need drawing only what is in view.
- Text shown to people goes through one translation table, English and Simplified Chinese. Content such as node text, template text and market listings is never translated.
- Toolbar defaults were chosen by judgment: how often a node appears in the starter flows. Record real node use and revisit them.
- The Claude and Codex nodes use our own stickers. Using the companies' logos needs their official files and permission.
- The names `flowboard` (file format, manifest spec, MCP server) are working names.

**Risks**

- **Harness interfaces change often.** Pin versions. Keep recorded event samples per harness and test each adapter's mapping against them.
- **We own what Pi leaves out.** Permission prompts, sub-agents and MCP are our extensions to build and maintain.
- **The Codex details are the least certain.** The event reference used here is a third-party page, and approvals through the app server were not confirmed. Check the official documentation before building that adapter.
- **Other people's code.** The market is safe only while browser nodes stay in the isolated worker and backend nodes stay in a sandbox.
- **Cost.** Agent, image and video runs cost money per use. The design has no budgets or limits yet.

**Open questions**

- Is live editing by several people in the first release?
- Where are run results kept, and for how long?
- Do tool permissions belong to the board, the person or the workspace?
- Who may publish to the market, and who reviews?
- Is the phone tool in the first release? It needs a device farm or a paired device.
- May the HTML preview run scripts inside its sandboxed frame?
- Which sandbox provider, and what are the limits per board?

## Sources

Everything about the product comes from the design draft itself. The four pages below were opened on 20 November 2026 for the harness facts.

- [Whiteboard App design draft](https://claude.ai/artifact/3tqinfERfp8A4VCrkwMa8F): the three pages this document describes.
- [Pi: Extensions](https://www.mintlify.com/pt-act/pi-mono/concepts/extensions): the `tool_call` and `tool_result` events and `pi.registerTool`. This is a mirror of the pi-mono documentation.
- [Claude Agent SDK: Configure permissions](https://code.claude.com/docs/en/agent-sdk/permissions.md): the order in which permissions are evaluated, and when `canUseTool` is called.
- [Agent Client Protocol: Tool calls](https://agentclientprotocol.com/protocol/tool-calls.md): the `tool_call` fields, the `kind` and `status` values, and `session/request_permission`.
- [Codex exec JSONL reference](https://codex.danielvaughan.com/2026/04/08/codex-exec-jsonl-reference/): event and item types. A third-party page; confirm against the official Codex documentation.

# Status against the design draft

All three pages of the draft are restored: Sign in, the workspace home and the
whiteboard, with a server behind every part the draft only simulated.

## How the board was carried over

- **Markup**: `scripts/dc-to-jsx.py` turns each draft page into a React view
  (`apps/web/src/views`), so spacing, colours, stickers, type and states are
  the draft's own. Run `npm run views` after changing a draft page.
- **Logic**: the whiteboard is the draft's own board class, ported method by
  method by `scripts/port-board.py` into `apps/web/src/board/Board.tsx`. The
  methods that were simulated in the draft (saving, loading, agent runs, the
  toolbar chat, the market, files, sharing, voice) are replaced by the files
  in `scripts/board-overrides`, which talk to the server. `Board.tsx` is
  generated: change an override and run `npm run board`.
- **Shared code**: node types, wiring rules, the file format, documents,
  templates and the manifest check come from `packages/shared` through
  `apps/web/src/board/draft.ts`, which maps the draft's names onto them.

## Matches the draft

- **Sign in**: sign in, create account, password rules, show/hide password,
  the robot that follows the pointer and hides its eyes, shake on errors,
  email link, forgot password, language switch, Skip for now (a guest account).
- **Workspace**: team and personal workspaces, Boards, Shared with me,
  Templates (all 16, with filters), Trash with restore, search, New board,
  the three guided flows, members, invites with roles, cancel invite, sign out,
  language switch.
- **Editing**: every tool (select, hand, shapes, arrows and lines with bend
  handles, pen, text, sticky notes, frames, stickers, nodes), the selection
  toolbar for nodes, shapes, text, stickies, arrows and multi-selections
  (style, colour, bold, italic, link, list, align, lock, comment, options,
  more), the right-click menu, cut, copy, paste and duplicate, group and
  ungroup, tidy up, layer order, nudging, keyboard connect (`C`), undo and
  redo, comments on any item, the library of saved selections, the Nodes
  panel with pins, and every keyboard shortcut in the help dialog.
- **Agent steps**: the tool-node ring that opens around an agent step, with
  sub-agents, tool counts, the permission question on the tool node (Allow
  once, Always, Deny), pause and resume, and replay and scrubbing back
  through the calls. The ring is driven by the server's run events, for
  every harness.
- **Options**: run a node as options A, B and C, compare them side by side,
  and keep one.
- **Running**: Run flow and run one node, the review gate, Code nodes running
  JavaScript in a worker, and every server-side node: terminal, Python, API
  request, image, video, market nodes. Previews and full view for Doc,
  Sheet, Slides, HTML and Markdown, with downloads and real .docx, .xlsx and
  .pptx export.
- **Panels and dialogs**: the node market (browse, installed, make your own,
  publish, the MCP config for coding agents), the inspector, the AI view
  (outline, JSON, copy, download, load a file, suggest next step), backend
  interfaces with live status, the help dialog, and the share dialog (view
  link, embed code, the "In your app" snippet).
- **Robot and voice**: the robot's moods and what it says while it thinks,
  works, waits and finishes; click the robot to talk, or dictate into the
  chat bar. Both use the browser's speech recognition.
- **Toolbar chat**: Draws as Auto / Diagram / Workflow, the agent's step
  list, the proposal with Accept and Reject, and the selection box.
- **Language**: English and Chinese for every page, including text only the
  board shows.

## Different from the draft, or not done

- **View links**: Share makes a link (`/v/<token>`) that anyone can open
  read-only, without an account. The embed code uses `/embed/<token>`, or the
  board's own address when editing is allowed (people then need access).
- **"In your app"**: the draft's snippet names a package that does not exist
  yet (`[PACKAGE NAME]`); it is shown as the draft has it.
- **Voice**: needs a browser with speech recognition (Chrome, Edge, Safari).
  Elsewhere the board says so and you type instead.
- **One person at a time**: boards save with conflict checks, but two people
  editing the same board do not see each other live.
- **Services that need settings**: email, single sign-on, images, videos and
  each agent run for real once their keys are set (see the README); until
  then they say they are stand-ins. Videos need a service with the OpenAI
  Videos API format, since OpenAI closed its own in September 2026.
- **Names**: the file format (`flowboard` v1) and the node manifest spec
  (`flowboard-node/1`) keep the draft's names, so files made in the draft open
  here.

# Status against the design draft

This is the first pass of the restoration. It covers Sign in, the workspace
home, and the core of the whiteboard, with a complete server behind them.

## Matches the draft

The markup of all three pages is carried over from `design/*.dc.html` as is,
so spacing, colours, stickers, type and states are the draft's own.

- **Sign in**: sign in, create account, password rules, show/hide password,
  the robot that follows the pointer and hides its eyes, shake on errors,
  email link, forgot password, language switch, Skip for now (a guest account).
- **Workspace**: team and personal workspaces, Boards, Shared with me,
  Templates (all 16, with filters), Trash with restore, search, New board,
  the three guided flows, members, invites with roles, cancel invite, sign out,
  language switch. Board cards show real titles, times and node counts.
- **Whiteboard**: grid and dots backgrounds, pan, zoom (wheel, buttons, fit,
  100%), snap to grid, workflow node cards with stickers, fields, previews,
  status pills and the step / in / out footer, ports and arrows with their
  type labels and running animation, connecting nodes with the wiring rules,
  moving, multi-select by box, resize, duplicate, delete, undo and redo, the
  bottom toolbar with pinned nodes (up to six), the Nodes panel with pin and
  unpin, shapes and stickers panels, text, frames, stickies, pen and arrows,
  the welcome screen with the three guided flows, the empty-board hint,
  toasts, the account bar (All boards, workspace, save state, share link,
  language, account menu).
- **Running**: Run flow and run one node, queued / running / waiting / done /
  failed states, the review gate (Approve, Send back), agent permission
  questions on the node (Allow once, Always, Deny), Code nodes running
  JavaScript in a worker, and every server-side node: terminal, Python, API
  request, image, video, market nodes.
- **Previews and full view**: Doc, Sheet (sortable, sums), Slides (pager,
  thumbnails), HTML preview (phone and desktop, source), Markdown; downloads
  (.md, .html, .csv) and real .docx, .xlsx and .pptx export.
- **Toolbar chat**: Draws as Auto / Diagram / Workflow, the agent's step list,
  the proposal with Accept and Reject, and the selection box that asks what
  to build inside it.

## Not yet, or different

- **Next pass**: the robot assistant and voice input, the tool-node ring that
  opens around an agent step (tool calls are shown on the node for now),
  arrow bend handles, the formatting toolbar for text, shapes and stickies,
  the right-click menu, comments, group and tidy up, options A/B/C
  comparison and "keep one" (options run side by side today, but there is no
  compare view yet).
- **After that**: the node market screens (the server side, publishing and
  the MCP server are done), the AI view panel, the inspector, the backend
  interfaces dialog, the help dialog, the share dialog (Share copies the
  board link for now), and Chinese for text that only the board shows.
- **Server gaps**: single sign-on answers "not set up"; email is printed to
  the server log instead of sent; video generation has no provider yet, so
  video nodes return stand-ins; Codex permissions apply per run, not per call.
- **Names**: the file format (`flowboard` v1) and the node manifest spec
  (`flowboard-node/1`) keep the draft's names, so files made in the draft open
  here.

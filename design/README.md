# Design

The design draft the app is built from: the "Whiteboard App" design on Claude
([open it](https://claude.ai/artifact/3tqinfERfp8A4VCrkwMa8F)). These files are
the design's own, unchanged; they match it as of 23 November 2026.

| File | Page in the design |
| --- | --- |
| `Main.dc.html` | 1 · Whiteboard (opens first, no sign-in) |
| `SignIn.dc.html` | 2 · Sign in (only to share) |
| `Workspace.dc.html` | 3 · Workspace home |
| `canvas.json` | How the three pages sit on the design canvas |

Each page is markup plus the page's own logic. The app is generated from them:

- `npm run views` turns each page's markup into a React view in `apps/web/src/views`.
- `npm run board` ports the whiteboard's logic from `Main.dc.html` into
  `apps/web/src/board/Board.tsx`, with the parts the draft only simulated
  replaced by `scripts/board-overrides`.

So when the design changes, copy the new page here and run both commands.

The design doc that goes with it, "Whiteboard App: technical implementation and
notes", is in [`docs/technical-notes.md`](../docs/technical-notes.md).

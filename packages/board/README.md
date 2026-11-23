# @paradigm/board

Paradigm's whiteboard as a React component. It shows a board file
(`.flowboard.json`, as Paradigm downloads it) inside your own product, with no
account and no server, and hands back each change.

```bash
npm install @paradigm/board
```

```tsx
import { Board } from '@paradigm/board';
import file from './board.flowboard.json';

// Editable: you keep the file.
<Board file={file} onChange={save} />

// Read only, without toolbars.
<Board file={file} readOnly toolbar={false} />
```

| Prop | | |
| --- | --- | --- |
| `file` | required | A parsed board file |
| `onChange` | optional | Called with the new board file after each change. Without it the board is read only |
| `readOnly` | `false` | Show the board without any way to change it |
| `toolbar` | `true` | `false` hides the toolbars |
| `lang` | `'en'` | `'en'` or `'zh'` |
| `height` | `480` | Height of the board's box; it always fills the width |

Everything you can do to a board in the app works here: notes, shapes,
arrows, frames, stickers, nodes and their settings, undo, comments, the AI
view. Steps that run on a server (AI steps, the toolbar chat, the terminal,
API requests, images and video) say so when you run them; open the board in
Paradigm to run those.

React 18 or newer is a peer dependency. The styles come with the component.

## Building

From the repository root: `npm run build -w packages/board`. The package is
the app's own board (`apps/web/src/board`), built as one ES module.

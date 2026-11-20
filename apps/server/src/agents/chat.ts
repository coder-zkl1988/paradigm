// The toolbar chat: our built-in agent with tools that work on the board. It
// never changes the board itself: what it draws comes back as a proposal the
// person accepts or rejects. Without a model key, planChat() makes the same
// kind of proposal from the wording alone.

import type { AgentRunRequest, BoardItem, ChatRequest, NodeItem, ShapeItem } from '@paradigm/shared';
import { GRID, NODE_BY, NODE_DEFS, bounds, canTake, clipText, fromFile, index, itemText, mkEdge, planChat, tr, type ToolEvent } from '@paradigm/shared';
import type { Run } from './run';
import type { AdapterContext } from './types';
import type { PiTool } from './tools';
import { runPi } from './pi';

export interface Proposal { note: string; fit: boolean; items: BoardItem[] }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const snap = (v: number) => Math.round(v / GRID) * GRID;

export function boardItems(board: unknown): BoardItem[] {
  if (Array.isArray(board)) return board.filter((o) => o && typeof o === 'object' && typeof (o as BoardItem).id === 'string') as BoardItem[];
  if (board && typeof board === 'object' && (board as { format?: string }).format === 'flowboard') return fromFile(board);
  return [];
}

function idMaker(items: BoardItem[]) {
  const used = new Set(items.map((o) => o.id));
  return (p: string) => { let n = 1; while (used.has(p + n)) n++; used.add(p + n); return p + n; };
}

const boardEvent = (tool: string, line: string): ToolEvent => ({ res: 'board', op: tool === 'board_read' ? 'read' : 'write', tpl: '', arg: line, tool, target: 'board' });

export async function simulateChat(run: Run, req: AgentRunRequest, stepMs: number): Promise<Proposal> {
  const chat = req.chat as ChatRequest, items = boardItems(chat.board), byId = index(items);
  const selIt = chat.selected?.length === 1 ? byId[chat.selected[0]] || null : null;
  const plan = planChat(chat.mode, req.instruction, items, byId, selIt, idMaker(items), chat.area);
  const added: BoardItem[] = [];
  let n = 0;
  for (const c of plan.calls) {
    const id = 'chat_' + ++n;
    await sleep(stepMs);
    if (!(await run.toolCall(id, boardEvent(c.tool, c.line), { add: c.add }))) continue;
    added.push(...c.add);
    run.update(id, 'completed');
  }
  return { note: plan.note, fit: plan.fit, items: added };
}

/** Where the next new thing goes: inside the selection box, or below what is on the board. */
class Placer {
  x = 40; y = 40; rowX = 40; right = Infinity; rowH = 0;
  constructor(items: BoardItem[], byId: Record<string, BoardItem>, area: ChatRequest['area']) {
    if (area) { this.x = this.rowX = Math.ceil((area.x + 24) / GRID) * GRID; this.y = Math.ceil((area.y + 24) / GRID) * GRID; this.right = area.x + area.w - 24; }
    else if (items.length) {
      let maxy = -Infinity, minx = Infinity;
      for (const o of items) { const b = bounds(o, byId); maxy = Math.max(maxy, b.y + b.h); minx = Math.min(minx, b.x); }
      this.x = this.rowX = snap(minx); this.y = snap(maxy + 80);
    }
  }
  place(w: number, h: number) {
    if (this.x + w > this.right && this.x > this.rowX) { this.x = this.rowX; this.y += this.rowH + 80; this.rowH = 0; }
    const p = { x: this.x, y: this.y };
    this.x += w + 80; this.rowH = Math.max(this.rowH, h);
    return p;
  }
}

export async function realChat(ctx: AdapterContext): Promise<Proposal> {
  const { run, req } = ctx, chat = req.chat as ChatRequest;
  const items = boardItems(chat.board), byId = index(items), newId = idMaker(items), added: BoardItem[] = [];
  const all = () => ({ ...byId, ...index(added) });
  const place = new Placer(items, byId, chat.area);
  let n = 0;
  const report = async (tool: string, line: string, add: BoardItem[]) => {
    const id = 'board_' + ++n;
    if (!(await run.toolCall(id, boardEvent(tool, line), { add }))) throw new Error('The person did not allow changes to the board');
    added.push(...add); run.update(id, 'completed');
  };
  const S = (props: Record<string, unknown>, required: string[]) => ({ type: 'object', properties: props, required, additionalProperties: false });
  const ok = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
  const types = NODE_DEFS.filter((d) => !d.pkg).map((d) => d.t);
  const tools: PiTool[] = [
    { name: 'board_read', label: 'Read the board', description: 'Lists what is on the board (id, kind, type, text, position) and what is selected.', parameters: S({}, []),
      execute: async () => {
        const list = items.filter((o) => o.kind !== 'arrow').slice(0, 300).map((o) => {
          const b = bounds(o, byId);
          return { id: o.id, kind: o.kind, ...(o.kind === 'node' ? { type: o.ntype } : o.kind === 'shape' ? { shape: o.shape } : {}), text: clipText(itemText(o), 120), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
        });
        const arrows = items.filter((o) => o.kind === 'arrow' && o.from && o.to).map((a) => a.kind === 'arrow' ? `${a.from!.id} -> ${a.to!.id}` : '');
        await report('board_read', list.length ? `Read the board: ${list.length} things on it` : tr('Read the board: it is empty'), []);
        return ok(JSON.stringify({ items: list, arrows, selected: chat.selected || [], area: chat.area }));
      } },
    { name: 'board_add_shape', label: 'Draw', description: 'Draws a shape with short text: rect for a step, diamond for a question or decision, pill for start and end.',
      parameters: S({ shape: { type: 'string', enum: ['rect', 'diamond', 'pill', 'circle'] }, text: { type: 'string', maxLength: 60 }, x: { type: 'number' }, y: { type: 'number' } }, ['shape', 'text']),
      execute: async (_id, p) => {
        const ask = p.shape === 'diamond', w = ask || p.shape === 'circle' ? 160 : 200, h = ask || p.shape === 'circle' ? 160 : 80;
        const at = typeof p.x === 'number' && typeof p.y === 'number' ? { x: snap(p.x), y: snap(p.y) } : place.place(w, h);
        const it: ShapeItem = { id: newId('s'), kind: 'shape', shape: p.shape, x: at.x, y: at.y, w, h, fill: ask ? '#FFE9C7' : p.shape === 'pill' ? '#BFD7FF' : '#E3E4E8', style: 'body', align: 'center', text: clipText(String(p.text), 60) } as ShapeItem;
        await report('board_add_shape', `Draw: ${it.text}`, [it]);
        return ok(`Drew #${it.id}`);
      } },
    { name: 'board_add_node', label: 'Add a step', description: `Adds a workflow node. Types: ${types.join(', ')}.`,
      parameters: S({ type: { type: 'string', enum: types }, text: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' } }, ['type']),
      execute: async (_id, p) => {
        const d = NODE_BY[p.type]; if (!d) throw new Error(`Unknown node type ${p.type}`);
        const at = typeof p.x === 'number' && typeof p.y === 'number' ? { x: snap(p.x), y: snap(p.y) } : place.place(d.w, d.h);
        const it: NodeItem = { id: newId(p.type === 'llm' ? 'ai' : p.type.slice(0, 2)), kind: 'node', ntype: p.type, x: at.x, y: at.y, w: d.w, h: d.h, text: String(p.text || ''), status: 'idle' };
        await report('board_add_node', `Add a step: ${d.label}`, [it]);
        return ok(`Added #${it.id}`);
      } },
    { name: 'board_connect', label: 'Connect', description: 'Draws an arrow from one thing to another, by id.', parameters: S({ from: { type: 'string' }, to: { type: 'string' } }, ['from', 'to']),
      execute: async (_id, p) => {
        const b = all(), a = b[p.from], z = b[p.to];
        if (!a || !z) throw new Error(`No item with id ${!a ? p.from : p.to}`);
        if (z.kind === 'node' && a.kind === 'node' && !canTake(z, a)) throw new Error(`#${p.to} cannot take what #${p.from} passes on`);
        await report('board_connect', `Connect #${p.from} to #${p.to}`, [mkEdge(newId('e'), p.from, p.to)]);
        return ok(`Connected #${p.from} to #${p.to}`);
      } },
  ];
  const mode = chat.mode === 'diagram'
    ? 'The board is being used as a diagram. Draw with shapes and arrows only: one shape per step, a diamond for each question, pills for start and end, then connect them in order.'
    : 'The board is being used as a workflow. Add workflow nodes and connect them so what each one passes on fits the next. Start with a prompt node for what the person typed when there is nothing to build on.';
  const system = [
    'You are the assistant in the toolbar of a whiteboard. You change the board only through the board tools. Read the board first.',
    mode,
    chat.area ? `Keep everything inside the selection box at x ${chat.area.x}, y ${chat.area.y}, ${chat.area.w} by ${chat.area.h}; leave x and y out and the board places things for you.` : 'Leave x and y out unless the person asked for a place; the board places things for you.',
    chat.selected?.length ? `The person selected: ${chat.selected.join(', ')}. Build on it.` : '',
    'Everything you add is shown as a proposal the person accepts or rejects. Finish with one short sentence that says what you propose.',
  ].filter(Boolean).join('\n');
  const note = await runPi({ ...ctx, system, prompt: req.instruction }, tools);
  return { note: clipText(note.trim() || tr('Proposal'), 200), fit: !chat.area && !chat.selected?.length, items: added };
}

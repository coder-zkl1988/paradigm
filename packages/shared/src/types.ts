// Board items. A board is a flat list of these; arrows point at other items by id.

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Pt = [number, number];
export interface Box { x: number; y: number; w: number; h: number }

export type RunStatus = 'idle' | 'queued' | 'running' | 'waiting' | 'done' | 'error';

interface Base {
  id: string;
  /** Set on items an agent proposed and nobody has accepted yet. Never saved. */
  proposed?: boolean;
  locked?: boolean;
}

export interface NodeItem extends Base {
  kind: 'node';
  ntype: string;
  x: number; y: number; w: number; h: number;
  text: string;
  status: RunStatus;
  /** Per-node settings, keyed by the option key from NODE_OPTIONS or a market manifest. */
  cfg?: Record<string, string | number>;
  /** Options: AI steps that share an `opt` group run side by side and the person keeps one. */
  opt?: string;
  optName?: string;
  /** HTML preview width. */
  device?: 'phone' | 'desktop';
}

export interface ShapeItem extends Base {
  kind: 'shape';
  shape: string;
  x: number; y: number; w: number; h: number;
  fill: string;
  text?: string;
  style?: TextStyleKey;
  align?: 'left' | 'center' | 'right';
}

export interface StickyItem extends Base {
  kind: 'sticky';
  x: number; y: number; w: number; h: number;
  color: string;
  /** Slight tilt in degrees, so stickies look hand-placed. */
  rot?: number;
  style?: TextStyleKey;
  text: string;
}

export interface FrameItem extends Base {
  kind: 'frame';
  x: number; y: number; w: number; h: number;
  fill: string;
  label: string;
}

export type TextStyleKey = 'title' | 'heading' | 'body' | 'small';

export interface TextItem extends Base {
  kind: 'text';
  x: number; y: number;
  text: string;
  style?: TextStyleKey;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  link?: string;
}

export interface StickerItem extends Base {
  kind: 'sticker';
  sticker: string;
  x: number; y: number; w: number; h: number;
}

export interface PenItem extends Base {
  kind: 'pen';
  x: number; y: number;
  pts: Pt[];
  color: string;
  weight: number;
}

export interface ArrowEnd { id: string; side: Side }
/** A hand-set route: `o` is the first segment's direction, `c` the alternating x/y of each bend. */
export interface Via { o: 'h' | 'v'; c: number[] }

export interface ArrowItem extends Base {
  kind: 'arrow';
  from?: ArrowEnd | null;
  to?: ArrowEnd | null;
  x1: number; y1: number; x2: number; y2: number;
  color: string;
  weight: number;
  dash: boolean;
  head: boolean;
  via?: Via;
  label?: string;
}

export type BoardItem = NodeItem | ShapeItem | StickyItem | FrameItem | TextItem | StickerItem | PenItem | ArrowItem;
export type ItemKind = BoardItem['kind'];

/** What a node produced in a run. */
export interface NodeResult {
  type: string;
  value: unknown;
  text: string;
  /** True when the value came from a stand-in because no backend or key was available. */
  sim?: boolean;
  logs?: string[];
  meta?: Record<string, unknown>;
  view?: View;
  error?: string;
}

export interface NodeInput { from: string; type: string; value: unknown; label?: string }

// ---- document views drawn by render nodes

export interface Block {
  k: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'quote' | 'code' | 'hr' | 'img' | 'button' | 'link' | 'field' | 'nav' | 'swatch' | 'table';
  text: string;
  mark?: string;
  items?: string[];
  head?: string[];
  rows?: string[][];
}

export interface Theme { bg: string | null; ink: string | null; accent: string | null; center: boolean }
export interface Slide { title: string; items: Block[] }

export type View =
  | { kind: 'doc'; title: string; blocks: Block[]; words: number; source: string }
  | { kind: 'sheet'; title: string; head: string[]; rows: string[][]; total: number; sums: { col: number; label: string; value: number }[]; source: string }
  | { kind: 'slides'; title: string; slides: Slide[]; source: string }
  | { kind: 'page'; title: string; blocks: Block[]; theme: Theme | null; source: string; fromHtml: boolean }
  | { kind: 'text'; title: string; source: string };

// The contract between the web app and the server. Every node that needs the
// server goes through one of these calls; the server hides which harness or
// service does the work.

import type { HarnessId, Perm, ToolRes } from './harness';
import type { Block, NodeInput, Slide } from './types';
import type { Manifest, Problem } from './market';
import type { HttpRequest } from './nodes';
import { HARNESSES } from './harness';
import { MCP_TOOLS, SPEC } from './market';
import { BOARD_TOOLS } from './sim';

export const API = {
  agent: { method: 'POST', path: '/v1/agent/runs', stream: true, usedBy: 'AI step and the agent nodes', note: 'Starts one harness run and streams what it does: tool_call, tool_call_update, permission_request, message, result. The chat in the toolbar uses the same call with surface set to chat and the board tools.' },
  permission: { method: 'POST', path: '/v1/agent/runs/{runId}/permissions', usedBy: 'AI step and the agent nodes', note: 'Answers a permission_request with allow_once, allow_always or deny.' },
  terminal: { method: 'POST', path: '/v1/sandbox/exec', stream: true, usedBy: 'Terminal', note: 'Runs one command in the board sandbox and streams its output, then the exit code.' },
  code: { method: 'POST', path: '/v1/sandbox/code', usedBy: 'Code', note: 'Runs a script in the sandbox. JavaScript already runs in the browser, so only other languages need this.' },
  http: { method: 'POST', path: '/v1/http/proxy', usedBy: 'API request', note: 'Sends the request from the server, so keys stay out of the browser.' },
  imagegen: { method: 'POST', path: '/v1/media/images', usedBy: 'Image generation', note: 'Makes one image and returns its address.' },
  videogen: { method: 'POST', path: '/v1/media/videos', usedBy: 'Video generation', note: 'Starts a video job. Ask GET /v1/media/videos/{jobId} until it is done.' },
  export: { method: 'POST', path: '/v1/files/export', usedBy: 'Doc, Sheet and Slides', note: 'Turns what a Doc, Sheet or Slides node shows into a .docx, .xlsx or .pptx file and returns its address.' },
  marketList: { method: 'GET', path: '/v1/market/nodes', usedBy: 'Node market', note: 'Lists the nodes in the market. Each entry is a manifest that passed the check.' },
  marketPublish: { method: 'POST', path: '/v1/market/nodes', usedBy: 'Node market', note: 'Uploads a manifest. The server runs the same check again before it lists the node.' },
  marketRun: { method: 'POST', path: '/v1/market/nodes/{id}/run', usedBy: 'Market nodes that run on the backend', note: 'Runs a node whose code lives on the server and returns what it made.' },
} as const;
export type ApiKind = keyof typeof API;

// ---- agent runs

export interface AgentRunRequest {
  harness: HarnessId;
  instruction: string;
  inputs: NodeInput[];
  permissions: Partial<Record<ToolRes, Perm>>;
  /** The board whose sandbox the run works in. */
  workspace: string;
  /** For ACP: which agent to start. */
  agent?: string;
  /** Option name (A, B, C) when the step is one of several options. */
  optName?: string;
  /** Plain context for the stand-in run: the step's text and what is upstream, and the types of what it feeds. */
  context?: { text: string; feeds: string[] };
  /** The toolbar chat. */
  surface?: 'node' | 'chat';
  chat?: ChatRequest;
}

export interface ChatRequest {
  mode: 'diagram' | 'flow';
  board: unknown;
  selected: string[];
  area: { x: number; y: number; w: number; h: number; contains: string[] } | null;
  tools: string[];
}

export type AgentEvent =
  | { type: 'run'; runId: string; harness: HarnessId; simulated: boolean; reason?: string }
  | { type: 'tool_call'; id: string; res: ToolRes; op: string; title: string; tool: string; target: string; parent: string | null; sub?: string; raw?: unknown; add?: unknown[] }
  | { type: 'tool_call_update'; id: string; status: 'in_progress' | 'completed' | 'failed' | 'blocked' }
  | { type: 'permission_request'; requestId: string; toolCallId: string; res: ToolRes; title: string; options: ('allow_once' | 'allow_always' | 'deny')[] }
  | { type: 'message'; text: string }
  | { type: 'result'; status: 'success' | 'error'; output: { type: string; value: unknown }; error?: string; note?: string; simulated: boolean };

export interface PermissionAnswer { requestId: string; decision: 'allow_once' | 'allow_always' | 'deny' }

// ---- other calls

export interface ExecRequest { command: string; stdin: string | null; timeoutSec: number; workspace?: string }
export type ExecEvent = { type: 'stdout' | 'stderr'; chunk: string } | { type: 'exit'; exitCode: number; simulated?: boolean };

export interface CodeRequest { language: 'javascript' | 'python'; source: string; input: unknown; inputs?: Record<string, unknown> }
export interface CodeResponse { value: unknown; logs: string[]; simulated?: boolean; error?: string }

export type ProxyRequest = HttpRequest;
export interface ProxyResponse { status: number; statusText: string; headers: Record<string, string>; body: unknown; simulated?: boolean }

export interface ImageRequest { prompt: string; ratio: string; references?: string[] }
export interface ImageResponse { url: string | null; width?: number; height?: number; simulated?: boolean }
export interface VideoRequest { prompt: string; ratio: string; seconds: number; references?: string[] }
export interface VideoJob { jobId: string; status: 'queued' | 'running' | 'done' | 'failed'; url: string | null; simulated?: boolean }

export interface ExportRequest {
  format: 'docx' | 'xlsx' | 'pptx';
  title: string;
  content: { kind: 'doc' | 'sheet' | 'slides'; blocks?: Block[]; head?: string[]; rows?: string[][]; slides?: Slide[] };
}
export interface ExportResponse { url: string }

export interface MarketList { nodes: (Manifest & { publisher?: string; publishedAt?: string })[] }
export interface PublishResponse { ok: boolean; problems: Problem[] }
export interface MarketRunRequest { node: string; version: string; input: unknown; inputs: NodeInput[]; config: Record<string, unknown>; text: string }
export interface MarketRunResponse { value: unknown; logs: string[]; simulated?: boolean }

// ---- accounts, boards, workspaces

export interface User { id: string; email: string; name: string }
export interface Workspace { id: string; name: string; personal: boolean; role: 'owner' | 'editor' | 'viewer'; members: number }
export interface BoardSummary { id: string; workspaceId: string; title: string; updatedAt: string; owner: string; template?: string | null }
export interface Board extends BoardSummary { file: unknown; settings: BoardSettings }
export interface BoardSettings { perms?: Partial<Record<ToolRes, Perm>>; bg?: 'grid' | 'dots' | 'plain' }
/** Per-person node placement: pins on the toolbar, the Nodes panel, installed and own market nodes. */
export interface NodePrefs { pins: string[]; shelf: string[]; installed: string[]; mine: Manifest[] }

/** The whole contract as JSON, for the "Backend interfaces" dialog. */
export function contract(): unknown {
  return {
    contract: 'flowboard-backend', version: 1, baseUrl: '[YOUR BACKEND URL]', auth: 'Authorization: Bearer [SESSION TOKEN]',
    endpoints: Object.entries(API).map(([id, e]) => ({ id, ...e, stream: 'stream' in e && !!e.stream })),
    nodeManifest: { spec: SPEC.spec, keys: SPEC.keys, required: SPEC.required, wireTypes: SPEC.wire, previews: SPEC.previews, runs: SPEC.runs, stickers: SPEC.stickers, limits: SPEC.limits, notAllowed: SPEC.looks, mcpTools: MCP_TOOLS.map((m) => m[0]) },
    chat: { harness: 'pi', surface: 'chat', note: 'The toolbar chat is the built-in agent with tools that work on the board. Its changes arrive as a proposal the person accepts or rejects.', tools: BOARD_TOOLS.map((t) => ({ name: t[0], does: t[1] })) },
    harnesses: Object.entries(HARNESSES).map(([node, h]) => ({ node, harness: h.id, name: h.name, nativeEvents: h.stream, permissions: h.gate, toolMapping: h.map.map((m) => ({ tool: m[0], boardNode: m[1] })) })),
  };
}

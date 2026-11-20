// Claude Agent SDK. Every tool call passes a PreToolUse hook first; the hook
// draws the call on the board and answers allow or deny from the board's
// permissions, asking the person when a permission is "ask first".

import { mapToolEvent, foldSubAgent } from '@paradigm/shared';
import type { Adapter } from './types';
import { optional } from './types';

const PKG = '@anthropic-ai/claude-agent-sdk';

export const claudeAdapter: Adapter = {
  id: 'claude',
  async unavailable() {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN) return 'Set ANTHROPIC_API_KEY on the server to run Claude Agent SDK steps for real';
    if (!(await optional(PKG))) return `Install ${PKG} on the server (npm run agents:install)`;
    return null;
  },
  async run(ctx) {
    const sdk = await optional(PKG);
    const { run } = ctx;
    const parentOf = new Map<string, string | null>();
    const out = (decision: 'allow' | 'deny', reason?: string) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, ...(reason ? { permissionDecisionReason: reason } : {}) } });
    const pre = async (input: any) => {
      if (input.hook_event_name !== 'PreToolUse') return {};
      const raw = { type: 'tool_use', id: input.tool_use_id, name: input.tool_name, input: input.tool_input || {}, parent_tool_use_id: parentOf.get(input.tool_use_id) || null };
      const ev = mapToolEvent('claude', raw);
      if (!ev) return out('allow');
      foldSubAgent(ev); ev.raw = raw;
      const ok = await run.toolCall(input.tool_use_id, ev);
      return ok ? out('allow') : out('deny', 'The person did not allow this on the board.');
    };
    const post = (status: 'completed' | 'failed') => async (input: any) => { if (input.tool_use_id) run.update(input.tool_use_id, status); return {}; };
    const abortController = new AbortController();
    run.abort.signal.addEventListener('abort', () => abortController.abort(), { once: true });
    const q = sdk.query({
      prompt: ctx.prompt,
      options: {
        cwd: ctx.cwd,
        systemPrompt: { type: 'preset', preset: 'claude_code', append: ctx.system },
        settingSources: [],
        permissionMode: 'default',
        maxTurns: 40,
        abortController,
        hooks: { PreToolUse: [{ hooks: [pre], timeout: 900 }], PostToolUse: [{ hooks: [post('completed')] }], PostToolUseFailure: [{ hooks: [post('failed')] }] },
        canUseTool: async (_name: string, input: Record<string, unknown>) => ({ behavior: 'allow', updatedInput: input }),
      },
    });
    let final: string | null = null;
    for await (const m of q) {
      if (m.type === 'assistant') {
        for (const b of m.message?.content || []) {
          if (b.type === 'tool_use') parentOf.set(b.id, m.parent_tool_use_id || null);
          else if (b.type === 'text' && !m.parent_tool_use_id && b.text?.trim()) run.emit({ type: 'message', text: b.text });
        }
      } else if (m.type === 'result') {
        if (m.subtype === 'success' && !m.is_error) final = m.result || '';
        else throw new Error(m.result || (m.errors || []).join('; ') || 'The run stopped: ' + m.subtype);
      }
    }
    if (final === null) throw new Error('The run ended without an answer');
    return final;
  },
};

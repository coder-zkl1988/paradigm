// What an agent step is told: the step's own instruction, what flows in, and
// what shape its answer must take for the step after it.

import type { AgentRunRequest } from '@paradigm/shared';
import { showVal } from '@paradigm/shared';

const MAX_INPUT = 60_000;

export function systemPrompt(req: AgentRunRequest): string {
  const feeds = req.context?.feeds || [];
  const shape = feeds.includes('html') ? 'Answer with one complete HTML document, starting with <!doctype html>, and nothing else.'
    : feeds.includes('sheet') ? 'Answer with a Markdown table (or CSV) and a short title, so the next step can show it as a sheet.'
    : feeds.includes('slides') ? 'Answer in Markdown: a # title, then one ## heading per slide with a few bullet points.'
    : feeds.some((f) => f === 'doc' || f === 'md') ? 'Answer in Markdown with headings.'
    : feeds.some((f) => f === 'code' || f === 'terminal') ? 'Answer with what the next step needs to run: code or a command, in a fenced block, with one line saying what it does.'
    : 'Answer with what the next step needs, in Markdown.';
  return [
    'You are one step in a workflow drawn on a whiteboard. The person wrote the instruction on the step; what flows in comes from the steps before it.',
    'Work in the current folder. It belongs to this board and is shared by every step on it.',
    'Your final answer is passed on as this step\'s output. Do not explain what you did unless asked.',
    shape,
    req.optName ? `This is option ${req.optName} of several tried side by side. Take a clearly different approach from the obvious one.` : '',
  ].filter(Boolean).join('\n');
}

export function userPrompt(req: AgentRunRequest): string {
  const ask = (req.instruction || '').trim() || 'Work on what flows in.';
  if (!req.inputs.length) return ask;
  const parts = req.inputs.map((i) => {
    let v = showVal(i.value);
    if (v.length > MAX_INPUT) v = v.slice(0, MAX_INPUT) + '\n[... cut: ' + (v.length - MAX_INPUT) + ' more characters]';
    return `## From #${i.from} (${i.type}${i.label ? ', ' + i.label : ''})\n\n${v}`;
  });
  return `${ask}\n\n# What flows in\n\n${parts.join('\n\n')}`;
}

/** Last assistant text in a list of messages from any SDK that uses {role, content}. */
export function lastText(messages: { role?: string; content?: unknown }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
      const t = m.content.filter((c: any) => c && c.type === 'text').map((c: any) => c.text).join('');
      if (t) return t;
    }
  }
  return '';
}

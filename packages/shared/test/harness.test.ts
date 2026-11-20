import { describe, expect, it } from 'vitest';
import { mapToolEvent, simulatedScript, toolEventText } from '../src';

describe('tool call mapping', () => {
  it('maps each harness to the same tool nodes', () => {
    expect(mapToolEvent('claude', { type: 'tool_use', name: 'Read', input: { file_path: 'a.ts' } })).toMatchObject({ res: 'folder', op: 'read' });
    expect(mapToolEvent('claude', { name: 'mcp__playwright__browser_click', input: {} })!.res).toBe('browser');
    expect(mapToolEvent('claude', { name: 'mcp__github__create_issue', input: {} })!.res).toBe('connector');
    expect(mapToolEvent('codex', { item: { type: 'command_execution', command: 'npm test' } })!.res).toBe('terminal');
    expect(mapToolEvent('codex', { item: { type: 'file_change', changes: [{ path: 'x', kind: 'add' }] } })!.res).toBe('folder');
    expect(mapToolEvent('acp', { kind: 'execute', title: 'npm test' })!.res).toBe('terminal');
    expect(mapToolEvent('pi', { toolName: 'bash', args: { command: 'ls' } })!.res).toBe('terminal');
    expect(mapToolEvent('pi', { toolName: 'board_add_shape', args: { text: 'Pay' } })!.res).toBe('board');
  });
  it('sends unknown tools to the extra node and drops noise', () => {
    expect(mapToolEvent('claude', { name: 'SlackSend', input: {} })!.res).toBe('tool');
    expect(mapToolEvent('acp', { kind: 'other', title: 'Resize' })!.res).toBe('tool');
    expect(mapToolEvent('claude', { name: 'TodoWrite', input: {} })).toBeNull();
    expect(mapToolEvent('codex', { item: { type: 'reasoning' } })).toBeNull();
    expect(mapToolEvent('acp', { kind: 'think', title: 'x' })).toBeNull();
  });
  it('makes believable stand-in runs in each native format', () => {
    for (const h of ['pi', 'claude', 'codex', 'acp'] as const) {
      const s = simulatedScript(h, { context: 'fix the checkout bug', feeds: ['terminal'], hasInputs: true });
      expect(s.events.length).toBeGreaterThan(3);
      expect(s.events.every((e) => toolEventText(e).length > 0)).toBe(true);
    }
  });
});

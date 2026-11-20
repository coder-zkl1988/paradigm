import { describe, expect, it, vi } from 'vitest';
import { canTake, chatModeOf, chatSteps, flowGraph, fromFile, index, planChat, starterItems, TEMPLATES, templateItems, toFile, executeNode, type NodeItem, type Services } from '../src';

describe('templates', () => {
  it('every template wires only allowed connections', () => {
    for (const key of Object.keys(TEMPLATES)) {
      const items = templateItems(key), byId = index(items);
      for (const a of items) if (a.kind === 'arrow') expect(canTake(byId[a.to!.id], byId[a.from!.id]), key + ' ' + a.from!.id + '>' + a.to!.id).toBe(true);
      expect(flowGraph(items).order.length).toBe(items.filter((i) => i.kind === 'node').length);
    }
  });
  it('guided flows load', () => {
    expect(starterItems('UI flow')!.filter((i) => i.kind === 'node')).toHaveLength(9);
  });
});

describe('board file', () => {
  it('round-trips and never keeps run state', () => {
    const items = starterItems('Code flow')!.map((i) => (i.kind === 'node' ? { ...i, status: 'done' as const } : i));
    const back = fromFile(JSON.parse(JSON.stringify(toFile(items))));
    expect(back).toHaveLength(items.length);
    expect(back.filter((i): i is NodeItem => i.kind === 'node').every((n) => n.status === 'idle')).toBe(true);
  });
  it('refuses other formats and unknown node types', () => {
    expect(() => fromFile({ format: 'x' })).toThrow();
    expect(() => fromFile({ format: 'flowboard', nodes: [{ id: 'a', kind: 'node', ntype: 'nope', x: 0, y: 0 }] })).toThrow(/Unknown/);
  });
});

describe('chat planning', () => {
  it('reads steps and picks diagram or workflow', () => {
    expect(chatSteps('Sign-up flow: enter email, verify the code, pick a plan')).toEqual(['Enter email', 'Verify the code', 'Pick a plan']);
    expect(chatModeOf('draw a flowchart of onboarding', [], null)).toBe('diagram');
    expect(chatModeOf('build a landing page', [], null)).toBe('flow');
  });
  it('draws shapes inside a box', () => {
    let n = 0;
    const p = planChat('diagram', 'a -> b -> c -> d -> e', [], {}, null, (pre) => pre + ++n, { x: 100, y: 100, w: 600, h: 600 });
    const shapes = p.calls.flatMap((c) => c.add).filter((i) => i.kind === 'shape') as { x: number; w: number }[];
    expect(shapes).toHaveLength(5);
    expect(shapes.every((s) => s.x >= 100 && s.x + s.w <= 700)).toBe(true);
  });
});

describe('running a node', () => {
  const svc: Services = {
    backend: async (kind) => ({ simulated: true, stdout: 'ok', exitCode: 0, value: null, logs: [] , kind }),
    script: async (src, input) => ({ value: new Function('input', 'inputs', 'console', src)(input, {}, console), logs: [] }),
    agent: async () => ({ type: 'text', value: 'done', text: 'done' }),
  };
  it('runs code locally and render nodes in place', async () => {
    const code: NodeItem = { id: 'c', kind: 'node', ntype: 'code', x: 0, y: 0, w: 1, h: 1, text: 'return input * 2', status: 'idle' };
    expect((await executeNode(code, [{ from: 'd', type: 'data', value: 21 }], {}, svc)).value).toBe(42);
    const sheet: NodeItem = { ...code, id: 's', ntype: 'sheet', text: '' };
    expect((await executeNode(sheet, [{ from: 'd', type: 'text', value: 'a,b\n1,2' }], {}, svc)).view!.kind).toBe('sheet');
  });
  it('waits for a video job to finish', async () => {
    vi.useFakeTimers();
    const asked: string[] = [];
    let polls = 0, failNext = false;
    const svcVideo: Services = { ...svc, backend: async (kind, body: any) => {
      asked.push(kind);
      if (kind === 'videogen') return { jobId: 'job_1', status: 'running', url: null };
      polls++;
      expect(body).toEqual({ jobId: 'job_1' });
      return polls < 2 ? { jobId: 'job_1', status: 'running' } : failNext ? { status: 'failed', error: 'Too dark' } : { jobId: 'job_1', status: 'done', url: '/v1/files/abc/video.mp4' };
    } };
    const v: NodeItem = { id: 'v', kind: 'node', ntype: 'videogen', x: 0, y: 0, w: 1, h: 1, text: 'A kite over a beach', status: 'idle' };
    const p = executeNode(v, [], {}, svcVideo);
    await vi.advanceTimersByTimeAsync(10_000);
    const r = await p;
    expect(asked).toEqual(['videogen', 'videoJob', 'videoJob']);
    expect(r).toMatchObject({ type: 'video', value: '/v1/files/abc/video.mp4', sim: false });
    failNext = true; polls = 0;
    const f = executeNode(v, [], {}, svcVideo).catch((e) => e);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(((await f) as Error).message).toBe('Too dark');
    vi.useRealTimers();
  });
  it('runs a market node from its manifest', async () => {
    const n: NodeItem = { id: 'k', kind: 'node', ntype: 'pkg:word-count', x: 0, y: 0, w: 1, h: 1, text: '', status: 'idle' };
    const svcReal: Services = { ...svc, script: async (src, input, inputs) => ({ value: new Function('input', 'inputs', 'console', src)(input, inputs, console), logs: [] }) };
    const r = await executeNode(n, [{ from: 'p', type: 'text', value: 'one two three. four!' }], {}, svcReal);
    expect((r.value as { measure: string; value: number }[])[0]).toEqual({ measure: 'Words', value: 4 });
    expect(r.view!.kind).toBe('sheet');
  });
});

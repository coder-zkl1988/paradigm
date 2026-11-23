import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeApp } from './helpers';

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => { t = await makeApp(); });
afterAll(async () => { await t.close(); });

/** Opens an event stream and collects what arrives. */
function listen(path: string, token?: string) {
  const got: any[] = [], ctrl = new AbortController();
  const wake: { fn: (() => void) | null } = { fn: null };
  const done = (async () => {
    const r = await fetch(t.base + path, { headers: { accept: 'text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) }, signal: ctrl.signal });
    const rd = r.body!.getReader(), dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          if (chunk.startsWith('data: ')) { got.push(JSON.parse(chunk.slice(6))); wake.fn?.(); }
        }
      }
    } catch { /* stopped */ }
    got.push({ type: 'closed' }); wake.fn?.();
  })();
  const until = async (f: (e: any) => boolean) => {
    for (let i = 0; i < 100; i++) {
      const e = got.find(f);
      if (e) return e;
      await new Promise<void>((ok) => { wake.fn = ok; setTimeout(ok, 50); });
    }
    throw new Error('nothing arrived: ' + JSON.stringify(got));
  };
  return { got, until, stop: () => { ctrl.abort(); return done; } };
}

describe('live boards', () => {
  it('tells everyone on the board when someone saves, and who is there', async () => {
    const ana = await t.signup('Ana'), bo = await t.signup('Bo');
    const team = (await t.call('GET', '/v1/workspaces', undefined, ana.token)).json.workspaces[0].id;
    const board = (await t.call('POST', `/v1/workspaces/${team}/boards`, { template: 'w4' }, ana.token)).json.board;
    await t.call('POST', `/v1/boards/${board.id}/shares`, { email: bo.email, role: 'editor' }, ana.token);

    const a = listen(`/v1/boards/${board.id}/live`, ana.token);
    const hello = await a.until((e) => e.type === 'hello');
    expect(hello).toMatchObject({ version: board.version, people: [{ name: 'Ana' }] });
    const b = listen(`/v1/boards/${board.id}/live`, bo.token);
    const bHello = await b.until((e) => e.type === 'hello');
    expect(bHello.people.map((p: any) => p.name).sort()).toEqual(['Ana', 'Bo']);
    expect((await a.until((e) => e.type === 'people' && e.people.length === 2)).people.map((p: any) => p.name).sort()).toEqual(['Ana', 'Bo']);

    const r = await t.call('PUT', `/v1/boards/${board.id}`, { file: board.file, version: board.version, conn: bHello.conn }, bo.token);
    expect(r.status).toBe(200);
    expect(await a.until((e) => e.type === 'saved')).toEqual({ type: 'saved', version: board.version + 1, by: { id: bo.user.id, name: 'Bo' }, conn: bHello.conn });

    await b.stop();
    expect((await a.until((e) => e.type === 'people' && e.people.length === 1)).people[0].name).toBe('Ana');
    await a.stop();
  });

  it('keeps out people who cannot open the board', async () => {
    const ana = await t.signup(), cy = await t.signup();
    const team = (await t.call('GET', '/v1/workspaces', undefined, ana.token)).json.workspaces[0].id;
    const board = (await t.call('POST', `/v1/workspaces/${team}/boards`, {}, ana.token)).json.board;
    const r = await fetch(`${t.base}/v1/boards/${board.id}/live`, { headers: { authorization: `Bearer ${cy.token}` } });
    expect(r.status).toBe(404); // as if the board did not exist
  });

  it('streams to view links, and closes them when the link is turned off', async () => {
    const ana = await t.signup();
    const team = (await t.call('GET', '/v1/workspaces', undefined, ana.token)).json.workspaces[0].id;
    const board = (await t.call('POST', `/v1/workspaces/${team}/boards`, { template: 'w4' }, ana.token)).json.board;
    const { token } = (await t.call('POST', `/v1/boards/${board.id}/link`, {}, ana.token)).json;
    const a = listen(`/v1/boards/${board.id}/live`, ana.token);
    await a.until((e) => e.type === 'hello');
    const v = listen(`/v1/public/${token}/live`);
    expect((await v.until((e) => e.type === 'hello')).people.map((p: any) => p.name)).toEqual([ana.user.name]);
    await t.call('PUT', `/v1/boards/${board.id}`, { file: board.file, version: board.version }, ana.token);
    expect(await v.until((e) => e.type === 'saved')).toMatchObject({ version: board.version + 1, conn: null });
    await t.call('DELETE', `/v1/boards/${board.id}/link`, undefined, ana.token);
    expect(await v.until((e) => e.type === 'gone')).toEqual({ type: 'gone', reason: 'link_off' });
    await v.until((e) => e.type === 'closed');
    expect(a.got.some((e) => e.type === 'gone')).toBe(false);
    await t.call('POST', `/v1/boards/${board.id}/trash`, {}, ana.token);
    expect(await a.until((e) => e.type === 'gone')).toEqual({ type: 'gone', reason: 'trashed' });
    await a.stop();
  });
});

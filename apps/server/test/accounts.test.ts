import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeApp } from './helpers';

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => { t = await makeApp(); });
afterAll(async () => { await t.close(); });

describe('accounts', () => {
  it('signs up, signs in and refuses a wrong password', async () => {
    const { token, email } = await t.signup();
    expect((await t.call('GET', '/v1/me', undefined, token)).json.user.name).toBe('Lin Yue');
    expect((await t.call('POST', '/v1/auth/signin', { email, password: 'correct horse' })).status).toBe(200);
    const bad = await t.call('POST', '/v1/auth/signin', { email, password: 'wrong password' });
    expect(bad.status).toBe(401);
    expect(bad.json.error).toMatch(/not right/);
    expect((await t.call('POST', '/v1/auth/signup', { name: 'X', email, password: 'correct horse' })).status).toBe(409);
    expect((await t.call('POST', '/v1/auth/signup', { name: 'X', email: 'a@b.co', password: 'short' })).json.error).toMatch(/8\+/);
  });
  it('signs in with an email link, once', async () => {
    const r = await t.call('POST', '/v1/auth/link', { email: 'linky@example.com' });
    const token = new URL(r.json.devLink).searchParams.get('link');
    const v = await t.call('POST', '/v1/auth/link/verify', { token });
    expect(v.json.user.email).toBe('linky@example.com');
    expect((await t.call('POST', '/v1/auth/link/verify', { token })).status).toBe(401);
  });
  it('lets a guest in and keeps their boards when they add an email', async () => {
    const g = await t.call('POST', '/v1/auth/guest');
    expect(g.json.user.guest).toBe(true);
    const u = await t.call('PATCH', '/v1/me', { email: 'kept@example.com', password: 'correct horse' }, g.json.token);
    expect(u.json.user.guest).toBe(false);
  });
  it('makes a team and a personal workspace, and joins people by invite', async () => {
    const a = await t.signup('Lin Yue');
    const ws = (await t.call('GET', '/v1/workspaces', undefined, a.token)).json.workspaces;
    expect(ws.map((w: any) => w.name)).toEqual(["Lin's team", 'Personal']);
    const team = ws[0].id;
    expect((await t.call('POST', `/v1/workspaces/${team}/invites`, { emails: 'ok@example.com, nope' }, a.token)).json.error).toMatch(/nope/);
    const inv = await t.call('POST', `/v1/workspaces/${team}/invites`, { emails: ['marco@example.com'], role: 'viewer' }, a.token);
    expect(inv.json.sent[0].email).toBe('marco@example.com');
    const b = await t.signup('Marco Rossi', 'marco@example.com');
    const theirs = (await t.call('GET', '/v1/workspaces', undefined, b.token)).json.workspaces;
    expect(theirs.find((w: any) => w.id === team).role).toBe('viewer');
    const m = (await t.call('GET', `/v1/workspaces/${team}/members`, undefined, a.token)).json;
    expect(m.members.map((x: any) => x.role)).toEqual(['owner', 'viewer']);
    expect(m.invites).toHaveLength(0);
  });
  it('needs a session for everything else', async () => {
    expect((await t.call('GET', '/v1/workspaces')).status).toBe(401);
  });
});

describe('boards', () => {
  it('opens a template as a real flow, saves, detects conflicts and trashes', async () => {
    const a = await t.signup();
    const team = (await t.call('GET', '/v1/workspaces', undefined, a.token)).json.workspaces[0].id;
    const made = await t.call('POST', `/v1/workspaces/${team}/boards`, { template: 'w1' }, a.token);
    expect(made.status).toBe(200);
    const b = made.json.board;
    expect(b.title).toBe('Pull request review');
    expect(b.nodes).toBe(5);
    expect(b.file.format).toBe('flowboard');
    const saved = await t.call('PUT', `/v1/boards/${b.id}`, { file: b.file, version: b.version, title: 'PR review' }, a.token);
    expect(saved.json.version).toBe(2);
    expect((await t.call('PUT', `/v1/boards/${b.id}`, { file: b.file, version: 1 }, a.token)).status).toBe(409);
    expect((await t.call('PUT', `/v1/boards/${b.id}`, { file: { format: 'nope' }, version: 2 }, a.token)).json.error).toMatch(/not a board file/);
    const list = (await t.call('GET', `/v1/workspaces/${team}/boards?q=review`, undefined, a.token)).json.boards;
    expect(list.map((x: any) => x.title)).toEqual(['PR review']);
    await t.call('POST', `/v1/boards/${b.id}/trash`, {}, a.token);
    expect((await t.call('GET', `/v1/workspaces/${team}/boards?view=trash`, undefined, a.token)).json.boards).toHaveLength(1);
    await t.call('POST', `/v1/boards/${b.id}/restore`, {}, a.token);
    expect((await t.call('DELETE', `/v1/boards/${b.id}`, undefined, a.token)).status).toBe(400);
  });
  it('shares a board read-only', async () => {
    const a = await t.signup(), v = await t.signup('Chen Wei');
    const team = (await t.call('GET', '/v1/workspaces', undefined, a.token)).json.workspaces[0].id;
    const b = (await t.call('POST', `/v1/workspaces/${team}/boards`, { template: 'UI flow' }, a.token)).json.board;
    await t.call('POST', `/v1/boards/${b.id}/shares`, { email: v.email, role: 'viewer' }, a.token);
    const shared = (await t.call('GET', '/v1/shared', undefined, v.token)).json.boards;
    expect(shared[0]).toMatchObject({ id: b.id, role: 'viewer', sharedBy: 'Lin Yue' });
    expect((await t.call('GET', `/v1/boards/${b.id}`, undefined, v.token)).json.board.nodes).toBe(9);
    expect((await t.call('PUT', `/v1/boards/${b.id}`, { file: b.file }, v.token)).status).toBe(403);
    expect((await t.call('POST', '/v1/agent/runs?wait=1', { harness: 'pi', instruction: 'x', inputs: [], workspace: b.id }, v.token)).status).toBe(403);
  });
  it('keeps pins and refuses more than six', async () => {
    const a = await t.signup();
    expect((await t.call('GET', '/v1/me/nodes', undefined, a.token)).json.prefs.pins).toEqual(['prompt', 'llm', 'html', 'gate']);
    expect((await t.call('PUT', '/v1/me/nodes', { pins: ['prompt', 'llm', 'terminal'] }, a.token)).json.prefs.pins).toEqual(['prompt', 'llm', 'terminal']);
    expect((await t.call('PUT', '/v1/me/nodes', { pins: ['prompt', 'llm', 'html', 'gate', 'code', 'md', 'doc'] }, a.token)).status).toBe(400);
  });
});

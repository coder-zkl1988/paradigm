import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeApp } from './helpers';

// A stand-in for a service with the OpenAI Videos API format.
const MP4 = Buffer.from('00000020667479706973736f6d', 'hex');
const jobs = new Map<string, { polls: number; prompt: string; fail?: boolean }>();
let lastBody: any = null, lastAuth = '';
const svc: Server = createServer((req, res) => {
  const json = (code: number, o: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  lastAuth = String(req.headers.authorization || '');
  const m = /^\/v1\/videos(?:\/([^/]+))?(\/content)?$/.exec(req.url || '');
  if (!m) return json(404, { error: { message: 'no' } });
  if (req.method === 'POST' && !m[1]) {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      lastBody = JSON.parse(raw);
      if (lastBody.prompt === 'refuse') return json(400, { error: { message: 'This prompt is not allowed' } });
      const id = `video_${jobs.size + 1}`;
      jobs.set(id, { polls: 0, prompt: lastBody.prompt, fail: lastBody.prompt === 'break' });
      json(200, { id, object: 'video', status: 'queued' });
    });
    return;
  }
  const j = jobs.get(m[1] || '');
  if (!j) return json(404, { error: { message: 'No such video' } });
  if (m[2]) { res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': MP4.length }); return res.end(MP4); }
  j.polls++;
  if (j.fail) return json(200, { id: m[1], status: 'failed', error: { message: 'The model could not render this' } });
  json(200, { id: m[1], status: j.polls < 3 ? 'in_progress' : 'completed', progress: j.polls * 30 });
});

let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => {
  await new Promise<void>((ok) => svc.listen(0, '127.0.0.1', () => ok()));
  const url = `http://127.0.0.1:${(svc.address() as { port: number }).port}/v1`;
  t = await makeApp({ videoApiUrl: url, videoApiKey: 'vk', videoModel: 'some-video-model', videoPollMs: 10 });
});
afterAll(async () => { await t.close(); await new Promise<void>((ok) => svc.close(() => ok())); });

async function until(path: string, token: string) {
  for (let i = 0; i < 100; i++) {
    const r = await t.call('GET', path, undefined, token);
    if (r.json.status !== 'running') return r.json;
    await new Promise((ok) => setTimeout(ok, 20));
  }
  throw new Error('still running');
}

describe('video generation', () => {
  it('starts a job, waits for it and keeps the video', async () => {
    const { token } = await t.signup();
    const r = await t.call('POST', '/v1/media/videos', { prompt: 'A paper boat on a pond', ratio: '9:16', seconds: 8 }, token);
    expect(r.json).toMatchObject({ status: 'running', url: null });
    expect(r.json.simulated).toBeUndefined();
    expect(lastBody).toEqual({ model: 'some-video-model', prompt: 'A paper boat on a pond', seconds: '8', size: '720x1280' });
    expect(lastAuth).toBe('Bearer vk');
    const done = await until(`/v1/media/videos/${r.json.jobId}`, token);
    expect(done.status).toBe('done');
    const file = await fetch(t.base + done.url);
    expect(file.headers.get('content-type')).toMatch(/video\/mp4/);
    expect(Buffer.from(await file.arrayBuffer()).equals(MP4)).toBe(true);
  });

  it('passes on why a job failed', async () => {
    const { token } = await t.signup();
    const r = await t.call('POST', '/v1/media/videos', { prompt: 'break' }, token);
    const done = await until(`/v1/media/videos/${r.json.jobId}`, token);
    expect(done).toMatchObject({ status: 'failed', error: 'The model could not render this' });
    const refused = await t.call('POST', '/v1/media/videos', { prompt: 'refuse' }, token);
    expect(refused.status).toBe(502);
    expect(refused.json.error).toBe('This prompt is not allowed');
  });

  it('keeps jobs to their owner, and says videos are real in the status', async () => {
    const a = await t.signup(), b = await t.signup();
    const r = await t.call('POST', '/v1/media/videos', { prompt: 'A kite' }, a.token);
    expect((await t.call('GET', `/v1/media/videos/${r.json.jobId}`, undefined, b.token)).status).toBe(404);
    expect((await t.call('GET', '/v1/status', undefined, a.token)).json.videos).toEqual({ real: true, provider: 'some-video-model' });
  });

  it('finishes at once as a stand-in without a service', async () => {
    const off = await makeApp();
    const { token } = await off.signup();
    const r = await off.call('POST', '/v1/media/videos', { prompt: 'A kite' }, token);
    await off.close();
    expect(r.json).toMatchObject({ status: 'done', url: null, simulated: true });
  });
});

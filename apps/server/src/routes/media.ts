// Image and video generation. Images: OpenRouter through pi-ai when
// OPENROUTER_API_KEY is set, else OpenAI when OPENAI_API_KEY is set, else a
// stand-in. Videos: no provider is wired in yet, so jobs finish at once as
// stand-ins; add one in makeVideo().

import type { FastifyInstance } from 'fastify';
import type { Deps } from '../app';
import { now } from '../db';
import { need } from '../lib/auth';
import { HttpError, notFound } from '../lib/errors';
import { body, str } from '../lib/http';
import { newId } from '../lib/ids';
import { saveFile } from '../lib/files';
import { getModels } from '../agents/pi';

const SIZE: Record<string, string> = { '1:1': '1024x1024', '16:9': '1536x1024', '9:16': '1024x1536', '4:3': '1536x1024', '3:4': '1024x1536' };

export function imageProvider(): 'openrouter' | 'openai' | null {
  return process.env.OPENROUTER_API_KEY ? 'openrouter' : process.env.OPENAI_API_KEY ? 'openai' : null;
}

async function makeImage(prompt: string, ratio: string, model: string): Promise<{ data: Buffer; mime: string } | null> {
  const p = imageProvider();
  if (p === 'openrouter') {
    const m = getModels(), im = m.getModelOfType('image', 'openrouter', model || 'google/gemini-2.5-flash-image');
    if (!im) throw new HttpError(500, `The image model ${model} is not in the catalog`, 'config');
    const r = await m.generateImages(im, { input: [{ type: 'text', text: `${prompt}\n\nAspect ratio ${ratio}.` }] });
    if (r.stopReason === 'error') throw new HttpError(502, r.errorMessage || 'The image service answered with an error', 'upstream');
    const img = (r.output || []).find((b: any) => b.type === 'image');
    if (!img) throw new HttpError(502, 'The image service sent no picture', 'upstream');
    return { data: Buffer.from(img.data, 'base64'), mime: img.mimeType || 'image/png' };
  }
  if (p === 'openai') {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: model || 'gpt-image-1', prompt, size: SIZE[ratio] || '1024x1024', n: 1 }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(502, j?.error?.message || `The image service answered ${res.status}`, 'upstream');
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new HttpError(502, 'The image service sent no picture', 'upstream');
    return { data: Buffer.from(b64, 'base64'), mime: 'image/png' };
  }
  return null;
}

/** Hook for a video provider. Returns null while none is configured. */
async function makeVideo(_prompt: string, _ratio: string, _seconds: number): Promise<{ url: string } | null> {
  return null;
}

export function mediaRoutes(app: FastifyInstance, { db, cfg }: Deps) {
  app.post('/v1/media/images', async (req) => {
    const u = need(req), b = body(req), prompt = str(b.prompt, 'Description', { max: 8000 }), ratio = String(b.ratio || '1:1');
    const img = await makeImage(prompt, ratio, cfg.imageModel);
    if (!img) return { url: null, simulated: true, ratio };
    const ext = img.mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const f = await saveFile(db, cfg, u.id, `image.${ext}`, img.mime, img.data);
    return { url: f.url, ratio };
  });

  app.post('/v1/media/videos', async (req) => {
    const u = need(req), b = body(req), prompt = str(b.prompt, 'Description', { max: 8000 });
    const ratio = String(b.ratio || '16:9'), seconds = Number(b.seconds) || 4;
    const v = await makeVideo(prompt, ratio, seconds);
    const id = newId('job'), t = now();
    db.prepare('INSERT INTO video_jobs (id, owner_id, status, url, simulated, done_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, u.id, 'done', v?.url || null, v ? 0 : 1, t, t);
    return { jobId: id, status: 'done', url: v?.url || null, ...(v ? {} : { simulated: true }), ratio, seconds };
  });

  app.get('/v1/media/videos/:id', async (req) => {
    const u = need(req), j = db.prepare('SELECT * FROM video_jobs WHERE id = ? AND owner_id = ?').get((req.params as { id: string }).id, u.id) as any;
    if (!j) throw notFound('There is no such video job');
    return { jobId: j.id, status: j.status, url: j.url, ...(j.simulated ? { simulated: true } : {}) };
  });
}

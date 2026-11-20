// Video generation. Any service that speaks the OpenAI Videos API format
// works: POST /videos starts a job, GET /videos/{id} says how far it is, and
// GET /videos/{id}/content is the finished MP4. OpenAI shut its own Videos API
// down in September 2026; gateways that route the same calls to current
// models still offer it. Set VIDEO_API_URL (ending in /v1), VIDEO_API_KEY and
// VIDEO_MODEL. Jobs run in the background; the page asks until one is done.

import type { Config } from '../config';
import type { DB } from '../db';
import { now } from '../db';
import { saveFile } from './files';

export const videoReady = (cfg: Config) => !!(cfg.videoApiUrl && cfg.videoApiKey);

const SIZE: Record<string, string> = { '16:9': '1280x720', '9:16': '720x1280' };
const MAX_BYTES = 200 * 1024 * 1024, GIVE_UP_MS = 20 * 60_000;

async function call(cfg: Config, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${cfg.videoApiUrl}${path}`, { ...init, headers: { authorization: `Bearer ${cfg.videoApiKey}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(60_000) });
}

async function message(r: Response): Promise<string> {
  const j: any = await r.json().catch(() => null);
  return j?.error?.message || j?.message || `The video service answered ${r.status}`;
}

/** Starts a job at the provider and returns its id there. */
export async function startVideo(cfg: Config, prompt: string, ratio: string, seconds: number): Promise<string> {
  const r = await call(cfg, '/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: cfg.videoModel, prompt, seconds: String(seconds), size: SIZE[ratio] || SIZE['16:9'] }) });
  if (!r.ok) throw new Error(await message(r));
  const j: any = await r.json();
  if (!j?.id) throw new Error('The video service did not start a job');
  return String(j.id);
}

const active = new Set<string>();

/** Asks the provider until the job is done, then keeps the video as a file. Safe to call again after a restart. */
export function followVideo(db: DB, cfg: Config, jobId: string) {
  if (active.has(jobId)) return;
  active.add(jobId);
  const job = db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(jobId) as { owner_id: string; provider_id: string; created_at: string };
  const fail = (e: string) => db.prepare("UPDATE video_jobs SET status = 'failed', error = ?, done_at = ? WHERE id = ?").run(e.slice(0, 500), now(), jobId);
  void (async () => {
    try {
      for (;;) {
        if (Date.now() - Date.parse(job.created_at) > GIVE_UP_MS) return fail('The video took too long to make. Try again.');
        const r = await call(cfg, `/videos/${encodeURIComponent(job.provider_id)}`).catch(() => null);
        if (r && r.ok) {
          const v: any = await r.json();
          if (v.status === 'failed') return fail(v.error?.message || 'The video service could not make this video');
          if (v.status === 'completed') break;
        } else if (r && r.status >= 400 && r.status < 500 && r.status !== 429) return fail(await message(r));
        await new Promise((ok) => setTimeout(ok, cfg.videoPollMs));
      }
      const c = await call(cfg, `/videos/${encodeURIComponent(job.provider_id)}/content`);
      if (!c.ok) return fail(await message(c));
      const size = Number(c.headers.get('content-length') || 0);
      if (size > MAX_BYTES) return fail('The video is too large to keep');
      const data = Buffer.from(await c.arrayBuffer());
      if (data.length > MAX_BYTES) return fail('The video is too large to keep');
      const f = await saveFile(db, cfg, job.owner_id, 'video.mp4', c.headers.get('content-type')?.split(';')[0] || 'video/mp4', data);
      db.prepare("UPDATE video_jobs SET status = 'done', url = ?, done_at = ? WHERE id = ?").run(f.url, now(), jobId);
    } catch (e) {
      fail((e as Error).message || 'The video service could not be reached');
    } finally {
      active.delete(jobId);
    }
  })();
}

// Small helpers shared by the routes: reading bodies safely and streaming
// Server-Sent Events.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { bad } from './errors';

export const body = (req: FastifyRequest): Record<string, any> => {
  const b = req.body;
  if (b === undefined || b === null) return {};
  if (typeof b !== 'object' || Array.isArray(b)) throw bad('Send a JSON object');
  return b as Record<string, any>;
};

export function str(v: unknown, name: string, o: { min?: number; max?: number; optional?: boolean } = {}): string {
  if (v === undefined || v === null || v === '') { if (o.optional) return ''; throw bad(`${name} is missing`); }
  if (typeof v !== 'string') throw bad(`${name} must be text`);
  const s = v.trim();
  if (o.min && s.length < o.min) throw bad(`${name} is too short`);
  if (s.length > (o.max ?? 10_000)) throw bad(`${name} is too long`);
  return s;
}

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function sse(req: FastifyRequest, reply: FastifyReply, origin: string | undefined) {
  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  });
  let open = true;
  const ping = setInterval(() => { if (open) raw.write(': ping\n\n'); }, 15000);
  // The response closes when the page goes away (the request's own close fires as soon as its body is read).
  raw.on('close', () => { open = false; clearInterval(ping); });
  return {
    get open() { return open; },
    send(data: unknown) { if (open) raw.write(`data: ${JSON.stringify(data)}\n\n`); },
    end() { if (!open) return; open = false; clearInterval(ping); raw.end(); },
    onClose(fn: () => void) { raw.on('close', fn); },
  };
}

export const wantsStream = (req: FastifyRequest) => /text\/event-stream/.test(String(req.headers.accept || ''));

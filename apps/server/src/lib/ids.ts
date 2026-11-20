import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** A short random id with a readable prefix, such as `b_k3j9x2m1q8`. */
export const newId = (prefix: string) => prefix + '_' + randomBytes(8).toString('base64url').replace(/[-_]/g, '').slice(0, 10).toLowerCase();
/** A secret for links and sessions. Only its hash is stored. */
export const newSecret = () => randomBytes(32).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16), key = await scrypt(pw, salt, 64);
  return 'scrypt$' + salt.toString('base64') + '$' + key.toString('base64');
}

export async function checkPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [kind, s, k] = stored.split('$');
  if (kind !== 'scrypt' || !s || !k) return false;
  const want = Buffer.from(k, 'base64'), got = await scrypt(pw, Buffer.from(s, 'base64'), want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}

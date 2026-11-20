import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SMTPServer } from 'smtp-server';
import { makeApp } from './helpers';

// A real SMTP server on a local port, so the mail goes over the wire.
const inbox: { to: string[]; raw: string }[] = [];
const smtp = new SMTPServer({
  authOptional: true, disabledCommands: ['STARTTLS'], logger: false,
  onData(stream, session, done) {
    let raw = '';
    stream.on('data', (c: Buffer) => { raw += c.toString(); });
    stream.on('end', () => { inbox.push({ to: session.envelope.rcptTo.map((r) => r.address), raw }); done(); });
  },
});
let port = 0;
let t: Awaited<ReturnType<typeof makeApp>>;
beforeAll(async () => {
  await new Promise<void>((ok) => smtp.listen(0, '127.0.0.1', () => ok()));
  port = (smtp.server.address() as { port: number }).port;
  t = await makeApp({ smtpUrl: `smtp://127.0.0.1:${port}`, mailFrom: 'Paradigm <no-reply@example.com>', devMail: true });
});
afterAll(async () => { await t.close(); await new Promise<void>((ok) => smtp.close(() => ok())); });

describe('email over SMTP', () => {
  it('sends the sign-in link and does not hand it back to the page', async () => {
    const r = await t.call('POST', '/v1/auth/link', { email: 'ana@example.com' });
    expect(r.status).toBe(200);
    expect(r.json.delivered).toBe(true);
    expect(r.json.devLink).toBeUndefined();
    const mail = inbox.find((m) => m.to.includes('ana@example.com'))!;
    expect(mail.raw).toMatch(/Subject: Your sign-in link/);
    const body = mail.raw.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); // quoted-printable
    const token = /signin\?link=([\w-]+)/.exec(body)![1];
    const signed = await t.call('POST', '/v1/auth/link/verify', { token });
    expect(signed.status).toBe(200);
    expect(signed.json.user.email).toBe('ana@example.com');
  });

  it('sends invites', async () => {
    const { token } = await t.signup();
    const ws = (await t.call('POST', '/v1/workspaces', { name: 'Studio' }, token)).json.workspace;
    const r = await t.call('POST', `/v1/workspaces/${ws.id}/invites`, { emails: ['bo@example.com'], role: 'editor' }, token);
    expect(r.status).toBe(200);
    expect(r.json.sent[0].devLink).toBeUndefined();
    expect(inbox.some((m) => m.to.includes('bo@example.com') && /invited you to Studio/.test(m.raw))).toBe(true);
  });

  it('says so when the mail server cannot be reached', async () => {
    const down = await makeApp({ smtpUrl: 'smtp://127.0.0.1:1', mailFrom: 'x@example.com' });
    const r = await down.call('POST', '/v1/auth/link', { email: 'cy@example.com' });
    await down.close();
    expect(r.status).toBe(502);
    expect(r.json.code).toBe('mail_failed');
  });

  it('reports mail as real in the status', async () => {
    const { token } = await t.signup();
    expect((await t.call('GET', '/v1/status', undefined, token)).json.mail).toEqual({ real: true, provider: 'smtp' });
  });
});

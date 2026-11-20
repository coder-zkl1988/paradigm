// Email. No mail service is wired in: in development the link is printed to the
// log and handed back to the caller so the page can show it. Plug a provider in
// here (SMTP, Resend, SES) to send real mail.

import type { FastifyBaseLogger } from 'fastify';

export interface Mail { to: string; subject: string; text: string; link: string }

export interface Mailer { send(m: Mail): Promise<{ delivered: boolean; devLink?: string }> }

export function devMailer(log: FastifyBaseLogger, returnLinks: boolean): Mailer {
  return {
    async send(m) {
      log.info({ to: m.to, subject: m.subject, link: m.link }, 'mail (not sent: no mail service configured)');
      return { delivered: false, devLink: returnLinks ? m.link : undefined };
    },
  };
}

// Email. With SMTP_URL set, mail goes out over SMTP (any provider: SES,
// Postmark, Resend, Mailgun and others all offer an SMTP address). Without it,
// in development, the link is printed to the log and handed back to the caller
// so the page can show it.

import type { FastifyBaseLogger } from 'fastify';
import nodemailer from 'nodemailer';
import { HttpError } from './errors';

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

/** Sends through SMTP. `url` is like smtps://user:password@smtp.example.com:465. */
export function smtpMailer(log: FastifyBaseLogger, url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    async send(m) {
      try {
        await transport.sendMail({ from, to: m.to, subject: m.subject, text: m.text });
        return { delivered: true };
      } catch (e) {
        log.error({ err: e, to: m.to, subject: m.subject }, 'mail could not be sent');
        throw new HttpError(502, "We couldn't send the email just now. Try again in a minute.", 'mail_failed');
      }
    },
  };
}

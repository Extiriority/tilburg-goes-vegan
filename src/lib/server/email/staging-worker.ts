import nodemailer from 'nodemailer';
import { connect } from 'cloudflare:sockets';
import { Duplex } from 'node:stream';
import type { Socket } from 'node:net';
import type { SMTPTransportOptions } from 'nodemailer/lib/smtp-transport';
import {
  claimLocalConfirmation, finishLocalConfirmation, renderClaimedConfirmation, type SendOutcome,
} from './local-outbox.ts';

interface Env {
  DB: D1Database;
  APP_ENV: string;
  STAGING_ORIGIN: string;
  MAILGUN_STAGING_RECIPIENTS?: string;
  MAILGUN_SMTP_USERNAME?: string;
  MAILGUN_SMTP_PASSWORD?: string;
  MANAGEMENT_TOKEN_SECRET?: string;
}

function smtpOutcome(error: unknown): SendOutcome {
  const code = (error as { responseCode?: number } | null)?.responseCode;
  if (typeof code === 'number' && code >= 400 && code < 500) return 'temporary';
  if (typeof code === 'number' && code >= 500 && code < 600) return 'permanent';
  return 'uncertain';
}

export default {
  async scheduled(_controller, env) {
    const { DB, STAGING_ORIGIN, MAILGUN_SMTP_USERNAME: user, MAILGUN_SMTP_PASSWORD: pass, MANAGEMENT_TOKEN_SECRET: secret } = env;
    if (env.APP_ENV !== 'staging' || !/^https:\/\/tilburg-goes-vegan-staging\.[a-z0-9-]+\.workers\.dev$/.test(STAGING_ORIGIN) ||
        !user || !/^postmaster@sandbox[a-z0-9]+\.mailgun\.org$/.test(user) || !pass || !secret || secret.length < 32) return;
    const recipients = [...new Set(env.MAILGUN_STAGING_RECIPIENTS?.split(',').map(email => email.trim().toLowerCase()))];
    if (recipients.length !== 2 || recipients.some(email => !/^[^\s<>,;@]+@[^\s<>,;@]+\.[^\s<>,;@]+$/.test(email))) return;

    const now = Date.now();
    const pending = await DB.prepare(`SELECT 1 FROM email_outbox
      WHERE recipient IN (?,?) AND status='pending' AND template='registration_confirmed'
        AND next_attempt_at<=? AND purge_at>? AND attempts<3 LIMIT 1`)
      .bind(...recipients, now, now).first();
    if (!pending) return;

    const transportOptions: SMTPTransportOptions = {
      host: 'smtp.mailgun.org', port: 465, secure: true, auth: { user, pass },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
      disableFileAccess: true, disableUrlAccess: true,
      getSocket(_options, callback) {
        const socket = connect({ hostname: 'smtp.mailgun.org', port: 465 }, { secureTransport: 'on', allowHalfOpen: false });
        const timer = setTimeout(() => void socket.close().catch(() => {}), 20000);
        void socket.closed.then(() => clearTimeout(timer), () => clearTimeout(timer));
        void socket.opened.then(() => {
          const streams = { readable: socket.readable, writable: socket.writable };
          const stream = Duplex.fromWeb(streams as Parameters<typeof Duplex.fromWeb>[0]);
          // The underlying Workers socket has a hard deadline instead of Node's idle timeout.
          const connection = Object.assign(stream, { setTimeout: () => stream }) as unknown as Socket;
          callback(null, { connection, secured: true });
        }, () => callback(Object.assign(new Error('Cloudflare SMTP socket could not connect'), { code: 'WORKER_SOCKET' })));
      },
    };
    const transport = nodemailer.createTransport(transportOptions);
    try {
      await transport.verify();
    } catch (error) {
      const details = error as { code?: string; command?: string; responseCode?: number } | null;
      const safeCode = /^[A-Z0-9_]{1,40}$/.test(details?.code ?? '') ? details?.code : undefined;
      const safeCommand = /^[A-Z ]{1,20}$/.test(details?.command ?? '') ? details?.command : undefined;
      console.warn('Staging SMTP preflight failed', smtpOutcome(error), safeCode, safeCommand);
      return;
    }

    for (const recipient of recipients) {
      const claim = await claimLocalConfirmation(DB, recipient, Date.now());
      if (!claim) continue;
      const message = await renderClaimedConfirmation(DB, claim, secret, Date.now(), STAGING_ORIGIN);
      let outcome: SendOutcome = 'permanent';
      if (message) {
        try {
          const result = await transport.sendMail({ from: user, to: recipient, subject: message.subject,
            text: message.body, html: message.html,
            headers: { 'X-Mailgun-Track-Clicks': 'no', 'X-Mailgun-Track-Opens': 'no' },
          });
          outcome = result.accepted.length === 1 ? 'accepted' : 'uncertain';
        } catch (error) {
          outcome = smtpOutcome(error);
        }
      }
      await finishLocalConfirmation(DB, claim.id, claim.attempts, outcome, Date.now());
    }
  },
} satisfies ExportedHandler<Env>;

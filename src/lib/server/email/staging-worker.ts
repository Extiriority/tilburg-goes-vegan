import nodemailer from 'nodemailer';
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

    const transport = nodemailer.createTransport({
      host: 'smtp.mailgun.org', port: 587, secure: false, requireTLS: true, auth: { user, pass },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
      disableFileAccess: true, disableUrlAccess: true,
    });
    try {
      await transport.verify();
    } catch (error) {
      console.warn('Staging SMTP preflight failed', smtpOutcome(error));
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

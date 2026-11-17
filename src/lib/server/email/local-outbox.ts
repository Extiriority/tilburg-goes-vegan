import { hashToken, managementToken } from '../registrations/tokens.ts';
import { renderLocalConfirmation } from './confirmation.ts';

const MAX_ATTEMPTS = 3;

export async function claimLocalConfirmation(db: D1Database, recipient: string, now: number) {
  return db.prepare(`UPDATE email_outbox
    SET status='sending', attempts=attempts+1, lease_until=?
    WHERE id=(SELECT o.id FROM email_outbox o
      JOIN registrations r ON r.id=o.registration_id AND r.event_id=o.event_id
      JOIN events e ON e.id=o.event_id
      WHERE o.recipient=? AND o.template='registration_confirmed' AND o.status='pending'
        AND o.next_attempt_at<=? AND o.purge_at>? AND o.attempts<?
        AND r.email_normalized=o.recipient AND r.status='confirmed' AND r.anonymized_at IS NULL
        AND e.status='scheduled' AND e.starts_at>?
      ORDER BY o.created_at,o.id LIMIT 1)
    RETURNING id,attempts,locale`)
    .bind(now + 120000, recipient, now, now, MAX_ATTEMPTS, now)
    .first<{ id: string; attempts: number; locale: 'en' | 'nl' }>();
}

export type SendOutcome = 'accepted' | 'temporary' | 'permanent' | 'uncertain';

export async function renderClaimedConfirmation(
  db: D1Database,
  claim: { id: string; attempts: number; locale: 'en' | 'nl' },
  secret: string,
  now: number,
  stagingOrigin?: string,
) {
  const record = await db.prepare(`SELECT r.id,r.full_name,e.starts_at,v.name AS venue,v.address,t.token_hash
    FROM email_outbox o JOIN registrations r ON r.id=o.registration_id AND r.event_id=o.event_id
    JOIN events e ON e.id=r.event_id JOIN venues v ON v.id=e.venue_id
    JOIN registration_tokens t ON t.registration_id=r.id
    WHERE o.id=? AND o.status='sending' AND o.attempts=? AND o.purge_at>? AND r.status='confirmed'
      AND r.email_normalized=o.recipient AND r.anonymized_at IS NULL AND e.status='scheduled'
      AND e.starts_at>? AND t.revoked_at IS NULL AND t.expires_at>?
    ORDER BY t.created_at DESC LIMIT 1`)
    .bind(claim.id, claim.attempts, now, now, now)
    .first<{ id: string; full_name: string; starts_at: number; venue: string; address: string; token_hash: string }>();
  if (!record) return null;
  const token = await managementToken(secret, record.id);
  if (await hashToken(token) !== record.token_hash) return null;
  return renderLocalConfirmation({
    locale: claim.locale, fullName: record.full_name, startsAt: record.starts_at,
    venue: record.venue, address: record.address, token, stagingOrigin,
  });
}

export async function finishLocalConfirmation(db: D1Database, id: string, attempt: number, outcome: SendOutcome, now: number) {
  const retry = outcome === 'temporary' && attempt < MAX_ATTEMPTS;
  const status = outcome === 'accepted' ? 'sent' : retry ? 'pending' : 'failed';
  const next = retry ? now + 60000 * 2 ** (attempt - 1) : now;
  const guard = "id=? AND attempts=? AND status='sending' AND template='registration_confirmed'";
  const results = await db.batch([
    db.prepare(`INSERT INTO email_attempts (id,outbox_id,attempted_at,outcome_code)
      SELECT ?,id,?,? FROM email_outbox WHERE ${guard}`)
      .bind(crypto.randomUUID(), now, outcome, id, attempt),
    db.prepare(`UPDATE email_outbox SET status=?,sent_at=?,next_attempt_at=?,lease_until=NULL WHERE ${guard}`)
      .bind(status, outcome === 'accepted' ? now : null, next, id, attempt),
  ]);
  return results[1].meta.changes === 1 ? status : null;
}

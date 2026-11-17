import { getPlatformProxy } from 'wrangler';
import { claimLocalConfirmation, finishLocalConfirmation } from '../src/lib/server/email/local-outbox.ts';
import { renderLocalConfirmation } from '../src/lib/server/email/confirmation.ts';
import { managementToken, hashToken } from '../src/lib/server/registrations/tokens.ts';

const [action, value, attempt, outcome, ...extra] = process.argv.slice(2);
const validClaim = action === 'claim' && /^[^\s<>,;@]+@[^\s<>,;@]+\.[^\s<>,;@]+$/.test(value ?? '') && !attempt && !outcome;
const validFinish = action === 'finish' && /^[\da-f-]{36}$/.test(value ?? '') &&
  /^[1-3]$/.test(attempt ?? '') && ['accepted', 'temporary', 'permanent', 'uncertain'].includes(outcome);
if (extra.length || (!validClaim && !validFinish)) throw new Error('Invalid local outbox arguments');
if (validClaim && process.stdout.isTTY) throw new Error('Use the PowerShell sender so the private link is not printed.');
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: true, remoteBindings: false });
let result;
try {
  const db = proxy.env.DB;
  if (validClaim) {
    const secret = proxy.env.MANAGEMENT_TOKEN_SECRET;
    if (typeof secret !== 'string' || secret.length < 32) throw new Error('Local signing key is missing.');
    result = await claimLocalConfirmation(db, value.toLowerCase(), Date.now());
    if (result) {
      const record = await db.prepare(`SELECT r.id,r.full_name,e.starts_at,v.name AS venue,v.address,t.token_hash
        FROM email_outbox o JOIN registrations r ON r.id=o.registration_id AND r.event_id=o.event_id
        JOIN events e ON e.id=r.event_id JOIN venues v ON v.id=e.venue_id
        JOIN registration_tokens t ON t.registration_id=r.id
        WHERE o.id=? AND o.status='sending' AND o.attempts=? AND o.purge_at>? AND r.status='confirmed'
          AND r.email_normalized=o.recipient AND r.anonymized_at IS NULL AND e.status='scheduled'
          AND e.starts_at>? AND t.revoked_at IS NULL AND t.expires_at>?
        ORDER BY t.created_at DESC LIMIT 1`)
        .bind(result.id, result.attempts, Date.now(), Date.now(), Date.now()).first();
      const token = record && await managementToken(secret, record.id);
      if (!token || await hashToken(token) !== record.token_hash) {
        await finishLocalConfirmation(db, result.id, result.attempts, 'permanent', Date.now());
        result = { blocked: true };
      } else {
        result = { ...result, ...renderLocalConfirmation({
          locale: result.locale, fullName: record.full_name, startsAt: record.starts_at,
          venue: record.venue, address: record.address, token,
        }) };
      }
    }
  } else {
    result = await finishLocalConfirmation(db, value, Number(attempt), outcome, Date.now());
  }
} finally {
  await proxy.dispose();
}
// Wrangler may also write startup information to stdout.
console.log('TGV_OUTBOX_RESULT=' + Buffer.from(JSON.stringify(result), 'utf8').toString('base64'));

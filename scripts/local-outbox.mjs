import { getPlatformProxy } from 'wrangler';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { claimLocalConfirmation, finishLocalConfirmation } from '../src/lib/server/email/local-outbox.ts';
import { renderLocalConfirmation } from '../src/lib/server/email/confirmation.ts';
import { managementToken, hashToken } from '../src/lib/server/registrations/tokens.ts';

const args = process.argv.slice(2);
const staging = args[0] === '--staging';
if (staging) args.shift();
const [action, value, attempt, outcome, ...extra] = args;
const validClaim = action === 'claim' && /^[^\s<>,;@]+@[^\s<>,;@]+\.[^\s<>,;@]+$/.test(value ?? '') && !attempt && !outcome;
const validFinish = action === 'finish' && /^[\da-f-]{36}$/.test(value ?? '') &&
  /^[1-3]$/.test(attempt ?? '') && ['accepted', 'temporary', 'permanent', 'uncertain'].includes(outcome);
if (extra.length || (!validClaim && !validFinish)) throw new Error('Invalid outbox arguments');
if (validClaim && process.stdout.isTTY) throw new Error('Use the PowerShell sender so the private link is not printed.');
// Wrangler sends semicolon-separated statements to D1 in one batch.
function remoteStagingDatabase(configPath) {
  const execute = (statements) => {
    const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js',
      'd1', 'execute', 'tgv-staging', '--remote', '--config', configPath,
      '--command', statements.join(';\n'), '--json'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Staging D1 query failed. Check your Wrangler sign-in.');
    const rows = JSON.parse(result.stdout);
    if (rows.length !== statements.length || rows.some(row => !row.success)) throw new Error('Staging D1 returned an incomplete result.');
    return rows;
  };
  return {
    prepare: (sql) => ({ bind: (...parameters) => {
      const parts = sql.split('?');
      if (parts.length !== parameters.length + 1) throw new Error('Unexpected SQL parameters.');
      const statement = parameters.reduce((bound, value, index) => {
        if (value === null) return bound + 'NULL' + parts[index + 1];
        if (Number.isSafeInteger(value)) return bound + String(value) + parts[index + 1];
        if (typeof value !== 'string') throw new Error('Invalid SQL parameter.');
        return bound + `CAST(X'${Buffer.from(value).toString('hex')}' AS TEXT)` + parts[index + 1];
      }, parts[0]);
      return { statement, first: async () => execute([statement])[0].results[0] ?? null };
    } }),
    batch: async (queries) => execute(queries.map(query => query.statement)),
  };
}
let proxy;
let stagingOrigin;
let stagingSecret;
let db;
let result;
try {
  if (staging) {
    const configPath = 'wrangler.staging.local.jsonc';
    const config = JSON.parse(readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
    const [database] = config.d1_databases;
    stagingOrigin = config.vars.STAGING_ORIGIN;
    if (config.name !== 'tilburg-goes-vegan-staging' || config.vars.APP_ENV !== 'staging' ||
        stagingOrigin !== 'https://tilburg-goes-vegan-staging.vhg-trang.workers.dev' ||
        database.binding !== 'DB' || database.database_name !== 'tgv-staging' ||
        database.database_id !== '53c62c64-68b5-4a8a-8db0-27b6de27a348') throw new Error('Unexpected staging target.');
    if (validClaim) {
      const { MAILGUN_STAGING_RECIPIENTS } = parseEnv(readFileSync('.env.staging-mail', 'utf8'));
      const allowed = MAILGUN_STAGING_RECIPIENTS?.split(',').map(email => email.trim().toLowerCase());
      if (!allowed?.includes(value.toLowerCase())) throw new Error('Recipient is not approved for staging.');
      stagingSecret = parseEnv(readFileSync('.env.staging-secrets', 'utf8')).MANAGEMENT_TOKEN_SECRET;
    }
    db = remoteStagingDatabase(configPath);
  } else {
    proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', persist: true, remoteBindings: false });
    db = proxy.env.DB;
  }
  if (validClaim) {
    const secret = staging ? stagingSecret : proxy.env.MANAGEMENT_TOKEN_SECRET;
    if (typeof secret !== 'string' || secret.length < 32) throw new Error('Management signing key is missing.');
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
          venue: record.venue, address: record.address, token, stagingOrigin,
        }) };
      }
    }
  } else {
    result = await finishLocalConfirmation(db, value, Number(attempt), outcome, Date.now());
  }
} finally {
  await proxy?.dispose();
}
// Wrangler may also write startup information to stdout.
console.log('TGV_OUTBOX_RESULT=' + Buffer.from(JSON.stringify(result), 'utf8').toString('base64'));

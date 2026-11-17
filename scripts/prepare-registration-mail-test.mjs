import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { register } from '../src/lib/server/registrations/service.ts';
import { createSubmissionToken } from '../src/lib/server/registrations/tokens.ts';

// The verified address is applied by PowerShell only at send time.
const recipient = 'sandbox-test@example.invalid';
const migrations = new URL('../drizzle/', import.meta.url);
const runtime = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response(null,{status:404})}}',
  compatibilityDate: '2025-10-11',
  d1Databases: ['DB'],
  d1Persist: false,
});
try {
  const db = await runtime.getD1Database('DB');
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    const statements = readFileSync(new URL(file, migrations), 'utf8')
      .split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean);
    await db.batch(statements.map(sql => db.prepare(sql)));
  }
  const now = Date.now(), day = 86400000;
  await db.prepare(`INSERT INTO events
    (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at)
    VALUES ('mail-test','mail-test','mail-test',?,?,'tgv-v39',30,?,?)`)
    .bind(now + 14 * day, now + 14 * day + 10800000, now + 12 * day, now).run();
  const secret = crypto.randomUUID();
  const { registration } = await register(db, secret, {
    eventId: 'mail-test', fullName: 'Test Guest', email: recipient, role: 'guest',
    language: 'en', undecided: false, dietaryNotes: null, dietaryConsent: false,
    comments: null, submissionToken: await createSubmissionToken(secret),
  }, now);
  const { results } = await db.prepare('SELECT event_id,registration_id,recipient,template,status FROM email_outbox').all();
  const [intent] = results;
  if (results.length !== 1 || intent.event_id !== 'mail-test' ||
      intent.registration_id !== registration.id || intent.recipient !== recipient ||
      intent.template !== 'registration_confirmed' || intent.status !== 'pending') {
    throw new Error('Expected exactly one synthetic registration confirmation');
  }
  console.log(JSON.stringify({
    subject: 'Tilburg Goes Vegan - registration confirmed (sandbox test)',
    body: 'Hi Test Guest,\n\nYour sample dinner registration is confirmed. This is a sandbox test from the registration queue. No real seat was reserved.\n\nTilburg Goes Vegan',
  }));
} finally {
  await runtime.dispose();
}

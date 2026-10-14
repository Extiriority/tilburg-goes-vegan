import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { cleanupPrivacy } from '../src/lib/server/privacy/cleanup';

const DAY = 86_400_000;
// Dinner before the Amsterdam spring DST transition: elapsed-day rules stay UTC.
const end = Date.parse('2026-03-28T21:00:00Z');
let mf: Miniflare;
let db: D1Database;
beforeEach(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2025-10-11', d1Databases: ['DB'] });
  db = await mf.getD1Database('DB') as unknown as D1Database;
  for (const file of readdirSync('drizzle').filter(file => file.endsWith('.sql')).sort()) {
    for (const sql of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run();
  }
  await db.prepare(`INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at)
    VALUES ('e','privacy-test','privacy-test',?,?,'tgv-v39',30,?,0)`).bind(end - 10800000, end, end - 3 * DAY).run();
  for (const [i, status] of ['confirmed','waiting_list','undecided','cancelled'].entries()) {
    await db.prepare(`INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,dietary_notes,dietary_consent_at,comments,created_at,updated_at)
      VALUES (?,'e',?,'Synthetic person','guest',?,'en','Synthetic dietary note',1,'Synthetic comment',0,0)`)
      .bind(`r${i}`,`privacy${i}@example.invalid`,status).run();
  }
  await db.prepare("INSERT INTO registration_tokens VALUES ('token','r0','synthetic-hash',?,NULL,0)").bind(end).run();
  await db.prepare("INSERT INTO registration_mutations VALUES ('mutation','r0',1,'details',1,0)").run();
  await db.prepare(`INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,next_attempt_at,purge_at,created_at)
    VALUES ('mail','synthetic-key','e','r0','privacy0@example.invalid','confirmation','en',0,?,0)`)
    .bind(end + 30 * DAY).run();
  await db.prepare("INSERT INTO email_attempts VALUES ('attempt','mail',0,'test_failure')").run();
});
afterEach(async () => { await mf?.dispose(); });
const count = async (table: string) => (await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;

it('purges dietary notes and consent exactly at +24h, retaining identity until +7d', async () => {
  expect(await cleanupPrivacy(db, end + DAY - 1)).toEqual({dietaryRows:0,deletedRegistrations:0,deletedEmails:0});
  expect(await cleanupPrivacy(db, end + DAY)).toEqual({dietaryRows:4,deletedRegistrations:0,deletedEmails:0});
  const rows = await db.prepare('SELECT dietary_notes,dietary_consent_at,full_name,comments FROM registrations').all();
  expect(rows.results).toHaveLength(4);
  for (const row of rows.results) expect(row).toEqual({dietary_notes:null,dietary_consent_at:null,full_name:'Synthetic person',comments:'Synthetic comment'});
  await cleanupPrivacy(db, end + 7 * DAY - 1);
  expect(await count('registrations')).toBe(4);
  expect(await count('privacy_cleanup_runs')).toBe(1);
});

it('deletes all participant states and linked data at +7d, preserving event details', async () => {
  expect(await cleanupPrivacy(db, end + 7 * DAY)).toEqual({dietaryRows:4,deletedRegistrations:4,deletedEmails:1});
  for (const table of ['registrations','registration_tokens','registration_mutations','email_outbox','email_attempts']) expect(await count(table)).toBe(0);
  expect(await count('events')).toBe(1);
  const receipts = await db.prepare('SELECT kind,cutoff,affected_rows FROM privacy_cleanup_runs ORDER BY kind').all();
  expect(receipts.results).toEqual([{kind:'dietary',cutoff:end+DAY,affected_rows:4},{kind:'identity',cutoff:end+7*DAY,affected_rows:4}]);
});

it('uses the scheduled end for cancelled events and catches up after downtime', async () => {
  await db.prepare("UPDATE events SET status='cancelled' WHERE id='e'").run();
  await cleanupPrivacy(db, end + 30 * DAY);
  expect(await count('registrations')).toBe(0);
  expect(await count('privacy_cleanup_runs')).toBe(2);
});

it('is safe on concurrent/repeated runs and re-cleans restored data despite receipts', async () => {
  const now = end + 7 * DAY;
  const runs = await Promise.all([cleanupPrivacy(db,now),cleanupPrivacy(db,now)]);
  expect(runs.reduce((n,r) => n+r.deletedRegistrations,0)).toBe(4);
  expect(await count('privacy_cleanup_runs')).toBe(2);
  expect(await cleanupPrivacy(db,now)).toEqual({dietaryRows:0,deletedRegistrations:0,deletedEmails:0});
  await db.prepare(`INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,created_at,updated_at)
    VALUES ('restored','e','restored@example.invalid','Restored synthetic','guest','cancelled','en',0,0)`).run();
  expect((await cleanupPrivacy(db,now)).deletedRegistrations).toBe(1);
  expect(await count('privacy_cleanup_runs')).toBe(2);
});

it('rolls back the whole event cleanup when a receipt write fails, then retries', async () => {
  await db.prepare("CREATE TRIGGER fail_cleanup BEFORE INSERT ON privacy_cleanup_runs WHEN NEW.kind='identity' BEGIN SELECT RAISE(ABORT,'injected'); END").run();
  await expect(cleanupPrivacy(db,end+7*DAY)).rejects.toThrow();
  expect(await count('registrations')).toBe(4);
  expect(await count('registration_tokens')).toBe(1);
  expect(await count('email_attempts')).toBe(1);
  expect(await count('privacy_cleanup_runs')).toBe(0);
  expect((await db.prepare("SELECT dietary_notes FROM registrations WHERE id='r0'").first())!.dietary_notes).toBe('Synthetic dietary note');
  await db.prepare('DROP TRIGGER fail_cleanup').run();
  await cleanupPrivacy(db,end+7*DAY);
  expect(await count('registrations')).toBe(0);
});

it('honors outbox purge deadlines even without an event or registration', async () => {
  await db.prepare(`INSERT INTO email_outbox (id,idempotency_key,recipient,template,locale,next_attempt_at,purge_at,created_at)
    VALUES ('orphan','orphan-key','synthetic@example.invalid','test','en',0,?,0)`).bind(end+DAY).run();
  expect((await cleanupPrivacy(db,end+DAY-1)).deletedEmails).toBe(0);
  expect((await cleanupPrivacy(db,end+DAY)).deletedEmails).toBe(1);
  expect(await count('email_outbox')).toBe(1);
});

it('rejects invalid clock values without deleting anything', async () => {
  await expect(cleanupPrivacy(db,NaN)).rejects.toThrow('Invalid cleanup time');
  expect(await count('registrations')).toBe(4);
});

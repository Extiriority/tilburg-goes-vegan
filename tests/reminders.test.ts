import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { queueDueReminders, reminderTimes } from '../src/lib/server/events/reminders';
import { cleanupPrivacy } from '../src/lib/server/privacy/cleanup';

let mf: Miniflare;
let db: D1Database;
const starts = Date.parse('2026-10-26T18:00:00Z');
const ends = starts + 3 * 3_600_000;
const cutoff = Date.parse('2026-10-24T14:00:00Z');
const saturday = Date.parse('2026-10-24T08:00:00Z');
const sunday = Date.parse('2026-10-25T17:00:00Z');
const at = (now: number) => ({
  prepare: (sql: string) => db.prepare(sql.replaceAll("CAST(strftime('%s','now') AS INTEGER)*1000", String(now))),
  batch: (statements: D1PreparedStatement[]) => db.batch(statements),
}) as D1Database;
beforeEach(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2025-10-11', d1Databases: ['DB'] });
  db = await mf.getD1Database('DB') as unknown as D1Database;
  for (const file of readdirSync('drizzle').filter(file => file.endsWith('.sql')).sort()) {
    for (const sql of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)) await db.prepare(sql).run();
  }
  await db.prepare("INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES ('e','reminder-test','reminder-test',?,?,'tgv-v39',30,?,?)").bind(starts, ends, cutoff, saturday - 1000).run();
  for (const [id, status, language] of [['u','undecided','nl'],['c','confirmed','en'],['w','waiting_list','en'],['x','cancelled','nl']]) {
    await db.prepare("INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,created_at,updated_at) VALUES (?,'e',?,'Synthetic reminder guest','guest',?,?,?,?)")
      .bind(id, `${id}@example.invalid`, status, language, saturday - 1000, saturday - 1000).run();
  }
});
afterEach(async () => { await mf?.dispose(); });

it('uses Amsterdam Saturday 10:00 and Sunday 18:00 across DST', () => {
  expect(reminderTimes(starts, cutoff)).toEqual({ undecided: saturday, confirmed: sunday });
  expect(reminderTimes(Date.parse('2027-03-29T17:00:00Z'), Date.parse('2027-03-27T15:00:00Z'))).toEqual({
    undecided: Date.parse('2027-03-27T09:00:00Z'), confirmed: Date.parse('2027-03-28T16:00:00Z'),
  });
});
it('queues at exact deadlines once, even under concurrent runs, in the stored language', async () => {
  expect(await queueDueReminders(at(saturday-1), saturday-1)).toEqual({ queued: 0 });
  const runs = await Promise.all([queueDueReminders(at(saturday), saturday), queueDueReminders(at(saturday), saturday)]);
  expect(runs.reduce((sum, result) => sum + result.queued, 0)).toBe(1);
  expect(await queueDueReminders(at(sunday-1), sunday-1)).toEqual({ queued: 0 });
  expect(await queueDueReminders(at(sunday), sunday)).toEqual({ queued: 1 });
  expect(await queueDueReminders(at(sunday+1000), sunday+1000)).toEqual({ queued: 0 });
  expect((await db.prepare('SELECT template,locale,purge_at FROM email_outbox ORDER BY template').all()).results).toEqual([
    { template: 'reminder_confirmed', locale: 'en', purge_at: ends + 7 * 86_400_000 },
    { template: 'reminder_undecided', locale: 'nl', purge_at: ends + 7 * 86_400_000 },
  ]);
});
it('catches up within the window, never after cutoff/start or for cancelled events', async () => {
  expect(await queueDueReminders(at(cutoff), cutoff)).toEqual({ queued: 0 });
  expect(await queueDueReminders(at(starts), starts)).toEqual({ queued: 0 });
  await db.prepare("UPDATE events SET status='cancelled' WHERE id='e'").run();
  expect(await queueDueReminders(at(sunday), sunday)).toEqual({ queued: 0 });
});
it('checks database time as well as request time', async () => {
  expect(await queueDueReminders(at(saturday-1000), saturday)).toEqual({ queued: 0 });
  expect(await queueDueReminders(at(cutoff), saturday)).toEqual({ queued: 0 });
});
it('rolls back failed inserts and can retry without duplicate intents', async () => {
  await db.prepare("CREATE TRIGGER fail_reminder BEFORE INSERT ON email_outbox BEGIN SELECT RAISE(ABORT,'synthetic failure'); END").run();
  await expect(queueDueReminders(at(saturday), saturday)).rejects.toThrow();
  expect(await db.prepare('SELECT count(*) AS n FROM email_outbox').first('n')).toBe(0);
  await db.prepare('DROP TRIGGER fail_reminder').run();
  expect(await queueDueReminders(at(saturday+1000), saturday+1000)).toEqual({ queued: 1 });
});
it('deletes reminder recipients with identity at scheduled end plus seven days', async () => {
  await queueDueReminders(at(saturday), saturday);
  await cleanupPrivacy(db, ends + 7 * 86_400_000);
  expect(await db.prepare('SELECT count(*) AS n FROM email_outbox').first('n')).toBe(0);
});

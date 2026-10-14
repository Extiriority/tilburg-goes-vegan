import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { maintainUpcomingEvents } from '../src/lib/server/events/repository';

let mf: Miniflare;
let db: D1Database;
beforeEach(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2025-10-11', d1Databases: ['DB'] });
  db = await mf.getD1Database('DB') as unknown as D1Database;
  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(`drizzle/${file}`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
  await db.prepare("INSERT INTO venues (id,name,address,created_at) VALUES ('v','Test venue','Test address',0)").run();
  await db.prepare("INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES ('e','2026-10-26','test',10000,20000,'v',8,9000,0)").run();
});
afterEach(async () => { await mf?.dispose(); });
const signup = (id: string, role = 'guest', status = 'confirmed', email = `${id}@example.invalid`) => db.prepare('INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,created_at,updated_at) VALUES (?,\'e\',?,\'Test person\',?,?,\'en\',0,0)').bind(id,email,role,status);
const count = async () => (await db.prepare("SELECT count(*) AS n FROM registrations WHERE status='confirmed'").first<{n:number}>())!.n;

describe('D1 migrations and integrity', () => {
  it('uses capacity 30 and generates four dates idempotently without changing cancellations or edits', async () => {
    await db.prepare("DELETE FROM events WHERE id='e'").run();
    expect(await db.prepare('SELECT default_capacity FROM settings WHERE id=1').first()).toEqual({default_capacity:30});
    expect(await db.prepare('SELECT default_venue_id,organizer_email FROM settings WHERE id=1').first()).toEqual({default_venue_id:'tgv-v39',organizer_email:'tilburg@goesvegan.nl'});
    await db.prepare('UPDATE settings SET default_venue_id=NULL WHERE id=1').run();
    const now = Date.parse('2026-10-14T12:00:00Z');
    expect(await maintainUpcomingEvents(db,now)).toEqual({configured:false,created:0});
    await db.prepare("UPDATE settings SET default_venue_id='v' WHERE id=1").run();
    expect(await maintainUpcomingEvents(db,now)).toEqual({configured:true,created:4});
    await db.prepare("UPDATE events SET status='cancelled',description='Organizer edit' WHERE occurrence_key='2026-10-26'").run();
    expect(await maintainUpcomingEvents(db,now)).toEqual({configured:true,created:0});
    expect(await db.prepare("SELECT status,description,capacity FROM events WHERE occurrence_key='2026-10-26'").first()).toEqual({status:'cancelled',description:'Organizer edit',capacity:30});
    const results = await Promise.all([maintainUpcomingEvents(db,now),maintainUpcomingEvents(db,now)]);
    expect(results.every((r) => r.created===0)).toBe(true);
  });
  it('creates all 20 specified tables with foreign keys', async () => {
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{name:string}>();
    const expected = ['admin_sessions','admin_users','audit_events','dish_media','dishes','email_attempts','email_outbox','events','media_assets','password_reset_tokens','privacy_cleanup_runs','recipe_ingredients','recipe_media','recipe_steps','recipes','registration_tokens','registrations','scheduled_job_runs','settings','venues'];
    expect(tables.results.map((t) => t.name)).toEqual(expect.arrayContaining(expected));
    await expect(db.prepare("INSERT INTO registration_tokens VALUES ('t','missing','hash',1,NULL,0)").run()).rejects.toThrow();
  });
  it('enforces active normalized emails and permits cancelled history', async () => {
    await signup('a').run();
    await expect(signup('b','guest','undecided','a@example.invalid').run()).rejects.toThrow();
    await expect(signup('upper','guest','confirmed','UPPER@example.invalid').run()).rejects.toThrow();
    await db.prepare("UPDATE registrations SET status='cancelled' WHERE id='a'").run();
    await signup('b','guest','confirmed','a@example.invalid').run();
  });
  it('prevents overbooking under concurrent writes and rejects capacity reductions', async () => {
    const outcomes = await Promise.allSettled(Array.from({length:20},(_,i) => signup(`g${i}`).run()));
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(8);
    expect(await count()).toBe(8);
    await expect(db.prepare("UPDATE events SET capacity=7 WHERE id='e'").run()).rejects.toThrow();
  });
  it('enforces both volunteer limits on inserts and promotions', async () => {
    for (const role of ['chef','helper_chef']) {
      const results = await Promise.allSettled(Array.from({length:5},(_,i) => signup(`${role}${i}`,role).run()));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    }
    await signup('wait','chef','waiting_list').run();
    await expect(db.prepare("UPDATE registrations SET status='confirmed' WHERE id='wait'").run()).rejects.toThrow();
  });
  it('does not reserve seats for undecided/waitlist and enforces meal ceilings', async () => {
    await signup('u','guest','undecided').run();
    await signup('w','guest','waiting_list').run();
    expect(await count()).toBe(0);
    await db.prepare("UPDATE events SET meal_allocation=1 WHERE id='e'").run();
    await db.prepare("UPDATE registrations SET status='confirmed' WHERE id='w'").run();
    await expect(signup('extra').run()).rejects.toThrow();
  });
  it('requires dietary consent and supports irreversible identity cleanup', async () => {
    await signup('p').run();
    await expect(db.prepare("UPDATE registrations SET dietary_notes='test' WHERE id='p'").run()).rejects.toThrow();
    await db.prepare("UPDATE registrations SET dietary_notes='test',dietary_consent_at=1,comments='test' WHERE id='p'").run();
    await db.prepare("INSERT INTO registration_tokens VALUES ('t','p','hash',100,NULL,0)").run();
    await db.prepare("INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,next_attempt_at,purge_at,created_at) VALUES ('mail','cleanup','e','p','p@example.invalid','confirmation','en',0,100,0)").run();
    await db.batch([
      db.prepare("UPDATE registrations SET dietary_notes=NULL,dietary_consent_at=NULL,comments=NULL,email_normalized=NULL,full_name=NULL,anonymized_at=100 WHERE id='p'"),
      db.prepare("DELETE FROM registration_tokens WHERE registration_id='p'"),
      db.prepare("UPDATE email_outbox SET recipient=NULL,status='purged' WHERE registration_id='p'")
    ]);
    const row = await db.prepare("SELECT * FROM registrations WHERE id='p'").first();
    expect(row).toMatchObject({full_name:null,email_normalized:null,dietary_notes:null,comments:null});
    expect(await count()).toBe(1);
    expect(await db.prepare('SELECT * FROM registration_tokens').first()).toBeNull();
    expect(await db.prepare("SELECT recipient,status FROM email_outbox WHERE id='mail'").first()).toEqual({recipient:null,status:'purged'});
  });
  it('deduplicates outbox and cron intents and rolls back failed batches', async () => {
    const message = (id:string) => db.prepare("INSERT INTO email_outbox (id,idempotency_key,recipient,template,locale,next_attempt_at,purge_at,created_at) VALUES (?,'same','test@example.invalid','confirmation','en',0,100,0)").bind(id);
    await message('m').run();
    await expect(db.batch([signup('rollback'), message('duplicate')])).rejects.toThrow();
    expect(await count()).toBe(0);
    await db.prepare("INSERT INTO scheduled_job_runs (id,idempotency_key,operation,due_at) VALUES ('j','event:reminder','reminder',0)").run();
    await expect(db.prepare("INSERT INTO scheduled_job_runs (id,idempotency_key,operation,due_at) VALUES ('j2','event:reminder','reminder',0)").run()).rejects.toThrow();
  });
});

import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { beforeEach, afterEach, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  login,
  resolveAdmin,
  hashSession,
  requireAdmin,
} from '../src/lib/server/admin/auth';
import {
  editRegistration,
  registrationEdit,
  saveEvent,
  eventEdit,
  cancelEvent,
  promoteManually,
  saveRecipe,
  recipeEdit,
  parseLocal,
  saturdayCutoff,
} from '../src/lib/server/admin/service';
import {
  uploadRecipePhotos,
  orderRecipePhotos,
  webpDimensions,
} from '../src/lib/server/admin/media';
import { registrationWindow } from '../src/lib/server/events/window';
import { promoteWaitingList } from '../src/lib/server/events/waiting-list';
import { actions as registrationActions } from '../src/routes/admin/(panel)/registrations/+page.server';
import { actions as eventActions } from '../src/routes/admin/(panel)/events/+page.server';
import { actions as recipeActions } from '../src/routes/admin/(panel)/recipes/+page.server';
const starts = Date.parse('2026-10-26T18:00:00Z'),
  cutoff = Date.parse('2026-10-24T14:00:00Z');
let mf: Miniflare, db: D1Database, bucket: R2Bucket, clock: number, timed: D1Database;
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: '2025-10-11',
    d1Databases: ['DB'],
    r2Buckets: ['MEDIA'],
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  bucket = (await mf.getR2Bucket('MEDIA')) as unknown as R2Bucket;
  for (const file of readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const statements = readFileSync(`drizzle/${file}`, 'utf8')
      .split('--> statement-breakpoint')
      .map((sql) => sql.trim())
      .filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  await db
    .prepare(
      "INSERT INTO admin_users VALUES ('admin','organizer@example.invalid','synthetic-placeholder',0)",
    )
    .run();
  await db
    .prepare(
      "INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES ('e','2026-10-26','admin-test',?,?,'tgv-v39',30,?,0)",
    )
    .bind(starts, starts + 10800000, cutoff)
    .run();
  clock = Date.parse('2026-10-14T12:00:00Z');
  timed = {
    prepare: (s: string) =>
      db.prepare(
        s
          .replaceAll("CAST(strftime('%s','now') AS INTEGER)*1000", String(clock))
          .replaceAll("CAST(strftime('%s','now') AS INTEGER) * 1000", String(clock)),
      ),
    batch: (s: D1PreparedStatement[]) => db.batch(s),
  } as D1Database;
});
afterEach(async () => {
  await mf?.dispose();
});
const signup = (id: string, status = 'confirmed', role = 'guest', created = 1) =>
  db
    .prepare(
      "INSERT INTO registrations (id,event_id,email_normalized,full_name,role,status,language,created_at,updated_at) VALUES (?,'e',?,'Synthetic person',?,?,'en',?,0)",
    )
    .bind(id, `${id}@example.invalid`, role, status, created)
    .run();
const count = async (table: string) =>
  (await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{ n: number }>())!.n;
const eventInput = () =>
  eventEdit.parse({
    id: 'e',
    version: 0,
    starts: '2026-10-26T19:00',
    ends: '2026-10-26T22:00',
    venue: 'Synthetic venue',
    address: 'Synthetic address',
    description: 'Special dinner',
    capacity: 30,
  });
const recipeInput = () =>
  recipeEdit.parse({
    id: '',
    version: 0,
    slug: 'synthetic-lentils',
    title: 'Synthetic lentils',
    description: 'Synthetic recipe',
    category: 'main',
    chefCredit: '',
    ingredients: '200 g | lentils\n1 l | water',
    steps: 'Rinse lentils.\nCook until tender.',
  });

it('salts password hashes, rejects wrong passwords, and stores only session hashes', async () => {
  const password = 'synthetic-test-password-not-a-real-secret';
  const hash = await hashPassword(password);
  expect(hash).not.toContain(password);
  expect(await hashPassword(password)).not.toBe(hash);
  expect(await verifyPassword(password, hash)).toBe(true);
  expect(await verifyPassword('incorrect', hash)).toBe(false);
  await db.prepare("UPDATE admin_users SET password_hash=? WHERE id='admin'").bind(hash).run();
  const token = await login(db, 'ORGANIZER@EXAMPLE.INVALID', password);
  expect(token).toBeTruthy();
  expect(await resolveAdmin(db, token!)).toEqual({
    id: 'admin',
    email: 'organizer@example.invalid',
  });
  const stored = await db
    .prepare('SELECT session_hash,expires_at FROM admin_sessions')
    .first<{ session_hash: string; expires_at: number }>();
  expect(stored!.session_hash).toBe(await hashSession(token!));
  expect(stored!.session_hash).not.toBe(token);
  expect(await resolveAdmin(db, token!, stored!.expires_at)).toBeNull();
  await db.prepare('DELETE FROM admin_sessions').run();
  expect(await resolveAdmin(db, token!)).toBeNull();
});

it('enforces a persistent login limit under concurrent requests', async () => {
  const hash = await hashPassword('synthetic-valid-password');
  await db.prepare("UPDATE admin_users SET password_hash=? WHERE id='admin'").bind(hash).run();
  const now = Date.now();
  const tokens = await Promise.all(
    Array.from({ length: 8 }, () =>
      login(db, 'organizer@example.invalid', 'synthetic-valid-password', now),
    ),
  );
  expect(tokens.filter(Boolean)).toHaveLength(5);
  expect(await count('admin_sessions')).toBe(5);
});

it('protects every admin mutation before parsing its body', async () => {
  const event = { locals: { locale: 'en', admin: null }, platform: { env: { DB: db } } } as any;
  expect(() => requireAdmin(event)).toThrow();
  for (const action of [
    ...Object.values(registrationActions),
    ...Object.values(eventActions),
    ...Object.values(recipeActions),
  ])
    await expect(action(event)).rejects.toMatchObject({ status: 303, location: '/admin/login' });
});

it('rejects stale edits and role overbooking without queuing email or audits', async () => {
  for (let i = 0; i < 3; i++) await signup(`chef${i}`, 'confirmed', 'chef');
  await signup('guest');
  const input = registrationEdit.parse({
    id: 'guest',
    version: 0,
    fullName: 'Edited synthetic',
    email: 'guest@example.invalid',
    role: 'chef',
    comments: '',
  });
  await expect(editRegistration(timed, 'admin', input, clock)).rejects.toThrow();
  expect(await count('audit_events')).toBe(0);
  expect(await count('email_outbox')).toBe(0);
  const valid = { ...input, role: 'guest' as const };
  await editRegistration(timed, 'admin', valid, clock);
  await expect(editRegistration(timed, 'admin', valid, clock)).rejects.toThrow();
  expect(await count('audit_events')).toBe(1);
  expect(await count('email_outbox')).toBe(1);
});

it('reschedules a gathering, preserves its recurrence key and copies an immutable venue snapshot', async () => {
  await signup('person');
  await db
    .prepare("INSERT INTO registration_tokens VALUES ('t','person','synthetic-hash',?,NULL,0)")
    .bind(starts + 10800000)
    .run();
  await saveEvent(
    timed,
    'admin',
    { ...eventInput(), starts: '2026-10-28T19:00', ends: '2026-10-28T22:00' },
    clock,
  );
  const row = await db
    .prepare(
      "SELECT starts_at,registration_cutoff,occurrence_key,venue_id FROM events WHERE id='e'",
    )
    .first<any>();
  expect(row.starts_at).toBe(Date.parse('2026-10-28T18:00:00Z'));
  expect(row.registration_cutoff).toBe(cutoff);
  expect(row.occurrence_key).toBe('2026-10-26');
  expect(row.venue_id).not.toBe('tgv-v39');
  expect((await db.prepare("SELECT name FROM venues WHERE id='tgv-v39'").first())!.name).toBe(
    'V39',
  );
  expect(
    (await db.prepare("SELECT expires_at FROM registration_tokens WHERE id='t'").first())!
      .expires_at,
  ).toBe(Date.parse('2026-10-28T21:00:00Z'));
  expect(await count('email_outbox')).toBe(1);
});

it('rejects unsafe capacity reductions and rescheduling after meal allocation', async () => {
  await signup('a');
  await signup('b');
  await expect(
    saveEvent(timed, 'admin', { ...eventInput(), capacity: 1 }, clock),
  ).rejects.toThrow();
  clock = cutoff;
  await expect(
    saveEvent(
      timed,
      'admin',
      { ...eventInput(), starts: '2026-10-28T19:00', ends: '2026-10-28T22:00' },
      clock,
    ),
  ).rejects.toThrow();
  expect((await db.prepare("SELECT starts_at FROM events WHERE id='e'").first())!.starts_at).toBe(
    starts,
  );
});

it('cancels events atomically and notifies confirmed, waiting-list and undecided participants', async () => {
  await signup('a');
  await signup('b', 'waiting_list');
  await signup('c', 'undecided');
  await signup('d', 'cancelled');
  await cancelEvent(timed, 'admin', 'e', 0, clock);
  expect((await db.prepare("SELECT status FROM events WHERE id='e'").first())!.status).toBe(
    'cancelled',
  );
  expect(await count('registrations')).toBe(4);
  expect(await count('email_outbox')).toBe(3);
  await expect(cancelEvent(timed, 'admin', 'e', 0, clock)).rejects.toThrow();
  expect(await count('email_outbox')).toBe(3);
});

it('requires Monday contact acknowledgement, FIFO and a promotion before 19:00', async () => {
  await signup('first', 'waiting_list', 'guest', 0);
  await signup('second', 'waiting_list', 'guest', 1);
  await db.prepare("UPDATE events SET meal_allocation=1 WHERE id='e'").run();
  clock = Date.parse('2026-10-26T12:00:00Z');
  await expect(promoteManually(timed, 'admin', 'first', 0, false, clock)).rejects.toThrow();
  await expect(promoteManually(timed, 'admin', 'second', 0, true, clock)).rejects.toThrow();
  clock = starts;
  await expect(promoteManually(timed, 'admin', 'first', 0, true, clock)).rejects.toThrow();
  clock = starts - 1;
  await promoteManually(timed, 'admin', 'first', 0, true, clock);
  expect(
    (await db.prepare("SELECT status FROM registrations WHERE id='first'").first())!.status,
  ).toBe('confirmed');
  await expect(promoteManually(timed, 'admin', 'second', 0, true, clock)).rejects.toThrow();
  expect(await count('email_outbox')).toBe(1);
});

it('publishes recipes with ordered ingredients/steps and rolls back stale updates', async () => {
  const input = recipeInput(),
    id = await saveRecipe(db, 'admin', input, clock);
  expect(await count('recipes')).toBe(1);
  expect(await count('dishes')).toBe(1);
  expect(
    (
      await db
        .prepare('SELECT ingredient FROM recipe_ingredients WHERE recipe_id=? ORDER BY position')
        .bind(id)
        .all()
    ).results,
  ).toEqual([{ ingredient: 'lentils' }, { ingredient: 'water' }]);
  await saveRecipe(db, 'admin', { ...input, id, title: 'Updated synthetic' }, clock);
  await expect(saveRecipe(db, 'admin', { ...input, id, title: 'Stale' }, clock)).rejects.toThrow();
  expect((await db.prepare('SELECT title FROM recipes WHERE id=?').bind(id).first())!.title).toBe(
    'Updated synthetic',
  );
});

it('rolls back gathering edits and venue creation if notification persistence fails', async () => {
  await signup('person');
  const venues = await count('venues');
  await db
    .prepare(
      "CREATE TRIGGER fail_admin_mail BEFORE INSERT ON email_outbox BEGIN SELECT RAISE(ABORT,'injected'); END",
    )
    .run();
  await expect(saveEvent(timed, 'admin', eventInput(), clock)).rejects.toThrow();
  expect(await count('venues')).toBe(venues);
  expect(await count('audit_events')).toBe(0);
  expect((await db.prepare("SELECT version FROM events WHERE id='e'").first())!.version).toBe(0);
});

it('keeps the manual promotion deadline at 19:00 even if dinner starts later', async () => {
  await signup('waiting', 'waiting_list');
  await db
    .prepare("UPDATE events SET starts_at=?,ends_at=?,meal_allocation=1 WHERE id='e'")
    .bind(starts + 3600000, starts + 14400000)
    .run();
  clock = starts;
  await expect(promoteManually(timed, 'admin', 'waiting', 0, true, clock)).rejects.toThrow();
  clock = starts - 1;
  await promoteManually(timed, 'admin', 'waiting', 0, true, clock);
  expect(
    (await db.prepare("SELECT status FROM registrations WHERE id='waiting'").first())!.status,
  ).toBe('confirmed');
});

it('uses the gathering day midnight/19:00 boundaries for a special Wednesday date', async () => {
  const special = Date.parse('2026-10-28T18:00:00Z'),
    midnight = Date.parse('2026-10-27T23:00:00Z');
  await signup('first', 'waiting_list', 'guest', 0);
  await signup('second', 'waiting_list', 'guest', 1);
  await db
    .prepare("UPDATE events SET starts_at=?,ends_at=?,meal_allocation=2 WHERE id='e'")
    .bind(special, special + 10800000)
    .run();
  clock = midnight;
  expect((await promoteWaitingList(timed, 'e', clock)).promoted).toBe(0);
  await promoteManually(timed, 'admin', 'first', 0, true, clock);
  clock = special;
  await expect(promoteManually(timed, 'admin', 'second', 0, true, clock)).rejects.toThrow();
});

it('rejects nonexistent/ambiguous Amsterdam wall times and keeps Saturday deadlines for special dates', () => {
  expect(() => parseLocal('2027-03-28T02:30')).toThrow();
  expect(() => parseLocal('2026-10-25T02:30')).toThrow();
  expect(saturdayCutoff(parseLocal('2026-10-28T19:00'))).toBe(cutoff);
  expect(saturdayCutoff(parseLocal('2026-10-24T19:00'))).toBe(cutoff);
});

it('bases a rescheduled registration window on actual earlier dinners', async () => {
  for (const [id, start] of [
    ['second', '2026-11-09T18:00:00Z'],
    ['third', '2026-11-23T18:00:00Z'],
  ] as const) {
    const t = Date.parse(start);
    await db
      .prepare(
        "INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,capacity,registration_cutoff,created_at) VALUES (?,?,?,?,?,'tgv-v39',30,?,0)",
      )
      .bind(id, id, id, t, t + 10800000, t - 3 * 86400000)
      .run();
  }
  expect((await registrationWindow(db, 'third'))!.opensAt).toBe(Date.parse('2026-10-26T23:00:00Z'));
  await saveEvent(
    timed,
    'admin',
    { ...eventInput(), starts: '2026-10-28T19:00', ends: '2026-10-28T22:00' },
    clock,
  );
  expect((await registrationWindow(db, 'third'))!.opensAt).toBe(Date.parse('2026-10-28T23:00:00Z'));
});

it('validates WebP metadata, stores variants in local R2, and enforces photo ownership/order', async () => {
  const bytes = new Uint8Array(
    Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'),
  );
  expect(webpDimensions(bytes).width).toBeGreaterThan(0);
  expect(() => webpDimensions(new TextEncoder().encode('<svg></svg>'))).toThrow();
  const recipe = await saveRecipe(db, 'admin', recipeInput(), clock);
  const file = new File([bytes], 'synthetic.webp', { type: 'image/webp' });
  await uploadRecipePhotos(db, bucket, recipe, 0, [file, file], [file, file], clock);
  const photos = await db
    .prepare(
      'SELECT m.id,m.r2_key FROM media_assets m JOIN recipe_media rm ON rm.media_id=m.id WHERE rm.recipe_id=? ORDER BY position',
    )
    .bind(recipe)
    .all<{ id: string; r2_key: string }>();
  expect(photos.results).toHaveLength(2);
  expect(await bucket.get(photos.results[0].r2_key)).toBeTruthy();
  const ordered = photos.results.map((p) => p.id).reverse();
  await orderRecipePhotos(
    db,
    recipe,
    1,
    ordered,
    ordered[0],
    Object.fromEntries(ordered.map((id) => [id, 'Synthetic lentil dish'])),
    clock,
  );
  expect(
    (await db
      .prepare('SELECT media_id FROM recipe_media WHERE recipe_id=? AND is_cover=1')
      .bind(recipe)
      .first())!.media_id,
  ).toBe(ordered[0]);
  await expect(
    orderRecipePhotos(db, recipe, 2, ['foreign-image'], ordered[0], {}, clock),
  ).rejects.toThrow();
});

// Organizer-only walk-ins and absence are tested against real SQLite triggers.
import {
  addWalkIn,
  editWalkIn,
  markAttendance,
  createGathering,
  walkInInput,
  uniqueGathering,
} from '../src/lib/server/admin/gathering-participants';
import { cleanupPrivacy } from '../src/lib/server/privacy/cleanup';
import { load as overviewLoad } from '../src/routes/admin/(panel)/+page.server';
import { load as gatheringLoad } from '../src/routes/admin/(panel)/events/+page.server';
const walkIn = (extra: Record<string, unknown> = {}) =>
  walkInInput.parse({
    id: crypto.randomUUID(),
    eventId: 'e',
    fullName: 'Synthetic walk-in',
    ...extra,
  });

it('counts name-only guests atomically, without email or tokens, and replays safely', async () => {
  await db.prepare("UPDATE events SET capacity=1 WHERE id='e'").run();
  const input = walkIn();
  const results = await Promise.allSettled([
    addWalkIn(timed, 'admin', input, clock),
    addWalkIn(timed, 'admin', walkIn(), clock),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await count('walk_in_guests')).toBe(1);
  expect(await count('confirmed_participants')).toBe(1);
  expect(await count('registration_tokens')).toBe(0);
  expect(await count('email_outbox')).toBe(0);
  const saved = await db.prepare('SELECT id FROM walk_in_guests').first<{ id: string }>();
  await addWalkIn(timed, 'admin', { ...input, id: saved!.id.slice(8) }, clock);
  expect(await count('walk_in_guests')).toBe(1);
  await expect(signup('overfull')).rejects.toThrow();
  await expect(db.prepare("UPDATE events SET capacity=0 WHERE id='e'").run()).rejects.toThrow();
});

it('requires an explicit override and atomically raises only the selected limits', async () => {
  await signup('booked');
  clock = starts + 1;
  await db.prepare("UPDATE events SET capacity=1,meal_allocation=1 WHERE id='e'").run();
  expect(
    walkInInput.safeParse({
      id: crypto.randomUUID(),
      eventId: 'e',
      fullName: 'X',
      override: 'on',
      reason: '',
    }).success,
  ).toBe(false);
  await expect(addWalkIn(timed, 'admin', walkIn(), clock)).rejects.toThrow();
  const input = walkIn({ override: 'on', reason: 'Synthetic spare meal confirmed' });
  await addWalkIn(timed, 'admin', input, clock);
  await addWalkIn(timed, 'admin', input, clock);
  expect(
    await db.prepare("SELECT capacity,meal_allocation FROM events WHERE id='e'").first(),
  ).toEqual({ capacity: 2, meal_allocation: 2 });
  expect(await count('confirmed_participants')).toBe(2);
  expect(
    await db.prepare('SELECT limits_overridden,override_reason FROM walk_in_guests').first(),
  ).toEqual({ limits_overridden: 1, override_reason: 'Synthetic spare meal confirmed' });
  await expect(db.prepare("UPDATE events SET capacity=1 WHERE id='e'").run()).rejects.toThrow();
  await expect(
    db.prepare("UPDATE events SET meal_allocation=1 WHERE id='e'").run(),
  ).rejects.toThrow();
});

it('preserves waiting-list priority, and failed overrides roll back raised limits', async () => {
  await signup('waiting', 'waiting_list');
  const input = walkIn({ override: 'on', reason: 'Synthetic extra place' });
  const before = await db.prepare("SELECT capacity,version FROM events WHERE id='e'").first();
  await expect(addWalkIn(timed, 'admin', input, clock)).rejects.toThrow();
  expect(await db.prepare("SELECT capacity,version FROM events WHERE id='e'").first()).toEqual(
    before,
  );
  expect(await count('walk_in_guests')).toBe(0);
  clock = starts; // 19:00 Amsterdam, the manual promotion deadline.
  await addWalkIn(timed, 'admin', input, clock);
  expect(await count('walk_in_guests')).toBe(1);
});

it('quick-adds WhatsApp and unannounced parties after cutoff without asking for override reasons', async () => {
  await signup('booked');
  clock = starts + 1;
  await db.prepare("UPDATE events SET capacity=1,meal_allocation=1 WHERE id='e'").run();
  const whatsapp = walkIn({ source: 'whatsapp', extraGuests: 2 });
  await addWalkIn(timed, 'admin', whatsapp, clock);
  await addWalkIn(timed, 'admin', whatsapp, clock);
  expect(await db.prepare("SELECT capacity,meal_allocation FROM events WHERE id='e'").first()).toEqual({capacity:4,meal_allocation:4});
  await addWalkIn(timed, 'admin', walkIn({ source: 'unannounced' }), clock);
  expect(await db.prepare("SELECT capacity,meal_allocation FROM events WHERE id='e'").first()).toEqual({capacity:5,meal_allocation:5});
  expect((await db.prepare('SELECT source FROM walk_in_guests ORDER BY created_at,id').all()).results.map(row=>row.source).sort()).toEqual(['unannounced','whatsapp']);
  await expect(addWalkIn(timed,'admin',{...whatsapp,source:'unannounced'},clock)).rejects.toThrow();
  expect(await count('email_outbox')).toBe(0);
});

it('freezes meals including walk-ins and rejects stale edits and additions after dinner', async () => {
  const input = walkIn();
  await addWalkIn(timed, 'admin', input, clock);
  const id = `walk-in:${input.id}`;
  await editWalkIn(
    timed,
    'admin',
    { id, version: 0, fullName: 'Synthetic updated guest', comments: 'Synthetic notes' },
    clock,
  );
  await expect(
    editWalkIn(timed, 'admin', { id, version: 0, fullName: 'Stale', comments: '' }, clock),
  ).rejects.toThrow();
  clock = cutoff;
  const { freezeMealAllocation } = await import('../src/lib/server/events/waiting-list');
  await freezeMealAllocation(timed, 'e', clock).run();
  expect(
    await db.prepare("SELECT meal_allocation FROM events WHERE id='e'").first('meal_allocation'),
  ).toBe(1);
  clock = starts + 10800000;
  await expect(
    addWalkIn(timed, 'admin', walkIn({ override: 'on', reason: 'Too late' }), clock),
  ).rejects.toThrow();
  expect(await db.prepare("SELECT capacity FROM events WHERE id='e'").first('capacity')).toBe(30);
});

it('distinguishes no-show from cancellation and purges both guest types at the seven-day boundary', async () => {
  const input = walkIn();
  await addWalkIn(timed, 'admin', input, clock);
  await signup('absent');
  await signup('waiting', 'waiting_list');
  await expect(markAttendance(timed, 'admin', 'absent', 0, true, clock)).rejects.toThrow();
  clock = starts;
  await expect(markAttendance(timed, 'admin', 'waiting', 0, true, clock)).rejects.toThrow();
  await markAttendance(timed, 'admin', 'absent', 0, true, clock);
  await markAttendance(timed, 'admin', `walk-in:${input.id}`, 0, true, clock);
  expect(await count('registration_no_shows')).toBe(1);
  expect(
    await db.prepare("SELECT status FROM registrations WHERE id='absent'").first('status'),
  ).toBe('cancelled');
  expect(await db.prepare('SELECT status FROM walk_in_guests').first('status')).toBe('no_show');
  await expect(markAttendance(timed, 'admin', 'absent', 0, true, clock)).rejects.toThrow();
  await db.prepare("UPDATE events SET status='cancelled' WHERE id='e'").run();
  const end = starts + 10800000;
  await cleanupPrivacy(timed, end + 604800000 - 1);
  expect(await count('walk_in_guests')).toBe(1);
  const result = await cleanupPrivacy(timed, end + 604800000);
  expect(result.deletedRegistrations).toBe(3);
  expect(await count('walk_in_guests')).toBe(0);
  expect(await count('registration_no_shows')).toBe(0);
  expect(
    await db
      .prepare("SELECT affected_rows FROM privacy_cleanup_runs WHERE kind='identity'")
      .first('affected_rows'),
  ).toBe(3);
});

it('creates a one-off gathering without changing the recurring anchor and handles retries', async () => {
  const input = uniqueGathering.parse({
    ...eventInput(),
    id: crypto.randomUUID(),
    starts: '2026-10-28T19:00',
    ends: '2026-10-28T22:00',
  });
  await createGathering(timed, 'admin', input, clock);
  await createGathering(timed, 'admin', input, clock);
  const row = await db
    .prepare('SELECT occurrence_key,registration_cutoff,capacity FROM events WHERE id=?')
    .bind(input.id)
    .first();
  expect(row).toEqual({
    occurrence_key: `special:${input.id}`,
    registration_cutoff: cutoff,
    capacity: 30,
  });
  expect(await count('events')).toBe(2);
  expect(await db.prepare("SELECT starts_at FROM events WHERE id='e'").first('starts_at')).toBe(
    starts,
  );
  await expect(
    createGathering(
      timed,
      'admin',
      { ...input, id: crypto.randomUUID(), starts: '2026-03-29T02:30' },
      clock,
    ),
  ).rejects.toThrow();
});

it('defaults to the next gathering, combines both participant types and orders by visible status', async () => {
  await signup('waiting', 'waiting_list', 'guest', 0);
  await signup('confirmed', 'confirmed', 'chef', 10);
  await signup('undecided', 'undecided', 'guest', 1);
  await signup('cancelled', 'cancelled', 'guest', 0);
  clock = starts;
  await signup('absent');
  await markAttendance(timed, 'admin', 'absent', 0, true, clock);
  await addWalkIn(timed, 'admin', walkIn({ override: 'on', reason: 'Synthetic spare' }), clock);
  const request = {
    platform: { env: { DB: timed } },
    locals: { admin: { id: 'admin', email: 'organizer@example.invalid' } },
    url: new URL('http://localhost/admin/events'),
  } as unknown as Parameters<typeof gatheringLoad>[0];
  const data = await gatheringLoad(request);
  expect(data.selected?.id).toBe('e');
  expect(data.people.map((r) => r.status)).toEqual([
    'confirmed',
    'confirmed',
    'waiting_list',
    'no_show',
    'cancelled',
    'cancelled',
  ]);
  expect(data.people.find((r) => r.walk_in)?.email_normalized).toBeNull();
  expect(data.total).toBe(6);
  expect(data.counts).toEqual({
    confirmed: 2,
    waiting_list: 1,
    no_show: 1,
    cancelled: 2,
  });
  expect(data.selected?.confirmed).toBe(2);
  expect(data.selected?.budget).toEqual({ starter: 0, main: 0, dessert: 0 });
  const overview = await overviewLoad(request as unknown as Parameters<typeof overviewLoad>[0]);
  expect(overview.counts.find((r) => r.status === 'confirmed')?.total).toBe(2);
  expect(overview.counts.find((r) => r.status === 'no_show')?.total).toBe(1);
});

import {
  changeParticipantStatus,
  savePayment,
  paymentInput,
  statusInput,
} from '../src/lib/server/admin/participant-operations';
it('reverses cancellation and absence with atomic capacity and stale-version checks', async () => {
  await signup('returning');
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'returning', version: 0, status: 'cancelled' }),
    clock,
  );
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'returning', version: 1, status: 'confirmed' }),
    clock,
  );
  expect(
    await db.prepare("SELECT status FROM registrations WHERE id='returning'").first('status'),
  ).toBe('confirmed');
  await expect(
    changeParticipantStatus(
      timed,
      'admin',
      statusInput.parse({ id: 'returning', version: 1, status: 'cancelled' }),
      clock,
    ),
  ).rejects.toThrow();
  clock = starts;
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'returning', version: 2, status: 'no_show' }),
    clock,
  );
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'returning', version: 3, status: 'confirmed' }),
    clock,
  );
  expect(await count('registration_no_shows')).toBe(0);
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'returning', version: 4, status: 'cancelled' }),
    clock,
  );
  await db.prepare("UPDATE events SET capacity=1 WHERE id='e'").run();
  await signup('taken');
  await expect(
    changeParticipantStatus(
      timed,
      'admin',
      statusInput.parse({ id: 'returning', version: 5, status: 'confirmed' }),
      clock,
    ),
  ).rejects.toThrow();
  expect(
    await db.prepare("SELECT status FROM registrations WHERE id='returning'").first('status'),
  ).toBe('cancelled');
});

it('payment records support extra amounts, correction after 19:00 and dinner, and expire with identity', async () => {
  await signup('payer');
  clock = starts + 3600000;
  await savePayment(
    timed,
    'admin',
    paymentInput.parse({ id: 'payer', version: 0, paid: 'on', amount: '21.50' }),
    clock,
  );
  expect(
    await db
      .prepare("SELECT paid_amount_cents FROM registrations WHERE id='payer'")
      .first('paid_amount_cents'),
  ).toBe(2150);
  clock = starts + 10800000 + 1000;
  await savePayment(
    timed,
    'admin',
    paymentInput.parse({ id: 'payer', version: 1, amount: '0' }),
    clock,
  );
  expect(
    await db
      .prepare("SELECT paid_at,paid_amount_cents FROM registrations WHERE id='payer'")
      .first(),
  ).toEqual({ paid_at: null, paid_amount_cents: 0 });
  await expect(
    savePayment(
      timed,
      'admin',
      paymentInput.parse({ id: 'payer', version: 0, paid: 'on', amount: '7' }),
      clock,
    ),
  ).rejects.toThrow();
  clock = starts + 10800000 + 604800000;
  await expect(
    savePayment(
      timed,
      'admin',
      paymentInput.parse({ id: 'payer', version: 2, paid: 'on', amount: '7' }),
      clock,
    ),
  ).rejects.toThrow();
  await cleanupPrivacy(timed, clock);
  expect(await count('registrations')).toBe(0);
});

it('status confirmation cannot bypass the contacted waiting-list policy', async () => {
  await signup('waiting', 'waiting_list');
  await db.prepare("UPDATE events SET meal_allocation=1 WHERE id='e'").run();
  clock = starts - 3600000;
  await expect(
    changeParticipantStatus(
      timed,
      'admin',
      statusInput.parse({ id: 'waiting', version: 0, status: 'confirmed' }),
      clock,
    ),
  ).rejects.toThrow();
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'waiting', version: 0, status: 'confirmed', contacted: 'on' }),
    clock,
  );
  expect(
    await db.prepare("SELECT status FROM registrations WHERE id='waiting'").first('status'),
  ).toBe('confirmed');
});

it('cancelled undecided and waiting registrations cannot bypass their confirmation deadlines', async () => {
  await signup('unsure', 'undecided');
  await signup('queued', 'waiting_list');
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'unsure', version: 0, status: 'cancelled' }),
    clock,
  );
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'queued', version: 0, status: 'cancelled' }),
    clock,
  );
  clock = cutoff + 1;
  await expect(
    changeParticipantStatus(
      timed,
      'admin',
      statusInput.parse({ id: 'unsure', version: 1, status: 'confirmed' }),
      clock,
    ),
  ).rejects.toThrow();
  await expect(
    changeParticipantStatus(
      timed,
      'admin',
      statusInput.parse({ id: 'queued', version: 1, status: 'confirmed' }),
      clock,
    ),
  ).rejects.toThrow();
  expect(await count('confirmed_participants')).toBe(0);
});

import {
  saveChefCost,
  saveChefReimbursement,
  chefCostInput,
  chefReimbursementInput,
} from '../src/lib/server/admin/chef-expenses';

it('shares chef role limits across website and organizer groups, including concurrent quick adds', async () => {
  await signup('chef-one','confirmed','chef');
  await signup('chef-two','confirmed','chef');
  const result=await Promise.allSettled([
    addWalkIn(timed,'admin',walkIn({source:'whatsapp',role:'chef',extraGuests:2}),clock),
    addWalkIn(timed,'admin',walkIn({source:'whatsapp',role:'chef'}),clock),
  ]);
  expect(result.filter(item=>item.status==='fulfilled')).toHaveLength(1);
  expect(await db.prepare("SELECT count(*) AS n FROM confirmed_participants WHERE role='chef'").first('n')).toBe(3);
  await expect(addWalkIn(timed,'admin',walkIn({source:'unannounced',role:'chef'}),clock)).rejects.toThrow();
  await expect(signup('fourth-chef','confirmed','chef')).rejects.toThrow();
});

it('records organizer chef costs and reimbursements in totals and deletes them at retention', async () => {
  const input=walkIn({source:'whatsapp',role:'chef',extraGuests:2});
  await addWalkIn(timed,'admin',input,clock);
  const id=`walk-in:${input.id}`;
  await saveChefCost(timed,'admin',chefCostInput.parse({id,version:0,amount:'12.50'}),clock);
  await saveChefReimbursement(timed,'admin',chefReimbursementInput.parse({id,version:1,reimbursed:'on'}),clock);
  const request={locals:{admin:{id:'admin'},locale:'en'},platform:{env:{DB:timed}},url:new URL('http://localhost/admin/events?event=e')} as never;
  const loaded=await gatheringLoad(request);
  expect(loaded.people[0].role).toBe('chef');
  expect(loaded.people[0].extra_guests).toBe(2);
  expect(loaded.selected?.confirmed).toBe(3);
  expect(loaded.finance.costs).toBe(1250);
  expect(loaded.finance.reimbursed).toBe(1250);
  await expect(saveChefCost(timed,'admin',chefCostInput.parse({id,version:0,amount:'1'}),clock)).rejects.toThrow();
  await expect(db.prepare('UPDATE walk_in_guests SET chef_cost_cents=-1 WHERE id=?').bind(id).run()).rejects.toThrow();
  clock=starts+10800000+604800000;
  await expect(saveChefCost(timed,'admin',chefCostInput.parse({id,version:2,amount:'1'}),clock)).rejects.toThrow();
  await cleanupPrivacy(timed,clock);
  expect(await count('walk_in_guests')).toBe(0);
});
it('uses actual chef costs for balance and preserves amounts already reimbursed when costs change', async () => {
  await signup('payer');
  await signup('chef', 'confirmed', 'chef');
  await savePayment(
    timed,
    'admin',
    paymentInput.parse({ id: 'payer', version: 0, paid: 'on', amount: '28' }),
    clock,
  );
  const input = walkIn();
  await addWalkIn(timed, 'admin', input, clock);
  await savePayment(
    timed,
    'admin',
    paymentInput.parse({ id: `walk-in:${input.id}`, version: 0, paid: 'on', amount: '14' }),
    clock,
  );
  await saveChefCost(
    timed,
    'admin',
    chefCostInput.parse({ id: 'chef', version: 0, amount: '40' }),
    clock,
  );
  await saveChefReimbursement(
    timed,
    'admin',
    chefReimbursementInput.parse({ id: 'chef', version: 1, reimbursed: 'on' }),
    clock,
  );
  await saveChefCost(
    timed,
    'admin',
    chefCostInput.parse({ id: 'chef', version: 2, amount: '45.50' }),
    clock,
  );
  expect(
    await db
      .prepare("SELECT chef_cost_cents,chef_reimbursed_cents FROM registrations WHERE id='chef'")
      .first(),
  ).toEqual({ chef_cost_cents: 4550, chef_reimbursed_cents: 4000 });
  await expect(
    saveChefCost(
      timed,
      'admin',
      chefCostInput.parse({ id: 'chef', version: 0, amount: '1' }),
      clock,
    ),
  ).rejects.toThrow();
  await changeParticipantStatus(
    timed,
    'admin',
    statusInput.parse({ id: 'chef', version: 3, status: 'cancelled' }),
    clock,
  );
  const request = {
    platform: { env: { DB: timed } },
    locals: { admin: { id: 'admin', email: 'organizer@example.invalid' } },
    url: new URL('http://localhost/admin/events'),
  } as unknown as Parameters<typeof gatheringLoad>[0];
  const data = await gatheringLoad(request);
  expect(data.finance).toEqual({
    received: 4200,
    costs: 4550,
    reimbursed: 4000,
    outstanding: 550,
    balance: -350,
    cash: 200,
    missing: 0,
  });
});

it('accepts zero recorded chef costs, reports missing costs, and deletes cost/payment records at retention', async () => {
  await signup('chef', 'confirmed', 'chef');
  const request = {
    platform: { env: { DB: timed } },
    locals: { admin: { id: 'admin', email: 'organizer@example.invalid' } },
    url: new URL('http://localhost/admin/events'),
  } as unknown as Parameters<typeof gatheringLoad>[0];
  expect((await gatheringLoad(request)).finance.missing).toBe(1);
  await expect(
    saveChefReimbursement(
      timed,
      'admin',
      chefReimbursementInput.parse({ id: 'chef', version: 0, reimbursed: 'on' }),
      clock,
    ),
  ).rejects.toThrow();
  await saveChefCost(
    timed,
    'admin',
    chefCostInput.parse({ id: 'chef', version: 0, amount: '0' }),
    clock,
  );
  expect((await gatheringLoad(request)).finance.missing).toBe(0);
  await expect(
    db.prepare("UPDATE registrations SET chef_cost_cents=-1 WHERE id='chef'").run(),
  ).rejects.toThrow();
  clock = starts + 10800000 + 604800000;
  await expect(
    saveChefCost(
      timed,
      'admin',
      chefCostInput.parse({ id: 'chef', version: 1, amount: '20' }),
      clock,
    ),
  ).rejects.toThrow();
  await cleanupPrivacy(timed, clock);
  expect(await count('registrations')).toBe(0);
});

import { expireUndecided } from '../src/lib/server/events/undecided';
it('cancels undecided at the exact cutoff with one atomic notification across retries', async()=>{
  await signup('unsure','undecided');
  await signup('booked');
  clock=cutoff-1;
  expect((await expireUndecided(timed,clock)).cancelled).toBe(0);
  clock=cutoff;
  const results=await Promise.all([expireUndecided(timed,clock),expireUndecided(timed,clock)]);
  expect(results.reduce((n,r)=>n+r.cancelled,0)).toBe(1);
  expect(await db.prepare("SELECT status FROM registrations WHERE id='unsure'").first('status')).toBe('cancelled');
  expect(await db.prepare("SELECT count(*) AS n FROM email_outbox WHERE registration_id='unsure'").first('n')).toBe(1);
  expect((await expireUndecided(timed,clock)).cancelled).toBe(0);
  expect(await db.prepare("SELECT status FROM registrations WHERE id='booked'").first('status')).toBe('confirmed');
});
it('rolls back cutoff cancellation if its notification cannot be queued',async()=>{
  await signup('unsure','undecided');
  await db.prepare("CREATE TRIGGER fail_cutoff_mail BEFORE INSERT ON email_outbox BEGIN SELECT RAISE(ABORT,'test'); END").run();
  clock=cutoff;
  await expect(expireUndecided(timed,clock)).rejects.toThrow();
  expect(await db.prepare("SELECT status FROM registrations WHERE id='unsure'").first('status')).toBe('undecided');
});
it('enables no-show exactly at Amsterdam midnight on the gathering date',async()=>{
  await signup('absent');
  clock=parseLocal('2026-10-26T00:00');
  await expect(markAttendance(timed,'admin','absent',0,true,clock-1)).rejects.toThrow();
  await markAttendance(timed,'admin','absent',0,true,clock);
  expect(await count('registration_no_shows')).toBe(1);
});
it('blocks choosing undecided and only allows a new waiting-list status at full capacity',async()=>{
  await signup('booked');
  await expect(changeParticipantStatus(timed,'admin',statusInput.parse({id:'booked',version:0,status:'undecided'}),clock)).rejects.toThrow();
  await expect(changeParticipantStatus(timed,'admin',statusInput.parse({id:'booked',version:0,status:'waiting_list'}),clock)).rejects.toThrow();
  await db.prepare("UPDATE events SET capacity=1 WHERE id='e'").run();
  await changeParticipantStatus(timed,'admin',statusInput.parse({id:'booked',version:0,status:'waiting_list'}),clock);
  expect(await db.prepare("SELECT status FROM registrations WHERE id='booked'").first('status')).toBe('waiting_list');
});

it('matches the organizer budget table at ten and twenty people, excluding other statuses',async()=>{
  await addWalkIn(timed,'admin',walkIn({extraGuests:9}),clock);
  await signup('cancelled-budget','cancelled');
  await signup('undecided-budget','undecided');
  const request={platform:{env:{DB:timed}},locals:{admin:{id:'admin',email:'organizer@example.invalid'}},url:new URL('http://localhost/admin/events?event=e')} as unknown as Parameters<typeof gatheringLoad>[0];
  expect((await gatheringLoad(request)).selected?.budget).toEqual({starter:14,main:21,dessert:14});
  await addWalkIn(timed,'admin',walkIn({extraGuests:9}),clock);
  expect((await gatheringLoad(request)).selected?.budget).toEqual({starter:34,main:51,dessert:34});
  await addWalkIn(timed,'admin',walkIn({source:'unannounced',extraGuests:2}),clock);
  const withUnannounced = await gatheringLoad(request);
  expect(withUnannounced.selected?.confirmed).toBe(23);
  expect(withUnannounced.selected?.budget).toEqual({starter:34,main:51,dessert:34});
});

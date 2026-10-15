import { z } from 'zod';
import { localInstant, TIMEZONE } from '../events/schedule';
import { freezeMealAllocation, mondayStartsAt } from '../events/waiting-list';
const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER)*1000";
const DAY = 86400000;
export class AdminError extends Error {}
const id = z.string().min(1).max(100);
const version = z.coerce.number().int().min(0);
const text = (max: number) => z.string().trim().max(max);
export const registrationEdit = z.object({
  id,
  version,
  extraGuests: z.coerce.number().int().min(0).max(99).optional(),
  fullName: text(160).min(1),
  email: text(254).toLowerCase().pipe(z.email()),
  role: z.enum(['guest', 'helper_chef', 'chef']),
  comments: text(2000),
});
export const eventEdit = z.object({
  id,
  version,
  starts: text(16).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  ends: text(16).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  venue: text(160).min(1),
  address: text(500).min(1),
  description: text(4000),
  capacity: z.coerce.number().int().min(1).max(1000),
});
export function readEventForm(form: FormData) {
  const values = Object.fromEntries(form);
  for (const name of ['starts', 'ends']) {
    if (form.has(`${name}Date`) || form.has(`${name}Time`))
      values[name] = `${form.get(`${name}Date`) ?? ''}T${form.get(`${name}Time`) ?? ''}`;
  }
  return values;
}
export const recipeEdit = z.object({
  id: z.string().max(100),
  version,
  slug: text(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text(200).min(1),
  description: text(4000),
  category: z.enum(['starter', 'main', 'dessert']),
  chefCredit: text(160),
  ingredients: text(12000).min(1),
  steps: text(20000).min(1),
});

export function localInput(timestamp: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(timestamp)
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function parseLocal(value: string) {
  const [date, time] = value.split('T');
  const [hour, minute] = time.split(':').map(Number);
  const result = localInstant(Date.parse(`${date}T00:00:00Z`), hour) + minute * 60000;
  if (!Number.isFinite(result) || localInput(result) !== value)
    throw new AdminError('Invalid Amsterdam date/time');
  // Repeated autumn clock-hour times are ambiguous; require a different time.
  if (localInput(result - 3600000) === value || localInput(result + 3600000) === value)
    throw new AdminError('Ambiguous Amsterdam date/time');
  return result;
}
export function saturdayCutoff(starts: number) {
  const day = Date.parse(`${localInput(starts).slice(0, 10)}T00:00:00Z`);
  let saturday = day - ((new Date(day).getUTCDay() + 1) % 7) * DAY;
  if (localInstant(saturday, 16) >= starts) saturday -= 7 * DAY;
  return localInstant(saturday, 16);
}
export function receipt(db: D1Database, now: number) {
  return db
    .prepare('INSERT INTO admin_write_receipts (id,applied,created_at) VALUES (?,changes(),?)')
    .bind(crypto.randomUUID(), now);
}
export function audit(
  db: D1Database,
  adminId: string,
  eventId: string | null,
  action: string,
  now: number,
) {
  return db
    .prepare('INSERT INTO audit_events (id,admin_id,event_id,action,created_at) VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), adminId, eventId, action, now);
}
export function participantMail(
  db: D1Database,
  registrationId: string,
  template: string,
  now: number,
) {
  return db
    .prepare(
      `INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,next_attempt_at,purge_at,created_at)
    SELECT ?,?||':'||r.version,r.event_id,r.id,r.email_normalized,?,r.language,?,e.ends_at+?,? FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=?`,
    )
    .bind(
      crypto.randomUUID(),
      `${template}:${registrationId}`,
      template,
      now,
      7 * DAY,
      now,
      registrationId,
    );
}

export function volunteerMail(
  db: D1Database,
  registrationId: string,
  template: string,
  now: number,
) {
  return db
    .prepare(
      `INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,next_attempt_at,purge_at,created_at)
    SELECT ?||':'||recipient,?||':'||r.id||':'||r.version||':'||recipient,r.event_id,r.id,recipient,?,'en',?,e.ends_at+?,?
    FROM registrations r JOIN events e ON e.id=r.event_id CROSS JOIN (
      SELECT organizer_email AS recipient FROM settings WHERE id=1 AND organizer_email IS NOT NULL
      UNION SELECT value FROM settings,json_each(COALESCE(additional_recipients,'[]')) WHERE settings.id=1
    ) recipients WHERE r.id=? AND r.role IN ('chef','helper_chef')`,
    )
    .bind(crypto.randomUUID(), template, template, now, 7 * DAY, now, registrationId);
}
export async function batch(db: D1Database, statements: D1PreparedStatement[]) {
  try {
    return await db.batch(statements);
  } catch {
    throw new AdminError(
      'Could not save, try again',
    );
  }
}

export async function editRegistration(
  db: D1Database,
  adminId: string,
  input: z.infer<typeof registrationEdit>,
  now = Date.now(),
) {
  const current = await db
    .prepare('SELECT event_id,email_normalized FROM registrations WHERE id=?')
    .bind(input.id)
    .first<{ event_id: string; email_normalized: string }>();
  if (!current) throw new AdminError('Registration no longer exists');
  await batch(db, [
    freezeMealAllocation(db, current.event_id, now),
    db
      .prepare(
        `UPDATE registrations SET full_name=?,email_normalized=?,role=?,comments=?,extra_guests=COALESCE(?,extra_guests),version=version+1,updated_at=?
      WHERE id=? AND version=? AND anonymized_at IS NULL AND EXISTS(SELECT 1 FROM events WHERE id=event_id AND ends_at>MAX(?,${SQL_NOW}) AND status='scheduled' AND (registration_cutoff>${SQL_NOW} OR meal_allocation IS NOT NULL))`,
      )
      .bind(
        input.fullName,
        input.email,
        input.role,
        input.comments || null,
        input.extraGuests ?? null,
        now,
        input.id,
        input.version,
        now,
      ),
    receipt(db, now),
    db
      .prepare(
        "DELETE FROM email_outbox WHERE registration_id=? AND recipient=? AND status IN ('pending','failed')",
      )
      .bind(input.id, current.email_normalized),
    participantMail(db, input.id, 'organizer_registration_update', now),
    volunteerMail(db, input.id, 'volunteer_signup', now),
    audit(db, adminId, current.event_id, 'registration_updated', now),
  ]);
}

export async function cancelRegistration(
  db: D1Database,
  adminId: string,
  registrationId: string,
  expectedVersion: number,
  now = Date.now(),
) {
  const row = await db
    .prepare('SELECT event_id FROM registrations WHERE id=?')
    .bind(registrationId)
    .first<{ event_id: string }>();
  if (!row) throw new AdminError('Registration no longer exists');
  await batch(db, [
    freezeMealAllocation(db, row.event_id, now),
    db
      .prepare(
        `UPDATE registrations SET previous_status=status,status='cancelled',version=version+1,updated_at=? WHERE id=? AND version=? AND status<>'cancelled'
      AND EXISTS (SELECT 1 FROM events WHERE id=event_id AND ends_at>MAX(?,${SQL_NOW}) AND (status='cancelled' OR registration_cutoff>${SQL_NOW} OR meal_allocation IS NOT NULL))`,
      )
      .bind(now, registrationId, expectedVersion, now),
    receipt(db, now),
    participantMail(db, registrationId, 'registration_cancel', now),
    volunteerMail(db, registrationId, 'volunteer_cancellation', now),
    audit(db, adminId, row.event_id, 'registration_cancelled', now),
  ]);
}

export async function promoteManually(
  db: D1Database,
  adminId: string,
  registrationId: string,
  expectedVersion: number,
  contacted: boolean,
  now = Date.now(),
) {
  if (!contacted) throw new AdminError('Confirm that you contacted this person first');
  const row = await db
    .prepare(
      'SELECT r.event_id,e.starts_at FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=?',
    )
    .bind(registrationId)
    .first<{ event_id: string; starts_at: number }>();
  if (!row) throw new AdminError('Registration no longer exists');
  const monday = mondayStartsAt(row.starts_at);
  const deadline = parseLocal(`${localInput(row.starts_at).slice(0, 10)}T19:00`);
  await batch(db, [
    freezeMealAllocation(db, row.event_id, now),
    db
      .prepare(
        `UPDATE registrations SET status='confirmed',version=version+1,updated_at=? WHERE id=? AND version=? AND status='waiting_list'
      AND EXISTS (SELECT 1 FROM events e WHERE e.id=event_id AND e.status='scheduled' AND e.starts_at=? AND MAX(?,${SQL_NOW})>=? AND MAX(?,${SQL_NOW})<? AND e.ends_at>MAX(?,${SQL_NOW}) AND e.meal_allocation IS NOT NULL)
      AND id=(SELECT w.id FROM registrations w WHERE w.event_id=registrations.event_id AND w.status='waiting_list' AND w.anonymized_at IS NULL
        AND (w.role='guest' OR (SELECT count(*) FROM confirmed_participants WHERE event_id=w.event_id AND status='confirmed' AND role=w.role)<3)
        AND EXISTS(SELECT 1 FROM events limits WHERE limits.id=w.event_id AND (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=w.event_id)+w.extra_guests+1<=limits.capacity AND (limits.meal_allocation IS NULL OR (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=w.event_id)+w.extra_guests+1<=limits.meal_allocation)) ORDER BY w.created_at,w.id LIMIT 1)`,
      )
      .bind(now, registrationId, expectedVersion, row.starts_at, now, monday, now, deadline, now),
    receipt(db, now),
    participantMail(db, registrationId, 'waiting_list_promoted', now),
    volunteerMail(db, registrationId, 'volunteer_signup', now),
    audit(db, adminId, row.event_id, 'waiting_list_manual_promotion', now),
  ]);
}

export async function saveEvent(
  db: D1Database,
  adminId: string,
  input: z.infer<typeof eventEdit>,
  now = Date.now(),
) {
  const starts = parseLocal(input.starts),
    ends = parseLocal(input.ends),
    cutoff = saturdayCutoff(starts);
  if (ends <= starts || starts <= now)
    throw new AdminError('Gathering must be in the future and end after it starts');
  const current = await db
    .prepare('SELECT starts_at,ends_at,venue_id FROM events WHERE id=?')
    .bind(input.id)
    .first<{ starts_at: number; ends_at: number; venue_id: string }>();
  if (!current) throw new AdminError('Gathering no longer exists');
  const venueId = crypto.randomUUID();
  const changedTime = starts !== current.starts_at || ends !== current.ends_at;
  await batch(db, [
    freezeMealAllocation(db, input.id, now),
    db
      .prepare('INSERT INTO venues (id,name,address,created_at) VALUES (?,?,?,?)')
      .bind(venueId, input.venue, input.address, now),
    db
      .prepare(
        `UPDATE events SET starts_at=?,ends_at=?,registration_cutoff=?,venue_id=?,description=?,capacity=?,version=version+1
      WHERE id=? AND version=? AND status='scheduled' AND (?=0 OR (meal_allocation IS NULL AND registration_cutoff>MAX(?,${SQL_NOW})))`,
      )
      .bind(
        starts,
        ends,
        cutoff,
        venueId,
        input.description,
        input.capacity,
        input.id,
        input.version,
        changedTime ? 1 : 0,
        now,
      ),
    receipt(db, now),
    db
      .prepare(
        `UPDATE registration_tokens SET expires_at=? WHERE registration_id IN (SELECT id FROM registrations WHERE event_id=?) AND revoked_at IS NULL`,
      )
      .bind(ends, input.id),
    db
      .prepare('UPDATE email_outbox SET purge_at=? WHERE event_id=?')
      .bind(ends + 7 * DAY, input.id),
    db
      .prepare(
        `INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,next_attempt_at,purge_at,created_at)
      SELECT ?||':'||r.id,?||':'||r.id||':'||e.version,e.id,r.id,r.email_normalized,'gathering_updated',r.language,?,e.ends_at+?,? FROM registrations r JOIN events e ON e.id=r.event_id WHERE e.id=? AND r.status IN ('confirmed','waiting_list','undecided')`,
      )
      .bind(crypto.randomUUID(), 'gathering_updated', now, 7 * DAY, now, input.id),
    audit(db, adminId, input.id, 'gathering_updated', now),
  ]);
}

export async function cancelEvent(
  db: D1Database,
  adminId: string,
  eventId: string,
  expectedVersion: number,
  now = Date.now(),
) {
  await batch(db, [
    freezeMealAllocation(db, eventId, now),
    db
      .prepare(
        "UPDATE events SET status='cancelled',version=version+1 WHERE id=? AND version=? AND status='scheduled'",
      )
      .bind(eventId, expectedVersion),
    receipt(db, now),
    db
      .prepare("DELETE FROM email_outbox WHERE event_id=? AND status IN ('pending','failed')")
      .bind(eventId),
    db
      .prepare(
        `INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,next_attempt_at,purge_at,created_at)
      SELECT ?||':'||r.id,?||':'||r.id,r.event_id,r.id,r.email_normalized,'gathering_cancelled',r.language,?,e.ends_at+?,? FROM registrations r JOIN events e ON e.id=r.event_id WHERE e.id=? AND r.status<>'cancelled'`,
      )
      .bind(crypto.randomUUID(), `gathering_cancelled:${eventId}`, now, 7 * DAY, now, eventId),
    audit(db, adminId, eventId, 'gathering_cancelled', now),
  ]);
}

export async function saveRecipe(
  db: D1Database,
  adminId: string,
  input: z.infer<typeof recipeEdit>,
  now = Date.now(),
) {
  const ingredients = input.ingredients
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const [quantity, ...name] = line.split('|');
      if (!name.join('|').trim()) throw new AdminError('Use quantity | ingredient, one per line');
      return { quantity: quantity.trim(), name: name.join('|').trim() };
    });
  const steps = input.steps
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (ingredients.length > 100 || steps.length > 100)
    throw new AdminError('Use at most 100 ingredients/steps');
  const recipeId = input.id || crypto.randomUUID();
  const write = input.id
    ? db
        .prepare(
          'UPDATE recipes SET slug=?,title=?,description=?,category=?,chef_credit=?,version=version+1 WHERE id=? AND version=?',
        )
        .bind(
          input.slug,
          input.title,
          input.description || null,
          input.category,
          input.chefCredit || null,
          recipeId,
          input.version,
        )
    : db
        .prepare(
          'INSERT INTO recipes (id,slug,title,description,category,chef_credit,created_at,published_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          recipeId,
          input.slug,
          input.title,
          input.description || null,
          input.category,
          input.chefCredit || null,
          now,
          now,
        );
  await batch(db, [
    write,
    receipt(db, now),
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id=?').bind(recipeId),
    db.prepare('DELETE FROM recipe_steps WHERE recipe_id=?').bind(recipeId),
    db
      .prepare(
        "INSERT INTO recipe_ingredients (id,recipe_id,quantity,ingredient,position) SELECT ?||':'||key,?,json_extract(value,'$.quantity'),json_extract(value,'$.name'),CAST(key AS INTEGER) FROM json_each(?)",
      )
      .bind(crypto.randomUUID(), recipeId, JSON.stringify(ingredients)),
    db
      .prepare(
        "INSERT INTO recipe_steps (id,recipe_id,instruction,position) SELECT ?||':'||key,?,value,CAST(key AS INTEGER) FROM json_each(?)",
      )
      .bind(crypto.randomUUID(), recipeId, JSON.stringify(steps)),
    db
      .prepare(
        'INSERT INTO dishes (id,title,description,recipe_id,published_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description',
      )
      .bind(`recipe:${recipeId}`, input.title, input.description || null, recipeId, now),
    audit(db, adminId, null, input.id ? 'recipe_updated' : 'recipe_published', now),
  ]);
  return recipeId;
}

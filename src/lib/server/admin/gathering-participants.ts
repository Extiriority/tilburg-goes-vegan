import { z } from 'zod';
import {
  AdminError,
  audit,
  batch,
  receipt,
  eventEdit,
  parseLocal,
  saturdayCutoff,
  localInput,
} from './service';
import { freezeMealAllocation } from '../events/waiting-list';
const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER)*1000";
export const walkInInput = z
  .object({
    id: z.uuid(),
    eventId: z.string().min(1).max(100),
    extraGuests: z.coerce.number().int().min(0).max(99).default(0),
    fullName: z.string().trim().min(1).max(160),
    override: z.enum(['on']).optional(),
    reason: z.string().trim().max(500).default(''),
  })
  .refine((v) => !v.override || v.reason.length > 0);
export const walkInEdit = z.object({
  id: z.string().min(1).max(100),
  version: z.coerce.number().int().min(0),
  extraGuests: z.coerce.number().int().min(0).max(99).optional(),
  fullName: z.string().trim().min(1).max(160),
  comments: z.string().trim().max(2000),
});
export const uniqueGathering = eventEdit.omit({ version: true }).extend({ id: z.uuid() });

export async function addWalkIn(
  db: D1Database,
  admin: string,
  input: z.infer<typeof walkInInput>,
  now = Date.now(),
) {
  const size = 1 + (input.extraGuests ?? 0);
  const id = `walk-in:${input.id}`;
  const existing = await db
    .prepare('SELECT event_id,full_name,extra_guests FROM walk_in_guests WHERE id=?')
    .bind(id)
    .first<{ event_id: string; full_name: string; extra_guests: number }>();
  if (existing) {
    if (
      existing.event_id !== input.eventId ||
      existing.full_name !== input.fullName ||
      existing.extra_guests !== (input.extraGuests ?? 0)
    )
      throw new AdminError('Submission already used. Reload first.');
    return;
  }
  const count =
    '(SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=events.id)';
  const event = await db
    .prepare('SELECT starts_at FROM events WHERE id=?')
    .bind(input.eventId)
    .first<{ starts_at: number }>();
  if (!event) throw new AdminError('Gathering no longer exists.');
  const promotionEnds = parseLocal(`${localInput(event.starts_at).slice(0, 10)}T19:00`);
  const statements = [freezeMealAllocation(db, input.eventId, now)];
  if (input.override)
    statements.push(
      db
        .prepare(
          `UPDATE events SET capacity=MAX(capacity,${count}+${size}),meal_allocation=CASE WHEN meal_allocation IS NULL THEN NULL ELSE MAX(meal_allocation,${count}+1) END,version=version+1 WHERE id=? AND status='scheduled' AND ends_at>MAX(?,${SQL_NOW}) AND NOT EXISTS(SELECT 1 FROM walk_in_guests WHERE id=?)`,
        )
        .bind(input.eventId, now, id),
    );
  statements.push(
    db
      .prepare(
        `INSERT INTO walk_in_guests (id,event_id,full_name,status,limits_overridden,override_reason,created_at,updated_at,extra_guests)
    SELECT ?,id,?,'confirmed',?,?,?,?,? FROM events WHERE id=? AND status='scheduled' AND ends_at>MAX(?,${SQL_NOW})
    AND (registration_cutoff>MAX(?,${SQL_NOW}) OR meal_allocation IS NOT NULL)
    AND NOT EXISTS(SELECT 1 FROM walk_in_guests WHERE id=?)
    AND NOT EXISTS(SELECT 1 FROM registrations r WHERE r.event_id=events.id AND r.status='waiting_list' AND (r.role='guest' OR (SELECT count(*) FROM confirmed_participants c WHERE c.event_id=r.event_id AND c.role=r.role)<3) AND MAX(?,${SQL_NOW})<?)`,
      )
      .bind(
        id,
        input.fullName,
        input.override ? 1 : 0,
        input.reason || null,
        now,
        now,
        input.extraGuests ?? 0,
        input.eventId,
        now,
        now,
        id,
        now,
        // Existing waiting-list priority applies until manual promotions close at 19:00 Amsterdam.
        promotionEnds,
      ),
  );
  await batch(db, [
    ...statements,
    receipt(db, now),
    audit(
      db,
      admin,
      input.eventId,
      input.override ? 'walk_in_added_with_override' : 'walk_in_added',
      now,
    ),
  ]);
}

export async function editWalkIn(
  db: D1Database,
  admin: string,
  input: z.infer<typeof walkInEdit>,
  now = Date.now(),
) {
  await batch(db, [
    db
      .prepare(
        `UPDATE walk_in_guests SET full_name=?,comments=?,extra_guests=COALESCE(?,extra_guests),version=version+1,updated_at=? WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM events WHERE id=event_id AND ends_at>MAX(?,${SQL_NOW}) AND status='scheduled')`,
      )
      .bind(
        input.fullName,
        input.comments || null,
        input.extraGuests ?? null,
        now,
        input.id,
        input.version,
        now,
      ),
    receipt(db, now),
    audit(db, admin, null, 'walk_in_updated', now),
  ]);
}
export async function markAttendance(
  db: D1Database,
  admin: string,
  id: string,
  version: number,
  noShow: boolean,
  now = Date.now(),
) {
  const walkIn = id.startsWith('walk-in:');
  const table = walkIn ? 'walk_in_guests' : 'registrations';
  const person = await db
    .prepare(`SELECT event_id FROM ${table} WHERE id=?`)
    .bind(id)
    .first<{ event_id: string }>();
  if (!person) throw new AdminError('Registration no longer exists');
  const statements = [
    freezeMealAllocation(db, person.event_id, now),
    db
      .prepare(
        `UPDATE ${table} SET previous_status=status,status=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status='confirmed' AND EXISTS(SELECT 1 FROM events WHERE id=event_id AND status='scheduled' AND ${noShow ? `starts_at<=MIN(?,${SQL_NOW}) AND ends_at+604800000>MAX(?,${SQL_NOW})` : `ends_at>MAX(?,${SQL_NOW})`})`,
      )
      .bind(
        walkIn && noShow ? 'no_show' : 'cancelled',
        now,
        id,
        version,
        now,
        ...(noShow ? [now] : []),
      ),
    receipt(db, now),
  ];
  if (noShow && !walkIn)
    statements.push(
      db
        .prepare('INSERT INTO registration_no_shows (registration_id,created_at) VALUES (?,?)')
        .bind(id, now),
    );
  statements.push(
    audit(db, admin, null, noShow ? 'participant_no_show' : 'walk_in_cancelled', now),
  );
  await batch(db, statements);
}
export async function createGathering(
  db: D1Database,
  admin: string,
  input: z.infer<typeof uniqueGathering>,
  now = Date.now(),
) {
  const starts = parseLocal(input.starts),
    ends = parseLocal(input.ends);
  if (starts <= now || ends <= starts)
    throw new AdminError('Choose a future dinner with an end after its start.');
  const old = await db
    .prepare(
      'SELECT starts_at,ends_at,description,capacity FROM events WHERE id=? AND occurrence_key=?',
    )
    .bind(input.id, `special:${input.id}`)
    .first<{ starts_at: number; ends_at: number; description: string; capacity: number }>();
  if (old) {
    if (
      old.starts_at !== starts ||
      old.ends_at !== ends ||
      old.description !== input.description ||
      old.capacity !== input.capacity
    )
      throw new AdminError('Submission already used. Reload first.');
    return input.id;
  }
  const venue = crypto.randomUUID();
  await batch(db, [
    db
      .prepare('INSERT INTO venues (id,name,address,created_at) VALUES (?,?,?,?)')
      .bind(venue, input.venue, input.address, now),
    db
      .prepare(
        `INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,venue_id,description,capacity,registration_cutoff,created_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ?>${SQL_NOW}`,
      )
      .bind(
        input.id,
        `special:${input.id}`,
        `special-${input.id}`,
        starts,
        ends,
        venue,
        input.description,
        input.capacity,
        saturdayCutoff(starts),
        now,
        starts,
      ),
    receipt(db, now),
    audit(db, admin, input.id, 'gathering_created', now),
  ]);
  return input.id;
}

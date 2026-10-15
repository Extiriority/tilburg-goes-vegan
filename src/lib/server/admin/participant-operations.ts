import { z } from 'zod';
import {
  AdminError,
  audit,
  batch,
  receipt,
  cancelRegistration,
  promoteManually,
  participantMail,
  volunteerMail,
} from './service';
import { markAttendance } from './gathering-participants';
import { freezeMealAllocation } from '../events/waiting-list';
import { registrationWindow, priorDinnerSql } from '../events/window';
const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER)*1000";
const identity = { id: z.string().min(1).max(100), version: z.coerce.number().int().min(0) };
export const statusInput = z.object({
  ...identity,
  status: z.enum(['confirmed', 'waiting_list', 'undecided', 'cancelled', 'no_show']),
  contacted: z.enum(['on']).optional(),
});
export const paymentInput = z.object({
  ...identity,
  paid: z.enum(['on']).optional(),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,5}(?:[.,]\d{1,2})?$/),
});
const cents = (amount: string) => {
  const [whole, decimal = ''] = amount.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
};
export async function savePayment(
  db: D1Database,
  admin: string,
  input: z.infer<typeof paymentInput>,
  now = Date.now(),
) {
  const table = input.id.startsWith('walk-in:') ? 'walk_in_guests' : 'registrations';
  const amount = input.paid ? cents(input.amount) : 0;
  if (input.paid && amount <= 0) throw new AdminError('Enter the amount received.');
  await batch(db, [
    db
      .prepare(
        `UPDATE ${table} SET paid_at=?,paid_amount_cents=?,version=version+1,updated_at=? WHERE id=? AND version=? ${table === 'registrations' ? 'AND anonymized_at IS NULL' : ''} AND EXISTS(SELECT 1 FROM events WHERE id=event_id AND ends_at+604800000>MAX(?,${SQL_NOW}))`,
      )
      .bind(input.paid ? now : null, amount, now, input.id, input.version, now),
    receipt(db, now),
    audit(db, admin, null, input.paid ? 'payment_recorded' : 'payment_unchecked', now),
  ]);
}
export async function changeParticipantStatus(
  db: D1Database,
  admin: string,
  input: z.infer<typeof statusInput>,
  now = Date.now(),
) {
  const walkIn = input.id.startsWith('walk-in:');
  const table = walkIn ? 'walk_in_guests' : 'registrations';
  const person = await db
    .prepare(`SELECT p.event_id,p.status,p.version,p.previous_status FROM ${table} p WHERE p.id=?`)
    .bind(input.id)
    .first<{ event_id: string; status: string; version: number; previous_status: string | null }>();
  if (!person || person.version !== input.version)
    throw new AdminError('The record changed. Reload first.');
  const absent =
    !walkIn &&
    !!(await db
      .prepare('SELECT 1 FROM registration_no_shows WHERE registration_id=?')
      .bind(input.id)
      .first());
  const oldStatus = absent ? 'no_show' : person.status;
  if (oldStatus === input.status) return;
  if (input.status === 'undecided') throw new AdminError('Undecided is only available for existing registrations.');
  if (input.status === 'no_show') {
    await markAttendance(db, admin, input.id, input.version, true, now);
    return;
  }
  if (input.status === 'cancelled' && !walkIn && !absent) {
    await cancelRegistration(db, admin, input.id, input.version, now);
    return;
  }
  if (input.status === 'confirmed' && oldStatus === 'waiting_list') {
    await promoteManually(db, admin, input.id, input.version, input.contacted === 'on', now);
    return;
  }
  if (walkIn && !['confirmed', 'cancelled'].includes(input.status))
    throw new AdminError('This status is unavailable for organizer-added people.');
  const window =
    input.status === 'confirmed' ? await registrationWindow(db, person.event_id) : null;
  if (input.status === 'confirmed' && !window) throw new AdminError('Gathering no longer exists');
  // Restorations reserve the whole group and cannot bypass a waiting person.
  const needsCutoff =
    oldStatus === 'undecided' ||
    (oldStatus === 'cancelled' && !['confirmed', 'no_show'].includes(person.previous_status ?? ''));
  if (
    input.status === 'confirmed' &&
    oldStatus === 'cancelled' &&
    person.previous_status === 'waiting_list'
  )
    throw new AdminError('Restore waiting-list status first, then contact the person to confirm.');
  const confirmation =
    input.status === 'confirmed'
      ? ` AND e.starts_at=? AND (${priorDinnerSql}) IS ? AND ?<=MIN(?,${SQL_NOW})
    ${needsCutoff ? `AND e.registration_cutoff>MAX(?,${SQL_NOW})` : ''}
    AND NOT EXISTS(SELECT 1 FROM registrations w WHERE w.event_id=e.id AND w.status='waiting_list' AND w.anonymized_at IS NULL AND (w.role='guest' OR (SELECT count(*) FROM confirmed_participants c WHERE c.event_id=e.id AND c.role=w.role)<3))`
      : '';
  const statements = [
    freezeMealAllocation(db, person.event_id, now),
    db
      .prepare(
        `UPDATE ${table} SET previous_status=?,status=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status=? ${walkIn ? '' : 'AND anonymized_at IS NULL'} AND EXISTS(SELECT 1 FROM events e WHERE e.id=event_id AND e.status='scheduled' AND e.ends_at>MAX(?,${SQL_NOW}) AND (e.registration_cutoff>MAX(?,${SQL_NOW}) OR e.meal_allocation IS NOT NULL) ${input.status === 'waiting_list' ? "AND (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=e.id)>=e.capacity" : ''} ${confirmation})`,
      )
      .bind(
        oldStatus,
        input.status,
        now,
        input.id,
        input.version,
        person.status,
        now,
        now,
        ...(window
          ? [window.starts_at, window.prior_end, window.opensAt, now, ...(needsCutoff ? [now] : [])]
          : []),
      ),
    receipt(db, now),
  ];
  if (!walkIn) {
    statements.push(
      db.prepare('DELETE FROM registration_no_shows WHERE registration_id=?').bind(input.id),
    );
    statements.push(
      participantMail(
        db,
        input.id,
        input.status === 'cancelled' ? 'registration_cancel' : 'registration_' + input.status,
        now,
      ),
    );
    if (input.status === 'confirmed' || oldStatus === 'confirmed')
      statements.push(
        volunteerMail(
          db,
          input.id,
          input.status === 'confirmed' ? 'volunteer_signup' : 'volunteer_cancellation',
          now,
        ),
      );
  }
  statements.push(audit(db, admin, person.event_id, 'participant_status_' + input.status, now));
  await batch(db, statements);
}

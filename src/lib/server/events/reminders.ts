import { localInstant, TIMEZONE } from './schedule.ts';

const DAY = 86_400_000;
const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER)*1000";
const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function reminderTimes(startsAt: number, cutoff: number) {
  const day = Date.parse(`${calendar.format(startsAt)}T00:00:00Z`);
  // Latest Sunday before the dinner's calendar date, converted in its own zone.
  const sunday = day - (new Date(day).getUTCDay() || 7) * DAY;
  return { undecided: cutoff - 6 * 3_600_000, confirmed: localInstant(sunday, 18) };
}

/** Queue durable intents only. No SMTP, rendered bodies or raw management links. */
export async function queueDueReminders(db: D1Database, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid operation time');
  const events = await db.prepare("SELECT id,starts_at,registration_cutoff FROM events WHERE status='scheduled' AND starts_at>?")
    .bind(now).all<{ id: string; starts_at: number; registration_cutoff: number }>();
  let queued = 0;
  for (const event of events.results) {
    const times = reminderTimes(event.starts_at, event.registration_cutoff);
    const statements = (['undecided', 'confirmed'] as const).map(status => {
      const due = times[status];
      const until = status === 'undecided' ? event.registration_cutoff : event.starts_at;
      return db.prepare(`INSERT INTO email_outbox
        (id,idempotency_key,event_id,registration_id,recipient,template,locale,status,next_attempt_at,purge_at,created_at)
        SELECT 'reminder:${status}:'||r.id,'reminder:${status}:'||r.id,r.event_id,r.id,r.email_normalized,
          'reminder_${status}',r.language,'pending',?,e.ends_at+604800000,?
        FROM registrations r JOIN events e ON e.id=r.event_id
        WHERE e.id=? AND e.status='scheduled' AND e.starts_at=? AND e.registration_cutoff=?
          AND r.status=? AND r.anonymized_at IS NULL AND r.email_normalized IS NOT NULL
          AND ?<=MIN(?,${SQL_NOW}) AND ?>MAX(?,${SQL_NOW})
        ON CONFLICT(idempotency_key) DO NOTHING`)
        .bind(now, now, event.id, event.starts_at, event.registration_cutoff, status, due, now, until, now);
    });
    const results = await db.batch(statements);
    queued += results.reduce((sum, result) => sum + result.meta.changes, 0);
  }
  return { queued };
}

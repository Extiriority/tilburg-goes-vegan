import { localInstant, TIMEZONE, registrationOpensAt } from './schedule.ts';
import { registrationWindow,priorDinnerSql } from './window.ts';

const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER) * 1000";
const DAY = 86_400_000;

export function mondayStartsAt(startsAt: number) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(startsAt);
  return localInstant(Date.parse(`${date}T00:00:00Z`), 0);
}

// Include this before a post-cutoff registration write in the SAME batch.
// A delayed scheduler must not count a cancellation after it has freed a seat.
export function freezeMealAllocation(db: D1Database, eventId: string, now: number) {
  return db.prepare(`UPDATE events SET meal_allocation=(SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=events.id AND status='confirmed')
    WHERE id=? AND status='scheduled' AND meal_allocation IS NULL AND registration_cutoff<=MAX(?,${SQL_NOW})`).bind(eventId,now);
}

const candidateSql = `SELECT r.id,r.version FROM registrations r JOIN events e ON e.id=r.event_id
  WHERE e.id=? AND e.starts_at=? AND e.status='scheduled' AND r.status='waiting_list' AND r.anonymized_at IS NULL
    AND MAX(?,${SQL_NOW})<? AND e.ends_at>MAX(?,${SQL_NOW})
    AND (e.registration_cutoff>MAX(?,${SQL_NOW}) OR e.meal_allocation IS NOT NULL)
    AND (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed')+r.extra_guests+1<=e.capacity
    AND (e.meal_allocation IS NULL OR (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed')+r.extra_guests+1<=e.meal_allocation)
    AND (r.role='guest' OR (SELECT count(*) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed' AND role=r.role)<3)
  AND ?<=MIN(?,${SQL_NOW}) AND (${priorDinnerSql}) IS ? ORDER BY r.created_at,r.id LIMIT 1`;

/** Internal scheduler/service only: no participant-facing promotion endpoint. */
export async function promoteWaitingList(db: D1Database, eventId: string, now=Date.now()) {
  if (!Number.isSafeInteger(now) || now<0) throw new Error('Invalid operation time');
  const event = await db.prepare('SELECT starts_at,capacity FROM events WHERE id=?').bind(eventId).first<{starts_at:number;capacity:number}>();
  if (!event) return { promoted:0 };
  const monday = mondayStartsAt(event.starts_at);
  const window = await registrationWindow(db,eventId);
  if(!window)return {promoted:0};
  // Freeze even on Monday; never automatically promote that day.
  await freezeMealAllocation(db,eventId,now).run();
  if (now>=monday) return {promoted:0};
  let promoted=0;
  const bindings=[eventId,event.starts_at,now,monday,now,now,window.opensAt,now,window.prior_end];
  // Bound the work per pass; the next scheduler pass can continue if competing
  // writes keep changing the candidate. Each write independently enforces FIFO.
  for (let attempt=0;attempt<event.capacity+10;attempt++) {
    const candidate=await db.prepare(candidateSql).bind(...bindings).first<{id:string;version:number}>();
    if (!candidate) break;
    const mailId=crypto.randomUUID();
    const key=`registration:${candidate.id}:promoted:${candidate.version+1}`;
    const results=await db.batch([
      freezeMealAllocation(db,eventId,now),
      db.prepare(`UPDATE registrations SET status='confirmed',version=version+1,updated_at=?
        WHERE id=? AND version=? AND status='waiting_list' AND id=(${candidateSql.replace('SELECT r.id,r.version','SELECT r.id')})`)
        .bind(now,candidate.id,candidate.version,...bindings),
      // changes() refers directly to the conditional UPDATE. A losing racer
      // cannot queue a message for the winning request's version.
      db.prepare(`INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,status,next_attempt_at,purge_at,created_at)
        SELECT ?,?,r.event_id,r.id,r.email_normalized,'waiting_list_promoted',r.language,'pending',?,e.ends_at+?,?
        FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=? AND changes()=1`)
        .bind(mailId,key,now,7*DAY,now,candidate.id),
      db.prepare(`INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,status,next_attempt_at,purge_at,created_at)
        SELECT ?||':'||recipient,?||':'||recipient,r.event_id,r.id,recipient,'volunteer_signup','en','pending',?,e.ends_at+?,?
        FROM registrations r JOIN events e ON e.id=r.event_id CROSS JOIN (
          SELECT organizer_email AS recipient FROM settings WHERE id=1 AND organizer_email IS NOT NULL
          UNION SELECT value FROM settings,json_each(COALESCE(additional_recipients,'[]')) WHERE settings.id=1
        ) recipients WHERE r.id=? AND r.role IN ('chef','helper_chef') AND EXISTS (SELECT 1 FROM email_outbox WHERE id=?)`)
        .bind(crypto.randomUUID(),key+':organizer',now,7*DAY,now,candidate.id,mailId)
    ]);
    promoted+=results[1].meta.changes;
  }
  return {promoted};
}

export async function processWaitingLists(db:D1Database,now=Date.now()) {
  const events=await db.prepare(`SELECT id FROM events WHERE status='scheduled' AND ends_at>MAX(?,${SQL_NOW})`).bind(now).all<{id:string}>();
  let promoted=0;
  for(const event of events.results) promoted+=(await promoteWaitingList(db,event.id,now)).promoted;
  return {promoted};
}

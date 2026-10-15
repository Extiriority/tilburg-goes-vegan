import { hashToken, managementToken, verifySubmissionToken } from './tokens';
import type { RegistrationInput, DetailsInput } from './validation';
import { localInstant, TIMEZONE, registrationOpensAt } from '../events/schedule';
import { freezeMealAllocation } from '../events/waiting-list';
import { registrationWindow,priorDinnerSql } from '../events/window';

const DAY = 86_400_000;
// UTC seconds suffice for the whole-second Amsterdam deadlines; use DB time
// as well as request time so a delayed write cannot admit a late signup.
const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER) * 1000";
export type RegistrationStatus = 'confirmed' | 'waiting_list' | 'undecided' | 'cancelled';
export class RegistrationError extends Error {
  constructor(public code: 'closed' | 'not_open' | 'duplicate' | 'invalid_token' | 'conflict' | 'full' | 'invalid_transition') { super(code); }
}

export type ManagedRegistration = {
  id: string; event_id: string; email_normalized: string; full_name: string;
  extra_guests: number;
  role: 'guest' | 'helper_chef' | 'chef'; status: RegistrationStatus; language: 'en' | 'nl';
  dietary_notes: string | null; dietary_consent_at: number | null; comments: string | null; version: number;
  starts_at: number; ends_at: number; registration_cutoff: number; event_status: string;
  venue: string; address: string; token_expires_at: number;
};

export async function getManagedRegistration(db: D1Database, token: string, now = Date.now()) {
  if (!/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(`SELECT r.*,e.starts_at,e.ends_at,e.registration_cutoff,e.status AS event_status,
    v.name AS venue,v.address,t.expires_at AS token_expires_at
    FROM registration_tokens t JOIN registrations r ON r.id=t.registration_id
    JOIN events e ON e.id=r.event_id JOIN venues v ON v.id=e.venue_id
    WHERE t.token_hash=? AND t.revoked_at IS NULL AND t.expires_at>MAX(?,${SQL_NOW})
      AND e.ends_at>MAX(?,${SQL_NOW}) AND r.anonymized_at IS NULL`)
    .bind(await hashToken(token),now,now).first<ManagedRegistration>();
}

function emailIntent(db: D1Database, id: string, key: string, template: string, now: number, version?: number) {
  return db.prepare(`INSERT INTO email_outbox
    (id,idempotency_key,event_id,registration_id,recipient,template,locale,status,next_attempt_at,purge_at,created_at)
    SELECT ?,?,r.event_id,r.id,r.email_normalized,${template},r.language,'pending',?,e.ends_at+?,?
    FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=?
    ${version === undefined ? '' : 'AND r.version=?'} ON CONFLICT(idempotency_key) DO NOTHING`)
    .bind(id,key,now,7*DAY,now,key.split(':')[1],...(version === undefined ? [] : [version]));
}

function organizerIntents(db: D1Database, registrationId: string, key: string, template: string, now: number, condition: string, version?: number) {
  // Recipients are resolved from settings inside the same transaction. Never put
  // participant details or raw tokens into an outbox payload or an audit log.
  return db.prepare(`INSERT INTO email_outbox
    (id,idempotency_key,event_id,registration_id,recipient,template,locale,status,next_attempt_at,purge_at,created_at)
    SELECT ? || ':' || recipient, ? || ':' || recipient,r.event_id,r.id,recipient,?,'en','pending',?,e.ends_at+?,?
    FROM registrations r JOIN events e ON e.id=r.event_id CROSS JOIN (
      SELECT organizer_email AS recipient FROM settings WHERE id=1 AND organizer_email IS NOT NULL
      UNION SELECT value FROM settings,json_each(COALESCE(additional_recipients,'[]')) WHERE settings.id=1
    ) recipients WHERE r.id=? AND (${condition}) ${version === undefined ? '' : 'AND r.version=?'}
    ON CONFLICT(idempotency_key) DO NOTHING`)
    .bind(crypto.randomUUID(),key,template,now,7*DAY,now,registrationId,...(version === undefined ? [] : [version]));
}

export async function register(db: D1Database, secret: string, input: RegistrationInput, now = Date.now()) {
  const extraGuests = input.extraGuests ?? 0;
  if(!Number.isInteger(extraGuests)||extraGuests<0||extraGuests>99) throw new RegistrationError('conflict');
  const id = await verifySubmissionToken(secret,input.submissionToken);
  if (!id) throw new RegistrationError('invalid_token');
  const existing = await db.prepare('SELECT * FROM registrations WHERE id=?').bind(id).first<Record<string,unknown>>();
  if (existing && (existing.event_id!==input.eventId || existing.email_normalized!==input.email || existing.full_name!==input.fullName || existing.extra_guests!==extraGuests || existing.role!==input.role || existing.dietary_notes!==input.dietaryNotes || existing.comments!==input.comments)) throw new RegistrationError('conflict');
  const event = await registrationWindow(db,input.eventId);
  if (!event) throw new RegistrationError('closed');
  const opensAt = event.opensAt;
  if (!existing && now < opensAt) throw new RegistrationError('not_open');
  const token = await managementToken(secret,id);
  const tokenHash = await hashToken(token);
  const key = `registration:${id}:created`;
  try {
    await db.batch([
      db.prepare(`INSERT INTO registrations
        (id,event_id,email_normalized,full_name,role,status,language,dietary_notes,dietary_consent_at,comments,created_at,updated_at,extra_guests)
        SELECT ?,e.id,?,?,?,CASE WHEN ? THEN 'undecided'
          WHEN EXISTS (SELECT 1 FROM registrations w WHERE w.event_id=e.id AND w.status='waiting_list' AND w.anonymized_at IS NULL
            AND (w.role='guest' OR (SELECT count(*) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed' AND role=w.role)<3)) THEN 'waiting_list'
          WHEN (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed') + ${extraGuests+1} > e.capacity
            OR (e.meal_allocation IS NOT NULL AND (SELECT COALESCE(sum(seats),0) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed') + ${extraGuests+1} > e.meal_allocation)
            OR (? IN ('chef','helper_chef') AND (SELECT count(*) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed' AND role=?) >= 3)
          THEN 'waiting_list' ELSE 'confirmed' END,?,?,?,?,?,?,?
        FROM events e WHERE e.id=? AND e.status='scheduled' AND e.registration_cutoff>MAX(?,${SQL_NOW})
          AND e.starts_at=? AND (${priorDinnerSql}) IS ? AND ?<=MIN(?,${SQL_NOW})
        ON CONFLICT(id) DO NOTHING`)
        .bind(id,input.email,input.fullName,input.role,input.undecided?1:0,input.role,input.role,input.language,input.dietaryNotes,input.dietaryNotes?now:null,input.comments,now,now,extraGuests,input.eventId,now,event.starts_at,event.prior_end,opensAt,now),
      db.prepare(`INSERT INTO registration_tokens (id,registration_id,token_hash,expires_at,created_at)
        SELECT r.id,r.id,?,e.ends_at,? FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.id=?
        ON CONFLICT(id) DO NOTHING`).bind(tokenHash,now,id),
      emailIntent(db,crypto.randomUUID(),key,"'registration_' || r.status",now),
      organizerIntents(db,id,`registration:${id}:volunteer`,'volunteer_signup',now,"r.role IN ('chef','helper_chef') AND r.status IN ('confirmed','waiting_list')")
    ]);
  } catch (error) {
    const message = String(error);
    if (message.includes('registrations.event_id, registrations.email_normalized')) throw new RegistrationError('duplicate');
    throw error;
  }
  const result = await getManagedRegistration(db,token,now);
  if (!result) throw new RegistrationError('closed');
  if (result.email_normalized!==input.email || result.full_name!==input.fullName || result.extra_guests!==extraGuests || result.role!==input.role || result.event_id!==input.eventId || result.dietary_notes!==input.dietaryNotes || result.comments!==input.comments || result.language!==input.language) throw new RegistrationError('conflict');
  return { token, registration: result };
}

export async function changeRegistration(db: D1Database, token: string, action: 'cancel' | 'confirm' | 'details', expectedVersion: number, details?: DetailsInput, now = Date.now()) {
  const current = await getManagedRegistration(db,token,now);
  if (!current) throw new RegistrationError('invalid_token');
  if (current.version !== expectedVersion) throw new RegistrationError('conflict');
  if (action==='cancel' && current.status==='cancelled') return current;
  if (current.status==='cancelled' || (action!=='cancel' && current.event_status==='cancelled')) throw new RegistrationError('invalid_transition');
  if (action==='confirm' && current.status!=='undecided') throw new RegistrationError('invalid_transition');
  if (action==='confirm' && now>=current.registration_cutoff) throw new RegistrationError('closed');
  const window=action==='confirm'?await registrationWindow(db,current.event_id):null;
  if (action==='confirm' && (!window || now<window.opensAt)) throw new RegistrationError('not_open');
  if (action==='confirm' && await db.prepare(`SELECT 1 FROM registrations w WHERE w.event_id=? AND w.status='waiting_list' AND w.anonymized_at IS NULL
    AND (w.role='guest' OR (SELECT count(*) FROM confirmed_participants WHERE event_id=w.event_id AND status='confirmed' AND role=w.role)<3) LIMIT 1`)
    .bind(current.event_id).first()) throw new RegistrationError('full');
  const nextVersion=expectedVersion+1;
  const tokenHash=await hashToken(token);
  const validToken=`AND EXISTS (SELECT 1 FROM registration_tokens WHERE registration_id=registrations.id AND token_hash=? AND revoked_at IS NULL AND expires_at>MAX(?,${SQL_NOW}))`;
  const update = action==='details'
    ? db.prepare(`UPDATE registrations SET dietary_notes=?,dietary_consent_at=?,comments=?,version=version+1,updated_at=?
        WHERE id=? AND version=? AND status<>'cancelled' AND EXISTS (SELECT 1 FROM events WHERE id=event_id AND status='scheduled' AND ends_at>MAX(?,${SQL_NOW})
          AND (registration_cutoff>${SQL_NOW} OR meal_allocation IS NOT NULL)) ${validToken}`)
      .bind(details!.dietaryNotes,details!.dietaryNotes?now:null,details!.comments,now,current.id,expectedVersion,now,tokenHash,now)
    : db.prepare(`UPDATE registrations SET previous_status=status,status=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status=?
        AND EXISTS (SELECT 1 FROM events e WHERE id=event_id AND ends_at>MAX(?,${SQL_NOW})
          AND (status='cancelled' OR registration_cutoff>${SQL_NOW} OR meal_allocation IS NOT NULL)
          ${action==='confirm'?`AND status='scheduled' AND registration_cutoff>MAX(?,${SQL_NOW}) AND starts_at=? AND (${priorDinnerSql}) IS ? AND ?<=MIN(?,${SQL_NOW})
            AND NOT EXISTS (SELECT 1 FROM registrations w WHERE w.event_id=e.id AND w.status='waiting_list' AND w.anonymized_at IS NULL
              AND (w.role='guest' OR (SELECT count(*) FROM confirmed_participants WHERE event_id=e.id AND status='confirmed' AND role=w.role)<3))`:''}) ${validToken}`)
      .bind(action==='cancel'?'cancelled':'confirmed',now,current.id,expectedVersion,current.status,now,...(action==='confirm'?[now,current.starts_at,window!.prior_end,window!.opensAt,now]:[]),tokenHash,now);
  const key=`registration:${current.id}:${action}:${nextVersion}`;
  // The CHECK makes an unsuccessful conditional update abort the entire batch,
  // preventing a racing request from queuing an email for somebody else's update.
  const receipt=db.prepare(`INSERT INTO registration_mutations (id,registration_id,version,action,applied,created_at)
    VALUES (?,?,?,?,changes(),?)`).bind(crypto.randomUUID(),current.id,nextVersion,action,now);
  const statements=[freezeMealAllocation(db,current.event_id,now),update,receipt,emailIntent(db,crypto.randomUUID(),key,`'registration_${action}'`,now,nextVersion)];
  if (action==='cancel') statements.push(organizerIntents(db,current.id,key+':organizer','volunteer_cancellation',now,"r.role IN ('chef','helper_chef')",nextVersion));
  if (action==='confirm') statements.push(organizerIntents(db,current.id,key+':organizer','volunteer_signup',now,"r.role IN ('chef','helper_chef')",nextVersion));
  if (action==='details' && current.dietary_notes!==details!.dietaryNotes) statements.push(organizerIntents(db,current.id,key+':organizer','late_dietary_change',now,`e.registration_cutoff<=${now}`,nextVersion));
  const eventDate=new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(current.starts_at);
  const eventDayStarts=localInstant(Date.parse(`${eventDate}T00:00:00Z`),0);
  if (action==='cancel' && current.status==='confirmed' && now>=eventDayStarts && now<current.starts_at) statements.push(organizerIntents(db,current.id,key+':vacancy','vacancy',now,'1=1',nextVersion));
  try {
    const results=await db.batch(statements);
    if (results[1].meta.changes!==1) throw new RegistrationError('conflict');
  } catch (error) {
    if (String(error).includes('registration_capacity_exceeded')) throw new RegistrationError('full');
    if (String(error).includes('mutation_applied') || String(error).includes('registration_mutations.registration_id')) throw new RegistrationError('conflict');
    throw error;
  }
  return (await getManagedRegistration(db,token,now))!;
}

import { readDietaryForm, parseDietary, allergens } from '$lib/dietary';
import { AdminError, audit, batch, receipt } from './service';
import { z } from 'zod';

const input = z.object({ eventId: z.string().min(1).max(100),
  version: z.coerce.number().int().nonnegative(), notes: z.string().max(2000), consent: z.boolean(),
}).refine(value => !value.notes || value.consent);
export async function saveGatheringDietary(db: D1Database, admin: string, form: FormData, now = Date.now()) {
  const parsed = input.safeParse({ eventId: form.get('eventId'), version: form.get('version'),
    notes: readDietaryForm(form), consent: form.get('dietaryConsent') === 'on' });
  if (!parsed.success) throw new AdminError('Check dietary details and consent.');
  const value = parsed.data;
  await batch(db, [db.prepare(`INSERT INTO gathering_dietary (event_id,notes,version,updated_at)
    SELECT id,?,?,? FROM events WHERE id=? AND ends_at+86400000>MAX(?,CAST(strftime('%s','now') AS INTEGER)*1000)
    AND (?=0 OR EXISTS(SELECT 1 FROM gathering_dietary WHERE event_id=events.id AND version=?))
    ON CONFLICT(event_id) DO UPDATE SET notes=excluded.notes,version=excluded.version,updated_at=excluded.updated_at
    WHERE gathering_dietary.version=?`)
    .bind(value.notes || null, value.version+1, now, value.eventId, now, value.version, value.version, value.version),
    receipt(db, now), audit(db, admin, value.eventId, 'gathering_dietary_updated', now)]);
}

export async function getGatheringDietary(db: D1Database, eventId: string, now = Date.now()) {
  const manual = await db.prepare(`SELECT d.notes,d.version FROM gathering_dietary d JOIN events e ON e.id=d.event_id
    WHERE d.event_id=? AND e.ends_at+86400000>?`).bind(eventId,now).first<{notes:string|null;version:number}>();
  const rows = await db.prepare(`SELECT r.dietary_notes AS notes FROM registrations r JOIN events e ON e.id=r.event_id
    WHERE r.event_id=? AND r.status='confirmed' AND r.anonymized_at IS NULL AND e.ends_at+86400000>? AND r.dietary_notes IS NOT NULL`)
    .bind(eventId,now).all<{notes:string}>();
  const parsed = [...rows.results.map(row => parseDietary(row.notes)), parseDietary(manual?.notes ?? null)];
  return { manualNotes: manual?.notes ?? null, version: manual?.version ?? 0,
    allergens: allergens.filter(item => parsed.some(value => value.allergens.includes(item.id))).map(item => item.id),
    notes: [...new Set(parsed.flatMap(value => [value.other,value.preparation,value.legacy]).filter(Boolean))].sort() };
}

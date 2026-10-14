import { DEFAULT_CAPACITY, upcomingOccurrences, TIMEZONE } from './schedule';

// Call from the future scheduler or organizer setup, never mutate on public GET.
// INSERT ... ON CONFLICT preserves every existing occurrence, including cancellations.
export async function maintainUpcomingEvents(db: D1Database, now: number) {
  const defaults = await db.prepare('SELECT default_venue_id, default_capacity FROM settings WHERE id=1').first<{ default_venue_id: string | null; default_capacity: number | null }>();
  if (!defaults?.default_venue_id) return { configured: false, created: 0 };
  const results = await db.batch(upcomingOccurrences(now).map((event) => db.prepare(`
    INSERT INTO events (id,occurrence_key,slug,starts_at,ends_at,timezone,venue_id,capacity,registration_cutoff,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(occurrence_key) DO NOTHING
  `).bind(crypto.randomUUID(), event.occurrenceKey, event.occurrenceKey, event.startsAt, event.endsAt, TIMEZONE, defaults.default_venue_id, defaults.default_capacity ?? DEFAULT_CAPACITY, event.registrationCutoff, now)));
  return { configured: true, created: results.reduce((n,r) => n + r.meta.changes, 0) };
}

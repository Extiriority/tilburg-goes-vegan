import { localInstant, registrationOpensAt, TIMEZONE } from './schedule.ts';
// Includes cancelled recurrence records: cancellation must not shift the window.
export const priorDinnerSql = `SELECT p.ends_at FROM events p WHERE p.starts_at<e.starts_at OR (p.starts_at=e.starts_at AND p.id<e.id) ORDER BY p.starts_at DESC,p.id DESC LIMIT 1 OFFSET 1`;
export async function registrationWindow(db: D1Database, eventId: string) {
  const row = await db
    .prepare(`SELECT e.starts_at,(${priorDinnerSql}) AS prior_end FROM events e WHERE e.id=?`)
    .bind(eventId)
    .first<{ starts_at: number; prior_end: number | null }>();
  if (!row) return null;
  let opensAt = registrationOpensAt(row.starts_at);
  if (row.prior_end !== null) {
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(row.prior_end);
    opensAt = localInstant(Date.parse(`${date}T00:00:00Z`) + 86400000, 0);
  }
  return { ...row, opensAt };
}

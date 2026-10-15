const DAY = 86_400_000;

/** UTC elapsed days from scheduled dinner end, also for cancelled events. */
export async function cleanupPrivacy(db: D1Database, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('Invalid cleanup time');
  const due = await db.prepare('SELECT id, ends_at FROM events WHERE ends_at <= ? ORDER BY ends_at, id')
    .bind(now - DAY).all<{ id: string; ends_at: number }>();
  let dietaryRows = 0;
  let deletedRegistrations = 0;
  let deletedEmails = 0;
  for (const event of due.results) {
    // Recheck the deadline in each write. Never skip a sweep just because a
    // receipt exists: restored data must be cleaned again on the next run.
    const eligible = 'SELECT id FROM events WHERE id=? AND ends_at<=?';
    const statements = [
      db.prepare(`UPDATE registrations SET dietary_notes=NULL,dietary_consent_at=NULL
        WHERE event_id IN (${eligible}) AND (dietary_notes IS NOT NULL OR dietary_consent_at IS NOT NULL)`)
        .bind(event.id, now - DAY),
      db.prepare(`INSERT INTO privacy_cleanup_runs (id,event_id,cutoff,kind,affected_rows,completed_at)
        SELECT ?,id,ends_at+?,'dietary',changes(),? FROM events WHERE id=? AND ends_at<=?
        ON CONFLICT(event_id,kind) DO NOTHING`)
        .bind(crypto.randomUUID(), DAY, now, event.id, now - DAY)
    ];
    if (event.ends_at <= now - 7 * DAY) {
      const identityRunId = crypto.randomUUID();
      statements.push(
        db.prepare(`DELETE FROM email_outbox WHERE event_id IN (${eligible})
          OR registration_id IN (SELECT id FROM registrations WHERE event_id IN (${eligible})) RETURNING id`)
          .bind(event.id, now - 7 * DAY, event.id, now - 7 * DAY),
        // FK cascades delete management-token hashes and mutation receipts.
        db.prepare(`DELETE FROM registrations WHERE event_id IN (${eligible}) RETURNING id`).bind(event.id, now - 7 * DAY),
        db.prepare(`INSERT INTO privacy_cleanup_runs (id,event_id,cutoff,kind,affected_rows,completed_at)
          SELECT ?,id,ends_at+?,'identity',changes(),? FROM events WHERE id=? AND ends_at<=?
          ON CONFLICT(event_id,kind) DO NOTHING`)
          .bind(identityRunId, 7 * DAY, now, event.id, now - 7 * DAY),
        db.prepare(`DELETE FROM walk_in_guests WHERE event_id IN (${eligible}) RETURNING id`).bind(event.id, now - 7 * DAY),
        db.prepare('UPDATE privacy_cleanup_runs SET affected_rows=affected_rows+changes() WHERE id=?').bind(identityRunId)
      );
    }
    statements.push(db.prepare(`DELETE FROM gathering_dietary WHERE event_id IN (${eligible})`).bind(event.id, now - DAY));
    const results = await db.batch(statements);
    dietaryRows += results[0].meta.changes;
    dietaryRows += results[results.length - 1].meta.changes;
    if (event.ends_at <= now - 7 * DAY) {
      deletedEmails += results[2].results.length;
      deletedRegistrations += results[3].results.length + results[5].results.length;
    }
  }
  // Respect message-specific retention even for unlinked operational emails.
  // Attempts cascade; deleting instead of tombstoning also removes correlation IDs.
  const expired = await db.prepare('DELETE FROM email_outbox WHERE purge_at<=? RETURNING id').bind(now).all();
  deletedEmails += expired.results.length;
  return { dietaryRows, deletedRegistrations, deletedEmails };
}

const SQL_NOW = "CAST(strftime('%s','now') AS INTEGER)*1000";
/** Idempotent cutoff cancellation; notifications commit with the state change. */
export async function expireUndecided(db: D1Database, now = Date.now()) {
  const results = await db.batch([
    db.prepare(`INSERT INTO email_outbox (id,idempotency_key,event_id,registration_id,recipient,template,locale,status,next_attempt_at,purge_at,created_at)
      SELECT 'undecided-expired:'||r.id||':'||(r.version+1),'undecided-expired:'||r.id||':'||(r.version+1),r.event_id,r.id,r.email_normalized,'registration_cancel',r.language,'pending',?,e.ends_at+604800000,?
      FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.status='undecided' AND e.status='scheduled'
      AND e.registration_cutoff<=MAX(?,${SQL_NOW}) AND r.anonymized_at IS NULL AND e.ends_at+604800000>MAX(?,${SQL_NOW})
      ON CONFLICT(idempotency_key) DO NOTHING`).bind(now,now,now,now),
    db.prepare(`UPDATE registrations SET previous_status='undecided',status='cancelled',version=version+1,updated_at=?
      WHERE status='undecided' AND anonymized_at IS NULL AND EXISTS(SELECT 1 FROM events e
        WHERE e.id=event_id AND e.status='scheduled' AND e.registration_cutoff<=MAX(?,${SQL_NOW}) AND e.ends_at+604800000>MAX(?,${SQL_NOW}))`)
      .bind(now,now,now),
  ]);
  return { cancelled: results[1].meta.changes };
}

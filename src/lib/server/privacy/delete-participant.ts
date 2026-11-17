import { freezeMealAllocation } from '../events/waiting-list';

export async function deleteParticipant(db: D1Database, eventId: string, id: string, version: number, now = Date.now()) {
  const walkIn = id.startsWith('walk-in:');
  const table = walkIn ? 'walk_in_guests' : 'registrations';
  const bindings = [id, eventId, version] as const;
  const match = 'id=? AND event_id=? AND version=?';
  const statements = [freezeMealAllocation(db, eventId, now, { id, version, walkIn })];
  if (!walkIn) {
    // Outbox FK uses SET NULL; delete explicitly before the parent. Attempts cascade.
    statements.push(db.prepare(`DELETE FROM email_outbox WHERE registration_id IN
      (SELECT id FROM registrations WHERE ${match})`).bind(...bindings));
  }
  // Tokens, mutation receipts and no-show markers cascade with the registration.
  statements.push(db.prepare(`DELETE FROM ${table} WHERE ${match} RETURNING id`).bind(...bindings));
  const results = await db.batch(statements);
  return results.at(-1)?.results.length === 1;
}

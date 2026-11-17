import { z } from 'zod';

export const announcementVersion = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative());
export const announcementInput = z.object({
  id: z.union([z.uuid(), z.literal('')]),
  version: announcementVersion,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(3000),
  published: z.boolean(),
});

export async function deleteAnnouncement(db: D1Database, id: string, version: number) {
  const result = await db.prepare('DELETE FROM announcements WHERE id=? AND version=?')
    .bind(id, version).run();
  return result.meta.changes === 1;
}

export async function saveAnnouncement(
  db: D1Database, input: z.infer<typeof announcementInput>, now = Date.now(),
) {
  if (!input.id) {
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO announcements (id,title,body,published_at,updated_at) VALUES (?,?,?,?,?)')
      .bind(id, input.title, input.body, input.published ? now : null, now).run();
    return id;
  }
  const result = await db.prepare(`UPDATE announcements SET title=?,body=?,
    published_at=CASE WHEN ? THEN COALESCE(published_at,?) ELSE NULL END,
    updated_at=?,version=version+1 WHERE id=? AND version=?`)
    .bind(input.title, input.body, input.published ? 1 : 0, now, now, input.id, input.version).run();
  return result.meta.changes === 1 ? input.id : null;
}

export async function publishedAnnouncements(db: D1Database) {
  const { results } = await db.prepare(`SELECT id,title,body FROM announcements
    WHERE published_at IS NOT NULL ORDER BY published_at DESC,id DESC LIMIT 5`)
    .all<{id:string;title:string;body:string}>();
  return results;
}

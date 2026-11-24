import { requireAdmin } from '$lib/server/admin/auth';
import { expireUndecided } from '$lib/server/events/undecided';
import { seoDescriptions, seoDescriptionInput } from '$lib/server/seo';
import { fail } from '@sveltejs/kit';
export const load = async (event: import('./$types').PageServerLoadEvent) => {
  const { db } = requireAdmin(event);
  await expireUndecided(db);
  const registrations = await db
    .prepare(
      `SELECT r.status,sum(1+r.extra_guests) AS total FROM (SELECT r.event_id,r.extra_guests,CASE WHEN n.registration_id IS NOT NULL THEN 'no_show' ELSE r.status END AS status FROM registrations r LEFT JOIN registration_no_shows n ON n.registration_id=r.id WHERE r.anonymized_at IS NULL UNION ALL SELECT event_id,extra_guests,status FROM walk_in_guests) r JOIN events e ON e.id=r.event_id WHERE e.ends_at+604800000>? GROUP BY r.status`,
    )
    .bind(Date.now())
    .all<{ status: string; total: number }>();
  const gatherings = await db
    .prepare('SELECT count(*) AS total FROM events WHERE ends_at>?')
    .bind(Date.now())
    .first<{ total: number }>();
  const recipes = await db
    .prepare('SELECT count(*) AS total FROM recipes')
    .first<{ total: number }>();
  return {
    counts: registrations.results,
    gatherings: gatherings?.total ?? 0,
    recipes: recipes?.total ?? 0,
    seoDescriptions: await seoDescriptions(db),
  };
};

export const actions: import('./$types').Actions = {
  seo: async (event) => {
    const { db } = requireAdmin(event);
    const input = seoDescriptionInput.safeParse(Object.fromEntries(await event.request.formData()));
    if (!input.success) return fail(400, { seoError: true });
    const { page, locale, description } = input.data;
    await db.prepare(`INSERT INTO seo_metadata (page,locale,description) VALUES (?,?,?)
      ON CONFLICT(page,locale) DO UPDATE SET description=excluded.description`)
      .bind(page, locale, description).run();
    return { seoSaved: true };
  },
};

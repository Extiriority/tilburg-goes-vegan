import { adminFail } from '$lib/server/admin/feedback';
import { requireAdmin } from '$lib/server/admin/auth';
import { recipeEdit, saveRecipe, AdminError } from '$lib/server/admin/service';
import { fail, redirect } from '@sveltejs/kit';
import { uploadRecipePhotos, orderRecipePhotos } from '$lib/server/admin/media';
export const load = async (event: import('./$types').PageServerLoadEvent) => {
  const { db } = requireAdmin(event);
  const search = (event.url.searchParams.get('q') ?? '').slice(0, 200);
  const rows = await db
    .prepare('SELECT * FROM recipes WHERE title LIKE ? ORDER BY published_at DESC LIMIT 100')
    .bind(`%${search}%`)
    .all<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      category: string;
      chef_credit: string | null;
      version: number;
    }>();
  const id = (event.url.searchParams.get('edit') ?? '').slice(0, 100);
  const selected = id
    ? await db.prepare('SELECT * FROM recipes WHERE id=?').bind(id).first<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        category: string;
        chef_credit: string | null;
        version: number;
      }>()
    : null;
  let ingredients = '',
    steps = '';
  if (selected) {
    const i = await db
      .prepare(
        'SELECT quantity,ingredient FROM recipe_ingredients WHERE recipe_id=? ORDER BY position',
      )
      .bind(selected.id)
      .all<{ quantity: string; ingredient: string }>();
    const s = await db
      .prepare('SELECT instruction FROM recipe_steps WHERE recipe_id=? ORDER BY position')
      .bind(selected.id)
      .all<{ instruction: string }>();
    ingredients = i.results.map((i) => `${i.quantity} | ${i.ingredient}`).join('\n');
    steps = s.results.map((s) => s.instruction).join('\n');
  }
  const photos = selected
    ? await db
        .prepare(
          'SELECT m.id,m.alt_text,rm.position,rm.is_cover FROM recipe_media rm JOIN media_assets m ON m.id=rm.media_id WHERE rm.recipe_id=? ORDER BY rm.position',
        )
        .bind(selected.id)
        .all<{ id: string; alt_text: string; position: number; is_cover: number }>()
    : { results: [] };
  return {
    rows: rows.results,
    selected,
    ingredients,
    steps,
    photos: photos.results,
    mediaReady: !!event.platform?.env.MEDIA,
    search,
  };
};
export const actions = {
  save: async (event) => {
    const { db, admin } = requireAdmin(event);
    const p = recipeEdit.safeParse(Object.fromEntries(await event.request.formData()));
    if (!p.success)
      return adminFail(
        event.locals.locale,
        400,
        'Check the recipe fields. Use a lowercase URL slug with hyphens.',
      );
    let id: string;
    try {
      id = await saveRecipe(db, admin.id, p.data);
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not publish.',
      );
    }
    redirect(303, `/admin/recipes?edit=${encodeURIComponent(id)}&saved=1`);
  },
  photos: async (event) => {
    const { db } = requireAdmin(event);
    const f = await event.request.formData();
    const id = String(f.get('id') ?? ''),
      version = Number(f.get('version'));
    if (!id || !Number.isSafeInteger(version) || !event.platform?.env.MEDIA)
      return adminFail(event.locals.locale, 400, 'Image storage is unavailable.');
    try {
      await uploadRecipePhotos(
        db,
        event.platform.env.MEDIA,
        id,
        version,
        f.getAll('photos').filter((v): v is File => v instanceof File && v.size > 0),
        f.getAll('thumbnails').filter((v): v is File => v instanceof File && v.size > 0),
      );
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save photos.',
      );
    }
    redirect(303, `/admin/recipes?edit=${encodeURIComponent(id)}&saved=1`);
  },
  order: async (event) => {
    const { db } = requireAdmin(event);
    const f = await event.request.formData();
    const id = String(f.get('id') ?? ''),
      version = Number(f.get('version'));
    const ids = f.getAll('imageId').map(String);
    const positions = ids.map((id) => Number(f.get(`position:${id}`)));
    if (
      !id ||
      !Number.isSafeInteger(version) ||
      positions.some((p) => !Number.isSafeInteger(p) || p < 1 || p > 12) ||
      new Set(positions).size !== positions.length
    )
      return adminFail(event.locals.locale, 400, 'Use a different position number for each photo.');
    const ordered = ids
      .map((id, i) => ({ id, position: positions[i] }))
      .sort((a, b) => a.position - b.position)
      .map((v) => v.id);
    try {
      await orderRecipePhotos(
        db,
        id,
        version,
        ordered,
        String(f.get('cover') ?? ''),
        Object.fromEntries(ids.map((id) => [id, String(f.get(`alt:${id}`) ?? '')])),
      );
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save image order.',
      );
    }
    redirect(303, `/admin/recipes?edit=${encodeURIComponent(id)}&saved=1`);
  },
} satisfies import('./$types').Actions;

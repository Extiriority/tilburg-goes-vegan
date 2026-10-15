import { adminFail } from '$lib/server/admin/feedback';
import { requireAdmin } from '$lib/server/admin/auth';
import { recipeEdit, saveRecipe, AdminError } from '$lib/server/admin/service';
import { fail, redirect } from '@sveltejs/kit';
import { uploadRecipePhotos, deleteRecipePhoto, describeRecipePhoto } from '$lib/server/admin/media';
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
      version: number; notes: string; youtube_video_id: string | null; serving_grams: number | null; calories_kcal: number | null; servings: number | null; total_minutes: number | null; allergens: string;
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
        version: number; notes: string; youtube_video_id: string | null; serving_grams: number | null; calories_kcal: number | null; servings: number | null; total_minutes: number | null; allergens: string;
      }>()
    : null;
  let ingredients: { quantity: string; name: string }[] = [], steps: string[] = [];
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
    ingredients = i.results.map(i => ({ quantity: i.quantity, name: i.ingredient }));
    steps = s.results.map(s => s.instruction);
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
    const fields = await event.request.formData();
    const p = recipeEdit.safeParse({ ...Object.fromEntries(fields), allergens: fields.getAll('recipeAllergens') });
    if (!p.success)
      return adminFail(
        event.locals.locale,
        400,
        'Check the recipe fields.',
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
    let pendingCleanup = 0;
    try {
      ({ pendingCleanup } = await uploadRecipePhotos(
        db,
        event.platform.env.MEDIA,
        id,
        version,
        f.getAll('photos').filter((v): v is File => v instanceof File && v.size > 0),
        f.getAll('thumbnails').filter((v): v is File => v instanceof File && v.size > 0),
      ));
    } catch (e) {
      return adminFail(
        event.locals.locale,
        409,
        e instanceof AdminError ? e.message : 'Could not save photos.',
      );
    }
    redirect(303, `/admin/recipes?edit=${encodeURIComponent(id)}&saved=1${pendingCleanup ? '&cleanup=1' : ''}`);
  },
  deletePhoto: async (event) => {
    const {db}=requireAdmin(event);
    const form=await event.request.formData();
    const id=String(form.get('id')??''),version=Number(form.get('version'));
    if(!id || !Number.isSafeInteger(version) || version<0 || !event.platform?.env.MEDIA) return adminFail(event.locals.locale,400,'Image storage is unavailable.');
    let pendingCleanup=0;
    try { ({pendingCleanup}=await deleteRecipePhoto(db,event.platform.env.MEDIA,id,version)); }
    catch { return adminFail(event.locals.locale,409,'Could not save, try again'); }
    redirect(303,`/admin/recipes?edit=${encodeURIComponent(id)}&saved=1${pendingCleanup ? '&cleanup=1' : ''}`);
  },
  photoDetails: async (event) => {
    const {db}=requireAdmin(event);
    const form=await event.request.formData();
    const id=String(form.get('id')??''),version=Number(form.get('version'));
    if(!id || !Number.isSafeInteger(version) || version<0) return adminFail(event.locals.locale,400,'Could not save, try again');
    try { await describeRecipePhoto(db,id,version,String(form.get('mediaId')??''),String(form.get('alt')??'')); }
    catch { return adminFail(event.locals.locale,409,'Could not save, try again'); }
    redirect(303,`/admin/recipes?edit=${encodeURIComponent(id)}&saved=1`);
  },
} satisfies import('./$types').Actions;

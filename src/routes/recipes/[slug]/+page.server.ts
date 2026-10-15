import { error } from '@sveltejs/kit';
export const load = async ({ platform, params }: import('./$types').PageServerLoadEvent) => {
  if (!platform?.env.DB) error(404, 'Recipe not found');
  const db = platform.env.DB;
  const recipe = await db
    .prepare('SELECT title,description,category,chef_credit,id FROM recipes WHERE slug=?')
    .bind(params.slug)
    .first<{
      id: string;
      title: string;
      description: string | null;
      category: string;
      chef_credit: string | null;
    }>();
  if (!recipe) error(404, 'Recipe not found');
  const ingredients = await db
    .prepare(
      'SELECT quantity,ingredient FROM recipe_ingredients WHERE recipe_id=? ORDER BY position',
    )
    .bind(recipe.id)
    .all<{ quantity: string; ingredient: string }>();
  const steps = await db
    .prepare('SELECT instruction FROM recipe_steps WHERE recipe_id=? ORDER BY position')
    .bind(recipe.id)
    .all<{ instruction: string }>();
  const photos = await db
    .prepare(
      'SELECT m.id,m.alt_text,m.width,m.height FROM recipe_media rm JOIN media_assets m ON m.id=rm.media_id WHERE rm.recipe_id=? ORDER BY rm.position',
    )
    .bind(recipe.id)
    .all<{ id: string; alt_text: string; width: number; height: number }>();
  return { recipe, ingredients: ingredients.results, steps: steps.results, photos: photos.results };
};

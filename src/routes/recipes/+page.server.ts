export const load = async ({ platform, url }: import('./$types').PageServerLoadEvent) => {
  const search = (url.searchParams.get('q') ?? '').slice(0, 200);
  const category = ['starter', 'main', 'dessert'].includes(url.searchParams.get('category') ?? '')
    ? url.searchParams.get('category')!
    : '';
  const recipes = platform?.env.DB
    ? await platform.env.DB.prepare(
        `SELECT r.id,r.slug,r.title,r.description,r.category,r.chef_credit,m.id AS cover_id,m.alt_text AS cover_alt FROM recipes r LEFT JOIN recipe_media rm ON rm.recipe_id=r.id AND rm.is_cover=1 LEFT JOIN media_assets m ON m.id=rm.media_id WHERE r.title LIKE ? ${category ? 'AND r.category=?' : ''} ORDER BY r.published_at DESC LIMIT 100`,
      )
        .bind(`%${search}%`, ...(category ? [category] : []))
        .all<{
          id: string;
          slug: string;
          title: string;
          description: string | null;
          category: string;
          chef_credit: string | null;
          cover_id: string | null;
          cover_alt: string | null;
        }>()
    : { results: [] };
  return { recipes: recipes.results, search, category };
};

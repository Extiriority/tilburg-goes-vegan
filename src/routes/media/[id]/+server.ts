import {error} from '@sveltejs/kit';
export const GET=async({params,platform,url}:import('./$types').RequestEvent)=>{
  if(!platform?.env.DB||!platform.env.MEDIA)error(404,'Image not found');
  const asset=await platform.env.DB.prepare('SELECT m.r2_key FROM media_assets m JOIN recipe_media rm ON rm.media_id=m.id JOIN recipes r ON r.id=rm.recipe_id WHERE m.id=? LIMIT 1').bind(params.id).first<{r2_key:string}>();
  if(!asset)error(404,'Image not found');const key=url.searchParams.get('size')==='thumb'?asset.r2_key.replace('/full.webp','/thumb.webp'):asset.r2_key;const object=await platform.env.MEDIA.get(key);if(!object)error(404,'Image not found');return new Response(object.body,{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'}});
};

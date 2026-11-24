import { siteOrigin } from '$lib/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ platform }) => {
  const production = platform?.env.APP_ENV === 'production';
  const body = production
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /registration/\nSitemap: ${siteOrigin(platform?.env.PUBLIC_SITE_ORIGIN)}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};

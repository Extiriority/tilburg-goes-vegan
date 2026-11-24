import { pageUrl, siteOrigin, xml } from '$lib/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  const origin = siteOrigin(platform?.env.PUBLIC_SITE_ORIGIN);
  const paths = ['/', '/recipes', '/privacy'];
  if (platform?.env.DB) {
    const recipes = await platform.env.DB.prepare('SELECT slug FROM recipes WHERE published_at IS NOT NULL ORDER BY id').all<{ slug: string }>();
    paths.push(...recipes.results.map(recipe => `/recipes/${encodeURIComponent(recipe.slug)}`));
    const events = await platform.env.DB.prepare('SELECT slug FROM events WHERE ends_at>? ORDER BY starts_at,id LIMIT 4').bind(Date.now()).all<{ slug: string }>();
    paths.push(...events.results.map(event => `/events/${encodeURIComponent(event.slug)}`));
  }
  const entries = platform?.env.APP_ENV === 'production' ? paths.flatMap(path => (['nl', 'en'] as const).map(locale => {
    const alternatives = (['nl', 'en'] as const).map(language => `<xhtml:link rel="alternate" hreflang="${language}" href="${xml(pageUrl(path, language, origin))}"/>`).join('');
    return `<url><loc>${xml(pageUrl(path, locale, origin))}</loc>${alternatives}<xhtml:link rel="alternate" hreflang="x-default" href="${xml(pageUrl(path, 'nl', origin))}"/></url>`;
  })).join('') : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};

import type { Handle } from '@sveltejs/kit';
import { selectLocale } from '$lib/i18n';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = selectLocale(event.cookies.get('language'), event.request.headers.get('accept-language') ?? '');
  const response = await resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale) });
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  if (event.request.method==='POST' || event.url.pathname.startsWith('/registration/manage/')) response.headers.set('Cache-Control','private, no-store');
  if (event.url.pathname.startsWith('/registration/manage/')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  return response;
};

import type { Handle } from '@sveltejs/kit';
import { selectLocale } from '$lib/i18n';
import { resolveAdmin } from '$lib/server/admin/auth';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = selectLocale(event.cookies.get('language'), event.request.headers.get('accept-language') ?? '');
  if (event.url.pathname.startsWith('/admin') && import.meta.env.DEV && event.platform?.env.DB) {
    event.locals.admin = await resolveAdmin(event.platform.env.DB,event.cookies.get('tgv_admin'));
  }
  const response = await resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale) });
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  if (event.request.method==='POST' || event.url.pathname.startsWith('/registration/manage/') || event.url.pathname.startsWith('/admin')) response.headers.set('Cache-Control','private, no-store');
  if (event.url.pathname.startsWith('/admin')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  if (event.url.pathname.startsWith('/registration/manage/')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  return response;
};

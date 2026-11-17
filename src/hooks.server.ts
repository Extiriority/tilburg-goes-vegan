import type { Handle } from '@sveltejs/kit';
import { selectLocale } from '$lib/i18n';
import { resolveAdmin } from '$lib/server/admin/auth';
import { stagingAccessFailure } from '$lib/server/staging-access';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = selectLocale(event.cookies.get('language'), event.request.headers.get('accept-language') ?? '');
  const env = event.platform?.env;
  if (env?.APP_ENV === 'staging') {
    const failure = await stagingAccessFailure(event.request, env);
    if (failure) return new Response(`Staging access required (${failure}).`, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
    event.locals.stagingAccess = true;
  }
  if (event.url.pathname.startsWith('/admin') && (import.meta.env.DEV || event.locals.stagingAccess) && event.platform?.env.DB) {
    event.locals.admin = await resolveAdmin(event.platform.env.DB,event.cookies.get('tgv_admin'));
  }
  const response = await resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale) });
  // Native organizer forms need the same-origin Origin header for SvelteKit's CSRF check.
  const organizerRoute = event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/');
  response.headers.set('Referrer-Policy', organizerRoute ? 'same-origin' : 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  if (event.locals.stagingAccess) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  if (event.request.method==='POST' || event.url.pathname.startsWith('/registration/manage/') || event.url.pathname.startsWith('/admin')) response.headers.set('Cache-Control','private, no-store');
  if (event.url.pathname.startsWith('/admin')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  if (event.url.pathname.startsWith('/registration/manage/')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  return response;
};

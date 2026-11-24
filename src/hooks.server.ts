import type { Handle } from '@sveltejs/kit';
import { selectLocale } from '$lib/i18n';
import { resolveAdmin } from '$lib/server/admin/auth';
import { stagingAccessFailure } from '$lib/server/staging-access';
import { localizedPath, publicPath, stripLocale } from '$lib/public-paths';
import { redirect } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = selectLocale(event.cookies.get('language'), event.request.headers.get('accept-language') ?? '');
  const env = event.platform?.env;
  if (env?.APP_ENV === 'staging') {
    const failure = await stagingAccessFailure(event.request, env);
    if (failure) return new Response(`Staging access required (${failure}).`, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
    event.locals.stagingAccess = true;
  }
  const localized = stripLocale(event.url.pathname);
  if (localized) event.locals.locale = localized.locale;
  if (localized && publicPath(localized.pathname)) {
    const canonicalPath = localizedPath(localized.pathname, localized.locale);
    if (!event.isDataRequest && event.url.pathname !== canonicalPath && ['GET', 'HEAD'].includes(event.request.method)) redirect(308, canonicalPath + event.url.search);
    event.cookies.set('language', localized.locale, { path: '/', httpOnly: true, sameSite: 'lax', secure: event.url.protocol === 'https:', maxAge: 31536000 });
  } else if (publicPath(event.url.pathname) && (event.request.method === 'GET' || event.request.method === 'HEAD')) {
    redirect(308, localizedPath(event.url.pathname, 'nl') + event.url.search);
  }
  if (event.url.pathname.startsWith('/admin') && (import.meta.env.DEV || event.locals.stagingAccess) && event.platform?.env.DB) {
    event.locals.admin = await resolveAdmin(event.platform.env.DB,event.cookies.get('tgv_admin'));
  }
  const response = await resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale) });
  if (env?.APP_ENV !== 'production') response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  // Native forms need the same-origin Origin header for SvelteKit's CSRF check.
  const organizerRoute = event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/');
  response.headers.set('Referrer-Policy', organizerRoute || (localized && publicPath(localized.pathname)) ? 'same-origin' : 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  if (event.locals.stagingAccess) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  // The homepage contains a per-request registration token.
  if (localized?.pathname === '/') response.headers.set('Cache-Control', 'private, no-store');
  if (event.request.method==='POST' || event.url.pathname.startsWith('/registration/manage/') || event.url.pathname.startsWith('/admin')) response.headers.set('Cache-Control','private, no-store');
  if (event.url.pathname.startsWith('/admin')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  if (event.url.pathname.startsWith('/registration/manage/')) response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  return response;
};

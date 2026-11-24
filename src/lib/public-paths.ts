import type { Locale } from './i18n';

export function publicPath(pathname: string) {
  pathname = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return pathname === '/' || pathname === '/recipes' || /^\/(recipes|events)\/[^/]+$/.test(pathname) || pathname === '/privacy';
}

export function stripLocale(pathname: string) {
  const match = /^\/(nl|en)(\/.*|$)/.exec(pathname);
  return match ? { locale: match[1] as Locale, pathname: (match[2] || '/').replace(/\/$/, '') || '/' } : null;
}

export function localizedPath(pathname: string, locale: Locale) {
  return `/${locale}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
}

import type { Reroute } from '@sveltejs/kit';
import { publicPath, stripLocale } from '$lib/public-paths';

export const reroute: Reroute = ({ url }) => {
  const localized = stripLocale(url.pathname);
  if (localized && publicPath(localized.pathname)) return localized.pathname;
};

import { siteOrigin } from '$lib/seo';
import { seoDescriptions } from '$lib/server/seo';
import { publicPath, stripLocale } from '$lib/public-paths';

export const trailingSlash = 'ignore';

export const load: import('./$types').LayoutServerLoad = async ({ locals, platform, url }) => {
  const path = stripLocale(url.pathname)?.pathname ?? url.pathname;
  return {
    locale: locals.locale,
    siteOrigin: siteOrigin(platform?.env.PUBLIC_SITE_ORIGIN),
    seoDescriptions: publicPath(path) ? await seoDescriptions(platform?.env.DB) : null,
  };
};

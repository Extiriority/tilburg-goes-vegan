import { expect, it, vi } from 'vitest';
import { jsonLd, pageUrl, siteOrigin, xml } from '../src/lib/seo';
import { publicPath, stripLocale } from '../src/lib/public-paths';
import { GET as robots } from '../src/routes/robots.txt/+server';
import { GET as sitemap } from '../src/routes/sitemap.xml/+server';
import { handle } from '../src/hooks.server';

it('keeps canonical origins pinned and escapes structured output', () => {
  const origin = siteOrigin();
  expect(origin).toBe('https://www.tilburggoesvegan.nl');
  expect(pageUrl('/recipes/pancakes', 'nl', origin)).toBe(origin + '/nl/recipes/pancakes');
  expect(() => siteOrigin('https://user:pass@example.com')).toThrow();
  expect(() => siteOrigin('http://example.com')).toThrow();
  const unsafe = { title: '</script><script>alert(1)</script>' };
  expect(jsonLd(unsafe)).not.toContain('<');
  expect(JSON.parse(jsonLd(unsafe))).toEqual(unsafe);
  expect(xml('a&<"')).toBe('a&amp;&lt;&quot;');
  expect(stripLocale('/en/recipes')).toEqual({ locale: 'en', pathname: '/recipes' });
  expect(publicPath('/admin')).toBe(false);
  expect(publicPath('/registration/manage/private')).toBe(false);
  expect(stripLocale('/en/recipes/')).toEqual({ locale: 'en', pathname: '/recipes' });
});

it('uses URL language even when the cookie and browser request another language', async () => {
  const event = {
    url: new URL('https://example.com/nl/recipes'),
    request: new Request('https://example.com/nl/recipes', { headers: { 'accept-language': 'en' } }),
    cookies: { get: () => 'en', set: vi.fn() }, locals: {} as App.Locals,
    platform: { env: { APP_ENV: 'production' } },
  };
  const response = await handle({ event, resolve: async () => new Response('ok') } as never);
  expect(event.locals.locale).toBe('nl');
  expect(response.headers.has('X-Robots-Tag')).toBe(false);
  expect(response.headers.get('Referrer-Policy')).toBe('same-origin');
  const legacy = { ...event, url: new URL('https://example.com/'), request: new Request('https://example.com/') };
  await expect(handle({ event: legacy, resolve: vi.fn() } as never)).rejects.toMatchObject({ status: 308, location: '/nl/' });
  const dataRequest = { ...event, url: new URL('https://example.com/nl'), isDataRequest: true };
  expect((await handle({ event: dataRequest, resolve: async () => new Response('data') } as never)).status).toBe(200);
});

it('blocks non-production crawlers and lists only public language URLs in production', async () => {
  const prepare = vi.fn((sql: string) => ({
    all: async () => ({ results: sql.includes('recipes') ? [{ slug: 'pancakes' }] : [{ slug: '2026-12-07' }] }),
    bind() { return this; },
  }));
  const staging = { platform: { env: { APP_ENV: 'staging', DB: { prepare } } } };
  expect(await (await robots(staging as never)).text()).toContain('Disallow: /');
  expect(await (await sitemap(staging as never)).text()).not.toContain('<loc>');
  const production = { platform: { env: { ...staging.platform.env, APP_ENV: 'production' } } };
  const body = await (await sitemap(production as never)).text();
  expect(body).toContain('/nl/recipes/pancakes');
  expect(body).toContain('/en/events/2026-12-07');
  expect(body).toContain('hreflang="x-default"');
  expect(body).not.toContain('/admin');
  expect(body).not.toContain('/registration/');
  expect(await (await robots(production as never)).text()).toContain('Sitemap: https://www.tilburggoesvegan.nl/sitemap.xml');
});

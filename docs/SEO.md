# Public SEO

The public origin is `https://www.tilburggoesvegan.nl`, overridable with the
HTTPS-origin setting `PUBLIC_SITE_ORIGIN`. Public pages use `/nl/` and `/en/`.
The URL determines the rendered language regardless of cookies or browser
headers. The root and older unprefixed public links permanently redirect to
Dutch. Language links preserve the current page, query and anchor. Admin,
media and private management URLs keep their existing paths.

Implemented increments:

- Shared server-rendered title, description, canonical, reciprocal hreflang,
  Open Graph and Twitter card metadata. Query variants use the clean canonical.
- Organization and WebPage JSON-LD, plus breadcrumbs on child pages, Recipe
  data on published recipes and Event data on individual gathering pages.
  Only real, visible data is used. Recipe text remains in its author's language.
- Details for the next four gatherings at `/{locale}/events/{slug}`, discoverable
  through the production sitemap, with a registration link selecting that gathering.
  Gathering cards keep their direct registration interaction without a details link.
- `/robots.txt` and `/sitemap.xml`, including both languages of published
  recipes, public gathering pages and fixed pages. No participant or admin URLs.
- Editable NL/EN descriptions for the homepage, recipes index and privacy
  page under organizer Overview. Recipes have a separate optional description
  field in their editor. Blank page fields fall back to the default copy.
- Existing Dutch OG artwork, the existing table photograph for English,
  recipe photographs when available, and icons derived from the existing logo.
  Share image URLs are absolute. New event-specific artwork is a future increment.
- Localized error pages and responsive recipe search/filter improvements.

Migration 0021 adds `seo_metadata` and nullable `recipes.meta_description`.
Apply migrations before publishing this build to another environment.

Only `APP_ENV=production` enables indexing and sitemap URL entries. Staging
continues to require Access, returns noindex headers and disallows crawlers.
Admin and private management pages are noindex in every environment. The
homepage remains private/no-store because it includes a registration token.
Never enable shared HTML caching without first separating that token.

Before launch, connect the confirmed domain, check actual production response
headers and validate public pages with Google's Rich Results Test and a social
sharing debugger. Protected staging cannot be crawled by those services.
Then verify domain ownership in Search Console and submit `/sitemap.xml`.
Valid markup supports eligibility; Google determines search presentation.

References:

- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.google.com/search/docs/appearance/structured-data/recipe
- https://developers.google.com/search/docs/appearance/structured-data/event
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

import { defaultDescriptions, seoPages, type SeoPage } from '$lib/seo';
import type { Locale } from '$lib/i18n';
import { z } from 'zod';

export const seoDescriptionInput = z.object({
  page: z.enum(seoPages), locale: z.enum(['nl', 'en']), description: z.string().trim().max(320),
});

export async function seoDescriptions(db?: D1Database) {
  const descriptions = structuredClone(defaultDescriptions);
  if (!db) return descriptions;
  const rows = await db.prepare('SELECT page,locale,description FROM seo_metadata').all<{ page: SeoPage; locale: Locale; description: string }>();
  for (const row of rows.results) {
    if (seoPages.includes(row.page) && (row.locale === 'nl' || row.locale === 'en') && row.description) {
      descriptions[row.page][row.locale] = row.description;
    }
  }
  return descriptions;
}

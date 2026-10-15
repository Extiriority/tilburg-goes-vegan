import { z } from 'zod';

export const allergens = [
  { id: 'gluten', en: 'Gluten-containing cereals', nl: 'Glutenbevattende granen', icon: '/icons/allergens/gluten.svg' },
  { id: 'peanuts', en: 'Peanuts', nl: 'Pinda’s', icon: '/icons/allergens/peanuts.svg' },
  { id: 'nuts', en: 'Tree nuts', nl: 'Noten', icon: '/icons/allergens/nuts.svg' },
  { id: 'soy', en: 'Soy', nl: 'Soja', icon: '/icons/allergens/soya.svg' },
  { id: 'sesame', en: 'Sesame', nl: 'Sesam', icon: '/icons/allergens/sesame.svg' },
  { id: 'celery', en: 'Celery', nl: 'Selderij', icon: '/icons/allergens/celery.svg' },
  { id: 'mustard', en: 'Mustard', nl: 'Mosterd', icon: '/icons/allergens/mustard.svg' },
  { id: 'lupin', en: 'Lupin', nl: 'Lupine', icon: '/icons/allergens/lupin.svg' },
  { id: 'sulphites', en: 'Sulphites', nl: 'Sulfieten', icon: '/icons/allergens/so2.svg' },
  { id: 'coconut', en: 'Coconut', nl: 'Kokos', icon: '/icons/allergens/coconut.svg', extra: true },
  { id: 'milk', en: 'Milk', nl: 'Melk', icon: '/icons/allergens/milk.svg', secondary: true },
  { id: 'eggs', en: 'Eggs', nl: 'Eieren', icon: '/icons/allergens/eggs.svg', secondary: true },
  { id: 'fish', en: 'Fish', nl: 'Vis', icon: '/icons/allergens/fish.svg', secondary: true },
  { id: 'crustaceans', en: 'Crustaceans', nl: 'Schaaldieren', icon: '/icons/allergens/crustaceans.svg', secondary: true },
  { id: 'molluscs', en: 'Molluscs', nl: 'Weekdieren', icon: '/icons/allergens/molluscs.svg', secondary: true },
] as const;
const prefix = 'TGV_DIETARY_V1:';
const dietary = z.object({
  allergens: z.array(z.enum(allergens.map(item => item.id))).max(allergens.length),
  other: z.string().trim().max(160),
  preparation: z.string().trim().max(460),
  legacy: z.string().trim().max(2000).optional(),
});
export function readDietaryForm(form: FormData): string {
  if (form.get('dietaryFormat') !== 'v1') return String(form.get('dietaryNotes') ?? '');
  const parsed = dietary.safeParse({ allergens: form.getAll('allergens'),
    other: form.get('dietaryOther') ?? '', preparation: form.get('dietaryPreparation') ?? '',
    legacy: form.get('dietaryLegacy') ?? '' });
  // Route validation reports invalid structured input under dietaryNotes.
  if (!parsed.success) return 'x'.repeat(2001);
  const value = { ...parsed.data,
    allergens: allergens.filter(item => parsed.data.allergens.includes(item.id)).map(item => item.id) };
  if (!value.allergens.length && !value.other && !value.preparation && !value.legacy) return '';
  return prefix + JSON.stringify(value);
}
export function parseDietary(notes: string | null) {
  if (notes?.startsWith(prefix)) {
    try {
      const parsed = dietary.safeParse(JSON.parse(notes.slice(prefix.length)));
      if (parsed.success) return { ...parsed.data, legacy: parsed.data.legacy ?? '' };
    } catch { /* Preserve old/unrecognized notes as text, never guess allergens. */ }
  }
  return { allergens: [] as string[], other: '', preparation: '', legacy: notes ?? '' };
}

import { z } from 'zod';
import { allergens } from './dietary';

export const recipeAllergens = z.array(z.enum(allergens.map(item => item.id))).max(allergens.length).transform(values => allergens.filter(item => values.includes(item.id)).map(item => item.id));
export function readRecipeAllergens(value: string | null): string[] {
  try { return recipeAllergens.parse(JSON.parse(value ?? '[]')); } catch { return []; }
}

export function recipeSlug(title: string) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/, '');
}
export function youtubeId(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const id = host === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
        ? url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1] : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export const noteSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  targets: z.array(z.object({ kind: z.enum(['ingredient', 'step']), index: z.number().int().min(0).max(99) })).max(200),
});
export type RecipeNote = z.infer<typeof noteSchema>;
export const contentSchema = z.object({
  ingredients: z.array(z.object({ quantity: z.string().trim().max(160), name: z.string().trim().min(1).max(500) })).min(1).max(100),
  steps: z.array(z.string().trim().min(1).max(4000)).min(1).max(100),
  notes: z.array(noteSchema).max(50),
}).superRefine((value, context) => {
  value.notes.forEach((note, i) => note.targets.forEach(target => {
    if (target.index >= (target.kind === 'ingredient' ? value.ingredients.length : value.steps.length))
      context.addIssue({ code: 'custom', path: ['notes', i], message: 'Invalid note link' });
  }));
});
export function readRecipeNotes(value: string | null): RecipeNote[] {
  try { return z.array(noteSchema).max(50).parse(JSON.parse(value ?? '[]')); } catch { return []; }
}

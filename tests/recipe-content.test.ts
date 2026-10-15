import { expect, it } from 'vitest';
import { contentSchema, recipeSlug, youtubeId, recipeAllergens } from '../src/lib/recipe-content';
it('validates and deduplicates recipe allergen categories', () => {
  expect(recipeAllergens.parse(['soy','peanuts','soy'])).toEqual(['peanuts','soy']);
  expect(recipeAllergens.safeParse(['unknown']).success).toBe(false);
});
it('generates lowercase hyphenated slugs from titles', () => {
  expect(recipeSlug('  Crème & Lentils!  ')).toBe('creme-lentils');
  expect(recipeSlug('A'.repeat(120) + ' something')).toHaveLength(120);
});
it('accepts supported video links but rejects arbitrary embeds and hostile hosts', () => {
  expect(youtubeId('https://youtu.be/abcdefghijk?t=30')).toBe('abcdefghijk');
  expect(youtubeId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
  for (const url of ['https://youtube.com.evil.invalid/watch?v=abcdefghijk','javascript:alert(1)','http://youtu.be/abcdefghijk','https://youtube.com/watch?v=bad','https://evil.invalid/abcdefghijk']) expect(youtubeId(url)).toBeNull();
});
it('validates note references and structured list limits', () => {
  const value = { ingredients: [{ quantity: '200 g', name: 'Lentils' }], steps: ['Cook lentils'], notes: [{ text: 'Rinse first', targets: [{ kind: 'ingredient', index: 0 }, { kind: 'step', index: 0 }] }] };
  expect(contentSchema.safeParse(value).success).toBe(true);
  expect(contentSchema.safeParse({ ...value, notes: [{ text: 'Bad link', targets: [{ kind: 'step', index: 1 }] }] }).success).toBe(false);
  expect(contentSchema.safeParse({ ...value, ingredients: [] }).success).toBe(false);
  expect(contentSchema.safeParse({ ...value, steps: Array(101).fill('Cook') }).success).toBe(false);
});

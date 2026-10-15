import { expect, it } from 'vitest';
import { readDietaryForm, parseDietary } from '../src/lib/dietary';
import { detailsInput } from '../src/lib/server/registrations/validation';

function form(values: string[] = []) {
  const result = new FormData();
  result.set('dietaryFormat', 'v1');
  values.forEach(value => result.append('allergens', value));
  return result;
}
it('stores coconut as a distinct extra category without changing tree nuts', () => {
  expect(parseDietary(readDietaryForm(form(['coconut']))).allergens).toEqual(['coconut']);
  expect(parseDietary(readDietaryForm(form(['nuts','coconut']))).allergens).toEqual(['nuts','coconut']);
});
it('canonicalizes multiple allergens and preserves other/preparation details', () => {
  const value = form(['soy', 'peanuts', 'soy', 'milk']);
  value.set('dietaryOther', '  chickpeas  ');
  value.set('dietaryPreparation', 'Separate utensils');
  expect(parseDietary(readDietaryForm(value))).toEqual({ allergens: ['peanuts', 'soy', 'milk'],
    other: 'chickpeas', preparation: 'Separate utensils', legacy: '' });
});
it('requires explicit consent even when only checkboxes are selected', () => {
  const dietaryNotes = readDietaryForm(form(['sesame']));
  expect(detailsInput.safeParse({ version: 0, dietaryNotes, dietaryConsent: false, comments: '' }).success).toBe(false);
  expect(detailsInput.safeParse({ version: 0, dietaryNotes, dietaryConsent: true, comments: '' }).success).toBe(true);
});
it('stores no sensitive value for empty selections and rejects unknown or oversized input', () => {
  expect(readDietaryForm(form())).toBe('');
  for (const value of [form(['invented']), form()]) {
    if (!value.has('allergens')) value.set('dietaryOther', 'x'.repeat(161));
    expect(detailsInput.safeParse({version:0,dietaryNotes:readDietaryForm(value),dietaryConsent:true,comments:''}).success).toBe(false);
  }
});
it('preserves legacy notes without guessing allergen categories', () => {
  expect(parseDietary('No nuts please').legacy).toBe('No nuts please');
  expect(parseDietary('No nuts please').allergens).toEqual([]);
  const value = form(['nuts']);
  value.set('dietaryLegacy', 'Old preparation detail');
  expect(parseDietary(readDietaryForm(value)).legacy).toBe('Old preparation detail');
});
it('accepts combined details and rejects values beyond the combined limit', () => {
  const value = form();
  value.set('dietaryPreparation', 'x'.repeat(460));
  expect(parseDietary(readDietaryForm(value)).preparation.length).toBe(460);
  value.set('dietaryPreparation', 'x'.repeat(461));
  expect(detailsInput.safeParse({version:0,dietaryNotes:readDietaryForm(value),dietaryConsent:true,comments:''}).success).toBe(false);
});

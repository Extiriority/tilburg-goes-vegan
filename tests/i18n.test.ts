import { expect, it } from 'vitest';
import { selectLocale } from '../src/lib/i18n';
it('prioritizes saved language, then supported browser preferences, then English', () => {
  expect(selectLocale('en','nl-NL')).toBe('en');
  expect(selectLocale(undefined,'fr, nl-NL;q=0.9, en;q=0.7')).toBe('nl');
  expect(selectLocale(undefined,'nl;q=0,en;q=0.5')).toBe('en');
  expect(selectLocale('invalid','de')).toBe('en');
});

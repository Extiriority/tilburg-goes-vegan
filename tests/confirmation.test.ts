import { expect, it } from 'vitest';
import { renderLocalConfirmation } from '../src/lib/server/email/confirmation';

it('renders a localized, escaped confirmation with the same private link in both formats', () => {
  const input = { locale: 'nl' as const, fullName: '<img> Test', startsAt: Date.parse('2026-11-23T18:00:00Z'), venue: 'V39 & co', address: 'Tilburg', token: 'synthetic.token' };
  const mail = renderLocalConfirmation(input);
  const url = 'http://localhost:5173/registration/manage/synthetic.token';
  expect(mail.html).toContain('href="' + url + '"');
  expect(mail.body).toContain('Mijn aanmelding beheren: ' + url);
  expect(mail.body).toContain('19:00');
  expect(mail.html).toContain('V39 &amp; co');
  expect(mail.html).toContain('&lt;img&gt;');
  expect(mail.html).not.toContain('<img>');
  expect(renderLocalConfirmation({ ...input, locale: 'en' }).body).toContain('Manage my registration: ' + url);
});

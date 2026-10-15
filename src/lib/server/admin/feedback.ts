import { fail } from '@sveltejs/kit';
const dutch: Record<string, string> = {
  'Check the name, email, role and comments.': 'Controleer naam, e-mail, rol en opmerkingen.',
  'Confirm cancellation first.': 'Bevestig eerst de annulering.',
  'Confirm that you contacted this person.': 'Bevestig dat je deze persoon hebt gesproken.',
  'Check the gathering fields.': 'Controleer de gegevens van de bijeenkomst.',
  'Check the recipe fields. Use a lowercase URL slug with hyphens.':
    'Controleer het recept. Gebruik kleine letters en streepjes in de URL-naam.',
  'Image storage is unavailable.': 'Afbeeldingsopslag is niet beschikbaar.',
  'Use a different position number for each photo.': 'Geef elke foto een ander positienummer.',
  'Could not save. The record changed, a limit was exceeded, or the database rejected the update. Reload and check the details.':
    'Opslaan is niet gelukt. De gegevens zijn gewijzigd of een limiet is bereikt. Herlaad de pagina en controleer de gegevens.',
  'Registration no longer exists': 'Deze aanmelding bestaat niet meer.',
  'Gathering no longer exists': 'Deze bijeenkomst bestaat niet meer.',
  'Gathering must be in the future and end after it starts':
    'De bijeenkomst moet in de toekomst liggen en na de start eindigen.',
  'Invalid Amsterdam date/time': 'Ongeldige datum of tijd in Amsterdam.',
  'Ambiguous Amsterdam date/time':
    'Deze Amsterdamse kloktijd komt tweemaal voor door de wintertijd. Kies een andere tijd.',
  'Use quantity | ingredient, one per line': 'Gebruik hoeveelheid | ingrediënt, één per regel.',
  'Use at most 100 ingredients/steps': 'Gebruik maximaal 100 ingrediënten of stappen.',
  'Select up to eight photos and wait for conversion':
    'Kies maximaal acht foto’s en wacht tot het omzetten klaar is.',
  'A recipe may have up to 12 photos': 'Een recept mag maximaal 12 foto’s hebben.',
  'Photos could not be saved. Reload before trying again.':
    'Foto’s opslaan is niet gelukt. Herlaad de pagina en probeer opnieuw.',
  'Check image order, cover and descriptions': 'Controleer fotovolgorde, omslag en beschrijvingen.',
};
export function adminFail(locale: 'en' | 'nl', status: number, message: string) {
  return fail(status, {
    message:
      locale === 'nl'
        ? (dutch[message] ??
          'Opslaan is niet gelukt. Controleer de gegevens en limieten, of herlaad de pagina.')
        : message,
  });
}

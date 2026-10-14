export type Locale = 'en' | 'nl';
export function selectLocale(saved: string | undefined, accept = ''): Locale {
  if (saved === 'en' || saved === 'nl') return saved;
  const languages = accept.split(',').map((item) => {
    const [tag, ...params] = item.trim().toLowerCase().split(';');
    const quality = params.find((p) => p.trim().startsWith('q='));
    return { language: tag.split('-')[0], q: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter((l) => l.q > 0).sort((a, b) => b.q - a.q);
  return languages.find((l) => l.language === 'en' || l.language === 'nl')?.language as Locale || 'en';
}
export const messages = {
  en: { intro: 'Community vegan dinners in Tilburg', pending: 'Gathering details and registration will be available here once the organizers have completed setup.', upcoming: 'Upcoming gatherings', statuses: { not_open: 'Registration opens soon', setup_pending: 'Registration coming soon', cancelled: 'Cancelled', closed: 'Registration closed', available: 'Places available', almost_full: 'Almost full', waiting_list: 'Waiting list' } },
  nl: { intro: 'Samen vegan eten in Tilburg', pending: 'Informatie over de bijeenkomsten en aanmelden komen hier zodra de organisatoren alles hebben ingesteld.', upcoming: 'Komende bijeenkomsten', statuses: { not_open: 'Aanmelden opent binnenkort', setup_pending: 'Aanmelden binnenkort mogelijk', cancelled: 'Geannuleerd', closed: 'Aanmelding gesloten', available: 'Plaatsen beschikbaar', almost_full: 'Bijna vol', waiting_list: 'Wachtlijst' } }
};

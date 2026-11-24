import type { Locale } from './i18n';
import { localizedPath } from './public-paths';

export const DEFAULT_SITE_ORIGIN = 'https://www.tilburggoesvegan.nl';
export const seoPages = ['home', 'recipes', 'privacy'] as const;
export type SeoPage = typeof seoPages[number];
export const defaultDescriptions: Record<SeoPage, Record<Locale, string>> = {
  home: {
    nl: 'Samen vegan koken en eten in Tilburg. Elke twee weken een driegangendiner voor €7 bij V39. Kom vanaf 18:00 voor een praatje of spelletje. Meld je aan!',
    en: 'Cook and share a vegan three-course dinner in Tilburg for €7 at V39, every other Monday. Join us from 18:00 for a chat or games. Book your place!',
  },
  recipes: {
    nl: 'Ontdek vegan recepten uit de keuken van Tilburg Goes Vegan. Van voorgerecht tot dessert, met ingrediënten en stap-voor-stapbereiding.',
    en: 'Discover vegan recipes from the Tilburg Goes Vegan kitchen. Explore starters, mains and desserts with ingredients and step-by-step instructions.',
  },
  privacy: {
    nl: 'Lees hoe Tilburg Goes Vegan je gegevens gebruikt en verwijdert bij aanmelding voor een diner, inclusief je privacyrechten en contactgegevens.',
    en: 'Read how Tilburg Goes Vegan uses and deletes dinner registration data, including your privacy rights and how to contact the organizers.',
  },
};

export function siteOrigin(configured?: string) {
  const url = new URL(configured || DEFAULT_SITE_ORIGIN);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_SITE_ORIGIN must be an HTTPS origin');
  }
  return url.origin;
}

export function absoluteUrl(path: string, origin: string) { return new URL(path, origin).href; }
export function pageUrl(path: string, locale: Locale, origin: string) { return absoluteUrl(localizedPath(path, locale), origin); }
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
export function xml(value: string) {
  return value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}

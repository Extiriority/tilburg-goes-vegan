import { getContext } from 'svelte';
import type { Writable } from 'svelte/store';
import type { Locale } from './i18n';

export const LOCALE_CONTEXT = Symbol('locale');

export function getLocaleStore(): Writable<Locale> {
  return getContext<Writable<Locale>>(LOCALE_CONTEXT);
}

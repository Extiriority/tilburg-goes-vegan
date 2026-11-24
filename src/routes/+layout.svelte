<script lang="ts">
  import '../app.css';
  import { setContext, untrack } from 'svelte';
  import { writable } from 'svelte/store';
  import { LOCALE_CONTEXT } from '$lib/locale-context';
  import type { Locale } from '$lib/i18n';
  import Seo from '$lib/components/Seo.svelte';
  import LanguageLinks from '$lib/components/LanguageLinks.svelte';
  import { page } from '$app/state';
  import { publicPath, stripLocale } from '$lib/public-paths';
  let { data, children } = $props();
  // One store per layout instance, never shared between SSR requests.
  const locale = writable<Locale>(untrack(() => data.locale));
  setContext(LOCALE_CONTEXT, locale);
  $effect(() => { locale.set(data.locale); });
  $effect(() => { document.documentElement.lang = $locale; });
</script>
<Seo />
{#if publicPath(stripLocale(page.url.pathname)?.pathname ?? page.url.pathname) && !['/', '/nl/', '/en/'].includes(page.url.pathname)}
  <div class="page-width public-language-links"><LanguageLinks /></div>
{/if}
{@render children()}

<style>.public-language-links { display: flex; justify-content: flex-end; padding-top: 12px; }</style>

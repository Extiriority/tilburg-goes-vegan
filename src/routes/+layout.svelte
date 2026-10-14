<script lang="ts">
  import '../app.css';
  import { setContext, untrack } from 'svelte';
  import { writable } from 'svelte/store';
  import { LOCALE_CONTEXT } from '$lib/locale-context';
  import type { Locale } from '$lib/i18n';
  let { data, children } = $props();
  // One store per layout instance, never shared between SSR requests.
  const locale = writable<Locale>(untrack(() => data.locale));
  setContext(LOCALE_CONTEXT, locale);
  $effect(() => { locale.set(data.locale); });
  $effect(() => { document.documentElement.lang = $locale; });
</script>
{@render children()}

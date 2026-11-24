<script lang="ts">
  import { page } from '$app/state';
  import { localizedPath, stripLocale } from '$lib/public-paths';
  const path = $derived(stripLocale(page.url.pathname)?.pathname ?? '/');
</script>

<nav class="language-switch" aria-label={page.data.locale === 'nl' ? 'Taal' : 'Language'}>
  <a href={localizedPath(path, 'nl') + page.url.search + page.url.hash} hreflang="nl" lang="nl" aria-current={page.data.locale === 'nl' ? 'true' : undefined}>NL</a>
  <span aria-hidden="true">/</span>
  <a href={localizedPath(path, 'en') + page.url.search + page.url.hash} hreflang="en" lang="en" aria-current={page.data.locale === 'en' ? 'true' : undefined}>EN</a>
</nav>

<style>
  a { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 44px; padding: 8px 4px; }
  a[aria-current=true] { color: var(--color-ink); font-weight: 700; text-decoration: underline; text-underline-offset: 5px; }
</style>

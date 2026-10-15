<script lang="ts">
  import { page } from '$app/state';
  import { getLocaleStore } from '$lib/locale-context';
  let { children } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
</script>

<svelte:head
  ><title>{nl ? 'Beheer' : 'Organizer panel'} — TGV</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<a class="skip-link" href="#admin-main">{nl ? 'Naar inhoud' : 'Skip to content'}</a>
<div class="admin-shell page-width">
  <header class="admin-header">
    <a href="/">← Tilburg Goes Vegan</a>
    <form method="POST" action="/admin/logout">
      <button class="button">{nl ? 'Afmelden' : 'Log out'}</button>
    </form>
  </header>
  <h1>{nl ? 'Beheer' : 'Organizer panel'}</h1>
  <nav class="admin-nav" aria-label={nl ? 'Beheernavigatie' : 'Organizer navigation'}>
    {#each [{ href: '/admin', label: nl ? 'Overzicht' : 'Overview' }, { href: '/admin/events', label: nl ? 'Bijeenkomsten' : 'Gatherings' }, { href: '/admin/recipes', label: nl ? 'Recepten' : 'Recipes' }] as item}
      <a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}
        >{item.label}</a
      >
    {/each}
  </nav>
  <main id="admin-main">{@render children()}</main>
</div>

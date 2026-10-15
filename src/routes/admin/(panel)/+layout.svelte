<script lang="ts">
  import { page } from '$app/state';
  import { getLocaleStore } from '$lib/locale-context';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  let { children } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let languagePending = $state(false), languageError = $state(false);
  const switchLanguage: SubmitFunction = ({formData,cancel}) => {
    const next=formData.get('language');
    if ((next!=='nl' && next!=='en') || next===$locale || languagePending) {cancel();return;}
    const previous=$locale;
    locale.set(next); languagePending=true; languageError=false;
    return ({result}) => {
      languagePending=false;
      if(result.type!=='success') {locale.set(previous);languageError=true;}
    };
  };
</script>

<svelte:head
  ><title>{nl ? 'Beheer' : 'Organizer panel'} — TGV</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<a class="skip-link" href="#admin-main">{nl ? 'Naar inhoud' : 'Skip to content'}</a>
<div class="admin-shell page-width">
  <h1 class="sr-only">{nl ? 'Beheer' : 'Organizer panel'}</h1>
  <nav class="admin-nav" aria-label={nl ? 'Beheernavigatie' : 'Organizer navigation'}>
    {#each [{ href: '/admin', label: nl ? 'Overzicht' : 'Overview', icon: 'overview' }, { href: '/admin/events', label: nl ? 'Bijeenkomsten' : 'Gatherings', icon: 'gatherings' }, { href: '/admin/recipes', label: nl ? 'Recepten' : 'Recipes', icon: 'recipes' }] as item}
      <a href={item.href} title={item.label} aria-label={item.label} aria-current={(item.href === '/admin' ? page.url.pathname === item.href : page.url.pathname.startsWith(item.href)) ? 'page' : undefined}
        ><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          {#if item.icon === 'overview'}<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          {:else if item.icon === 'gatherings'}<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2"/>
          {:else}<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15M6 8h3M6 12h3M15 8h3M15 12h3"/>{/if}
        </svg></a
      >
    {/each}
    <form class="language-switch admin-language-switch" method="POST" action="/admin/language" use:enhance={switchLanguage} aria-label={nl ? 'Taal' : 'Language'} aria-busy={languagePending}>
      <input type="hidden" name="returnTo" value={page.url.pathname+page.url.search}/>
      <button name="language" value="nl" aria-label="Nederlands" aria-pressed={nl} disabled={languagePending} lang="nl">NL</button>
      <span aria-hidden="true">/</span>
      <button name="language" value="en" aria-label="English" aria-pressed={!nl} disabled={languagePending} lang="en">EN</button>
    </form>
  </nav>
  {#if languageError}<p class="field-error" role="alert">{nl ? 'Taalkeuze niet opgeslagen. Probeer opnieuw.' : 'Language preference could not be saved. Please try again.'}</p>{/if}
  <main id="admin-main">{@render children()}</main>
</div>

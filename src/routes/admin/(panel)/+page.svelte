<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  import { enhance } from '$app/forms';
  import { seoPages } from '$lib/seo';
  let { data, form } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
</script>

<h2>{nl ? 'Overzicht' : 'Overview'}</h2>
<form class="admin-overview-logout" method="POST" action="/admin/logout">
  <button class="button" aria-label={nl ? 'Afmelden' : 'Log out'} title={nl ? 'Afmelden' : 'Log out'}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
  </button>
</form>
<p class="section-intro">
  {nl
    ? 'Beheer de avonden, aanmeldingen en recepten.'
    : 'Manage gatherings, registrations and recipes.'}
</p>
<div class="admin-stats">
  <a class="card" href="/admin/events"
    ><strong>{data.counts.reduce((n, r) => n + r.total, 0)}</strong><span
      >{nl ? 'Aanmeldingen' : 'Registrations'}</span
    ></a
  >
  <a class="card" href="/admin/events?status=waiting_list"
    ><strong>{data.counts.find((r) => r.status === 'waiting_list')?.total ?? 0}</strong><span
      >{nl ? 'Wachtlijst' : 'Waiting list'}</span
    ></a
  >
  <a class="card" href="/admin/events"
    ><strong>{data.gatherings}</strong><span
      >{nl ? 'Komende bijeenkomsten' : 'Upcoming gatherings'}</span
    ></a
  >
  <a class="card" href="/admin/recipes"
    ><strong>{data.recipes}</strong><span>{nl ? 'Recepten' : 'Recipes'}</span></a
  >
</div>
<details class="card" style="margin-top:24px;padding:24px">
  <summary>{nl ? 'SEO-beschrijvingen' : 'SEO descriptions'}</summary>
  <p>{nl ? 'Korte samenvattingen voor zoekresultaten en gedeelde links. Richtlijn: ongeveer 150 tekens. Recepten hebben een eigen veld in de recepteditor.' : 'Short summaries for search results and shared links. Aim for around 150 characters. Recipes have their own field in the recipe editor.'}</p>
  {#if form?.seoSaved}<p role="status">{nl ? 'Opgeslagen.' : 'Saved.'}</p>{/if}
  {#if form?.seoError}<p role="alert">{nl ? 'Controleer de invoer (maximaal 320 tekens).' : 'Check the description (320 characters maximum).'}</p>{/if}
  {#each seoPages as seoPage}
    {#each ['nl', 'en'] as language}
      <form method="POST" action="?/seo" use:enhance class="form-grid" style="margin-top:20px">
        <input type="hidden" name="page" value={seoPage} /><input type="hidden" name="locale" value={language} />
        <label class="full">{seoPage === 'home' ? 'Homepage' : seoPage === 'recipes' ? (nl ? 'Recepten' : 'Recipes') : 'Privacy'} · {language.toUpperCase()}<textarea name="description" maxlength="320" rows="2" value={data.seoDescriptions[seoPage][language as 'nl' | 'en']}></textarea></label>
        <button class="button">{nl ? 'Opslaan' : 'Save'}</button>
      </form>
    {/each}
  {/each}
</details>
<p class="form-notice">
  {nl
    ? 'Lokale beheerversie. E-mails worden klaargezet, nog niet verstuurd.'
    : 'Local organizer panel. Emails are queued, not sent yet.'}
</p>

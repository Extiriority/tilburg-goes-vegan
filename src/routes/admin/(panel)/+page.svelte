<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
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
<p class="form-notice">
  {nl
    ? 'Lokale beheerversie. E-mails worden klaargezet, nog niet verstuurd.'
    : 'Local organizer panel. Emails are queued, not sent yet.'}
</p>

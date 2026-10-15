<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
</script>

<h2>{nl ? 'Overzicht' : 'Overview'}</h2>
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

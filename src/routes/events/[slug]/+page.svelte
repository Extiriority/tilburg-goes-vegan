<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
  const locale = getLocaleStore();
  const nl = $derived($locale === 'nl');
  const date = $derived(new Intl.DateTimeFormat(nl ? 'nl-NL' : 'en-GB', { timeZone: 'Europe/Amsterdam', dateStyle: 'full' }).format(data.event.starts_at));
  const time = (value: number) => new Intl.DateTimeFormat(nl ? 'nl-NL' : 'en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value);
</script>

<main class="page-width section-space">
  <a href={`/${$locale}/#agenda`}>← {nl ? 'Bijeenkomsten' : 'Gatherings'}</a>
  <h1 class="section-title" style="margin-top:24px">{date}</h1>
  {#if data.event.status === 'cancelled'}<p role="status">{nl ? 'Deze bijeenkomst is geannuleerd.' : 'This gathering has been cancelled.'}</p>{/if}
  <p>{data.event.venue} · {data.event.address}</p>
  <p>{nl ? 'Diner' : 'Dinner'} {time(data.event.starts_at)}–{time(data.event.ends_at)}</p>
  {#if data.event.description}<p>{data.event.description}</p>{/if}
  <p>{nl ? 'Gasten en hulpchefs betalen €7. Hoofdchefs eten gratis. Al het eten is vegan.' : 'Guests and helper chefs pay €7. Main chefs eat for free. All food is vegan.'}</p>
  <a class="button" href={`/${$locale}/?gathering=${encodeURIComponent(data.event.id)}#join`}>{nl ? 'Bekijk aanmelden' : 'View registration'}</a>
</main>

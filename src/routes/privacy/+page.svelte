<script lang="ts">
  import { siteCopy } from '$lib/site-copy';
  import { getLocaleStore } from '$lib/locale-context';
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let t = $derived(siteCopy[$locale]);
</script>
<svelte:head><title>{t.privacy} — Tilburg Goes Vegan</title><meta name="robots" content="noindex" /></svelte:head>
<main class="page-width privacy-page">
  <a href="/" data-sveltekit-preload-code="eager">← Tilburg Goes Vegan</a>
  <h1 class="section-title" style="margin-top: 36px">{t.privacy}</h1>
  <p>{nl ? 'De volledige privacyverklaring wordt vóór het openbaar openen van aanmelden door de organisatoren beoordeeld. De lokale testversie slaat testaanmeldingen op in een lokale database. E-mailbezorging is nog niet ingeschakeld. Lokale verwijdering wordt uitgevoerd als de lokale opschoontaak draait; automatische verwijdering in productie is nog niet ingesteld.' : 'The organizers will review the full privacy notice before public registration opens. The local test version stores test registrations in a local database. Email delivery is not enabled yet. Local deletion runs when the local cleanup task is running; production scheduled deletion is not configured yet.'}</p>
  <p>{t.privacyBrief}</p>
  <p>{nl ? 'OpenStreetMap wordt alleen geladen als je op “Toon kaart” klikt. Je browser maakt dan verbinding met OpenStreetMap, dat onder meer je IP-adres ontvangt. Je kunt het adres ook bekijken zonder de kaart te laden.' : 'OpenStreetMap loads only when you click “Show map”. Your browser then connects to OpenStreetMap, which receives information including your IP address. You can view the address without loading the map.'}</p>
  <p>{nl ? 'Je taalkeuze wordt één jaar bewaard in een voorkeurcookie. De lettertypen en afbeeldingen worden lokaal aangeboden.' : 'Your language choice is saved in a preference cookie for one year. Fonts and images are served locally.'}</p>
  <p>{t.emailLead} <a href="mailto:tilburg@goesvegan.nl">tilburg@goesvegan.nl</a>.</p>
</main>

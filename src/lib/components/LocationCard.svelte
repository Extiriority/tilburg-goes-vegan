<script lang="ts">
  let { venue, address, mapsUrl, mapsEmbedUrl, locale }: { venue: string; address: string; mapsUrl: string; mapsEmbedUrl?: string; locale: 'en' | 'nl' } = $props();
  let mapVisible = $state(false);
  let copy = $derived(locale === 'nl'
    ? { show: 'Toon kaart', note: 'Laadt OpenStreetMap na je klik.', directions: 'Route bekijken', title: `Kaart: ${venue}` }
    : { show: 'Show map', note: 'Loads OpenStreetMap after you click.', directions: 'Get directions', title: `Map: ${venue}` });
</script>

<div class="card location-card">
  <div class="map-preview">
    {#if !mapsEmbedUrl}
      <a class="map-placeholder" href={mapsUrl} target="_blank" rel="noopener noreferrer">
        <strong>{locale==='nl'?'Bekijk op OpenStreetMap ↗':'View on OpenStreetMap ↗'}</strong>
        <span>{locale==='nl'?'Opent in een nieuw tabblad.':'Opens in a new tab.'}</span>
      </a>
    {:else if mapVisible}
      <iframe src={mapsEmbedUrl} title={copy.title} referrerpolicy="no-referrer" loading="lazy"></iframe>
    {:else}
      <button class="map-placeholder" type="button" onclick={() => mapVisible = true}>
        <svg viewBox="0 0 40 48" fill="none" aria-hidden="true" focusable="false">
          <path d="M20 44S5 28 5 18a15 15 0 0 1 30 0c0 10-15 26-15 26Z" fill="currentColor" />
          <circle cx="20" cy="18" r="5" fill="var(--color-paper)" />
        </svg>
        <strong>{copy.show}</strong>
        <span>{copy.note}</span>
      </button>
    {/if}
  </div>
  <div class="location-details">
    <strong>{venue}</strong>
    <p>{address}</p>
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">{copy.directions} ↗</a>
  </div>
</div>

<style>
  .location-card { margin-top: 16px; }
  .map-preview { height: 180px; background: var(--color-paper2); border-bottom: 1px solid var(--color-line); }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
  .map-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; height: 100%; border: 0; cursor: pointer; color: var(--color-forest); background-color: var(--color-paper2); background-image: linear-gradient(25deg, transparent 46%, rgb(255 255 255 / .8) 47% 53%, transparent 54%), linear-gradient(110deg, transparent 44%, rgb(255 255 255 / .8) 45% 51%, transparent 52%); }
  .map-placeholder:hover { background-color: var(--color-butter); }
  .map-placeholder svg { width: 32px; height: 38px; margin-bottom: 4px; }
  .map-placeholder strong, .location-details > strong { font-family: var(--font-display); font-weight: 500; }
  .map-placeholder span { font-size: .78rem; color: var(--color-inksoft); }
  .location-details { padding: 16px 20px; }
  .location-details p, .location-details a { font-size: .875rem; }
  .location-details p { color: var(--color-inksoft); }
  .location-details a { display: inline-block; margin-top: 6px; color: var(--color-forest); }
</style>

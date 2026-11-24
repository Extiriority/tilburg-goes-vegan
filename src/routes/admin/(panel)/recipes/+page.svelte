<script lang="ts">
  import RecipeEditor from '$lib/components/RecipeEditor.svelte';
  import Fuse from 'fuse.js';
  import SearchHighlight from '$lib/components/SearchHighlight.svelte';
  import { untrack } from 'svelte';
  import { getLocaleStore } from '$lib/locale-context';
  import { page } from '$app/state';
  import RecipePhotoUpload from '$lib/components/RecipePhotoUpload.svelte';
  let { data, form } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let photoBusy = $state(false);
  let search = $state(untrack(() => data.search));
  const searchIndex = $derived(new Fuse(data.rows, { keys: ['title'], threshold: 0.4, ignoreLocation: true, includeMatches: true }));
  const visibleRecipes = $derived(search.trim()
    ? searchIndex.search(search.trim()).map(result => ({ recipe: result.item, ranges: result.matches?.find(match => match.key === 'title')?.indices ?? [] }))
    : data.rows.map(recipe => ({ recipe, ranges: [] as readonly (readonly [number, number])[] })));
</script>

<h2>{nl ? 'Recepten' : 'Recipes'}</h2>
<div class="admin-recipe-grid">
  <aside>
    <div class="recipe-toolbar">
      <label class="recipe-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        <input type="search" bind:value={search} maxlength="200" placeholder={nl ? 'Recept zoeken…' : 'Find recipe…'} aria-label={nl ? 'Recept zoeken' : 'Find recipe'} />
      </label>
      <a class="button recipe-add" href="/admin/recipes" aria-label={nl ? 'Nieuw recept' : 'New recipe'} title={nl ? 'Nieuw recept' : 'New recipe'}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></a>
    </div>
    <ul class="admin-recipe-list">
      {#each visibleRecipes as { recipe, ranges }}<li>
          <a
            href={`/admin/recipes?edit=${recipe.id}`}
            aria-current={data.selected?.id === recipe.id ? 'page' : undefined}><SearchHighlight text={recipe.title} {ranges} /></a
          >
        </li>{:else}<li role="status">{search.trim() ? (nl ? 'Geen recepten gevonden.' : 'No matching recipes.') : (nl ? 'Nog geen recepten.' : 'No recipes yet.')}</li>{/each}
    </ul>
  </aside>
  <section class="card admin-editor">
    <h3>
      {data.selected
        ? nl
          ? 'Recept bewerken'
          : 'Edit recipe'
        : nl
          ? 'Recept toevoegen'
          : 'Add recipe'}
    </h3>
    {#if page.url.searchParams.has('saved')}<p class="form-success" role="status">
        {nl ? 'Gepubliceerd.' : 'Published.'}
      </p>{/if}{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
    {#key data.selected?.id}
      <RecipeEditor recipe={data.selected} initialIngredients={data.ingredients} initialSteps={data.steps} {nl} />
      {#if data.selected}<a href={`/${$locale}/recipes/${data.selected.slug}`}>{nl ? 'Recept bekijken' : 'View recipe'} ↗</a>{/if}
      {/key}
    {#if data.selected}
      <h3 style="margin-top:32px">{nl ? 'Foto (optioneel)' : 'Photo (optional)'}</h3>
      {#if data.mediaReady}<form
          method="POST"
          action="?/photos"
          enctype="multipart/form-data"
          class="form-grid"
        >
          <input type="hidden" name="id" value={data.selected.id} /><input
            type="hidden"
            name="version"
            value={data.selected.version}
          />
          <div class="full"><RecipePhotoUpload {nl} currentSrc={data.photos.length ? `/media/${(data.photos.find(photo => photo.is_cover) ?? data.photos[0]).id}` : undefined} onbusy={(busy) => (photoBusy = busy)} /></div>
          <button class="button" disabled={photoBusy}
            >{photoBusy
              ? nl
                ? 'Gebruik eerst de uitsnede'
                : 'Apply crop first'
              : nl
                ? data.photos.length ? 'Foto vervangen' : 'Foto uploaden'
                : data.photos.length ? 'Replace photo' : 'Upload photo'}</button
          >
        </form>{:else}<p>
          {nl
            ? 'Herstart de lokale server om de afbeeldingsopslag te laden.'
            : 'Restart the local server to load image storage.'}
        </p>{/if}
      {#if data.photos.length}
        {@const photo = data.photos.find(photo => photo.is_cover) ?? data.photos[0]}
        <img class="admin-single-recipe-photo" src={`/media/${photo.id}?size=thumb`} alt={photo.alt_text} width="320" height="240" />
        <form method="POST" action="?/photoDetails" class="form-grid">
          <input type="hidden" name="id" value={data.selected.id} /><input type="hidden" name="version" value={data.selected.version} /><input type="hidden" name="mediaId" value={photo.id} />
          <label class="full">{nl ? 'Fotobeschrijving' : 'Photo description'}<input name="alt" value={photo.alt_text} maxlength="500" required /></label>
          <button class="button">{nl ? 'Beschrijving opslaan' : 'Save description'}</button>
        </form>
        <form method="POST" action="?/deletePhoto">
          <input type="hidden" name="id" value={data.selected.id} /><input type="hidden" name="version" value={data.selected.version} />
          <button class="button button-secondary">{nl ? 'Foto verwijderen' : 'Delete photo'}</button>
        </form>
        {#if data.photos.length > 1}<p class="small muted">{nl ? 'Dit recept bevat oudere extra foto’s. Vervangen of verwijderen verwijdert alle huidige receptfoto’s.' : 'This recipe has older extra photos. Replacing or deleting removes all current recipe photos.'}</p>{/if}
      {/if}
      {#if page.url.searchParams.has('cleanup')}<p class="form-notice">{nl ? 'De foto is bijgewerkt. Opslag opschonen wordt bij de volgende fotowijziging opnieuw geprobeerd.' : 'Photo updated. Storage cleanup will retry on the next photo change.'}</p>{/if}
    {/if}
  </section>
</div>

<style>
  .recipe-toolbar { display: flex; align-items: center; gap: 8px; }
  .recipe-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; height: 44px; padding-inline: 12px; border: 1px solid var(--color-line); border-radius: 8px; background: var(--color-paper); }
  .recipe-search:focus-within { outline: 2px solid var(--color-green, #33563a); outline-offset: 2px; }
  .recipe-search svg { flex-shrink: 0; }
  .recipe-search input { width: 100%; min-width: 0; height: 100%; padding: 0; border: 0; background: transparent; box-shadow: none; outline: none; }
  .recipe-add { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 44px; width: 44px; height: 44px; min-height: 44px; padding: 0; border-radius: 8px; }
</style>

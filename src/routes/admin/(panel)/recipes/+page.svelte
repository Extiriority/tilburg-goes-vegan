<script lang="ts">
  import RecipeEditor from '$lib/components/RecipeEditor.svelte';
  import { getLocaleStore } from '$lib/locale-context';
  import { page } from '$app/state';
  import RecipePhotoUpload from '$lib/components/RecipePhotoUpload.svelte';
  let { data, form } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let photoBusy = $state(false);
</script>

<h2>{nl ? 'Recepten' : 'Recipes'}</h2>
<form method="GET" class="admin-filters form-grid">
  <label
    >{nl ? 'Recept zoeken' : 'Find recipe'}<input
      name="q"
      value={data.search}
      maxlength="200"
    /></label
  ><button class="button">{nl ? 'Zoeken' : 'Search'}</button>
</form>
<div class="admin-recipe-grid">
  <aside>
    <a class="button" href="/admin/recipes">{nl ? 'Nieuw recept' : 'New recipe'}</a>
    <ul class="admin-recipe-list">
      {#each data.rows as recipe}<li>
          <a
            href={`/admin/recipes?edit=${recipe.id}`}
            aria-current={data.selected?.id === recipe.id ? 'page' : undefined}>{recipe.title}</a
          >
        </li>{:else}<li>{nl ? 'Nog geen recepten.' : 'No recipes yet.'}</li>{/each}
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
      {#if data.selected}<a href={`/recipes/${data.selected.slug}`}>{nl ? 'Recept bekijken' : 'View recipe'} ↗</a>{/if}
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

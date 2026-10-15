<script lang="ts">
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
      <form method="POST" action="?/save" class="form-grid">
        <input type="hidden" name="id" value={data.selected?.id ?? ''} /><input
          type="hidden"
          name="version"
          value={data.selected?.version ?? 0}
        />
        <label class="full"
          >{nl ? 'Titel' : 'Title'}<input
            name="title"
            value={data.selected?.title ?? ''}
            maxlength="200"
            required
          /></label
        ><label
          >{nl ? 'URL-naam' : 'URL slug'}<input
            name="slug"
            value={data.selected?.slug ?? ''}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxlength="120"
            required
            aria-describedby="slug-help"
          /><span id="slug-help" class="small muted"
            >{nl
              ? 'Kleine letters, cijfers en streepjes.'
              : 'Lowercase letters, digits and hyphens.'}</span
          ></label
        >
        <label
          >{nl ? 'Gang' : 'Category'}<select
            name="category"
            value={data.selected?.category ?? 'main'}
            ><option value="starter">{nl ? 'Voorgerecht' : 'Starter'}</option><option value="main"
              >{nl ? 'Hoofdgerecht' : 'Main'}</option
            ><option value="dessert">{nl ? 'Nagerecht' : 'Dessert'}</option></select
          ></label
        >
        <label class="full"
          >{nl ? 'Beschrijving' : 'Description'}<textarea
            name="description"
            rows="3"
            maxlength="4000">{data.selected?.description ?? ''}</textarea
          ></label
        ><label class="full"
          >{nl ? 'Kok (optioneel)' : 'Chef credit (optional)'}<input
            name="chefCredit"
            value={data.selected?.chef_credit ?? ''}
            maxlength="160"
          /></label
        >
        <label class="full"
          >{nl ? 'Ingrediënten' : 'Ingredients'}<textarea
            name="ingredients"
            rows="7"
            maxlength="12000"
            required
            aria-describedby="ingredient-help">{data.ingredients}</textarea
          ><span id="ingredient-help" class="small muted"
            >{nl
              ? 'Eén per regel: hoeveelheid | ingrediënt. Bijvoorbeeld: 200 g | linzen'
              : 'One per line: quantity | ingredient. Example: 200 g | lentils'}</span
          ></label
        >
        <label class="full"
          >{nl ? 'Bereiding' : 'Preparation'}<textarea
            name="steps"
            rows="8"
            maxlength="20000"
            required
            aria-describedby="steps-help">{data.steps}</textarea
          ><span id="steps-help" class="small muted"
            >{nl ? 'Eén stap per regel.' : 'One step per line.'}</span
          ></label
        >
        <p class="form-notice full">
          {nl
            ? 'Opslaan publiceert direct. Recepten blijven in de taal waarin je ze schrijft.'
            : 'Saving publishes immediately. Recipes remain in the language you write them in.'}
        </p>
        <button class="button">{nl ? 'Opslaan en publiceren' : 'Save and publish'}</button
        >{#if data.selected}<a href={`/recipes/${data.selected.slug}`}
            >{nl ? 'Recept bekijken' : 'View recipe'} ↗</a
          >{/if}
      </form>{/key}
    {#if data.selected}
      <h3 style="margin-top:32px">{nl ? 'Foto’s' : 'Photos'}</h3>
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
          <div class="full"><RecipePhotoUpload {nl} onbusy={(busy) => (photoBusy = busy)} /></div>
          <button class="button" disabled={photoBusy}
            >{photoBusy
              ? nl
                ? 'Foto’s voorbereiden…'
                : 'Preparing photos…'
              : nl
                ? 'Foto’s uploaden'
                : 'Upload photos'}</button
          >
        </form>{:else}<p>
          {nl
            ? 'Herstart de lokale server om de afbeeldingsopslag te laden.'
            : 'Restart the local server to load image storage.'}
        </p>{/if}
      {#if data.photos.length}<form method="POST" action="?/order">
          <input type="hidden" name="id" value={data.selected.id} /><input
            type="hidden"
            name="version"
            value={data.selected.version}
          />
          <fieldset>
            <legend
              >{nl ? 'Volgorde, omslag en beschrijvingen' : 'Order, cover and descriptions'}</legend
            >
            {#each data.photos as photo, i}<div class="admin-photo-row">
                <img
                  src={`/media/${photo.id}?size=thumb`}
                  alt={photo.alt_text}
                  width="100"
                  height="80"
                /><input type="hidden" name="imageId" value={photo.id} /><label
                  >{nl ? 'Positie' : 'Position'}
                  {i + 1}<input
                    type="number"
                    name={`position:${photo.id}`}
                    value={i + 1}
                    min="1"
                    max="12"
                    required
                  /></label
                ><label
                  >{nl ? 'Beschrijving' : 'Description'}
                  {i + 1}<input
                    name={`alt:${photo.id}`}
                    value={photo.alt_text}
                    maxlength="500"
                    required
                  /></label
                ><label class="consent"
                  ><input
                    type="radio"
                    name="cover"
                    value={photo.id}
                    checked={!!photo.is_cover}
                    required
                  /><span>{nl ? 'Omslag' : 'Cover'}</span></label
                >
              </div>{/each}
            <button class="button"
              >{nl ? 'Foto-instellingen opslaan' : 'Save photo settings'}</button
            >
          </fieldset>
        </form>{/if}
    {/if}
  </section>
</div>

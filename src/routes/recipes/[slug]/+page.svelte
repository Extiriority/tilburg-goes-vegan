<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
</script>

<svelte:head><title>{data.recipe.title} — Tilburg Goes Vegan</title></svelte:head>
<main class="page-width section-space recipe-detail">
  <a href="/recipes">← {nl ? 'Recepten' : 'Recipes'}</a>
  <h1 class="section-title" style="margin-top:24px">{data.recipe.title}</h1>
  <p class="section-intro">{data.recipe.description ?? ''}</p>
  {#if data.recipe.chef_credit}<p>{nl ? 'Van' : 'By'} {data.recipe.chef_credit}</p>{/if}
  <div class="recipe-photos">
    {#each data.photos as photo}<img
        src={`/media/${photo.id}`}
        srcset={`/media/${photo.id}?size=thumb 640w, /media/${photo.id} 1600w`}
        sizes="(max-width: 767px) 100vw, 800px"
        alt={photo.alt_text}
        width={photo.width}
        height={photo.height}
        loading="lazy"
      />{/each}
  </div>
  <h2>{nl ? 'Ingrediënten' : 'Ingredients'}</h2>
  <ul>
    {#each data.ingredients as ingredient}<li>
        {ingredient.quantity}
        {ingredient.ingredient}
      </li>{/each}
  </ul>
  <h2>{nl ? 'Bereiding' : 'Preparation'}</h2>
  <ol>
    {#each data.steps as step}<li>{step.instruction}</li>{/each}
  </ol>
</main>

<style>
  .recipe-detail {
    max-width: 900px;
  }
  .recipe-detail h2 {
    margin-top: 32px;
  }
  .recipe-detail ul,
  .recipe-detail ol {
    padding-left: 24px;
    list-style: revert;
  }
  .recipe-detail li {
    margin-top: 12px;
  }
</style>

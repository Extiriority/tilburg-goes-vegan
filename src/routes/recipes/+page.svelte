<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
</script>

<svelte:head><title>{nl ? 'Recepten' : 'Recipes'} — Tilburg Goes Vegan</title></svelte:head>
<main class="page-width section-space">
  <a href="/">← Tilburg Goes Vegan</a>
  <h1 class="section-title" style="margin-top:24px">
    {nl ? 'Uit onze keuken' : 'From our kitchen'}
  </h1>
  <form method="GET" class="admin-filters form-grid">
    <label>{nl ? 'Zoeken' : 'Search'}<input name="q" value={data.search} maxlength="200" /></label
    ><label
      >{nl ? 'Gang' : 'Category'}<select name="category" value={data.category}
        ><option value="">{nl ? 'Alle' : 'All'}</option><option value="starter"
          >{nl ? 'Voorgerecht' : 'Starter'}</option
        ><option value="main">{nl ? 'Hoofdgerecht' : 'Main'}</option><option value="dessert"
          >{nl ? 'Nagerecht' : 'Dessert'}</option
        ></select
      ></label
    ><button class="button">{nl ? 'Zoeken' : 'Search'}</button>
  </form>
  <ul class="admin-list">
    {#each data.recipes as recipe}<li class="card admin-editor">
        {#if recipe.cover_id}<img
            class="recipe-cover"
            src={`/media/${recipe.cover_id}?size=thumb`}
            alt={recipe.cover_alt ?? ''}
            width="320"
            height="220"
            loading="lazy"
          />{/if}
        <h2><a href={`/recipes/${recipe.slug}`}>{recipe.title}</a></h2>
        <p>{recipe.description ?? ''}</p>
        {#if recipe.chef_credit}<p>{recipe.chef_credit}</p>{/if}
      </li>{:else}<li>{nl ? 'Geen recepten gevonden.' : 'No recipes found.'}</li>{/each}
  </ul>
</main>

<style>
  .recipe-cover {
    width: 320px;
    max-width: 100%;
    height: 220px;
    object-fit: cover;
    margin-bottom: 20px;
  }
</style>

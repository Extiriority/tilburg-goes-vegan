<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  const courses: Record<string, [string, string]> = {
    starter: ['Voorgerecht', 'Starter'], main: ['Hoofdgerecht', 'Main'], dessert: ['Nagerecht', 'Dessert'],
  };
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
  <ul class="recipe-card-grid">
    {#each data.recipes as recipe}<li class="card recipe-list-card">
        <a class="recipe-image-link" href={`/recipes/${recipe.slug}`} aria-label={recipe.title}>
        {#if recipe.cover_id}<img
            class="recipe-cover"
            src={`/media/${recipe.cover_id}`}
            srcset={`/media/${recipe.cover_id}?size=thumb 640w, /media/${recipe.cover_id} 1600w`}
            sizes="(max-width: 639px) 100vw, 50vw"
            alt={recipe.cover_alt ?? ''}
            width="800"
            height="600"
            loading="lazy"
          />{:else}<span class="recipe-cover recipe-cover-placeholder" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 20c-2-9 2-15 15-16 0 12-6 17-15 16ZM5 20 16 9"/></svg></span>{/if}
        </a>
        <div class="recipe-card-text">
        <div class="recipe-card-heading">
          <h2><a href={`/recipes/${recipe.slug}`}>{recipe.title}</a></h2>
          <span class="recipe-course-chip" data-course={recipe.category}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              {#if recipe.category === 'starter'}<path d="M3 12h18a9 9 0 0 1-18 0ZM7 3c-2 2 2 3 0 5M12 2c-2 2 2 3 0 5M17 3c-2 2 2 3 0 5M7 21h10"/>
              {:else if recipe.category === 'main'}<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 8V5M10 5h4M2 21h20"/>
              {:else}<path d="M6 10h12l-2 10H8ZM6 10a4 4 0 0 1 3-6 3 3 0 0 1 6 0 4 4 0 0 1 3 6M10 14v3M14 14v3"/>{/if}
            </svg>
            {courses[recipe.category]?.[nl ? 0 : 1] ?? recipe.category}
          </span>
        </div>
        <p>{recipe.description ?? ''}</p>
        {#if recipe.servings !== null || recipe.total_minutes !== null || recipe.serving_grams !== null}<div class="recipe-card-meta">
          {#if recipe.servings !== null}<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg>{recipe.servings} {nl ? 'porties' : 'servings'}</span>{/if}
          {#if recipe.total_minutes !== null}<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span class="sr-only">{nl ? 'Totale tijd:' : 'Total time:'} </span>{recipe.total_minutes} min</span>{/if}
          {#if recipe.serving_grams !== null}<span>{recipe.serving_grams} g {nl ? 'per portie' : 'per serving'}</span>{/if}
        </div>{/if}
        {#if recipe.chef_credit}<p class="recipe-chef-credit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14a5 5 0 0 1-1-10 5 5 0 0 1 7-2 5 5 0 0 1 7 2 5 5 0 0 1-1 10v7H6ZM6 17h12"/></svg>
          <span class="sr-only">{nl ? 'Kok:' : 'Chef:'} </span><span>{recipe.chef_credit}</span>
        </p>{/if}
        </div>
      </li>{:else}<li class="recipe-empty">{nl ? 'Geen recepten gevonden.' : 'No recipes found.'}</li>{/each}
  </ul>
</main>

<style>
  .recipe-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; list-style: none; padding: 0; margin-top: 32px; }
  .recipe-list-card { overflow: hidden; min-width: 0; border-radius: 16px; }
  .recipe-image-link { display: block; }
  .recipe-cover {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    height: auto;
    object-fit: cover;
  }
  .recipe-cover-placeholder { display: flex; align-items: center; justify-content: center; background: var(--color-paper2); color: var(--color-forest); }
  .recipe-card-text { padding: 24px; }
  .recipe-card-heading { display: flex; align-items: start; gap: 12px; }
  .recipe-card-heading h2 { flex: 1; min-width: 0; }
  .recipe-course-chip { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 4px 10px; border-radius: 999px; background: #e0f2e4; color: var(--color-forest); font-size: .75rem; font-weight: 700; white-space: nowrap; }
  .recipe-course-chip svg { flex-shrink: 0; }
  .recipe-course-chip[data-course=starter] { background: #fff0b3; color: #715200; }
  .recipe-course-chip[data-course=dessert] { background: #fbe2e9; color: var(--color-raspd); }
  .recipe-card-text h2 { font-size: 1.5rem; line-height: 1.3; overflow-wrap: anywhere; }
  .recipe-card-text p { margin-top: 10px; }
  .recipe-chef-credit { display: flex; align-items: center; gap: 6px; color: var(--color-inksoft); }
  .recipe-chef-credit svg { flex-shrink: 0; color: var(--color-forest); }
  .recipe-card-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; font-size: .85rem; color: var(--color-inksoft); }
  .recipe-card-meta > span { display: inline-flex; align-items: center; gap: 5px; }
  .recipe-empty { grid-column: 1 / -1; }
  @media (max-width: 639px) { .recipe-card-grid { grid-template-columns: 1fr; gap: 20px; } .recipe-card-text { padding: 20px; } }
</style>

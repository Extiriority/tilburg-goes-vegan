<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  import Fuse from 'fuse.js';
  import { untrack } from 'svelte';
  import SearchHighlight from '$lib/components/SearchHighlight.svelte';
  let { data } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let search = $state(untrack(() => data.search));
  let category = $state(untrack(() => data.category));
  const filteredRecipes = $derived(data.recipes.filter(recipe => !category || recipe.category === category));
  const searchIndex = $derived(new Fuse(filteredRecipes, { keys: ['title'], threshold: 0.4, ignoreLocation: true, includeMatches: true }));
  const visibleRecipes = $derived(search.trim()
    ? searchIndex.search(search.trim()).map(result => ({ recipe: result.item, ranges: result.matches?.find(match => match.key === 'title')?.indices ?? [] }))
    : filteredRecipes.map(recipe => ({ recipe, ranges: [] as readonly (readonly [number, number])[] })));
  const courses: Record<string, [string, string]> = {
    starter: ['Voorgerecht', 'Starter'], main: ['Hoofdgerecht', 'Main'], dessert: ['Nagerecht', 'Dessert'],
  };
</script>


<main class="page-width section-space">
  <a href={`/${$locale}/`}>← Tilburg Goes Vegan</a>
  <h1 class="section-title" style="margin-top:24px">
    {nl ? 'Uit onze keuken' : 'From our kitchen'}
  </h1>
  <form method="GET" class="recipe-filters" onsubmit={event => event.preventDefault()}>
    <label class="recipe-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input type="search" name="q" bind:value={search} placeholder={nl ? 'Recept zoeken…' : 'Find recipe…'} aria-label={nl ? 'Recept zoeken' : 'Find recipe'} maxlength="200" /></label
    >
    <div class="course-filters" role="group" aria-label={nl ? 'Filter op gang' : 'Filter by course'}>
      {#each ['', 'starter', 'main', 'dessert'] as course}
        <button type="button" class="course-filter" data-course={course} aria-pressed={category === course} onclick={() => category = course}>
          {course ? courses[course][nl ? 0 : 1] : nl ? 'Alle' : 'All'}
        </button>
      {/each}
    </div>
  </form>
  <ul class="recipe-card-grid">
    {#each visibleRecipes as { recipe, ranges }}<li class="card recipe-list-card">
        <a class="recipe-image-link" href={`/${$locale}/recipes/${recipe.slug}`} aria-label={recipe.title}>
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
          <h2><a href={`/${$locale}/recipes/${recipe.slug}`}><SearchHighlight text={recipe.title} {ranges} /></a></h2>
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
  .recipe-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; margin-top: 24px; }
  .course-filters { display: flex; flex-wrap: wrap; gap: 6px; }
  .course-filter { min-height: 44px; padding: 8px 16px; border: 1px solid var(--color-line); border-radius: 999px; background: transparent; color: var(--color-forest); font: inherit; font-size: .9rem; cursor: pointer; }
  .course-filter:hover { background: #e0f2e4; }
  .course-filter[aria-pressed=true] { background: var(--color-forest); color: white; border-color: var(--color-forest); }
  .course-filter[data-course=starter][aria-pressed=true] { background: #fff0b3; color: #715200; border-color: #d9c36c; }
  .course-filter[data-course=main][aria-pressed=true] { background: #e0f2e4; color: #174a2a; border-color: #b7d9bf; }
  .course-filter[data-course=dessert][aria-pressed=true] { background: #fbe2e9; color: var(--color-raspd); border-color: #e8b4c4; }
  @media (max-width: 639px) { .recipe-search { flex-basis: 100%; } .course-filters { width: 100%; } .course-filter { flex: 1; padding-inline: 10px; } }
  .recipe-search { display: flex; align-items: center; gap: 10px; flex: 1 1 220px; min-width: 0; height: 48px; padding-inline: 12px; border: 1px solid var(--color-line); border-radius: 8px; background: var(--color-paper); }
  .recipe-search:focus-within { outline: 2px solid var(--color-green, #33563a); outline-offset: 2px; }
  .recipe-search svg { flex-shrink: 0; }
  .recipe-search input { width: 100%; min-width: 0; height: 100%; border: 0; padding: 0; outline: none; box-shadow: none; background: transparent; }
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

<script lang="ts">
  import CookMode from '$lib/components/CookMode.svelte';
  import { allergens } from '$lib/dietary';
  import { readRecipeAllergens } from '$lib/recipe-content';
  import { getLocaleStore } from '$lib/locale-context';
  let { data } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
  let showTutorial = $state(false);
  let recipeAllergens = $derived(readRecipeAllergens(data.recipe.allergens));
  let highlightedSteps = $state<number[]>([]);
  const recipeId = $derived(data.recipe.id);
  $effect(() => { recipeId; highlightedSteps = []; });
</script>

<svelte:head><title>{data.recipe.title} — Tilburg Goes Vegan</title></svelte:head>
<main class="page-width section-space recipe-detail">
  <a href="/recipes">← {nl ? 'Recepten' : 'Recipes'}</a>
  <div class="recipe-layout" class:has-photos={data.photos.length > 0 || !!data.recipe.youtube_video_id}>
    <header class="recipe-heading">
      <div class="recipe-title-row">
        <h1 class="section-title">{data.recipe.title}</h1>
        {#if data.recipe.chef_credit}<span class="recipe-author"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14a5 5 0 0 1-1-10 5 5 0 0 1 7-2 5 5 0 0 1 7 2 5 5 0 0 1-1 10v7H6ZM6 17h12"/></svg><span class="sr-only">{nl ? 'Kok:' : 'Chef:'} </span>{data.recipe.chef_credit}</span>{/if}
      </div>
      {#if data.recipe.description}<p class="section-intro">{data.recipe.description}</p>{/if}
      <div class="recipe-meta">
        {#if data.recipe.servings !== null}<span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg>{data.recipe.servings} {nl ? 'porties' : 'servings'}</span>{/if}
        {#if data.recipe.total_minutes !== null}<span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span class="sr-only">{nl ? 'Totale tijd:' : 'Total time:'} </span>{data.recipe.total_minutes} min</span>{/if}
      </div>
    {#if recipeAllergens.length}<section class="recipe-allergen-summary" aria-label={nl ? 'Mogelijke allergenen' : 'Possible allergens'}><p class="small">{nl ? 'Mogelijke allergenen' : 'Possible allergens'}</p><ul role="list">{#each allergens.filter(item => recipeAllergens.includes(item.id)) as item}<li><span class="allergen-icon" style={`--allergen-icon: url('${item.icon}')`} aria-hidden="true"></span>{item.id === 'gluten' ? 'Gluten' : nl ? item.nl : item.en}</li>{/each}</ul></section>{/if}
    </header>

    <div class="recipe-sidebar">
    {#if data.photos.length}  <aside class="recipe-photos" aria-label={nl ? 'Receptfoto’s' : 'Recipe photos'}>
    {#each data.photos as photo}<img
        src={`/media/${photo.id}`}
        srcset={`/media/${photo.id}?size=thumb 640w, /media/${photo.id} 1600w`}
        sizes="(max-width: 767px) 100vw, 40vw"
        alt={photo.alt_text}
        width={photo.width}
        height={photo.height}
        loading="lazy"
      />{/each}
  </aside>
{/if}
  {#if data.recipe.youtube_video_id}<section class="recipe-video-panel"><h2>{nl ? 'Videotutorial' : 'Video tutorial'}</h2>
    {#if showTutorial}<iframe class="recipe-tutorial" title={nl ? 'YouTube-recepttutorial' : 'YouTube recipe tutorial'} src={`https://www.youtube-nocookie.com/embed/${data.recipe.youtube_video_id}`} allow="fullscreen; picture-in-picture" referrerpolicy="strict-origin" allowfullscreen></iframe>
    {:else}<button type="button" class="button" onclick={() => showTutorial = true}>{nl ? 'YouTube-tutorial laden' : 'Load YouTube tutorial'}</button><p class="small muted">{nl ? 'Bij laden maakt je browser verbinding met YouTube.' : 'Loading connects your browser to YouTube.'}</p>{/if}
  </section>{/if}
    </div>
    <div class="recipe-body">
  <h2>{nl ? 'Ingrediënten' : 'Ingredients'}</h2>
  <ul class="ingredient-checklist" role="list">
    {#each data.ingredients as ingredient, i}<li id={`ingredient-${i+1}`}>
        <label><input type="checkbox" /><span>{ingredient.quantity} {ingredient.ingredient}</span></label>
        {#each data.notes as note, n}{#if note.targets.some(t => t.kind === 'ingredient' && t.index === i)} <a class="recipe-note-link" href={`#recipe-note-${n+1}`}>{nl ? 'Notitie' : 'Note'} {n+1}</a>{/if}{/each}
      </li>{/each}
  </ul>
  <CookMode {nl} />
  <h2>{nl ? 'Bereiding' : 'Preparation'}</h2>
  <ol class="preparation-checklist" role="list">
    {#each data.steps as step, i}<li id={`step-${i+1}`} class:step-highlighted={highlightedSteps.includes(i)}>
      <button type="button" class="preparation-step" aria-pressed={highlightedSteps.includes(i)} onclick={() => highlightedSteps = highlightedSteps.includes(i) ? highlightedSteps.filter(value => value !== i) : [...highlightedSteps, i]}>
        <span class="step-stamp" aria-hidden="true">{i+1}</span><span><span class="sr-only">{nl ? 'Stap' : 'Step'} {i+1}: </span>{step.instruction}</span>
      </button>
      {#each data.notes as note, n}{#if note.targets.some(t => t.kind === 'step' && t.index === i)} <a class="recipe-note-link" href={`#recipe-note-${n+1}`}>{nl ? 'Notitie' : 'Note'} {n+1}</a>{/if}{/each}
    </li>{/each}
  </ol>
  {#if data.notes.length}<section class="card recipe-notes"><h2>{nl ? 'Receptnotities' : 'Recipe notes'}</h2><ol>{#each data.notes as note, n}<li id={`recipe-note-${n+1}`}>{note.text} {#each note.targets as target}<a class="recipe-note-link" href={`#${target.kind}-${target.index+1}`}>{target.kind === 'ingredient' ? (nl ? 'Ingrediënt' : 'Ingredient') : (nl ? 'Stap' : 'Step')} {target.index+1} ↑</a> {/each}</li>{/each}</ol></section>{/if}

  {#if data.recipe.serving_grams !== null || data.recipe.calories_kcal !== null}<p class="small recipe-nutrition">{nl ? 'Per portie' : 'Per serving'}: {#if data.recipe.serving_grams !== null}{data.recipe.serving_grams} g{/if}{#if data.recipe.serving_grams !== null && data.recipe.calories_kcal !== null} · {/if}{#if data.recipe.calories_kcal !== null}{data.recipe.calories_kcal} kcal{/if}</p>{/if}
    </div>
  </div>
</main>

<style>
  .recipe-detail { max-width: 1440px; }
  .recipe-layout { margin-top: 28px; }
  .recipe-layout.has-photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px; align-items: start; }
  .recipe-heading { grid-column: 1; padding-bottom: 24px; }
  .recipe-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 24px; }
  .recipe-title-row h1 { margin: 0; }
  .recipe-author { display: inline-flex; align-items: center; gap: 7px; color: var(--color-forest); font-size: .9rem; }
  .recipe-author svg, .recipe-meta svg { flex-shrink: 0; }
  .recipe-heading .section-intro { margin-top: 18px; margin-bottom: 0; }
  .recipe-meta { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 20px; color: var(--color-inksoft); font-size: .9rem; }
  .recipe-meta > span { display: inline-flex; align-items: center; gap: 7px; }
  .recipe-body { grid-column: 1; min-width: 0; }
  .recipe-sidebar { grid-column: 2; grid-row: 1 / span 2; min-width: 0; }
  .recipe-video-panel { margin-top: 24px; }
  .recipe-video-panel h2 { margin-top: 0; margin-bottom: 16px; }
  .recipe-detail .recipe-photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 0; }
  .recipe-detail .recipe-photos img { width: 100%; aspect-ratio: 1; height: auto; object-fit: cover; border-radius: 16px; }
  .recipe-detail .recipe-photos img:first-child { grid-column: 1 / -1; aspect-ratio: 4 / 3; }
  .recipe-detail h2 { margin-top: 32px; font-family: var(--font-display); font-size: 1.5rem; color: var(--color-forest); }
  .recipe-body > h2:first-child { margin-top: 0; }
  .recipe-detail ul, .recipe-detail ol { padding-left: 24px; list-style: revert; }
  .recipe-detail .recipe-allergen-summary ul { padding-left: 0; list-style: none; }
  .recipe-detail .recipe-allergen-summary li { margin-top: 0; }
  .recipe-detail li { margin-top: 12px; }
  .recipe-detail ol li { white-space: pre-line; }
  .recipe-detail .ingredient-checklist, .recipe-detail .preparation-checklist { list-style: none; padding-left: 0; }
  .ingredient-checklist li { border-radius: 8px; }
  .recipe-detail .ingredient-checklist li { margin-top: 0; }
  .ingredient-checklist li { display: flex; align-items: center; flex-wrap: wrap; gap: 0 6px; }
  .ingredient-checklist label { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 4px 0 4px 10px; cursor: pointer; }
  .ingredient-checklist input { flex: 0 0 22px; width: 22px; height: 22px; accent-color: var(--color-forest); cursor: pointer; }
  .ingredient-checklist input:checked + span { text-decoration: line-through; color: var(--color-inksoft); }
  .ingredient-checklist .recipe-note-link { display: inline-block; margin: 0; }
  .recipe-detail .preparation-checklist li { border-radius: 10px; margin-top: 4px; }
  .preparation-checklist li:nth-child(even) { background: #e4eddd; }
  .preparation-step { display: flex; align-items: flex-start; gap: 10px; text-align: left; width: 100%; min-height: 44px; padding: 8px 10px; background: transparent; border: 0; border-radius: 10px; color: inherit; cursor: pointer; }
  .preparation-step > span:last-child { white-space: pre-line; }
  .step-stamp { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 30px; width: 30px; height: 30px; border-radius: 50%; background: var(--color-forest); color: white; font-family: var(--font-display); font-weight: 600; font-size: .9rem; box-shadow: inset 0 0 0 2px #ffffff40; }
  .preparation-checklist li.step-highlighted { background: #fff0b3; }
  .preparation-checklist .recipe-note-link { display: inline-block; margin: 0 12px 8px 54px; }
  @media (hover: hover) { .ingredient-checklist li:hover { background: #e0f2e4; } .preparation-step:hover { background: #f6eaae80; } }
  .recipe-detail .recipe-notes { border-radius: 16px; }
  .recipe-detail .recipe-notes h2 { margin-top: 0; }
  .recipe-nutrition { margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--color-line); color: var(--color-inksoft); }
  @media (max-width: 767px) {
    .recipe-layout.has-photos { display: flex; flex-direction: column; gap: 24px; }
    .recipe-heading { padding-bottom: 0; order: 0; }
    .recipe-sidebar { display: contents; }
    .recipe-detail .recipe-photos { order: 1; }
    .recipe-body { order: 2; }
    .recipe-video-panel { order: 3; width: 100%; margin-top: 0; }
    .recipe-detail .recipe-photos { width: 100%; }
    .recipe-detail .recipe-photos img:first-child { aspect-ratio: 4 / 3; }
    .recipe-body { width: 100%; }
  }
</style>

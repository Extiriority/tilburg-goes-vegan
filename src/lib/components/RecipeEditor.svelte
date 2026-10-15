<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { allergens } from '$lib/dietary';
  import { readRecipeAllergens } from '$lib/recipe-content';
  import { recipeSlug, readRecipeNotes, type RecipeNote } from '$lib/recipe-content';
  let { recipe, initialIngredients, initialSteps, nl }: {
    recipe: { id: string; version: number; title: string; description: string | null; category: string; chef_credit: string | null; notes: string; youtube_video_id: string | null; serving_grams: number | null; calories_kcal: number | null; servings: number | null; total_minutes: number | null; allergens: string } | null;
    initialIngredients: { quantity: string; name: string }[]; initialSteps: string[]; nl: boolean;
  } = $props();
  let title = $state(untrack(() => recipe?.title ?? ''));
  let selectedAllergens = $state(untrack(() => readRecipeAllergens(recipe?.allergens ?? null)));
  let ingredients = $state(untrack(() => initialIngredients.map(item => ({ ...item })).concat([{ quantity: '', name: '' }])));
  let steps = $state(untrack(() => [...initialSteps, '']));
  let notes = $state<RecipeNote[]>(untrack(() => readRecipeNotes(recipe?.notes ?? null).concat([{ text: '', targets: [] }])));
  let linking = $state<number | null>(null);
  let pending = $state(false);
  let slug = $derived(recipeSlug(title));
  function growIngredients() {
    if (ingredients.at(-1)?.name.trim() && ingredients.length < 100) ingredients.push({ quantity: '', name: '' });
  }
  function growSteps() { if (steps.at(-1)?.trim() && steps.length < 100) steps.push(''); }
  function growNotes() { if (notes.at(-1)?.text.trim() && notes.length < 50) notes.push({ text: '', targets: [] }); }
  function link(kind: 'ingredient' | 'step', index: number) {
    if (linking === null) return;
    const targets = notes[linking].targets;
    const found = targets.findIndex(target => target.kind === kind && target.index === index);
    if (found >= 0) targets.splice(found, 1); else targets.push({ kind, index });
  }
  function remove(kind: 'ingredient' | 'step', index: number) {
    if (kind === 'ingredient') ingredients.splice(index, 1); else steps.splice(index, 1);
    for (const note of notes) note.targets = note.targets.filter(t => t.kind !== kind || t.index !== index).map(t => t.kind === kind && t.index > index ? { ...t, index: t.index - 1 } : t);
  }
  function references(kind: 'ingredient' | 'step', index: number) {
    return notes.flatMap((note, i) => note.text.trim() && note.targets.some(t => t.kind === kind && t.index === index) ? [i + 1] : []);
  }
  let content = $derived.by(() => {
    const ingredientMap = ingredients.map((item, i) => item.name.trim() ? i : -1).filter(i => i >= 0);
    const stepMap = steps.map((item, i) => item.trim() ? i : -1).filter(i => i >= 0);
    return JSON.stringify({ ingredients: ingredientMap.map(i => ingredients[i]), steps: stepMap.map(i => steps[i]), notes: notes.filter(note => note.text.trim()).map(note => ({
      text: note.text, targets: note.targets.map(t => ({ ...t, index: (t.kind === 'ingredient' ? ingredientMap : stepMap).indexOf(t.index) })).filter(t => t.index >= 0),
    })) });
  });
</script>

<form method="POST" action="?/save" class="form-grid recipe-editor" use:enhance={() => { pending = true; return async ({ update }) => { try { await update({ reset: false }); } finally { pending = false; } }; }}>
  <input type="hidden" name="id" value={recipe?.id ?? ''} />
  <input type="hidden" name="version" value={recipe?.version ?? 0} />
  <input type="hidden" name="content" value={content} />
  <label class="full">{nl ? 'Titel' : 'Title'}<input name="title" bind:value={title} maxlength="200" required /><span class="small muted">/recipes/{slug || '…'}</span></label>
  <label>{nl ? 'Gang' : 'Category'}<select name="category" value={recipe?.category ?? 'main'}><option value="starter">{nl ? 'Voorgerecht' : 'Starter'}</option><option value="main">{nl ? 'Hoofdgerecht' : 'Main'}</option><option value="dessert">{nl ? 'Nagerecht' : 'Dessert'}</option></select></label>
  <label>{nl ? 'Kok (optioneel)' : 'Chef credit (optional)'}<input name="chefCredit" value={recipe?.chef_credit ?? ''} maxlength="160" /></label>
  <label class="full">{nl ? 'Beschrijving' : 'Description'}<textarea name="description" rows="2" maxlength="4000" value={recipe?.description ?? ''}></textarea></label>

  <fieldset class="full recipe-repeat"><legend>{nl ? 'Ingrediënten' : 'Ingredients'}</legend>
    {#each ingredients as item, i}<div class="recipe-ingredient-row">
      <label>{nl ? 'Hoeveelheid' : 'Quantity'} {i + 1}<input bind:value={item.quantity} maxlength="160" placeholder="200 g" oninput={(event) => { item.quantity = event.currentTarget.value; growIngredients(); }} onclick={() => linking !== null && link('ingredient', i)} /></label>
      <label>{nl ? 'Ingrediënt' : 'Ingredient'} {i + 1}<input bind:value={item.name} maxlength="500" required={i === 0 || !!item.quantity.trim()} oninput={(event) => { item.name = event.currentTarget.value; growIngredients(); }} onclick={() => linking !== null && link('ingredient', i)} /></label>
      {#if linking !== null && item.name.trim()}<button type="button" class="recipe-link-target" onclick={() => link('ingredient', i)}>{nl ? 'Koppel' : 'Link'}</button>{/if}
      {#if i < ingredients.length - 1}<button type="button" class="recipe-remove" aria-label={`${nl ? 'Ingrediënt verwijderen' : 'Remove ingredient'} ${i+1}`} onclick={() => remove('ingredient', i)}>×</button>{/if}
      {#if references('ingredient', i).length}<span class="small full">{nl ? 'Notities' : 'Notes'} {references('ingredient', i).join(', ')}</span>{/if}
    </div>{/each}
  </fieldset>
  <fieldset class="full recipe-repeat"><legend>{nl ? 'Bereiding' : 'Preparation'}</legend>
    {#each steps as step, i}<div class="recipe-step-row">
      <label>{nl ? 'Stap' : 'Step'} {i+1}<textarea bind:value={steps[i]} rows="2" maxlength="4000" required={i === 0} oninput={(event) => { steps[i] = event.currentTarget.value; growSteps(); }} onclick={() => linking !== null && link('step', i)}></textarea></label>
      {#if linking !== null && step.trim()}<button type="button" class="recipe-link-target" onclick={() => link('step', i)}>{nl ? 'Koppel' : 'Link'}</button>{/if}
      {#if i < steps.length - 1}<button type="button" class="recipe-remove" aria-label={`${nl ? 'Stap verwijderen' : 'Remove step'} ${i+1}`} onclick={() => remove('step', i)}>×</button>{/if}
      {#if references('step', i).length}<span class="small full">{nl ? 'Notities' : 'Notes'} {references('step', i).join(', ')}</span>{/if}
    </div>{/each}
  </fieldset>
  <fieldset class="full recipe-repeat"><legend>{nl ? 'Receptnotities (optioneel)' : 'Recipe notes (optional)'}</legend>
    {#if linking !== null}<p class="form-notice" role="status">{nl ? 'Klik op een ingrediënt of stap om de notitie te koppelen. Klik nogmaals om te ontkoppelen.' : 'Click an ingredient or step to link this note. Click again to unlink.'}</p>{/if}
    {#each notes as note, i}<div class="recipe-step-row">
      <label>{nl ? 'Notitie' : 'Note'} {i+1}<textarea bind:value={note.text} oninput={(event) => { note.text = event.currentTarget.value; growNotes(); }} rows="2" maxlength="2000"></textarea></label>
      {#if note.text.trim()}<button type="button" class="recipe-link-target" aria-pressed={linking === i} onclick={() => linking = linking === i ? null : i}>{linking === i ? (nl ? 'Klaar' : 'Done') : (nl ? 'Koppel' : 'Link')} ↗</button>
      <button type="button" class="recipe-remove" aria-label={`${nl ? 'Notitie verwijderen' : 'Remove note'} ${i+1}`} onclick={() => { notes.splice(i, 1); linking = null; }}>×</button>{/if}
      {#if note.targets.length}<span class="small full">{note.targets.map(t => `${t.kind === 'ingredient' ? (nl ? 'Ingrediënt' : 'Ingredient') : (nl ? 'Stap' : 'Step')} ${t.index+1}`).join(' · ')}</span>{/if}
    </div>{/each}
  </fieldset>
  <fieldset class="full recipe-repeat"><legend>{nl ? 'Mogelijke allergenen (optioneel)' : 'Possible allergens (optional)'}</legend>
    <div class="recipe-allergen-options">{#each allergens.filter(item => !('secondary' in item)) as item}<label><input type="checkbox" name="recipeAllergens" value={item.id} bind:group={selectedAllergens} /><span class="allergen-icon" style={`--allergen-icon: url('${item.icon}')`} aria-hidden="true"></span>{item.id === 'gluten' ? 'Gluten' : nl ? item.nl : item.en}</label>{/each}</div>
    <details><summary>{nl ? 'Overige allergenen / kruiscontact' : 'Other allergens / cross-contact'}</summary><div class="recipe-allergen-options">{#each allergens.filter(item => 'secondary' in item) as item}<label><input type="checkbox" name="recipeAllergens" value={item.id} bind:group={selectedAllergens} /><span class="allergen-icon" style={`--allergen-icon: url('${item.icon}')`} aria-hidden="true"></span>{nl ? item.nl : item.en}</label>{/each}</div></details>
  </fieldset>
  <label>{nl ? 'Aantal porties (optioneel)' : 'Servings (optional)'}<input type="number" name="servings" value={recipe?.servings ?? ''} min="1" max="1000" step="1" /></label>
  <label>{nl ? 'Totale tijd (minuten, optioneel)' : 'Total time (minutes, optional)'}<input type="number" name="totalMinutes" value={recipe?.total_minutes ?? ''} min="1" max="10080" step="1" /></label>
  <label>{nl ? 'Portie (g, optioneel)' : 'Serving (g, optional)'}<input type="number" name="servingGrams" value={recipe?.serving_grams ?? ''} min="1" max="100000" step="1" /></label>
  <label>{nl ? 'Kcal per portie (optioneel)' : 'Kcal per serving (optional)'}<input type="number" name="caloriesKcal" value={recipe?.calories_kcal ?? ''} min="0" max="100000" step="1" /></label>
  <label class="full">{nl ? 'YouTube-tutorial (optioneel)' : 'YouTube tutorial (optional)'}<input type="url" name="youtubeUrl" value={recipe?.youtube_video_id ? `https://www.youtube.com/watch?v=${recipe.youtube_video_id}` : ''} placeholder="https://www.youtube.com/watch?v=…" maxlength="500" /></label>
  {#if !recipe}<p class="small full">{nl ? 'Na het opslaan kun je optioneel één foto toevoegen.' : 'After saving, you can add one optional photo.'}</p>{/if}
  <p class="small full">{nl ? 'Opslaan publiceert direct.' : 'Saving publishes immediately.'}</p>
  <button class="button" disabled={pending}>{pending ? (nl ? 'Opslaan…' : 'Saving…') : (nl ? 'Opslaan en publiceren' : 'Save and publish')}</button>
</form>

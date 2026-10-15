<script lang="ts">
  import { allergens, parseDietary } from '$lib/dietary';
  let { nl, notes = null, invalid = false, error = '', expanded = false, onCollapse, includeExtra = false, compact = false }: {
    nl: boolean; notes?: string | null; invalid?: boolean; error?: string; expanded?: boolean; onCollapse?: () => void; includeExtra?: boolean; compact?: boolean;
  } = $props();
  let initial = $derived(parseDietary(notes));
  let choices = $derived(allergens.filter(item => !('extra' in item) || includeExtra || initial.allergens.includes(item.id)));
</script>

<details class="full dietary-fields" class:dietary-compact={compact} open={expanded || !!notes || invalid} ontoggle={(event) => { if (!event.currentTarget.open) onCollapse?.(); }}>
  <summary>{compact ? (nl ? 'Allergieën of intoleranties' : 'Allergies or intolerances') : (nl ? 'Voedselallergieën of intoleranties (optioneel)' : 'Food allergies or intolerances (optional)')}</summary>
<fieldset aria-describedby={compact ? undefined : 'dietary-help'}>
  <legend class="sr-only">{nl ? 'Voedselallergieën of intoleranties' : 'Food allergies or intolerances'}</legend>
  {#if !compact}<p id="dietary-help" class="small">{nl
    ? 'Voor jou en iedereen die je meeneemt. Selecteer alles wat vermeden moet worden. Al het eten is vegan; kruiscontact kan toch relevant zijn.'
    : 'For you and everyone you’re bringing. Select everything that must be avoided. All food is vegan; cross-contact can still matter.'}</p>{/if}
  <input type="hidden" name="dietaryFormat" value="v1" />
  <div class="dietary-options">
    {#each choices.filter(item => !('secondary' in item)) as item}
      <label><input type="checkbox" name="allergens" value={item.id} checked={initial.allergens.includes(item.id)} />{nl ? item.nl : item.en}</label>
    {/each}
  </div>
  <details open={!!initial.other || !!initial.preparation || !!initial.legacy || invalid || initial.allergens.some(id => allergens.some(item => item.id === id && 'secondary' in item))}>
    <summary>{nl ? 'Overige allergenen (ook bij kruiscontact)' : 'Other allergens (including cross-contact)'}</summary>
    <div class="dietary-options">
      {#each allergens.filter(item => 'secondary' in item) as item}
        <label><input type="checkbox" name="allergens" value={item.id} checked={initial.allergens.includes(item.id)} />{nl ? item.nl : item.en}</label>
      {/each}
    </div>
  <label>{nl ? 'Overige ingrediënten of bereidingsdetails (optioneel)' : 'Other ingredients or preparation details (optional)'}<textarea name="dietaryPreparation" rows="2" maxlength="460" value={[initial.other, initial.preparation].filter(Boolean).join('\n')} aria-invalid={invalid} aria-describedby={invalid ? 'dietary-error dietary-text-help' : 'dietary-text-help'}></textarea></label>
  <p id="dietary-text-help" class="small">{nl ? 'Noem ingrediënten en noodzakelijke bereidingsdetails, geen namen of medische geschiedenis.' : 'List ingredients and necessary preparation details; don’t include names or medical history.'}</p>
  {#if initial.legacy}<label>{nl ? 'Eerder ingevulde informatie' : 'Previously entered information'}<textarea name="dietaryLegacy" rows="2" maxlength="2000" value={initial.legacy}></textarea></label>{/if}
  </details>
  {#if invalid}<p id="dietary-error" class="field-error" role="alert">{error}</p>{/if}
</fieldset>
</details>

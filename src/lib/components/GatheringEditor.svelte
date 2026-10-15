<script lang="ts">
  import GatheringDateTime from './GatheringDateTime.svelte';
  let {
    row,
    nl,
  }: {
    row: {
      id: string;
      version: number;
      status: string;
      starts: string;
      ends: string;
      venue: string;
      address: string;
      capacity: number;
      description: string;
      meal_allocation: number | null;
    };
    nl: boolean;
  } = $props();
</script>

{#if row.status === 'scheduled'}
  <form method="POST" action={`?event=${encodeURIComponent(row.id)}&/save`} class="form-grid">
    <input type="hidden" name="id" value={row.id} /><input
      type="hidden"
      name="version"
      value={row.version}
    />
    <GatheringDateTime name="starts" label={nl ? 'Start diner' : 'Dinner starts'} {nl} value={row.starts} />
    <GatheringDateTime name="ends" label={nl ? 'Einde diner' : 'Dinner ends'} {nl} value={row.ends} defaultTime="22:00" />
    <label
      >{nl ? 'Locatie' : 'Venue'}<input
        name="venue"
        value={row.venue}
        maxlength="160"
        required
      /></label
    ><label
      >{nl ? 'Adres' : 'Address'}<input
        name="address"
        value={row.address}
        maxlength="500"
        required
      /></label
    >
    <label
      >{nl ? 'Capaciteit' : 'Capacity'}<input
        name="capacity"
        type="number"
        value={row.capacity}
        min="1"
        max="1000"
        required
      /></label
    ><label class="full"
      >{nl ? 'Beschrijving' : 'Description'}<textarea name="description" rows="3" maxlength="4000"
        >{row.description}</textarea
      ></label
    >
    <p class="small muted full">
      {nl
        ? 'Na het vastzetten van de maaltijden kunnen datum en tijden niet meer worden gewijzigd.'
        : 'Date/time changes are locked once meals are allocated.'}
      {row.meal_allocation !== null ? `${nl ? 'Maaltijden' : 'Meals'}: ${row.meal_allocation}` : ''}
    </p>
    <button class="button">{nl ? 'Opslaan' : 'Save gathering'}</button>
  </form>
  <form
    method="POST"
    action={`?event=${encodeURIComponent(row.id)}&/cancel`}
    class="admin-inline-form"
  >
    <input type="hidden" name="id" value={row.id} /><input
      type="hidden"
      name="version"
      value={row.version}
    /><label class="consent"
      ><input type="checkbox" name="ack" required /><span
        >{nl
          ? 'Deze bijeenkomst annuleren en deelnemers informeren.'
          : 'Cancel this gathering and notify participants.'}</span
      ></label
    ><button class="button">{nl ? 'Bijeenkomst annuleren' : 'Cancel gathering'}</button>
  </form>
{:else}<p>
    {nl ? 'Geannuleerd; de geschiedenis blijft bewaard.' : 'Cancelled; history is preserved.'}
  </p>{/if}

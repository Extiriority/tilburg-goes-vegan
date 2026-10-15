<script lang="ts">
  import AdminChefExpenses from '$lib/components/AdminChefExpenses.svelte';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  let {
    person,
    eventId,
    nl,
    startsAt,
    now,
    cancelled,
    onCostPreview,
  }: {
    person: {
      id: string;
      version: number;
      status: string;
      role: string;
      walk_in: number;
      full_name: string;
      paid_at: number | null;
      paid_amount_cents: number;
      extra_guests: number;
      chef_cost_cents: number;
      chef_reimbursed_cents: number;
      chef_cost_recorded_at: number | null;
    };
    eventId: string;
    nl: boolean;
    startsAt: number;
    now: number;
    cancelled: boolean;
    onCostPreview?: (id: string, cents: number | null, saving: boolean) => void;
  } = $props();
  let pending = $state(false),
    message = $state(''),
    selected = $state(''),
    paid = $state(false),
    amount = $state(''),
    contacted = $state(false);
  let fee = $derived((person.extra_guests + (person.role === 'chef' ? 0 : 1)) * 7);
  $effect(() => {
    selected = person.status;
    paid = person.paid_at !== null;
    amount = (person.paid_amount_cents ? person.paid_amount_cents / 100 : fee).toFixed(2);
  });
  // Keep arbitrary typed cent amounts valid while spinner/keyboard steps use €7.
  let paymentStepBase = $derived(Math.max(0, Math.round(Number(amount || 0) * 100) % 700) / 100);
  const labels: Record<string, [string, string]> = {
    confirmed: ['Bevestigd', 'Confirmed'],
    waiting_list: ['Wachtlijst', 'Waiting list'],
    undecided: ['Nog niet zeker', 'Undecided'],
    no_show: ['Niet verschenen', 'No-show'],
    cancelled: ['Geannuleerd', 'Cancelled'],
  };
  const submit: SubmitFunction = () => {
    pending = true;
    message = '';
    return async ({ result, update }) => {
      try {
        await update({ reset: false });
        if (result.type === 'failure')
          message = String(result.data?.message ?? (nl ? 'Opslaan mislukt.' : 'Could not save.'));
        if (result.type === 'error')
          message = nl ? 'Opslaan mislukt. Probeer opnieuw.' : 'Could not save. Try again.';
      } finally {
        pending = false;
        selected = person.status;
        paid = person.paid_at !== null;
      }
    };
  };
</script>

<div
  class="admin-person-controls"
  class:has-chef-expenses={person.role === 'chef' || person.chef_cost_recorded_at !== null}
  aria-busy={pending}
>
  <form
    class="admin-status-form"
    method="POST"
    action={`?event=${encodeURIComponent(eventId)}&/status`}
    use:enhance={submit}
  >
    <input type="hidden" name="id" value={person.id} /><input
      type="hidden"
      name="version"
      value={person.version}
    />
    <select
      name="status"
      class="participant-status status-{person.status}"
      aria-label={`${nl ? 'Status van' : 'Status for'} ${person.full_name}`}
      bind:value={selected}
      disabled={pending || cancelled}
      onchange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {#each Object.entries(labels) as [status, label]}{#if !person.walk_in || !['waiting_list', 'undecided'].includes(status)}<option
            value={status}
            disabled={status === 'no_show' && startsAt > now}>{label[nl ? 0 : 1]}</option
          >{/if}{/each}
    </select>
    {#if person.status === 'waiting_list'}<label class="admin-contacted-check"
        ><input type="checkbox" name="contacted" bind:checked={contacted} disabled={pending} />{nl
          ? 'Gesproken'
          : 'Contacted'}<span class="sr-only">: {person.full_name}</span></label
      >{/if}
    <noscript><button>{nl ? 'Status opslaan' : 'Save status'}</button></noscript>
  </form>
  {#if person.role === 'chef' || person.chef_cost_recorded_at !== null}<AdminChefExpenses
      {person}
      {eventId}
      {nl}
      {onCostPreview}
    />{/if}
  {#if fee > 0 || person.paid_at !== null}
    <form
      method="POST"
      action={`?event=${encodeURIComponent(eventId)}&/payment`}
      use:enhance={submit}
      class="admin-payment-form"
    >
      <input type="hidden" name="id" value={person.id} /><input
        type="hidden"
        name="version"
        value={person.version}
      />
      <label class="admin-currency-field"
        ><span aria-hidden="true">€</span><span class="sr-only"
          >{nl ? 'Ontvangen bedrag in euro voor' : 'Amount received in euros for'}
          {person.full_name}</span
        ><input
          name="amount"
          type="number"
          inputmode="decimal"
          onkeydown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault();
          }}
          step="7"
          min={paymentStepBase}
          max="99999.99"
          bind:value={amount}
          disabled={pending}
          onblur={(event) => {
            if (
              paid &&
              !pending &&
              Math.round(Number(event.currentTarget.value) * 100) !== person.paid_amount_cents
            )
              event.currentTarget.form?.requestSubmit();
          }}
        /></label
      >
      <label class="admin-paid-check"
        ><span>{nl ? 'Betaald' : 'Paid'}</span><span class="sr-only">: {person.full_name}</span><input
          type="checkbox"
          name="paid"
          bind:checked={paid}
          disabled={pending}
          onchange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        </label
      >
      <noscript><button>{nl ? 'Opslaan' : 'Save payment'}</button></noscript>
    </form>
  {/if}
</div>
{#if message}<p class="form-error admin-row-message" role="alert">{message}</p>{/if}

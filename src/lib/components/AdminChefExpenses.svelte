<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  let {
    person,
    eventId,
    nl,
    onCostPreview,
  }: {
    person: {
      id: string;
      version: number;
      full_name: string;
      chef_cost_cents: number;
      chef_reimbursed_cents: number;
      chef_cost_recorded_at: number | null;
    };
    eventId: string;
    nl: boolean;
    onCostPreview?: (id: string, cents: number | null, saving: boolean) => void;
  } = $props();
  let amount = $state(''),
    reimbursed = $state(false),
    pending = $state(false),
    message = $state('');
  $effect(() => {
    amount = person.chef_cost_recorded_at === null ? '' : (person.chef_cost_cents / 100).toFixed(2);
    reimbursed =
      person.chef_cost_cents > 0 && person.chef_reimbursed_cents >= person.chef_cost_cents;
  });
  const submit: SubmitFunction = () => {
    pending = true;
    message = '';
    onCostPreview?.(person.id, Math.round(Number(amount) * 100), true);
    return async ({ update, result }) => {
      try {
        await update({ reset: false });
        if (result.type === 'failure')
          message = String(result.data?.message ?? (nl ? 'Opslaan mislukt.' : 'Could not save.'));
        if (result.type === 'error')
          message = nl ? 'Opslaan mislukt. Probeer opnieuw.' : 'Could not save. Try again.';
      } finally {
        pending = false;
        onCostPreview?.(person.id, null, false);
        amount = person.chef_cost_recorded_at === null ? '' : (person.chef_cost_cents / 100).toFixed(2);
        reimbursed =
          person.chef_cost_cents > 0 && person.chef_reimbursed_cents >= person.chef_cost_cents;
      }
    };
  };
  function saveCost(field: HTMLInputElement) {
    if (pending || field.value === '') return;
    if (!field.validity.valid) {
      field.reportValidity();
      return;
    }
    if (person.chef_cost_recorded_at === null ||
      Math.round(Number(field.value) * 100) !== person.chef_cost_cents)
      field.form?.requestSubmit();
  }
</script>

<div class="admin-chef-expenses" aria-busy={pending}>
  <form
    method="POST"
    action={`?event=${encodeURIComponent(eventId)}&/chefCost`}
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
        >{nl ? 'Werkelijke chefkosten voor' : 'Actual chef costs for'} {person.full_name}</span
      ><input
        name="amount"
        type="number"
        inputmode="decimal"
        step="0.01"
        min="0"
        max="99999.99"
        bind:value={amount}
        placeholder="0.00"
        required
        disabled={pending}
        oninput={(event) => {
          const field = event.currentTarget;
          const cents = Math.round(Number(field.value) * 100);
          onCostPreview?.(person.id, field.value !== '' && field.validity.valid &&
            (person.chef_cost_recorded_at === null || cents !== person.chef_cost_cents)
            ? cents : null, false);
        }}
        onkeydown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault();
        }}
        onblur={(event) => saveCost(event.currentTarget)}
      /></label
    >
    <noscript><button>{nl ? 'Kosten opslaan' : 'Save cost'}</button></noscript>
  </form>
  <form
    method="POST"
    action={`?event=${encodeURIComponent(eventId)}&/chefReimbursement`}
    use:enhance={submit}
  >
    <input type="hidden" name="id" value={person.id} /><input
      type="hidden"
      name="version"
      value={person.version}
    />
    <label class="admin-paid-check"
      ><span>{nl ? 'Vergoed' : 'Reimbursed'}</span><span class="sr-only">: {person.full_name}</span><input
        name="reimbursed"
        type="checkbox"
        bind:checked={reimbursed}
        disabled={pending || person.chef_cost_recorded_at === null || person.chef_cost_cents === 0}
        onchange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      </label
    >
    <noscript><button>{nl ? 'Opslaan' : 'Save reimbursement'}</button></noscript>
  </form>
  {#if message}<p class="form-error" role="alert">{message}</p>{/if}
</div>

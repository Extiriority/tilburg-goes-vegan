<script lang="ts">
  import { goto } from '$app/navigation';
  import { navigating } from '$app/state';
  import { getLocaleStore } from '$lib/locale-context';
  import AdminPersonControls from '$lib/components/AdminPersonControls.svelte';
  import GatheringEditor from '$lib/components/GatheringEditor.svelte';
  let { data, form } = $props();
  const locale = getLocaleStore();
  let creatingGathering = $state(false);
  let editingPerson = $state<string | null>(null);
  let nl = $derived($locale === 'nl');
  let costDrafts = $state<Record<string, { event: string; cents: number; saving: boolean }>>({});
  function previewCost(id: string, cents: number | null, saving: boolean) {
    if (cents === null) {
      const { [id]: removed, ...remaining } = costDrafts;
      costDrafts = remaining;
    } else {
      costDrafts = { ...costDrafts, [id]: { event: data.selected?.id ?? '', cents, saving } };
    }
  }
  let activeDrafts = $derived(data.people.filter(person => costDrafts[person.id]?.event === data.selected?.id));
  let costDelta = $derived(activeDrafts.reduce((sum, person) => sum + costDrafts[person.id].cents - person.chef_cost_cents, 0));
  let finance = $derived({ ...data.finance,
    costs: data.finance.costs + costDelta,
    outstanding: data.finance.outstanding + costDelta,
    balance: data.finance.balance - costDelta,
  });
  let date = $derived(
    new Intl.DateTimeFormat(nl ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      dateStyle: 'full',
    }),
  );
  let money = $derived(
    new Intl.NumberFormat(nl ? 'nl-NL' : 'en-GB', { style: 'currency', currency: 'EUR' }),
  );
  const labels: Record<string, [string, string]> = {
    confirmed: ['Bevestigd', 'Confirmed'],
    waiting_list: ['Wachtlijst', 'Waiting list'],
    undecided: ['Nog niet zeker', 'Undecided'],
    no_show: ['Niet verschenen', 'No-show'],
    cancelled: ['Geannuleerd', 'Cancelled'],
  };
  const roles: Record<string, [string, string]> = {
    guest: ['Gast', 'Guest'],
    chef: ['Chef', 'Chef'],
    helper_chef: ['Hulpchef', 'Helper chef'],
  };
</script>

<h2 class="admin-gathering-title">
  {nl ? 'Bijeenkomsten & deelnemers' : 'Gatherings & participants'}
</h2>
{#if form?.saved}<p class="form-success" role="status">{nl ? 'Opgeslagen.' : 'Saved.'}</p>{/if}
{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
<div class="admin-gathering-toolbar">
  <form method="GET" action="/admin/events" class="admin-filters">
    <label
      >{nl ? 'Bijeenkomst' : 'Gathering'}<select
        name="event"
        value={data.selected?.id}
        onchange={(event) =>
          goto('/admin/events?event=' + encodeURIComponent(event.currentTarget.value), {
            keepFocus: true,
            noScroll: true,
          })}
      >
        {#each data.rows as row}<option value={row.id}
            >{date.format(row.starts_at)} · {row.venue}{row.status === 'cancelled'
              ? ' · ' + labels.cancelled[nl ? 0 : 1]
              : ''}</option
          >{/each}
      </select></label
    ><noscript><button class="button">{nl ? 'Tonen' : 'Show'}</button></noscript>
  </form>
  <button
    type="button"
    class="button admin-add-gathering"
    aria-label={nl ? 'Unieke bijeenkomst toevoegen' : 'Add a unique gathering'}
    aria-expanded={creatingGathering}
    aria-controls="create-gathering"
    onclick={() => (creatingGathering = !creatingGathering)}
    ><span aria-hidden="true">＋</span><span class="admin-add-gathering-label"
      >{nl ? 'Unieke bijeenkomst toevoegen' : 'Add a unique gathering'}</span
    ></button
  >
</div>
<p class="sr-only" role="status">
  {navigating.to ? (nl ? 'Bijeenkomst laden…' : 'Loading gathering…') : ''}
</p>
<section
  id="create-gathering"
  class="card admin-new-gathering"
  hidden={!creatingGathering}
  aria-label={nl ? 'Unieke bijeenkomst toevoegen' : 'Add a unique gathering'}
>
  <form method="POST" action="?/create" class="form-grid admin-editor">
    <input type="hidden" name="id" value={data.gatheringSubmission} />
    <label
      >{nl ? 'Start diner' : 'Dinner starts'}<input
        type="datetime-local"
        name="starts"
        required
      /></label
    >
    <label
      >{nl ? 'Einde diner' : 'Dinner ends'}<input
        type="datetime-local"
        name="ends"
        required
      /></label
    >
    <label
      >{nl ? 'Locatie' : 'Venue'}<input
        name="venue"
        value={data.selected?.venue ?? ''}
        maxlength="160"
        required
      /></label
    >
    <label
      >{nl ? 'Adres' : 'Address'}<input
        name="address"
        value={data.selected?.address ?? ''}
        maxlength="500"
        required
      /></label
    >
    <label
      >{nl ? 'Capaciteit' : 'Capacity'}<input
        name="capacity"
        type="number"
        value="30"
        min="1"
        max="1000"
        required
      /></label
    >
    <label class="full"
      >{nl ? 'Beschrijving' : 'Description'}<textarea name="description" maxlength="4000" rows="3"
      ></textarea></label
    >
    <p class="small full">
      {nl
        ? 'Eenmalig. Aanmelden sluit op zaterdag om 16:00 vóór het diner.'
        : 'One-off gathering. Registration closes Saturday at 16:00 before dinner.'}
    </p>
    <button class="button">{nl ? 'Bijeenkomst toevoegen' : 'Create gathering'}</button>
  </form>
</section>
{#if data.selected}
  {@const gathering = data.selected}
  <div class="admin-gathering-workspace" aria-busy={!!navigating.to}>
    <section class="card admin-gathering-card" aria-labelledby="selected-gathering">
      <h3 id="selected-gathering">{date.format(gathering.starts_at)}</h3>
      <p>{gathering.venue} · {gathering.address}</p>
      {#if gathering.description}<p>{gathering.description}</p>{/if}
      <ul
        class="gathering-count-chips"
        aria-label={nl ? 'Deelnemers en gangbudgetten' : 'Participants and course budgets'}
      >
        <li class="gathering-count-chip count-primary">
          <strong>{gathering.confirmed}<span> / {gathering.capacity}</span></strong><span
            >{nl ? 'plaatsen bezet' : 'seats filled'}</span
          >
        </li>
        <li
          class="gathering-count-chip course-budget-chip"
          aria-label={nl
            ? `Budget: voorgerecht €${gathering.budget.starter}, hoofdgerecht €${gathering.budget.main}, nagerecht €${gathering.budget.dessert}`
            : `Budget: starter €${gathering.budget.starter}, main €${gathering.budget.main}, dessert €${gathering.budget.dessert}`}
          title={nl ? 'Voorgerecht / hoofdgerecht / nagerecht' : 'Starter / main / dessert'}
        >
          <span aria-hidden="true"
            >Budget <strong
              >€{gathering.budget.starter} / €{gathering.budget.main} / €{gathering.budget
                .dessert}</strong
            ></span
          >
        </li>
      </ul>
      <section
        class="admin-balance-panel"
        aria-label={nl ? 'Werkelijke inkomsten en kosten' : 'Actual income and costs'}
      >
        <dl>
          <div>
            <dt>{nl ? 'Ontvangen' : 'Received'}</dt>
            <dd>{money.format(finance.received / 100)}</dd>
          </div>
          <div>
            <dt>{nl ? 'Chefkosten' : 'Chef costs'}</dt>
            <dd>{money.format(finance.costs / 100)}</dd>
          </div>
          <div class:admin-reimbursement-due={finance.outstanding > 0}>
            <dt>
              {finance.outstanding < 0
                ? nl
                  ? 'Te veel vergoed'
                  : 'Over-reimbursed'
                : nl
                  ? 'Nog te vergoeden'
                  : 'To reimburse'}
            </dt>
            <dd>{money.format(Math.abs(finance.outstanding) / 100)}</dd>
          </div>
          <div class="admin-final-balance" class:negative={finance.balance < 0}>
            <dt>{nl ? 'Saldo na kosten' : 'Balance after costs'}</dt>
            <dd>{money.format(finance.balance / 100)}</dd>
          </div>
        </dl>
        {#if activeDrafts.length}<p class="small" role="status">{activeDrafts.some(person => costDrafts[person.id].saving)
          ? nl ? 'Opslaan…' : 'Saving…'
          : nl ? 'Voorbeeld — verlaat het kostenveld om op te slaan.' : 'Preview — leave the cost field to save.'}</p>{/if}

        {#if data.finance.missing}<p class="small form-notice">
            {nl
              ? `Voorlopig: bij ${data.finance.missing} chef(s) ontbreken de werkelijke kosten.`
              : `Provisional: actual costs are missing for ${data.finance.missing} chef(s).`}
          </p>{/if}
      </section>
      {#if gathering.status === 'cancelled'}<p class="form-error">
          {labels.cancelled[nl ? 0 : 1]}
        </p>{/if}
      <details>
        <summary>{nl ? 'Bijeenkomst bewerken' : 'Edit gathering'}</summary>
        <div class="admin-editor"><GatheringEditor row={gathering} {nl} /></div>
      </details>
    </section>
    <section class="admin-participants-panel" aria-labelledby="gathering-participants">
      <h3 id="gathering-participants">
        {nl ? 'Deelnemers' : 'Participants'} ({data.selected.confirmed})
      </h3>

      {#if gathering.status === 'scheduled' && gathering.ends_at > data.now}
        <details class="card admin-new-gathering">
          <summary>＋ {nl ? 'Persoon toevoegen' : 'Add person'}</summary>
          <form
            method="POST"
            action={`?event=${encodeURIComponent(gathering.id)}&/addPerson`}
            class="form-grid admin-editor"
          >
            <input type="hidden" name="id" value={data.submission} /><input
              type="hidden"
              name="eventId"
              value={gathering.id}
            />
            <label class="full"
              >{nl ? 'Naam' : 'Name'}<input name="fullName" maxlength="160" required /></label
            >
            <label class="full"
              >{nl ? 'Extra gasten' : 'Additional guests'}<input
                type="number"
                name="extraGuests"
                min="0"
                max="99"
                value="0"
                required
              /></label
            >
            <p class="small full">
              {nl
                ? 'Voor mensen die via WhatsApp of persoonlijk meedoen. Een naam is genoeg; deze persoon wordt als gast toegevoegd, zonder e-mail of privélink. Telt mee voor plaatsen en maaltijden. De wachtlijst houdt voorrang.'
                : 'For people joining through WhatsApp or in person. A name is enough; they are added as a guest, without email or a private link. Counts toward seats and meals. Waiting-list priority is preserved.'}
            </p>
            <label class="consent full"
              ><input type="checkbox" name="override" /><span
                >{nl
                  ? 'Extra plaats/maaltijd beschikbaar: verhoog zo nodig de limieten van deze bijeenkomst.'
                  : 'Extra seat/meal is available: raise this gathering’s limits if needed.'}</span
              ></label
            >
            <label class="full"
              >{nl ? 'Reden (verplicht bij overschrijven)' : 'Reason (required for override)'}<input
                name="reason"
                maxlength="500"
              /></label
            >
            <button class="button">{nl ? 'Persoon toevoegen' : 'Add person'}</button>
          </form>
        </details>
      {/if}
      <ul class="admin-list admin-people">
        {#each data.people as person, index (person.id)}<li
            class="card"
            class:admin-last-chef={person.role === 'chef' && data.people[index + 1]?.role !== 'chef'}
          >
            <div class="admin-person-header">
              <button
                type="button"
                class="admin-person-toggle"
                aria-expanded={editingPerson === person.id}
                aria-controls={`person-editor-${person.id}`}
                onclick={() => (editingPerson = editingPerson === person.id ? null : person.id)}
              >
                <span aria-hidden="true">{editingPerson === person.id ? '−' : '+'}</span><strong
                  >{person.full_name}{person.extra_guests
                    ? ` + ${person.extra_guests}`
                    : ''}</strong
                >{#if person.dietary_notes}<span class="admin-allergy-badge">{nl ? 'Allergie' : 'Allergy'}</span>{/if}<span class="admin-person-role"
                  >{roles[person.role]?.[nl ? 0 : 1]}{person.walk_in
                    ? ' · ' + (nl ? 'Handmatig toegevoegd' : 'Added by organizer')
                    : ''}</span
                >
              </button>
              <AdminPersonControls
                {person}
                onCostPreview={previewCost}
                eventId={gathering.id}
                {nl}
                startsAt={gathering.starts_at}
                now={data.now}
                cancelled={gathering.status === 'cancelled'}
              />
            </div>
            {#if editingPerson === person.id}<div
                class="admin-editor"
                id={`person-editor-${person.id}`}
              >
                {#if gathering.status === 'scheduled' && gathering.ends_at > data.now}<form
                    method="POST"
                    action={`?event=${encodeURIComponent(gathering.id)}&/${person.walk_in ? 'walkInSave' : 'personSave'}`}
                    class="form-grid"
                  >
                    <input type="hidden" name="id" value={person.id} /><input
                      type="hidden"
                      name="version"
                      value={person.version}
                    />
                    <label
                      >{nl ? 'Naam' : 'Name'}<input
                        name="fullName"
                        value={person.full_name}
                        maxlength="160"
                        required
                      /></label
                    >
                    {#if !person.walk_in}<input
                        name="email"
                        type="hidden"
                        value={person.email_normalized ?? ''}
                      />{/if}
                    <div class="full admin-role-guests">
                      {#if !person.walk_in}<label
                        >{nl ? 'Rol' : 'Role'}<select name="role" value={person.role}
                          >{#each Object.entries(roles) as [value, label]}<option {value}
                              >{label[nl ? 0 : 1]}</option
                            >{/each}</select
                        ></label
                      >{/if}
                    <label
                      >{nl ? 'Extra gasten' : 'Additional guests'}<input
                        type="number"
                        name="extraGuests"
                        value={person.extra_guests}
                        min="0"
                        max="99"
                        required
                      /></label
                    >
                    </div>
                    <label class="full"
                      >{nl ? 'Notities' : 'Notes'}<textarea
                        name="comments"
                        rows="2"
                        maxlength="2000">{person.comments ?? ''}</textarea
                      ></label
                    >
                    {#if person.dietary_notes}<p class="small full">
                        {nl ? 'Dieet/allergieën' : 'Diet/allergies'}: {person.dietary_notes}
                      </p>{/if}
                    {#if person.walk_in}<p class="small full">
                        {nl
                          ? 'Zet geen dieet- of allergiegegevens in deze notities.'
                          : 'Do not include dietary or allergy information in these notes.'}
                      </p>{/if}
                    <button class="button">{nl ? 'Opslaan' : 'Save'}</button>
                  </form>
                {:else}<p>
                    {person.email_normalized ?? (nl ? 'Gast zonder e-mail' : 'Name-only guest')}
                  </p>
                  {#if person.comments}<p>{person.comments}</p>{/if}{/if}
              </div>{/if}
          </li>{:else}<li class="card">
            {nl ? 'Nog geen deelnemers.' : 'No participants yet.'}
          </li>{/each}
      </ul>
      <nav class="admin-pagination" aria-label={nl ? 'Deelnemerspagina’s' : 'Participant pages'}>
        {#if data.page > 1}<a href="?event={encodeURIComponent(gathering.id)}&page={data.page - 1}"
            >← {nl ? 'Vorige' : 'Previous'}</a
          >{/if}
        {#if data.page * 200 < data.total}<a
            href="?event={encodeURIComponent(gathering.id)}&page={data.page + 1}"
            >{nl ? 'Volgende' : 'Next'} →</a
          >{/if}
      </nav>
    </section>
  </div>
{:else}<p>
    {nl ? 'Voeg een bijeenkomst toe om te beginnen.' : 'Add a gathering to get started.'}
  </p>{/if}

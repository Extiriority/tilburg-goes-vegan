<script lang="ts">
  import GatheringDateTime from '$lib/components/GatheringDateTime.svelte';
  import { goto } from '$app/navigation';
  import { navigating } from '$app/state';
  import { getLocaleStore } from '$lib/locale-context';
  import AdminPersonControls from '$lib/components/AdminPersonControls.svelte';
  import GatheringEditor from '$lib/components/GatheringEditor.svelte';
  import { allergens } from '$lib/dietary';
  import DietaryFields from '$lib/components/DietaryFields.svelte';
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  let { data, form } = $props();
  const locale = getLocaleStore();
  let creatingGathering = $state(false);
  let editingGathering = $state(false);
  let financeOpen = $state(false);
  const financeEventId = $derived(data.selected?.id);
  const financeStartsAt = $derived(data.selected?.starts_at);
  function rememberFinance(open: boolean) {
    financeOpen = open;
    try { sessionStorage.setItem(`tgv-finance:${financeEventId}`, String(open)); } catch { /* Storage is optional. */ }
  }
  $effect(() => {
    const startsAt = financeStartsAt;
    const eventId = financeEventId;
    if (!startsAt) { financeOpen = false; return; }
    const opensAt = startsAt - 60 * 60 * 1000;
    let automaticallyOpened = Date.now() >= opensAt;
    let remembered: string | null = null;
    try { remembered = sessionStorage.getItem(`tgv-finance:${eventId}`); } catch { /* Storage is optional. */ }
    financeOpen = remembered === null ? automaticallyOpened : remembered === 'true';
    const timer = setInterval(() => {
      if (!automaticallyOpened && Date.now() >= opensAt) {
        automaticallyOpened = true;
        rememberFinance(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  });
  let savedToast = $state(false);
  $effect(() => {
    if (!form?.saved) { savedToast = false; return; }
    savedToast = true;
    const timer = setTimeout(() => { savedToast = false; }, 3000);
    return () => clearTimeout(timer);
  });
  $effect(() => {
    data.selected?.id;
    editingGathering = false;
  });
  let editingPerson = $state<string | null>(null);
  let addPersonOpen = $state(false);
  let editingDietary = $state(false);
  let addingPerson = $state(false);
  let addSubmission = $state<string | null>(null);
  const addPerson: SubmitFunction = ({ formElement, cancel }) => {
    if (addingPerson) { cancel(); return; }
    addingPerson = true;
    return async ({ result, update }) => {
      try {
        await update({ reset: false });
        if (result.type === 'success') {
          const name = formElement.elements.namedItem('fullName') as HTMLInputElement;
          const guests = formElement.elements.namedItem('extraGuests') as HTMLInputElement;
          name.value = '';
          guests.value = '0';
          addSubmission = crypto.randomUUID();
          await tick();
          name.focus();
        }
      } finally { addingPerson = false; }
    };
  };
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
  let savingCost = $derived(activeDrafts.some(person => costDrafts[person.id].saving));
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
  let gatheringDate = $derived(new Intl.DateTimeFormat(nl ? 'nl-NL' : 'en-GB', {
    timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'short',
  }));
  function shortAddress(address: string) {
    return address.replace(/\b\d{4}\s?[A-Z]{2}\b\s*/gi, '').replace(/,\s*,/g, ',').trim();
  }
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
<div class="admin-save-announcement" role="status" aria-live="polite" aria-atomic="true">
  {#if savingCost}<p class="admin-save-toast admin-save-toast-pending">{nl ? 'Opslaan…' : 'Saving…'}</p>
  {:else if savedToast}{#key form}<p class="admin-save-toast">{nl ? 'Opgeslagen.' : 'Saved.'}</p>{/key}{/if}
</div>
{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
<div class="admin-gathering-toolbar">
  <form method="GET" action="/admin/events" class="admin-filters">
    <label
      ><span>{nl ? 'Bijeenkomst' : 'Gathering'}</span><select
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
    title={nl ? 'Unieke bijeenkomst toevoegen' : 'Add a unique gathering'}
    aria-expanded={creatingGathering}
    aria-controls="create-gathering"
    onclick={() => (creatingGathering = !creatingGathering)}
    ><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9M16 1v4M8 1v4M3 9h18M19 16v6M16 19h6"/></svg></button
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
    <GatheringDateTime name="starts" label={nl ? 'Start diner' : 'Dinner starts'} {nl} />
    <GatheringDateTime name="ends" label={nl ? 'Einde diner' : 'Dinner ends'} {nl} defaultTime="22:00" />
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
      <div class="admin-gathering-heading">
        <div class="admin-gathering-heading-text">
        <h3 id="selected-gathering">{gatheringDate.format(gathering.starts_at)}</h3>
        <p class="admin-gathering-venue">{gathering.venue} · {shortAddress(gathering.address)}</p>
        </div>
        <button type="button" class="admin-edit-gathering" aria-label={nl ? 'Bijeenkomst bewerken' : 'Edit gathering'} title={nl ? 'Bijeenkomst bewerken' : 'Edit gathering'} aria-expanded={editingGathering} aria-controls="edit-gathering" onclick={() => editingGathering = !editingGathering}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/></svg>
        </button>
      </div>
      {#if gathering.description}<p>{gathering.description}</p>{/if}
      <ul
        class="gathering-count-chips"
        aria-label={nl ? 'Deelnemers en gangbudgetten' : 'Participants and course budgets'}
      >
        <li class="gathering-count-chip count-primary" aria-label={nl ? `${gathering.confirmed} van ${gathering.capacity} plaatsen bezet` : `${gathering.confirmed} of ${gathering.capacity} seats filled`}>
          <strong aria-hidden="true">{gathering.confirmed}<span> / {gathering.capacity}</span></strong>
        </li>
        <li
          class="gathering-count-chip course-budget-chip"
          aria-label={nl
            ? `Budget: voorgerecht €${gathering.budget.starter}, hoofdgerecht €${gathering.budget.main}, nagerecht €${gathering.budget.dessert}`
            : `Budget: starter €${gathering.budget.starter}, main €${gathering.budget.main}, dessert €${gathering.budget.dessert}`}
          title={nl ? 'Voorgerecht / hoofdgerecht / nagerecht' : 'Starter / main / dessert'}
        >
          <span aria-hidden="true"
            ><strong
              >€{gathering.budget.starter} / €{gathering.budget.main} / €{gathering.budget
                .dessert}</strong
            ></span
          >
        </li>
        {#each allergens.filter(item => data.dietaryAllergens.includes(item.id)) as item}<li class="gathering-dietary-control"><button type="button" class="gathering-count-chip admin-allergy-badge dietary-edit-chip" aria-expanded={editingDietary} aria-controls="gathering-dietary-editor" onclick={() => editingDietary = !editingDietary}><span class="allergen-icon" style={`--allergen-icon: url('${item.icon}')`} aria-hidden="true"></span><span class="gathering-chip-text">{item.id === 'gluten' ? 'Gluten' : nl ? item.nl : item.en}</span></button></li>{/each}
        {#if data.dietaryNotes.length}<li class="gathering-dietary-control"><button type="button" class="gathering-count-chip admin-allergy-badge dietary-edit-chip" aria-expanded={editingDietary} aria-controls="gathering-dietary-editor" onclick={() => editingDietary = !editingDietary}>{nl ? 'Overige dieetdetails' : 'Other dietary details'}</button></li>{/if}
        {#if !data.dietaryAllergens.length && !data.dietaryNotes.length}<li class="gathering-dietary-control"><button
          type="button" class="gathering-count-chip dietary-edit-chip"
          title={nl ? 'Geen allergenen gemeld' : 'No allergens reported'}
          class:admin-allergy-badge={!!data.dietaryAllergens.length || !!data.dietaryNotes.length}
          aria-expanded={editingDietary} aria-controls="gathering-dietary-editor"
          onclick={() => editingDietary = !editingDietary}>
          <svg class="dietary-none-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 16c-1-6 2-9 8-9 0 6-3 9-8 9ZM8 16l7-8M5.6 5.6l12.8 12.8"/></svg>
          <span class="dietary-chip-short" aria-hidden="true">{nl ? 'Geen melding' : 'No report'}</span><span class="dietary-chip-full">{nl ? 'Geen allergenen gemeld' : 'No allergens reported'}</span>
        </button></li>{/if}
      </ul>
      {#if editingDietary}<form id="gathering-dietary-editor" class="form-grid" method="POST" action={`?event=${encodeURIComponent(gathering.id)}&/dietary`} use:enhance>
        <input type="hidden" name="eventId" value={gathering.id} /><input type="hidden" name="version" value={data.manualDietary.version} />
        <DietaryFields {nl} notes={data.manualDietary.notes} expanded includeExtra compact onCollapse={() => editingDietary = false} />
        <label class="consent full"><input type="checkbox" name="dietaryConsent" required checked={!!data.manualDietary.notes} /><span>{nl ? 'De betrokkenen hebben ingestemd dat deze informatie wordt gebruikt om dit diner te organiseren.' : 'The people concerned agreed to this information being used to organize this dinner.'}</span></label>
        <button class="button">{nl ? 'Opslaan' : 'Save'}</button>
      </form>{/if}
      {#if data.dietaryNotes.length}<details id="gathering-dietary">
        <summary>{nl ? 'Dieet- en allergie-informatie' : 'Dietary and allergy information'}</summary>
        <ul>{#each data.dietaryNotes as note}<li>{note}</li>{/each}</ul>
      </details>{/if}
      <button type="button" class="admin-finance-toggle" aria-label={nl ? 'Financieel overzicht' : 'Financial summary'} aria-expanded={financeOpen} aria-controls="gathering-finance" onclick={() => rememberFinance(!financeOpen)}>
        <span></span><svg width="32" height="16" viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={financeOpen ? 'M3 13 16 3 29 13' : 'M3 3 16 13 29 3'}/></svg><span></span>
      </button>
      <section
        id="gathering-finance"
        hidden={!financeOpen}
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
        {#if activeDrafts.length && !savingCost}<p class="small" role="status">{nl ? 'Voorbeeld — verlaat het kostenveld om op te slaan.' : 'Preview — leave the cost field to save.'}</p>{/if}

        {#if data.finance.missing}<p class="small form-notice">
            {nl
              ? `Voorlopig: bij ${data.finance.missing} chef(s) ontbreken de werkelijke kosten.`
              : `Provisional: actual costs are missing for ${data.finance.missing} chef(s).`}
          </p>{/if}
      </section>
      {#if gathering.status === 'cancelled'}<p class="form-error">
          {labels.cancelled[nl ? 0 : 1]}
        </p>{/if}
      <div id="edit-gathering" hidden={!editingGathering}>
        <div class="admin-editor"><GatheringEditor row={gathering} {nl} /></div>
      </div>
    </section>
    <div class="admin-participants-column">
      {#each [
        {status:'main', people:data.people.filter(person => person.status === 'confirmed')},
        {status:'other', people:data.people.filter(person => person.status !== 'confirmed').sort((a,b) => ['waiting_list','undecided','no_show','cancelled'].indexOf(a.status)-['waiting_list','undecided','no_show','cancelled'].indexOf(b.status))}
      ].filter(group => group.status === 'main' || group.people.length) as group (group.status)}
    <section class="card admin-participants-panel" class:admin-other-registrations={group.status === 'other'} aria-labelledby={group.status === 'main' ? 'gathering-participants' : 'other-registrations'}>
      <h3 id={group.status === 'main' ? 'gathering-participants' : 'other-registrations'}>
        {group.status === 'main' ? (nl ? 'Deelnemers' : 'Participants') : (nl ? 'Overige aanmeldingen' : 'Other registrations')}
        ({group.status === 'main' ? data.selected.confirmed : Object.entries(data.counts).reduce((sum,[status,count]) => sum + (status === 'confirmed' ? 0 : count),0)})
      </h3>

      {#if group.status === 'main' && gathering.status === 'scheduled' && gathering.ends_at > data.now}
        <details class="admin-new-gathering" bind:open={addPersonOpen}
          ontoggle={(event) => { if (event.currentTarget.open) editingPerson = null; }}>
          <summary title={nl ? 'Persoon toevoegen' : 'Add person'}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M19 8v6M16 11h6"/></svg>
            <span class="sr-only">{nl ? 'Persoon toevoegen' : 'Add person'}</span>
          </summary>
          <form
            method="POST"
            action={`?event=${encodeURIComponent(gathering.id)}&/addPerson`}
            class="form-grid admin-editor"
            use:enhance={addPerson}
            aria-busy={addingPerson}
          >
            <input type="hidden" name="id" value={addSubmission ?? data.submission} /><input
              type="hidden"
              name="eventId"
              value={gathering.id}
            />
            <div class="full admin-role-guests admin-add-name-guests">
              <label>{nl ? 'Naam' : 'Name'}<input name="fullName" maxlength="160" required /></label>
              <label>{nl ? 'Extra gasten' : 'Extra guests'}<input type="number" name="extraGuests" min="0" max="99" value="0" required /></label>
            </div>
            <div class="full admin-role-guests">
              <label>{nl ? 'Rol' : 'Role'}<select name="role">{#each Object.entries(roles) as [value,label]}<option {value}>{label[nl ? 0 : 1]}</option>{/each}</select></label>
              <label>{nl ? 'Via' : 'Source'}<select name="source"><option value="whatsapp">WhatsApp</option><option value="unannounced">{nl ? 'Onaangekondigd' : 'Unannounced'}</option></select></label>
            </div>
            <button class="button" disabled={addingPerson}>{addingPerson ? (nl ? 'Toevoegen…' : 'Adding…') : (nl ? 'Persoon toevoegen' : 'Add person')}</button>
          </form>
        </details>
      {/if}
      <ul class="admin-list admin-people">
        {#each group.people as person, index (person.id)}<li
            class="card"
            class:admin-last-chef={group.status === 'main' && person.role === 'chef' && group.people[index + 1]?.role !== 'chef'}
          >
            <div class="admin-person-header">
              <button
                type="button"
                class="admin-person-toggle"
                aria-expanded={editingPerson === person.id}
                aria-controls={`person-editor-${person.id}`}
                onclick={() => {
                  addPersonOpen = false;
                  editingPerson = editingPerson === person.id ? null : person.id;
                }}
              >
                <span aria-hidden="true">{editingPerson === person.id ? '−' : '+'}</span><strong
                  >{person.full_name}{person.extra_guests
                    ? ` + ${person.extra_guests}`
                    : ''}</strong
                ><span class="admin-person-role"
                  >{roles[person.role]?.[nl ? 0 : 1]}{person.walk_in
                    ? (person.source === 'whatsapp' ? '' : ' · ' + (person.source === 'unannounced' ? (nl ? 'Onaangekondigd' : 'Unannounced') : (nl ? 'Handmatig toegevoegd' : 'Added by organizer')))
                    : ''}</span
                >
              </button>
              <AdminPersonControls
                {person}
                onCostPreview={previewCost}
                eventId={gathering.id}
                {nl}
                attendanceOpensAt={gathering.attendanceOpensAt}
                full={gathering.confirmed >= gathering.capacity}
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
                      <label
                        >{nl ? 'Rol' : 'Role'}<select name="role" value={person.role}
                          >{#each Object.entries(roles) as [value, label]}<option {value}
                              >{label[nl ? 0 : 1]}</option
                            >{/each}</select
                        ></label
                      >
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
            {nl ? 'Nog geen bevestigde deelnemers.' : 'No confirmed participants yet.'}
          </li>{/each}
      </ul>
    </section>
      {/each}
      <nav class="admin-pagination" aria-label={nl ? 'Deelnemerspagina’s' : 'Participant pages'}>
        {#if data.page > 1}<a href="?event={encodeURIComponent(gathering.id)}&page={data.page - 1}"
            >← {nl ? 'Vorige' : 'Previous'}</a
          >{/if}
        {#if data.page * 200 < data.total}<a
            href="?event={encodeURIComponent(gathering.id)}&page={data.page + 1}"
            >{nl ? 'Volgende' : 'Next'} →</a
          >{/if}
      </nav>
    </div>
  </div>
{:else}<p>
    {nl ? 'Voeg een bijeenkomst toe om te beginnen.' : 'Add a gathering to get started.'}
  </p>{/if}

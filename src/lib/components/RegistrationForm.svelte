<script lang="ts">
  import DietaryFields from '$lib/components/DietaryFields.svelte';
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { getLocaleStore } from '$lib/locale-context';
  import { siteCopy } from '$lib/site-copy';
  import { registrationCopy } from '$lib/registration-copy';
  let {
    ready,
    submissionToken,
    gatherings,
    error,
    fields = [],
  }: {
    ready: boolean;
    submissionToken: string;
    gatherings: {
      id: string;
      startsAt: number;
      canRegister: boolean;
      registrationOpensAt: number;
      availability: string;
    }[];
    error?: string;
    fields?: string[];
  } = $props();
  const locale = getLocaleStore();
  let t = $derived(siteCopy[$locale]);
  let r = $derived(registrationCopy[$locale]);
  let pending = $state(false);
  let networkError = $state(false);
  let formElement = $state<HTMLFormElement>();
  let errorSummary = $state<HTMLParagraphElement>();
  let available = $derived(ready && gatherings.some((event) => event.canRegister));
  let formatter = $derived(
    new Intl.DateTimeFormat($locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }),
  );
  const submit: SubmitFunction = () => {
    pending = true;
    networkError = false;
    return async ({ result, update }) => {
      pending = false;
      if (result.type === 'error') {
        networkError = true;
        await tick();
        errorSummary?.focus();
        return;
      }
      await update({ reset: false });
      if (result.type === 'failure') {
        await tick();
        const invalid = formElement?.querySelector<HTMLElement>('[aria-invalid="true"]');
        (invalid ?? errorSummary)?.focus();
      }
    };
  };
</script>

<div class="card lift registration-preview">
  <h3>{t.formTitle}</h3>
  <p id="form-notice" class="form-notice">{available ? r.localNotice : r.unavailable}</p>
  {#if error || networkError}<p
      bind:this={errorSummary}
      tabindex="-1"
      class="form-error"
      role="alert"
    >
      {networkError
        ? r.errors.server
        : (r.errors[error as keyof typeof r.errors] ?? r.errors.invalid)}
    </p>{/if}
  <form
    bind:this={formElement}
    method="POST"
    action="?/register"
    use:enhance={submit}
    aria-describedby="form-notice"
    aria-busy={pending}
  >
    <fieldset disabled={!available || pending}>
      <legend class="sr-only">{t.formTitle}</legend>
      <input type="hidden" name="submissionToken" value={submissionToken} /><input
        type="hidden"
        name="language"
        value={$locale}
      />
      <div class="form-grid">
        <label class="full"
          >{t.name}<input
            name="fullName"
            type="text"
            autocomplete="name"
            maxlength="160"
            required
            aria-invalid={fields.includes('fullName')}
            aria-describedby={fields.includes('fullName') ? 'fullName-error' : undefined}
          />{#if fields.includes('fullName')}<span id="fullName-error" class="field-error"
              >{r.fields.fullName}</span
            >{/if}</label
        >
        <label class="full"
          >{t.email}<input
            name="email"
            type="email"
            autocomplete="email"
            maxlength="254"
            required
            aria-invalid={fields.includes('email')}
            aria-describedby={fields.includes('email') ? 'email-error' : undefined}
          />{#if fields.includes('email')}<span id="email-error" class="field-error"
              >{r.fields.email}</span
            >{/if}</label
        >
        <label
          >{t.role}<select name="role" required
            ><option value="guest">{t.guest} · €7</option><option value="helper_chef"
              >{t.helper} · €7</option
            ><option value="chef">{t.chef} · {t.free}</option></select
          ></label
        >
        <label
          >{t.date}<select
            name="eventId"
            required
            aria-invalid={fields.includes('eventId')}
            aria-describedby={fields.includes('eventId') ? 'eventId-error' : undefined}
            ><option value="" disabled selected>{t.date}</option
            >{#each gatherings as gathering}<option
                value={gathering.id}
                disabled={!gathering.canRegister}
                >{formatter.format(gathering.startsAt)}{#if gathering.availability === 'not_open'}
                  — {$locale === 'nl' ? 'opent' : 'opens'}
                  {formatter.format(gathering.registrationOpensAt)}{/if}</option
              >{/each}</select
          >{#if fields.includes('eventId')}<span id="eventId-error" class="field-error"
              >{r.fields.eventId}</span
            >{/if}</label
        >
        <label class="full"
          >{$locale === 'nl'
            ? 'Hoeveel extra mensen neem je mee?'
            : 'How many additional people are you bringing?'}<input
            name="extraGuests"
            type="number"
            value="0"
            min="0"
            max="99"
            required
            aria-invalid={fields.includes('extraGuests')}
            aria-describedby="extra-guests-help"
          /><span id="extra-guests-help" class="small muted"
            >{$locale === 'nl'
              ? 'Tel jezelf niet mee. Extra gasten betalen €7 per persoon. Jullie groep reserveert samen of komt samen op de wachtlijst.'
              : 'Do not include yourself. Additional guests pay €7 each. Your group reserves together or joins the waiting list together.'}</span
          ></label
        >
        <label class="consent full"
          ><input type="checkbox" name="undecided" /><span>{r.unsure}</span></label
        >
        <DietaryFields nl={$locale === 'nl'} invalid={fields.includes('dietaryNotes')} error={r.fields.dietaryNotes} />
        <label class="consent full"
          ><input
            type="checkbox"
            name="dietaryConsent"
            aria-invalid={fields.includes('dietaryConsent')}
            aria-describedby={fields.includes('dietaryConsent')
              ? 'dietaryConsent-error'
              : undefined}
          /><span
            >{t.consent}{#if fields.includes('dietaryConsent')}<span
                id="dietaryConsent-error"
                class="field-error">{r.fields.dietaryConsent}</span
              >{/if}</span
          ></label
        >
        <label class="full"
          >{t.comments} <span class="optional">({t.optional})</span><textarea
            name="comments"
            rows="2"
            maxlength="2000"
            aria-invalid={fields.includes('comments')}
            aria-describedby={fields.includes('comments') ? 'comments-error' : undefined}
          ></textarea>{#if fields.includes('comments')}<span id="comments-error" class="field-error"
              >{r.fields.comments}</span
            >{/if}</label
        >
      </div>
      <button class="button button-wide" type="submit"
        >{pending ? r.loading : available ? r.submit : t.submit}</button
      >
    </fieldset>
  </form>
  <p class="small muted retention-note">{t.privacyBrief}</p>
</div>

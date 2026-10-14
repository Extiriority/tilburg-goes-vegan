<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { getLocaleStore } from '$lib/locale-context';
  import { registrationCopy } from '$lib/registration-copy';
  import { siteCopy } from '$lib/site-copy';

  let { data, form } = $props();
  const locale = getLocaleStore();
  let t = $derived(siteCopy[$locale]);
  let r = $derived(registrationCopy[$locale]);
  let registration = $derived(data.registration);
  let copyState = $state<'idle' | 'copied' | 'failed'>('idle');
  const enhanceManagement: SubmitFunction = ({ formElement }) => async ({ update, result }) => {
    await update({ reset: false });
    await tick();
    if (result.type === 'failure') {
      const target = formElement.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?? document.getElementById('management-error');
      target?.focus();
    } else if (result.type === 'success') {
      document.getElementById('management-success')?.focus();
    }
  };

  async function copyPrivateLink() {
    try {
      await navigator.clipboard.writeText(data.managementUrl);
      copyState = 'copied';
    } catch {
      copyState = 'failed';
    }
  }
  let formatter = $derived(
    new Intl.DateTimeFormat($locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      dateStyle: 'full',
      timeStyle: 'short'
    })
  );
</script>

<svelte:head>
  <title>{r.manage} — Tilburg Goes Vegan</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
</svelte:head>

<main class="page-width management-page">
  <a class="back-link" href="/" data-sveltekit-preload-code="eager">
    ← {r.back}
  </a>

  <h1 class="section-title">{r.manage}</h1>

  {#if !registration}
    <p class="form-notice">{r.invalidLink}</p>
    <p>
      <a href={`mailto:${data.site.email}`}>{data.site.email}</a>
    </p>
  {:else}
    <div class="card management-card">
      <p class="registration-status" role="status">{r[registration.status]}</p>

      {#if registration.event_status === 'cancelled'}
        <p class="form-error">{r.eventCancelled}</p>
      {/if}

      <h2>{registration.full_name}</h2>
      <p>{formatter.format(registration.starts_at)}</p>
      <p>{registration.venue} · {registration.address}</p>
      <p>{registration.email_normalized}</p>

      <p>
        {registration.role === 'chef'
          ? t.chef
          : registration.role === 'helper_chef'
            ? t.helper
            : t.guest}
        · {registration.role === 'chef' ? t.free : '€7'}
      </p>

      <div class="private-link">
        <label for="management-link">{r.privateLink}</label>
        <div class="copy-link-row">
          <input
            id="management-link"
            type="text"
            readonly
            value={data.managementUrl}
            title={r.copyLink}
            aria-describedby="copy-link-hint copy-link-feedback"
            onclick={copyPrivateLink}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                void copyPrivateLink();
              }
            }}
          />
          <button type="button" class="copy-link-button" onclick={copyPrivateLink} aria-label={copyState === 'copied' ? r.linkCopied : r.copyLink} title={r.copyLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              {#if copyState === 'copied'}
                <path d="m5 12 4 4L19 6" />
              {:else}
                <rect x="8" y="8" width="12" height="13" rx="2" />
                <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
              {/if}
            </svg>
          </button>
        </div>
        <p id="copy-link-hint" class="small copy-feedback">{r.copyHint}</p>
        <p id="copy-link-feedback" class="small copy-feedback" role="status" aria-atomic="true">{copyState === 'copied' ? r.linkCopied : copyState === 'failed' ? r.copyFailed : ''}</p>
      </div>
      <p class="small muted">{r.privateHelp}</p>
      <p class="form-notice">{r.emailQueued}</p>

      {#if registration.role !== 'guest' && ['confirmed', 'waiting_list'].includes(registration.status) && registration.event_status === 'scheduled'}
        <p>
          {#if data.invite}
            <a href={data.invite} target="_blank" rel="noopener noreferrer">
              {r.coordination} ↗
            </a>
          {:else}
            {r.inviteMissing}
            <a href={`mailto:${data.site.email}`}>{data.site.email}</a>
          {/if}
        </p>
      {/if}

      <p class="small muted">{r.expires}: {formatter.format(registration.token_expires_at)}</p>
    </div>

    {#if form?.saved}
      <p id="management-success" tabindex="-1" class="form-success" role="status">{r.saved}</p>
    {/if}

    {#if form?.managementError}
      <p id="management-error" tabindex="-1" class="form-error" role="alert">
        {form.managementError === 'cancellationRequired'
          ? r.cancellationRequired
          : r.errors[form.managementError as keyof typeof r.errors] ?? r.errors.invalid}
      </p>
    {/if}

    {#if data.editable && registration.status !== 'cancelled'}
      {#if registration.status === 'undecided' && !data.late && registration.event_status === 'scheduled'}
        <form method="POST" action="?/confirm" use:enhance={enhanceManagement}>
          <input type="hidden" name="version" value={registration.version} />
          <button class="button" type="submit">{r.confirm}</button>
        </form>
      {/if}

      {#if registration.event_status === 'scheduled'}
        <section class="card management-card">
          <h2>{r.update}</h2>

          {#if data.late}
            <p class="form-notice">{r.lateDietary}</p>
          {/if}

          <form method="POST" action="?/details" use:enhance={enhanceManagement}>
            <input type="hidden" name="version" value={registration.version} />

            <div class="form-grid">
              <label class="full">
                {t.dietary}
                <textarea
                  name="dietaryNotes"
                  rows="3"
                  maxlength="2000"
                  value={registration.dietary_notes ?? ''}
                ></textarea>
              </label>

              <label class="consent full">
                <input
                  type="checkbox"
                  name="dietaryConsent"
                  checked={!!registration.dietary_notes}
                  aria-invalid={!!form?.consentError}
                  aria-describedby={form?.consentError ? 'management-consent-error' : undefined}
                />
                <span>{t.consent}</span>
              </label>

              {#if form?.consentError}
                <p id="management-consent-error" class="field-error full">{r.fields.dietaryConsent}</p>
              {/if}

              <label class="full">
                {t.comments}
                <textarea
                  name="comments"
                  rows="3"
                  maxlength="2000"
                  value={registration.comments ?? ''}
                ></textarea>
              </label>
            </div>

            <button class="button" type="submit">{r.update}</button>
          </form>

          <p class="small muted">{r.noRoleChange}</p>
        </section>
      {/if}

      <section class="card management-card">
        <h2>{r.cancel}</h2>

        {#if data.late}
          <p class="form-notice">{r.lateCancellation}</p>
        {/if}

        <form method="POST" action="?/cancel" use:enhance={enhanceManagement}>
          <input type="hidden" name="version" value={registration.version} />

          <label class="consent">
            <input type="checkbox" name="confirmCancellation" required />
            <span>{r.cancelCheck}</span>
          </label>

          <button class="button" type="submit">{r.cancel}</button>
        </form>
      </section>
    {/if}
  {/if}
</main>

<style>
  .copy-link-row { display: flex; align-items: stretch; gap: 8px; margin-top: 8px; }
  .copy-link-row input { flex: 1; min-width: 0; margin-top: 0; cursor: copy; }
  .copy-link-button { display: grid; place-items: center; flex: 0 0 48px; border: 1px solid var(--color-line); border-radius: 3px; background: var(--color-paper2); color: var(--color-forest); cursor: pointer; }
  .copy-link-button:hover { background: var(--color-butter); }
  .copy-link-button svg { width: 22px; height: 22px; }
  .copy-feedback { margin-top: 6px; color: var(--color-forest); }
</style>


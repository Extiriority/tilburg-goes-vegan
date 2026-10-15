<script lang="ts">
  import { getLocaleStore } from '$lib/locale-context';
  let { form } = $props();
  const locale = getLocaleStore();
  let nl = $derived($locale === 'nl');
</script>

<svelte:head
  ><title>{nl ? 'Beheer aanmelden' : 'Organizer login'} — TGV</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<main class="page-width admin-login">
  <a href="/">← Tilburg Goes Vegan</a>
  <h1>{nl ? 'Beheer aanmelden' : 'Organizer login'}</h1>
  <p>{nl ? 'Alleen voor organisatoren.' : 'For organizers only.'}</p>
  {#if form?.invalid}<p class="form-error" role="alert">
      {nl
        ? 'Aanmelden niet gelukt. Controleer je gegevens of probeer over 15 minuten opnieuw.'
        : 'Login failed. Check your details or try again in 15 minutes.'}
    </p>{/if}
  <form method="POST" class="form-grid">
    <label class="full"
      >Email<input
        name="email"
        type="email"
        autocomplete="username"
        required
        maxlength="254"
      /></label
    >
    <label class="full"
      >{nl ? 'Wachtwoord' : 'Password'}<input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        maxlength="256"
      /></label
    >
    <button class="button" type="submit">{nl ? 'Aanmelden' : 'Log in'}</button>
  </form>
</main>

<style>
  .admin-login {
    max-width: 560px;
    padding-block: 48px;
  }
  .admin-login h1 {
    font-size: 2rem;
    margin-top: 30px;
  }
  .admin-login form {
    margin-top: 24px;
  }
</style>

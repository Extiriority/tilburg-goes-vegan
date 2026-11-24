<script lang="ts">
  import { page } from '$app/state';
  import { stripLocale } from '$lib/public-paths';
  const locale = $derived(stripLocale(page.url.pathname)?.locale ?? 'nl');
  const nl = $derived(locale === 'nl');
  const missing = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{page.status === 404 ? (nl ? 'Pagina niet gevonden' : 'Page not found') : (nl ? 'Er ging iets mis' : 'Something went wrong')} | Tilburg Goes Vegan</title>
  <meta name="robots" content="noindex" />
</svelte:head>
<main class="page-width error-page">
  <a class="error-brand" href={`/${locale}/`}>Tilburg Goes Vegan<span aria-hidden="true"> 🌱</span></a>
  <div class="error-layout">
    <div class="error-copy">
      <p class="error-code">{page.status}<span>{missing ? (nl ? 'Pagina niet gevonden' : 'Page not found') : (nl ? 'Er ging iets mis' : 'Something went wrong')}</span></p>
      <h1>{missing ? (nl ? 'Deze pagina is de hort op.' : 'We’ve lost the plot.') : (nl ? 'Even in de puree.' : 'A little kitchen chaos.')}</h1>
      <p class="error-description">{missing ? (nl ? 'Zelfs de wortels weten niet waarheen. Schuif liever bij ons aan tafel.' : 'Even the carrots look confused. Let’s get you back to the table.') : (nl ? 'Er ging iets mis in onze digitale keuken. Probeer het straks nog eens.' : 'Something went wrong in our digital kitchen. Please try again in a moment.')}</p>
      <div class="error-actions">
        <a class="button" href={`/${locale}/`}>{nl ? 'Terug naar tafel' : 'Back to the table'}<span aria-hidden="true"> ↗</span></a>
        <a class="recipe-return" href={`/${locale}/recipes`}>{nl ? 'Of zoek iets lekkers' : 'Or find something tasty'}<span aria-hidden="true"> →</span></a>
      </div>
    </div>
    <figure>
      <div class="error-photo">
        <img src="/img/lost-carrots.webp" width="1000" height="667" alt={nl ? 'Een rij wortels met wiebeloogjes op het gras.' : 'A row of carrots with googly eyes lying on the grass.'} />
      </div>
      <figcaption><a href="https://unsplash.com/photos/a-group-of-carrots-in-the-grass-2wCdYVHTVN8" target="_blank" rel="noopener noreferrer">{nl ? 'Foto' : 'Photo'} · Wayne Pulford / Unsplash</a></figcaption>
    </figure>
  </div>
</main>

<style>
  .error-page { min-height: 85svh; padding-block: 28px 64px; }
  .error-brand { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-family: var(--font-display); font-size: 1.1rem; color: var(--color-forest); }
  .error-layout { display: grid; grid-template-columns: 1fr 1.1fr; align-items: center; gap: clamp(32px, 6vw, 88px); margin-top: clamp(36px, 7vw, 96px); }
  .error-code { display: flex; align-items: center; gap: 16px; margin: 0 0 20px; font-family: var(--font-display); font-size: 4rem; font-weight: 600; line-height: 1; color: var(--color-forest); }
  .error-code span { max-width: 130px; padding-left: 16px; border-left: 1px solid var(--color-line); font-family: var(--font-body); font-size: .9rem; font-weight: 400; line-height: 1.4; color: var(--color-inksoft); }
  h1 { max-width: 12ch; font-size: clamp(2.6rem, 4.5vw, 4.8rem); line-height: 1.05; letter-spacing: -.025em; }
  .error-description { max-width: 35ch; margin-top: 20px; color: var(--color-inksoft); font-size: 1.05rem; line-height: 1.65; }
  .error-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 28px; }
  .recipe-return { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; color: var(--color-forest); text-decoration: underline; text-underline-offset: 4px; }
  figure { min-width: 0; margin: 0; }
  .error-photo { overflow: hidden; border-radius: 45% 45% 20px 20px; background: var(--color-forest); }
  img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; object-position: center 65%; }
  figcaption { margin-top: 10px; text-align: right; font-size: .7rem; color: var(--color-inksoft); }
  figcaption a { display: inline-block; padding-block: 6px; }
  @media (max-width: 639px) {
    .error-page { padding-block: 16px 36px; }
    .error-layout { grid-template-columns: 1fr; gap: 28px; margin-top: 32px; }
    .error-code { font-size: 3rem; margin-bottom: 16px; }
    h1 { max-width: 15ch; }
    .error-actions { margin-top: 20px; }
    .error-photo { border-radius: 24px; }
    img { aspect-ratio: 4 / 3; }
  }
</style>

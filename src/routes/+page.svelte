<script lang="ts">
  import { messages } from '$lib/i18n';
  import { siteCopy } from '$lib/site-copy';
  import Photo from '$lib/components/Photo.svelte';
  import HeroDivider from '$lib/components/HeroDivider.svelte';
  import LocationCard from '$lib/components/LocationCard.svelte';
  import RegistrationForm from '$lib/components/RegistrationForm.svelte';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { getLocaleStore } from '$lib/locale-context';

  let { data, form } = $props();

  const localeStore = getLocaleStore();
  let locale = $derived($localeStore);
  let languagePending = $state(false);
  let languageError = $state(false);

  const switchLanguage: SubmitFunction = ({ formData, cancel }) => {
    const next = formData.get('language');

    if ((next !== 'en' && next !== 'nl') || next === locale || languagePending) {
      cancel();
      return;
    }

    const previous = locale;
    localeStore.set(next);
    languagePending = true;
    languageError = false;

    return ({ result }) => {
      languagePending = false;
      if (result.type !== 'success') {
        localeStore.set(previous);
        languageError = true;
      }
      // Only a preference changed: retain event data, scroll and loaded images.
    };
  };

  let t = $derived(siteCopy[locale]);
  let statuses = $derived(messages[locale].statuses);
  let dateFormat = $derived(
    new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  );
  let dayFormat = $derived(
    new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      day: 'numeric'
    })
  );
  let monthFormat = $derived(
    new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      month: 'long',
      year: 'numeric'
    })
  );
  function ordinalSuffix(day: number) {
    if (day % 100 >= 11 && day % 100 <= 13) return 'th';
    return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
  }
  let accessibleDateFormat = $derived(
    new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
      timeZone: 'Europe/Amsterdam',
      dateStyle: 'full'
    })
  );
  let first = $derived(data.gatherings[0]);
  const gallery = ['linzensoep', 'ramen', 'gazpacho', 'falafelbowl', 'paksoi'] as const;
</script>

<svelte:head>
  <title>Tilburg Goes Vegan — {t.headline}</title>
  <meta name="description" content={t.intro} />
  <meta property="og:title" content={`Tilburg Goes Vegan — ${t.headline}`} />
  <meta property="og:description" content={t.intro} />
  <meta property="og:image" content="/img/og-image.jpg" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content={locale === 'nl' ? 'nl_NL' : 'en_GB'} />
</svelte:head>

<!-- Skip link -->
<a class="skip-link" href="#main">{t.skip}</a>

<!-- Header -->
<header class="site-header">
  <nav class="page-width nav-row" aria-label={locale === 'nl' ? 'Hoofdnavigatie' : 'Main navigation'}>
    <a class="brand" href="/" aria-label="Tilburg Goes Vegan">
      <img src="/img/logo.jpg" alt="" width="38" height="38" />
      <span>Tilburg<br class="mobile-break" /> Goes Vegan</span>
    </a>

    <div class="nav-links">
      <a href="#evening">{t.evening}</a>
      <a href="#agenda">{t.agenda}</a>
      <a href="#recipes">{t.recipes}</a>
    </div>

    <form
      action="?/language"
      method="POST"
      use:enhance={switchLanguage}
      class="language-switch"
      aria-busy={languagePending}
      aria-label={locale === 'nl' ? 'Taal' : 'Language'}
    >
      <button name="language" value="nl" aria-label="Nederlands" aria-pressed={locale === 'nl'} disabled={languagePending} lang="nl">
        NL
      </button>
      <span aria-hidden="true">/</span>
      <button name="language" value="en" aria-label="English" aria-pressed={locale === 'en'} disabled={languagePending} lang="en">
        EN
      </button>
    </form>

    {#if languageError}
      <p class="language-error" role="alert">
        {locale === 'nl' ? 'Taalkeuze niet opgeslagen. Probeer opnieuw.' : 'Language preference could not be saved. Please try again.'}
      </p>
    {/if}

    <a class="button nav-cta" href="#join">{t.join}</a>
  </nav>
</header>

<!-- Main page -->
<main id="main">
  <!-- Hero -->
  <section class="hero" aria-labelledby="hero-title">
    <picture class="hero-image">
      <source media="(max-width: 639px)" type="image/webp" srcset="/img/hero-mobiel-600.webp 600w, /img/hero-mobiel-800.webp 800w" sizes="100vw" />
      <source type="image/webp" srcset="/img/hero-1280.webp 1280w, /img/hero-1920.webp 1920w, /img/hero-2560.webp 2560w" sizes="100vw" />
      <img src="/img/hero-1920.jpg" alt={t.heroAlt} width="1920" height="713" fetchpriority="high" />
    </picture>

    <div class="hero-shade" aria-hidden="true"></div>

    <div class="page-width hero-grid">
      <div class="hero-copy rise">
        <p class="eyebrow">TILBURG GOES VEGAN</p>
        <h1 id="hero-title">
          {t.headline}<br />
          {t.priceLead} <span class="swipe">€&thinsp;7</span>
        </h1>
        <p class="hero-intro">{t.intro}</p>

        <div class="welcome-card card">
          <div>
            <h2>{t.welcome}</h2>
            <p>{t.welcomeText}</p>
          </div>
          <div>
            <h2>{t.solo}</h2>
            <p>{t.soloText}</p>
          </div>
        </div>
      </div>

      <aside class="hero-details rise" aria-label={t.agenda}>
        <div class="card lift dinner-card">
          <div class="date-price">
            <p class="display-date">{dateFormat.format(first.startsAt)}</p>
            <span>€7</span>
          </div>
          <p class="small muted">{t.cutoff}</p>

          <dl class="schedule">
            <div>
              <dt>17:00</dt>
              <dd>{t.cook}</dd>
            </div>
            <div>
              <dt>18:00</dt>
              <dd>{t.doors}</dd>
            </div>
            <div>
              <dt>19:00</dt>
              <dd>{t.dinner}</dd>
            </div>
          </dl>

          <a class="button button-wide" href="#join">{t.join}</a>
          <p class="small card-note">{t.pending}</p>
        </div>

        <a class="venue-card card" href={first.mapsUrl} target="_blank" rel="noopener noreferrer">
          <span class="location-mark" aria-hidden="true">↗</span>
          <span>
            <strong>{first.venue}</strong>
            <span>{first.address}</span>
            <span>{locale === 'nl' ? 'Opent OpenStreetMap voor de route ↗' : 'Opens OpenStreetMap for directions ↗'}</span>
          </span>
        </a>
      </aside>
    </div>
    <HeroDivider />
  </section>

  <!-- Evening -->
  <section id="evening" class="page-width section-space" aria-labelledby="evening-title">
    <h2 id="evening-title" class="section-title">{t.eveningTitle}</h2>
    <p class="section-intro">{t.eveningIntro}</p>

    <div class="evening-grid">
      <article class="card kitchen-card">
        <Photo name="kok-snijdt" alt={t.photoAlts['kok-snijdt']} />
        <div class="card-body">
          <h3>{t.cookTitle}</h3>
          <p>{t.cookText}</p>
        </div>
      </article>

      <article class="card table-card">
        <Photo name="lange-tafel" alt={t.photoAlts['lange-tafel']} />
        <div class="card-body">
          <h3>{t.tableTitle}</h3>
          <p>{t.tableText}</p>
        </div>
      </article>

      <article class="card half-card">
        <Photo name="koks-buffet" alt={t.photoAlts['koks-buffet']} />
        <div class="card-body">
          <h3>{t.coursesTitle}</h3>
          <p>{t.coursesText}</p>
        </div>
      </article>

      <article class="card half-card">
        <Photo name="couscous-tafel" alt={t.photoAlts['couscous-tafel']} />
        <div class="card-body">
          <h3>{t.eveningEndTitle}</h3>
          <p>{t.eveningEndText}</p>
        </div>
      </article>
    </div>
  </section>

  <!-- Gallery -->
  <section class="page-width gallery-section" aria-labelledby="gallery-title">
    <div class="section-heading">
      <h2 id="gallery-title" class="section-title">{t.galleryTitle}</h2>
      <p class="muted">{t.galleryText}</p>
    </div>

    <div class="photo-grid">
      {#each gallery as photo, i}
        <figure class:gallery-lead={i === 0}>
          <Photo
            name={photo}
            alt={t.photoAlts[photo]}
            sizes={i === 0 ? '(min-width: 768px) 560px, 100vw' : '(min-width: 768px) 280px, 50vw'}
          />
        </figure>
      {/each}
    </div>
  </section>

  <!-- Agenda -->
  <section id="agenda" class="agenda-section section-space" aria-labelledby="agenda-title">
    <div class="page-width">
      <p class="eyebrow">{t.agenda}</p>
      <h2 id="agenda-title" class="section-title">{t.agendaTitle}</h2>
      <p class="section-intro">{t.agendaIntro}</p>

      <ul class="agenda-grid">
        {#each data.gatherings as gathering, i}
          <li class="date-card" class:date-future={i >= 2 || gathering.availability === 'not_open'}>
            <time datetime={new Date(gathering.startsAt).toISOString()}>
              <span class="sr-only">{accessibleDateFormat.format(gathering.startsAt)}</span>
              <span class="day" aria-hidden="true">{dayFormat.format(gathering.startsAt)}{#if locale === 'en'}<sup style="font-size: .4em; margin-left: .08em">{ordinalSuffix(Number(dayFormat.format(gathering.startsAt)))}</sup>{/if}</span>
              <span class="month" aria-hidden="true">{monthFormat.format(gathering.startsAt)}</span>
            </time>
            <p class="small">{t.dateDetail} · {gathering.venue}</p>
            <p class="date-status">{statuses[gathering.availability as keyof typeof statuses]}</p>
            {#if gathering.availability === 'not_open'}
              <p class="small muted">{locale === 'nl' ? 'Aanmelden vanaf' : 'Registration opens'} <time datetime={new Date(gathering.registrationOpensAt).toISOString()}>{accessibleDateFormat.format(gathering.registrationOpensAt)}</time> · 00:00</p>
            {/if}
            {#if i >= 2}
              <span class="future-label">{t.future}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </section>

  <!-- Volunteer roles -->
  <section class="page-width section-space" aria-labelledby="volunteer-title">
    <h2 id="volunteer-title" class="section-title">{t.volunteerTitle}</h2>
    <p class="section-intro">{t.volunteerText}</p>

    <div class="role-grid">
      {#each [{ title: t.guest, price: '€7', text: t.guestDetail }, { title: t.helper, price: '€7', text: t.helperDetail }, { title: t.chef, price: t.free, text: t.chefDetail }] as role}
        <article class="role-card">
          <div>
            <h3>{role.title}</h3>
            <span>{role.price}</span>
          </div>
          <p>{role.text}</p>
        </article>
      {/each}
    </div>
  </section>

  <!-- Recipes -->
  <section id="recipes" class="recipe-section section-space" aria-labelledby="recipes-title">
    <div class="page-width recipe-grid">
      <div>
        <p class="eyebrow">{t.recipes}</p>
        <h2 id="recipes-title" class="section-title">{t.recipeTitle}</h2>
        <p class="section-intro">{t.recipeIntro}</p>
        {#if data.hasRecipes}<a class="button" style="margin-top:24px" href="/recipes">{locale==='nl'?'Bekijk de recepten':'Browse recipes'} ↗</a>{:else}<p class="recipe-notice">{t.recipePending}</p>{/if}
      </div>
      <Photo name="ramen" alt={t.photoAlts.ramen} />
    </div>
  </section>

  <!-- Join -->
  <section id="join" class="join-section section-space" aria-labelledby="join-title">
    <div class="page-width join-grid">
      <div>
        <h2 id="join-title" class="section-title">{t.joinTitle}</h2>
        <p class="section-intro">{t.joinText}</p>
        <p class="contact-line">
          {t.emailLead} <a href={`mailto:${data.site.email}`}>{data.site.email}</a>.
        </p>

        <LocationCard venue={first.venue} address={first.address} mapsUrl={first.mapsUrl} mapsEmbedUrl={first.address===data.site.address?data.site.mapsEmbedUrl:undefined} {locale} />

        <Photo name="lange-tafel" alt={t.photoAlts['lange-tafel']} class="join-photo" />
      </div>

      <RegistrationForm
        ready={data.registrationReady}
        submissionToken={data.submissionToken}
        gatherings={data.gatherings}
        error={form?.registrationError}
        fields={form?.registrationFields}
      />
    </div>
  </section>
</main>

<!-- Footer -->
<footer class="site-footer">
  <div class="page-width footer-grid">
    <div>
      <a class="brand" href="/">
        <img src="/img/logo.jpg" alt="" width="40" height="40" />
        <span>Tilburg<br />Goes Vegan</span>
      </a>
      <p>{t.footer}</p>
    </div>

    <div>
      <h2>{t.contact}</h2>
      <a href={`mailto:${data.site.email}`}>{data.site.email}</a>
      <a href={data.site.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
      <a href={data.site.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook ↗</a>
      <a href="/privacy">{t.privacy}</a>
    </div>

    <div>
      <h2>{data.site.venue}</h2>
      <p>{data.site.address}</p>
      <a href={data.site.mapsUrl} target="_blank" rel="noopener noreferrer">{t.venue} ↗</a>
    </div>
  </div>
</footer>

<!-- Mobile action -->
<div class="mobile-action">
  <div>
    <strong>{dateFormat.format(first.startsAt)}</strong>
    <span>€7 · {t.pending}</span>
  </div>
  <a class="button" href="#join">{t.join}</a>
</div>

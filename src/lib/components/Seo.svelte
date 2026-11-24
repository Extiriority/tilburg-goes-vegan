<script lang="ts">
  import { page } from '$app/state';
  import { absoluteUrl, jsonLd, pageUrl } from '$lib/seo';
  import { publicPath, stripLocale } from '$lib/public-paths';
  import { confirmedSite } from '$lib/site';
  const path = $derived(stripLocale(page.url.pathname)?.pathname ?? page.url.pathname);
  const locale = $derived(page.data.locale);
  const nl = $derived(locale === 'nl');
  const origin = $derived(page.data.siteOrigin);
  const visible = $derived(publicPath(path) && page.status < 400);
  const recipe = $derived(page.data.recipe);
  const gathering = $derived(page.data.event);
  const gatheringTitle = $derived(gathering ? `${nl ? 'Vegan diner' : 'Vegan dinner'} · ${new Intl.DateTimeFormat(nl ? 'nl-NL' : 'en-GB', { timeZone: 'Europe/Amsterdam', dateStyle: 'long' }).format(gathering.starts_at)}` : '');
  const section = $derived(path === '/' ? 'home' : path === '/privacy' ? 'privacy' : 'recipes');
  const title = $derived(gathering ? `${gatheringTitle} | Tilburg Goes Vegan` : recipe?.title ? `${recipe.title} | Tilburg Goes Vegan` : section === 'home'
    ? (nl ? 'Samen koken en eten in Tilburg – 3 gangen voor €7 | Tilburg Goes Vegan' : 'Vegan dinner in Tilburg – 3 courses for €7 | Tilburg Goes Vegan')
    : `${section === 'privacy' ? (nl ? 'Privacyverklaring' : 'Privacy notice') : (nl ? 'Vegan recepten' : 'Vegan recipes')} | Tilburg Goes Vegan`);
  const description = $derived(gathering ? (gathering.description || `${gatheringTitle}. ${gathering.venue}, ${gathering.address}. ${nl ? 'Drie gangen voor €7.' : 'Three courses for €7.'}`) : recipe
    ? (recipe.meta_description || recipe.description?.slice(0, 320) || recipe.title)
    : page.data.seoDescriptions?.[section]?.[locale] ?? 'Tilburg Goes Vegan');
  const canonical = $derived(pageUrl(path, locale, origin));
  const photo = $derived(recipe && page.data.photos?.[0]);
  const image = $derived(absoluteUrl(photo ? `/media/${photo.id}` : nl ? '/img/og-image.jpg' : '/img/lange-tafel-1600.webp', origin));
  const schema = $derived.by(() => {
    const organization = {
      '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Tilburg Goes Vegan',
      url: origin, logo: absoluteUrl('/img/logo.jpg', origin), email: confirmedSite.email,
      sameAs: [confirmedSite.instagramUrl, confirmedSite.facebookUrl],
    };
    const graph: Record<string, unknown>[] = [organization, {
      '@type': 'WebPage', '@id': canonical, url: canonical, name: title, description,
      inLanguage: locale, publisher: { '@id': organization['@id'] },
    }];
    if (path !== '/') graph.push({
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tilburg Goes Vegan', item: pageUrl('/', locale, origin) },
        ...(recipe ? [{ '@type': 'ListItem', position: 2, name: nl ? 'Recepten' : 'Recipes', item: pageUrl('/recipes', locale, origin) }] : []),
        { '@type': 'ListItem', position: recipe ? 3 : 2, name: gathering ? gatheringTitle : recipe?.title ?? (section === 'privacy' ? 'Privacy' : nl ? 'Recepten' : 'Recipes'), item: canonical },
      ],
    });
    if (recipe) {
      const recipeSchema: Record<string, unknown> = {
        '@type': 'Recipe', name: recipe.title, description, url: canonical,
        recipeCategory: recipe.category, suitableForDiet: 'https://schema.org/VeganDiet',
        recipeIngredient: page.data.ingredients?.map((item: { quantity: string; ingredient: string }) => `${item.quantity} ${item.ingredient}`.trim()),
        recipeInstructions: page.data.steps?.map((step: { instruction: string }, index: number) => ({ '@type': 'HowToStep', text: step.instruction, url: `${canonical}#step-${index + 1}` })),
      };
      if (photo) recipeSchema.image = page.data.photos.map((item: { id: string }) => absoluteUrl(`/media/${item.id}`, origin));
      if (recipe.chef_credit) recipeSchema.author = { '@type': 'Person', name: recipe.chef_credit };
      if (recipe.servings) recipeSchema.recipeYield = String(recipe.servings);
      if (recipe.total_minutes) recipeSchema.totalTime = `PT${recipe.total_minutes}M`;
      if (recipe.calories_kcal !== null && recipe.servings) recipeSchema.nutrition = { '@type': 'NutritionInformation', calories: `${recipe.calories_kcal} kcal`, ...(recipe.serving_grams ? { servingSize: `${recipe.serving_grams} g` } : {}) };
      graph.push(recipeSchema);
    }
    if (gathering) graph.push({
      '@type': 'Event', '@id': `${canonical}#event`, url: canonical, name: gatheringTitle,
      description, startDate: new Date(gathering.starts_at).toISOString(), endDate: new Date(gathering.ends_at).toISOString(),
      eventStatus: gathering.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', maximumAttendeeCapacity: gathering.capacity,
      image: [image], organizer: { '@id': organization['@id'] },
      location: { '@type': 'Place', name: gathering.venue, address: { '@type': 'PostalAddress', streetAddress: gathering.address, addressLocality: 'Tilburg', addressCountry: 'NL' } },
      offers: { '@type': 'Offer', price: '7.00', priceCurrency: 'EUR', url: `${pageUrl('/', locale, origin)}?gathering=${encodeURIComponent(gathering.id)}#join` },
    });
    return { '@context': 'https://schema.org', '@graph': graph };
  });
</script>

<svelte:head>
  {#if visible}
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="alternate" hreflang="nl" href={pageUrl(path, 'nl', origin)} />
    <link rel="alternate" hreflang="en" href={pageUrl(path, 'en', origin)} />
    <link rel="alternate" hreflang="x-default" href={pageUrl(path, 'nl', origin)} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={recipe ? 'article' : 'website'} />
    <meta property="og:url" content={canonical} />
    <meta property="og:site_name" content="Tilburg Goes Vegan" />
    <meta property="og:locale" content={nl ? 'nl_NL' : 'en_GB'} />
    <meta property="og:locale:alternate" content={nl ? 'en_GB' : 'nl_NL'} />
    <meta property="og:image" content={image} />
    <meta property="og:image:alt" content={photo?.alt_text || 'Tilburg Goes Vegan'} />
    <meta property="og:image:width" content={String(photo?.width || (nl ? 1200 : 1600))} />
    <meta property="og:image:height" content={String(photo?.height || (nl ? 630 : 844))} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#33563a" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    {@html `<script type="application/ld+json">${jsonLd(schema)}</script>`}
  {/if}
</svelte:head>


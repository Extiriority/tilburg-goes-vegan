<script lang="ts">
  import { onMount } from 'svelte';
  let { posts, nl }: { posts: { id: string; title: string; body: string }[]; nl: boolean } = $props();
  let index = $state(0);
  let playing = $state(false);
  let hovered = $state(false);
  let focused = $state(false);
  let active = $derived(posts.length ? index % posts.length : 0);

  onMount(() => {
    playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  $effect(() => {
    const count = posts.length;
    if (!playing || hovered || focused || count < 2) return;
    const timer = setInterval(() => { index = (index + 1) % count; }, 10000);
    return () => clearInterval(timer);
  });

  function move(direction: number) {
    playing = false;
    index = (active + direction + posts.length) % posts.length;
  }
</script>

<section class="page-width section-space" id="announcements" aria-labelledby="announcements-title"
  onpointerenter={(event) => { if (event.pointerType === 'mouse') hovered = true; }}
  onpointerleave={() => { hovered = false; }}
  onfocusin={() => { focused = true; }}
  onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focused = false; }}>
  <h2 id="announcements-title" class="section-title">{nl ? 'Mededelingen' : 'Announcements'}</h2>
  <div class="announcement-list" aria-live={playing ? 'off' : 'polite'}>
    {#each posts as post, i (post.id)}
      <article class="card announcement-card" class:inactive={i !== active}>
        <h3>{post.title}</h3>
        <p>{post.body}</p>
      </article>
    {/each}
  </div>
  {#if posts.length > 1}
    <div class="announcement-controls" role="group" aria-label={nl ? 'Mededelingen bedienen' : 'Announcement controls'}>
      <button type="button" aria-label={nl ? 'Vorige mededeling' : 'Previous announcement'} onclick={() => move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
      <span class="announcement-position">{active + 1} / {posts.length}</span>
      <button type="button" aria-label={nl ? 'Volgende mededeling' : 'Next announcement'} onclick={() => move(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
      <button type="button" aria-label={playing ? (nl ? 'Mededelingen pauzeren' : 'Pause announcements') : (nl ? 'Mededelingen afspelen' : 'Play announcements')} title={playing ? (nl ? 'Pauzeren' : 'Pause') : (nl ? 'Afspelen' : 'Play')} onclick={() => playing = !playing}><svg viewBox="0 0 24 24" aria-hidden="true">{#if playing}<path d="M9 6v12M15 6v12" />{:else}<path d="m9 5 10 7-10 7Z" />{/if}</svg></button>
    </div>
  {/if}
</section>

<style>
  .announcement-list > article { grid-area: 1 / 1; }
  .inactive { visibility: hidden; }
  .announcement-controls { display: flex; justify-content: center; align-items: center; gap: 4px; margin-top: 8px; }
  .announcement-controls button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding: 10px; border: 0; border-radius: 999px; background: transparent; cursor: pointer; color: var(--color-forest); }
  .announcement-controls svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .announcement-position { font-size: .8rem; font-variant-numeric: tabular-nums; color: var(--color-inksoft); }
  .announcement-controls button:hover { background: var(--color-paper2); }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  let { posts, nl }: { posts: { id: string; title: string; body: string }[]; nl: boolean } = $props();
  let index = $state(0);
  let playing = $state(false);
  let hovered = $state(false);
  let active = $derived(posts.length ? index % posts.length : 0);

  onMount(() => {
    playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  $effect(() => {
    const count = posts.length;
    if (!playing || hovered || count < 2) return;
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
  onpointerleave={() => { hovered = false; }}>
  <h2 id="announcements-title" class="section-title">{nl ? 'Mededelingen' : 'Announcements'}</h2>
  {#if posts.length > 1}
    <div class="announcement-controls" role="group" aria-label={nl ? 'Mededelingen bedienen' : 'Announcement controls'}>
      <button type="button" onclick={() => playing = !playing}>{playing ? (nl ? 'Pauzeren' : 'Pause') : (nl ? 'Afspelen' : 'Play')}</button>
      <button type="button" aria-label={nl ? 'Vorige mededeling' : 'Previous announcement'} onclick={() => move(-1)}>←</button>
      <span>{active + 1} / {posts.length}</span>
      <button type="button" aria-label={nl ? 'Volgende mededeling' : 'Next announcement'} onclick={() => move(1)}>→</button>
    </div>
  {/if}
  <div class="announcement-list" aria-live={playing ? 'off' : 'polite'}>
    {#each posts as post, i (post.id)}
      <article class="card announcement-card" class:inactive={i !== active}>
        <h3>{post.title}</h3>
        <p>{post.body}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .announcement-list > article { grid-area: 1 / 1; }
  .inactive { visibility: hidden; }
  .announcement-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
  .announcement-controls button { min-height: 44px; min-width: 44px; padding: 4px 10px; border: 1px solid var(--color-line); border-radius: 6px; cursor: pointer; color: var(--color-forest); }
  .announcement-controls button:hover { background: var(--color-paper2); }
</style>

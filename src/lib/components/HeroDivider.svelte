<div class="botanical-edge" aria-hidden="true">
  <svg class="ground" viewBox="0 0 1440 28" preserveAspectRatio="none" focusable="false">
    <path d="M0 15 C180 28 280 3 470 14 S740 26 930 13 S1230 7 1440 16 V28 H0Z" />
  </svg>
  {#each ['first', 'middle', 'last'] as position}
    <svg class="sprout {position}" viewBox="0 0 64 72" focusable="false">
      <path class="stem" d="M32 72 V36" />
      <path d="M32 43 C12 44 3 32 3 17 C22 17 33 25 32 43Z M32 36 C31 16 43 5 61 5 C61 24 50 36 32 36Z" />
    </svg>
  {/each}
</div>

<style>
  .botanical-edge { position: absolute; inset: auto 0 -1px; height: 96px; color: var(--color-paper); pointer-events: none; }
  svg { position: absolute; display: block; fill: currentColor; }
  .ground { bottom: 0; width: 100%; height: 28px; }
  .sprout { bottom: 4px; width: 78px; height: 88px; }
  .stem { fill: none; stroke: currentColor; stroke-width: 4; stroke-linecap: round; }
  .first { left: 12%; transform: rotate(-12deg); }
  .middle { left: 49%; width: 60px; height: 68px; transform: rotate(15deg); }
  .last { right: 10%; transform: scaleX(-1) rotate(-5deg); }
  @media (max-width: 639px) {
    .first { left: 9%; width: 62px; height: 70px; }
    .middle { display: none; }
    .last { right: 8%; width: 54px; height: 61px; }
  }
</style>

<script lang="ts">let { status }: { status: string } = $props();</script>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if status === 'confirmed'}<path d="m5 12 4 4L19 6" />
  {:else if status === 'waiting_list'}<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
  {:else if status === 'undecided'}<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>
  {:else if status === 'no_show'}<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 9-5M16 15l5 5M21 15l-5 5"/>
  {:else}<path d="m6 6 12 12M18 6 6 18"/>{/if}
</svg>

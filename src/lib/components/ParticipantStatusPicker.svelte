<script lang="ts">
  import { onMount, tick } from 'svelte';
  import ParticipantStatusIcon from './ParticipantStatusIcon.svelte';
  let { value, options, label, disabled, onSelect }: {
    value: string; options: { value: string; label: string; disabled: boolean }[];
    label: string; disabled: boolean; onSelect: (value: string) => void;
  } = $props();
  const id = $props.id();
  let mounted = $state(false), open = $state(false), left = $state(0), top = $state(0);
  let trigger: HTMLButtonElement;
  let popup: HTMLDivElement;
  let current = $derived(options.find(option => option.value === value)?.label ?? value);
  onMount(() => { mounted = true; });
  function show() {
    const rect = trigger.getBoundingClientRect();
    left = Math.max(8, Math.min(rect.left, window.innerWidth - 220));
    top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 250));
    popup.togglePopover();
  }
  function close() { popup.hidePopover(); trigger.focus(); }
  function navigate(event: KeyboardEvent) {
    const buttons = [...popup.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next !== undefined) { event.preventDefault(); buttons[next]?.focus(); }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') close();
  }
</script>

<input type="hidden" name="status" {value} disabled={!mounted} />
<button bind:this={trigger} type="button" class="participant-status status-{value} admin-status-trigger"
  hidden={!mounted} {disabled} aria-label={`${label}: ${current}`} title={current}
  aria-haspopup="menu" aria-expanded={open} aria-controls={id}
  onclick={show} onkeydown={(event) => { if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); if (!open) show(); } }}>
  <ParticipantStatusIcon status={value}/><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
</button>
<div bind:this={popup} {id} popover="auto" role="menu" tabindex="-1" aria-label={label} class="admin-status-menu"
  style={`left:${left}px;top:${top}px`}
  onkeydown={navigate}
  ontoggle={async (event) => {
    open = event.newState === 'open';
    if (open) { await tick(); (popup.querySelector<HTMLButtonElement>('[aria-checked="true"]:not(:disabled)') ?? popup.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus(); }
  }}>
  {#each options as option}<button type="button" role="menuitemradio" tabindex="-1" aria-checked={value === option.value} disabled={disabled || option.disabled}
    class="status-{option.value}" onclick={() => { close(); if (value !== option.value) onSelect(option.value); }}>
    <ParticipantStatusIcon status={option.value}/><span>{option.label}</span>
  </button>{/each}
</div>
<noscript><select name="status" {value} {disabled} aria-label={label} class="participant-status status-{value}">
  {#each options as option}<option value={option.value} disabled={option.disabled}>{option.label}</option>{/each}
</select></noscript>

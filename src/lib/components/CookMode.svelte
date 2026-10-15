<script lang="ts">
  import { onMount } from 'svelte';
  let { nl }: { nl: boolean } = $props();
  let enabled = $state(false), active = $state(false), unavailable = $state(false);
  let lock: WakeLockSentinel | null = null;
  let generation = 0;
  async function acquire() {
    const attempt = ++generation;
    try {
      if (!('wakeLock' in navigator)) throw new Error('unsupported');
      const next = await navigator.wakeLock.request('screen');
      if (attempt !== generation || !enabled) { await next.release(); return; }
      lock = next; active = true; unavailable = false;
      next.addEventListener('release', () => { if (lock === next) { lock = null; active = false; } });
    } catch { if (attempt === generation) { active = false; unavailable = true; } }
  }
  function stop() { generation++; const previous = lock; lock = null; active = false; void previous?.release().catch(() => {}); }
  function toggle() { enabled = !enabled; if (enabled) void acquire(); else { stop(); unavailable = false; } }
  onMount(() => {
    const visibility = () => { if (document.visibilityState === 'visible' && enabled && !lock) void acquire(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { enabled = false; stop(); document.removeEventListener('visibilitychange', visibility); };
  });
</script>
<div class="cook-mode">
  <button type="button" role="switch" aria-checked={enabled} onclick={toggle}>{nl ? 'Kookmodus' : 'Cook Mode'} <span class="cook-mode-toggle" aria-hidden="true"><span></span></span></button>
  <span class="small" role="status">{unavailable ? (nl ? 'Je browser kan het scherm niet wakker houden.' : 'Your browser couldn’t keep the screen awake.') : active ? (nl ? 'Je scherm blijft wakker terwijl deze pagina zichtbaar is.' : 'Your screen stays awake while this page is visible.') : enabled ? (nl ? 'Schermvergrendeling wordt aangevraagd of is gepauzeerd.' : 'Screen wake lock is being requested or is paused.') : (nl ? 'Voorkomt dat je scherm in slaap valt.' : 'Prevents the screen from sleeping.')}</span>
</div>

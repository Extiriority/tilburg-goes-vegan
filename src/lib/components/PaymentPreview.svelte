<script lang="ts">
  let { nl }: { nl: boolean } = $props();
  let dialog: HTMLDialogElement;
  const cells = Array.from({ length: 21 * 21 }, (_, index) => ({ x: index % 21, y: Math.floor(index / 21) }))
    .filter(({ x, y }) => !((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)))
    .filter(({ x, y }) => (x * 17 + y * 31 + x * y) % 7 < 3);
  export function open() { dialog.showModal(); }
</script>

<dialog bind:this={dialog} aria-labelledby="payment-preview-title">
  <form method="dialog"><button class="close" aria-label={nl ? 'Sluiten' : 'Close'}>×</button></form>
  <h2 id="payment-preview-title">{nl ? 'Betalen via QR' : 'Pay by QR'}</h2>
  <p>{nl ? 'Voorbeeld — hiermee kun je nog niet betalen.' : 'Preview — payments are not available yet.'}</p>
  <svg viewBox="-4 -4 29 29" role="img" aria-label={nl ? 'Voorbeeld van een QR-code' : 'Dummy QR code'}>
    <rect x="-4" y="-4" width="29" height="29" fill="white" />
    <g fill="#23261c">
      {#each cells as cell}<rect x={cell.x} y={cell.y} width="1" height="1" />{/each}
      {#each [{ x: 0, y: 0 }, { x: 14, y: 0 }, { x: 0, y: 14 }] as corner}
        <rect x={corner.x} y={corner.y} width="7" height="7" />
        <rect x={corner.x + 1} y={corner.y + 1} width="5" height="5" fill="white" />
        <rect x={corner.x + 2} y={corner.y + 2} width="3" height="3" />
      {/each}
    </g>
  </svg>
  <strong class="preview-label">DEMO</strong>
</dialog>

<style>
  dialog { position: fixed; inset: 0; margin: auto; max-height: calc(100dvh - 32px); overflow-y: auto; width: min(360px, calc(100vw - 32px)); border: 1px solid var(--color-line); border-radius: 20px; padding: 24px; background: var(--color-paper); color: inherit; text-align: center; }
  dialog::backdrop { background: rgb(0 0 0 / .45); }
  form { display: flex; justify-content: flex-end; }
  .close { min-width: 44px; min-height: 44px; border: 0; background: transparent; font-size: 1.8rem; cursor: pointer; }
  h2 { margin-top: 0; }
  p { font-size: .95rem; }
  svg { display: block; width: min(100%, 260px); margin: 12px auto; border-radius: 12px; }
  .preview-label { color: var(--color-green, #33563a); }
</style>

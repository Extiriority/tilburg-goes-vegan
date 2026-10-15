<script lang="ts">
  import { onDestroy } from 'svelte';
  import { photoCrop } from '$lib/photo-crop';
  let {
    nl = false,
    onbusy,
    currentSrc,
  }: { nl?: boolean; onbusy: (busy: boolean) => void; currentSrc?: string } = $props();
  let fullInput: HTMLInputElement, thumbnails: HTMLInputElement;
  let preview = $state<HTMLCanvasElement>();
  let bitmap: ImageBitmap | null = null;
  let ready = $state(false),
    loading = $state(false),
    exporting = $state(false);
  let zoom = $state(1),
    x = $state(50),
    y = $state(50),
    message = $state('');
  let generation = 0;
  function invalidate() {
    if (fullInput) fullInput.value = '';
    if (thumbnails) thumbnails.value = '';
    onbusy(true);
  }
  async function load(file: Blob) {
    const attempt = ++generation;
    loading = true;
    ready = false;
    message = '';
    invalidate();
    bitmap?.close();
    bitmap = null;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10000000)
        throw new Error();
      const next = await createImageBitmap(file);
      if (attempt !== generation) {
        next.close();
        return;
      }
      if (next.width * next.height > 40000000) {
        next.close();
        throw new Error();
      }
      bitmap = next;
      zoom = 1;
      x = 50;
      y = 50;
      ready = true;
      message = nl
        ? 'Zoom en verschuif de foto, klik daarna op Uitsnede gebruiken.'
        : 'Zoom and position the photo, then click Use crop.';
    } catch {
      if (attempt === generation) {
        message = nl
          ? 'Gebruik één JPG/PNG/WebP-foto van minder dan 10 MB.'
          : 'Use one JPG/PNG/WebP photo under 10 MB.';
        onbusy(false);
      }
    } finally {
      if (attempt === generation) loading = false;
    }
  }
  async function loadCurrent() {
    if (!currentSrc) return;
    loading = true;
    invalidate();
    try {
      const response = await fetch(currentSrc);
      if (!response.ok) throw new Error();
      await load(await response.blob());
    } catch {
      message = nl
        ? 'Foto laden mislukt. Kies het bestand opnieuw.'
        : 'Could not load the photo. Choose the file again.';
      loading = false;
      onbusy(false);
    }
  }
  $effect(() => {
    const z = zoom,
      horizontal = x,
      vertical = y;
    if (!ready || !preview || !bitmap) return;
    invalidate();
    const crop = photoCrop(bitmap.width, bitmap.height, z, horizontal, vertical);
    preview
      .getContext('2d')!
      .drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, 640, 480);
  });
  async function apply() {
    if (!bitmap || exporting) return;
    exporting = true;
    message = '';
    invalidate();
    const attempt = generation;
    try {
      const crop = photoCrop(bitmap.width, bitmap.height, zoom, x, y);
      for (const [size, input] of [
        [1600, fullInput],
        [640, thumbnails],
      ] as const) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(Math.min(size, crop.width)));
        canvas.height = Math.max(1, Math.round((canvas.width * 3) / 4));
        canvas
          .getContext('2d')!
          .drawImage(
            bitmap,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error())), 'image/webp', 0.82),
        );
        if (attempt !== generation) return;
        if (blob.size > 2000000) throw new Error();
        const files = new DataTransfer();
        files.items.add(new File([blob], 'photo.webp', { type: 'image/webp' }));
        input.files = files.files;
      }
      message = nl
        ? 'Uitsnede klaar. Klik op Foto uploaden of vervangen om op te slaan.'
        : 'Crop ready. Click Upload or Replace photo to save.';
      onbusy(false);
    } catch {
      invalidate();
      message = nl
        ? 'Uitsnede maken mislukt. Probeer opnieuw.'
        : 'Could not prepare the crop. Try again.';
    } finally {
      exporting = false;
    }
  }
  onDestroy(() => {
    generation++;
    bitmap?.close();
  });
</script>

<label
  >{nl ? 'Foto kiezen' : 'Choose photo'}<input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    disabled={loading || exporting}
    onchange={(event) => {
      const file = event.currentTarget.files?.[0];
      if (file) void load(file);
    }}
    aria-describedby="photo-help"
  /></label
>
{#if currentSrc}<button
    type="button"
    class="button button-secondary"
    disabled={loading || exporting}
    onclick={loadCurrent}>{nl ? 'Huidige foto bijsnijden' : 'Adjust current photo'}</button
  >{/if}
<input bind:this={fullInput} type="file" name="photos" hidden aria-hidden="true" tabindex="-1" />
<input
  bind:this={thumbnails}
  type="file"
  name="thumbnails"
  hidden
  aria-hidden="true"
  tabindex="-1"
/>
{#if ready}<div class="photo-crop-editor">
    <div role="img" aria-label={nl ? 'Voorbeeld van de uitsnede' : 'Photo crop preview'}>
      <canvas bind:this={preview} width="640" height="480" aria-hidden="true"></canvas>
    </div>
    <fieldset disabled={exporting}>
      <legend class="sr-only">{nl ? 'Uitsnede aanpassen' : 'Adjust crop'}</legend>
      <label
        >Zoom <output>{Number(zoom).toFixed(1)}×</output><input
          aria-label="Zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          bind:value={zoom}
        /></label
      >
      <label
        >{nl ? 'Horizontale positie' : 'Horizontal position'}<input
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={x}
        /></label
      >
      <label
        >{nl ? 'Verticale positie' : 'Vertical position'}<input
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={y}
        /></label
      >
    </fieldset>
    <button type="button" class="button" disabled={exporting || loading} onclick={apply}
      >{exporting
        ? nl
          ? 'Uitsnede maken…'
          : 'Preparing crop…'
        : nl
          ? 'Uitsnede gebruiken'
          : 'Use crop'}</button
    >
  </div>{/if}
<p id="photo-help" class="small muted">
  {nl
    ? 'Uitsnede 4:3. Foto’s worden lokaal omgezet naar WebP. Bewaar zelf het origineel.'
    : '4:3 crop. Photos are converted to WebP on your device. Keep your original.'}
</p>
<p role="status" class="small">{message}</p>

<style>
  .photo-crop-editor {
    display: grid;
    gap: 12px;
  }
  canvas {
    display: block;
    width: 100%;
    max-width: 560px;
    height: auto;
    border-radius: 12px;
    background: var(--color-paper2);
  }
  fieldset {
    border: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  input[type='range'] {
    width: 100%;
    min-height: 36px;
    accent-color: var(--color-forest);
    cursor: pointer;
  }
</style>

<script lang="ts">
  let { nl = false, onbusy }: { nl?: boolean; onbusy: (busy: boolean) => void } = $props();
  let thumbnails: HTMLInputElement;
  let message = $state('');
  async function prepare(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    onbusy(true);
    message = '';
    try {
      if (files.length > 8) throw new Error();
      const full = new DataTransfer(),
        small = new DataTransfer();
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10000000)
          throw new Error();
        const bitmap = await createImageBitmap(file);
        try {
          if (bitmap.width * bitmap.height > 40000000) throw new Error();
          for (const [size, target] of [
            [1600, full],
            [640, small],
          ] as const) {
            const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error())),
                'image/webp',
                0.82,
              ),
            );
            target.items.add(new File([blob], 'photo.webp', { type: 'image/webp' }));
          }
        } finally {
          bitmap.close();
        }
      }
      input.files = full.files;
      thumbnails.files = small.files;
      message = nl ? 'Foto’s zijn klaar voor upload.' : 'Photos are ready to upload.';
    } catch {
      input.value = '';
      thumbnails.value = '';
      message = nl
        ? 'Gebruik maximaal 8 JPG/PNG/WebP-foto’s van elk minder dan 10 MB.'
        : 'Use up to 8 JPG/PNG/WebP photos under 10 MB each.';
    } finally {
      onbusy(false);
    }
  }
</script>

<label
  >{nl ? 'Foto’s toevoegen' : 'Add photos'}<input
    type="file"
    name="photos"
    accept="image/jpeg,image/png,image/webp"
    multiple
    onchange={prepare}
    required
    aria-describedby="photo-help"
  /></label
>
<input
  bind:this={thumbnails}
  type="file"
  name="thumbnails"
  multiple
  hidden
  aria-hidden="true"
  tabindex="-1"
/>
<p id="photo-help" class="small muted">
  {nl
    ? 'Foto’s worden vóór upload omgezet naar WebP (1600 en 640 pixels). Bewaar zelf de originelen.'
    : 'Photos are converted to WebP (1600 and 640 pixels) before upload. Keep your original files.'}
</p>
<p role="status" class="small">{message}</p>

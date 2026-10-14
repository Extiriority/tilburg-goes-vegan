<script lang="ts">
  let { name, alt, sizes = '(min-width: 1024px) 560px, 100vw', class: className = '' }: { name: string; alt: string; sizes?: string; class?: string } = $props();
</script>
<picture class={className}>
  <source type="image/webp" srcset={`/img/${name}-800.webp 800w, /img/${name}-1600.webp 1600w`} {sizes} />
  <img src={`/img/${name}.jpg`} {alt} width="1600" height="1067" loading="lazy" decoding="async" />
</picture>

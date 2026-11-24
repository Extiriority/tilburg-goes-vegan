<script lang="ts">
  let { text, ranges }: { text: string; ranges: readonly (readonly [number, number])[] } = $props();
  const parts = $derived.by(() => {
    const result: { text: string; matched: boolean }[] = [];
    let position = 0;
    for (const [start, end] of ranges) {
      if (start > position) result.push({ text: text.slice(position, start), matched: false });
      result.push({ text: text.slice(start, end + 1), matched: true });
      position = end + 1;
    }
    if (position < text.length) result.push({ text: text.slice(position), matched: false });
    return result;
  });
</script>

{#each parts as part}{#if part.matched}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}

<style>
  mark { background: #fff0b3; color: inherit; border-radius: 2px; }
</style>

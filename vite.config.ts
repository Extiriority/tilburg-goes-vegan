import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    watch: { ignored: ['**/.build-check/**', '**/.deps-old/**'] },
    warmup: {
      clientFiles: ['./src/routes/+layout.svelte', './src/routes/+page.svelte', './src/routes/privacy/+page.svelte'],
      ssrFiles: ['./src/routes/+page.server.ts', './src/routes/+page.svelte', './src/routes/privacy/+page.svelte']
    }
  }
});

import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
const stagingBuild = process.env.TGV_STAGING_BUILD === '1';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(stagingBuild ? { config: 'wrangler.staging.local.jsonc' } : undefined)
  }
};

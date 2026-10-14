# Local performance — 14 October 2026

`npm run dev` runs Vite's source transformer and the Cloudflare/D1 emulator, rather than the compiled production Worker. The adapter starts its platform proxy lazily. Initial route requests therefore include work that repeated requests do not.

Observed on this Windows workspace before route warmup:

- Existing localhost:5173 server: homepage HTTP requests 149, 81 and 63 ms; privacy requests 187 and 17 ms; navigation data request 85 ms.
- Browser return from privacy to the already-warm homepage: approximately 206 ms until its heading appeared. These are local observations, not production benchmarks.
- Fresh isolated dev server: approximately 2992 ms until Vite reported ready, first privacy HTTP response 1762 ms, first homepage response 504 ms, repeat homepage response 59 ms.

The reported five-second return delay was not reproduced in the warmed browser. Startup measurements show substantial development initialization, but do not establish the cause of every delay in the user's browser. Browser cache settings, extensions, host CPU load and first hydration remain possible contributors; do not assert those without measuring them.

Changes: warm the homepage/privacy client and SSR modules in Vite, and eagerly preload homepage code from the privacy return link. Code preloading does not cache availability data or relax registration deadlines. Existing data preloading remains on hover. Do not introduce long-lived availability caching to conceal a local startup issue.

After the change, the isolated server returned privacy in 171 ms and home in 102/44 ms; the warmed browser return measured 137 ms until the homepage heading appeared. These are warm measurements and should not be presented as eliminating all cold startup cost. All fifteen tests and Svelte/TypeScript checks pass.

For production-like local testing, use a compiled preview after stopping processes that lock generated Cloudflare output. A successful clean-copy build has already been verified; no deployment is needed to test locally. Restart the development server after changing its configuration.

References: https://vite.dev/guide/performance.html and https://svelte.dev/docs/kit/link-options.

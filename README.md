# Tilburg Goes Vegan

SvelteKit / TypeScript / Tailwind custom components, Cloudflare Workers + D1, Drizzle, R2 and Zod. No deployment has been performed.

Read [AGENTS.md](AGENTS.md), [architecture review and delivery plan](docs/ARCHITECTURE_REVIEW.md), and all requirements in `docs/`. Original handoff remains under `Tilburg_Goes_Vegan_Codex_Handoff/`; root `docs/` is the working documentation.

## Local development

The first development request includes source transformation and Cloudflare emulator initialization. Vite warms the main routes and the privacy return link eagerly preloads homepage code; repeated local navigation should be much quicker than the first startup. Measurements and limits are recorded in [local performance notes](docs/LOCAL_PERFORMANCE.md).

Use Node 22.12 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run db:setup:local
npm run dev
npm run check
npm test
npm run build
```

The all-zero D1 identifier is a local placeholder. Migrations configure the confirmed default capacity (30), V39 at Veemarktstraat 39, 5038 CT Tilburg, and tilburg@goesvegan.nl. No participants, admin credentials or invite links are seeded. Homepage adopts the approved designer handoff, with self-hosted Fredoka/Karla and optimized supplied photos. It shows four upcoming gatherings: the first two dates in normal styling and the following two in muted gray, with localized status labels. Missing event records appear as schedule previews with registration coming soon. The NL/EN switch persists the selected language in a preference cookie and overrides browser negotiation.

`maintainUpcomingEvents` is the tested server-side generator for organizer setup and the future scheduler. It requires a configured default venue and preserves existing occurrences, cancellations and edits. Public page requests only read data; they do not create events. `npm run db:setup:local` applies local migrations, creates the four actual dates, and generates ignored local signing/enablement settings. Restart the dev server afterward. Local registration supports confirmed/waiting-list/undecided signup and private confirmation, cancellation, dietary/comment updates. No SMTP email is sent; the UI says so. Production registration remains disabled pending the remaining gates. See [registration notes](docs/REGISTRATION.md).

`npm run db:generate` generates Drizzle table migrations. Custom capacity triggers are maintained in a separate SQL migration and must remain part of every migration/restore test. Tests apply all migrations to isolated Miniflare D1 instances, without Cloudflare credentials. `npm run db:migrate:local` uses only Wrangler local storage. No remote migration or deployment scripts are provided.

The lockfile includes patched dependency overrides for cookie parsing and development tooling (esbuild, worker pool, Miniflare HTTP/image libraries). Recheck their necessity when upgrading parent packages. Current verification passes thirty-one tests, Svelte/TypeScript checking, local migrations and browser QA, including an undecided signup → confirmation → comment edit → cancellation using synthetic data. Language switching updates immediately and saves the preference without reloading the page; its native form fallback remains available. The font installation audit reported zero findings. The Cloudflare adapter build passes in a clean local copy (`.build-check/`, ignored). Building into the existing output on Windows is blocked by a lock on `.svelte-kit/cloudflare` while the development server runs; rerun the normal build when it is stopped. Windows sandbox restrictions may require approval to run the local Workers test runtime.

Future bindings: public media and private backups must be separate R2 buckets. SMTP credentials and the private coordination invitation belong in deployment secrets, never admin settings or client code. Do not configure live resources until infrastructure spikes and organizer decisions are resolved.



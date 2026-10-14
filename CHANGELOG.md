# Changelog

## 2026-10-14

- Confirmed Saturday meal allocation equals confirmed participants, including volunteers. Added one-time snapshots before post-cutoff edits/cancellations and atomic FIFO waiting-list promotions constrained by role, capacity, opening time, meal ceiling and Monday midnight.
- Added a combined local privacy/waiting-list operations runner with queued participant/volunteer promotion intents. Email delivery, Monday authenticated manual actions and production cron remain pending; nothing deployed. Local verification changed no records.
- Limited simultaneous test runtimes to two after Windows Workers startup timeouts; concurrent capacity/promotion assertions remain concurrent within their tests.
- Waiting-list validation: all 51 tests pass, including an exact cutoff-crossing cancellation retry, FIFO eligibility, meal ceilings, concurrent promotion and outbox rollback. Type checks are clean.

- Limited registration to the next two gatherings. Gray dates show opening dates and remain disabled until 00:00 Amsterdam after the dinner two occurrences earlier. Server writes recheck opening against both request/database clocks and the event timestamp; undecided confirmation also respects the window. Existing registrations are retained.

- Implemented local privacy cleanup: dietary/consent purge at scheduled dinner end +24 hours and participant/linked token, receipt and email deletion at +7×24 hours, including cancelled events. Added local-only one-shot and minute-watch commands; no production cron or deployment.
- Privacy verification: 38 tests pass, covering exact boundaries, concurrent/repeated runs, restores, outbox expiry and transactional rollback. Type checks pass; an actual local cleanup found no expired records and removed nothing.

- Improved form accessibility: associated field errors, focused invalid fields/error summaries after enhanced submissions, and focused management feedback. Added full language names with larger targets, persistent copy instructions, and scroll clearance around sticky bars; compact headers avoid overflow at 320px.
- Verified consent error focus/description with a rejected synthetic submission, keyboard-visible mobile consent, and no horizontal overflow at 320px/640px. Checked key text contrast ratios (4.79:1–7.05:1). Full assistive-technology and browser zoom acceptance remain prelaunch checks.

- Agenda dates now expose one complete localized date to screen readers; decorative day/month styling and ordinal suffixes are hidden from assistive technology to avoid fragmented or duplicate announcements.

- Added English ordinal suffixes to agenda days (st/nd/rd/th, including 11th–13th); Dutch dates retain their normal format.

- Added the organizer-approved nonprofit community initiative statement to the English and Dutch homepage introduction.

- Added the organizer-supplied Instagram and Facebook links to the footer and bilingual chef copy explaining that professional chefs offer help and tips.

- Switched the optional map and location links to OpenStreetMap. Verified V39 marker coordinates with PDOK; venue overrides use an address search instead of the default marker. Updated bilingual map notices and privacy text.

- Added a bilingual note to the hero location card explaining that it opens Google Maps for directions.

- Moved the click-to-load map to the location beside the registration form; restored the compact address link in the hero.

- Added a bilingual click-to-load Google Maps location card using the effective event address. Initial rendering uses only a local decorative placeholder; address and directions remain available without loading the embed.

- Vertically centered consent labels with their checkboxes in registration and management forms.

- Added private-link copying through both the link field and an accessible copy button, with bilingual success/failure feedback and a success checkmark.

- Simplified the hero plants to larger, generic two-leaf sprouts following visual feedback.

- Replaced the hero’s jagged divider with a soft cream curve and small botanical silhouettes; mobile uses two smaller sprouts. Decorative inline SVG adds no image requests or interactive behavior.

- Added the local registration flow: bilingual Zod forms, undecided option, atomic confirmed/waitlist allocation, signed idempotent submissions, hash-only management credentials and queued email intents. Added private status/edit/confirm/cancel pages, optimistic versions and transactional mutation receipts.
- Organizer confirmed dinner-end link expiry and coordination access for waiting-list volunteers. Added local setup for the four actual dates and an ignored signing secret. SMTP, invite configuration, promotions and retention jobs remain later gates; production registration is disabled and nothing is deployed.
- Registration verification: thirty-one automated tests and type checks pass. Browser QA with synthetic data covered undecided signup, confirmation, comment editing and cancellation. The local migration applies successfully; secrets and local participant fixtures are ignored by Git.

- Investigated slow startup/return from privacy. Warm localhost homepage responses measured 60–150 ms and browser return about 200 ms; a fresh development server took about 3 seconds to start and its first privacy response about 1.8 seconds. Added targeted Vite route warmup and eager code preload on the privacy return link. Event availability still queries D1 at navigation; no stale-data cache or business-rule changes.

- Fixed slow language switching: enhanced preference save updates the localized UI immediately without a document reload or repeat event query. Per-layout locale state keeps privacy-page navigation consistent; failures restore the previous language. Native POST/redirect remains available without JavaScript. Excluded generated validation/dependency folders from dev-server watchers.
- Language fix validation: fifteen tests pass, including new preference-action cases; type checks report zero errors/warnings; browser checks verify both switch directions, privacy-page navigation and persistence after reload.

- Adopted the designer's visual direction in the existing bilingual SvelteKit homepage, with optimized supplied photos, self-hosted Fredoka/Karla, mobile layout, language persistence and an explicitly disabled registration preview. Preserved all agreed roles, deadlines and date styling; omitted invented mockup content and extra features.
- Confirmed V39 (Veemarktstraat 39, 5038 CT Tilburg) and tilburg@goesvegan.nl; added a migration that fills unset defaults without changing existing events. Added pending-review privacy summary and design adaptation notes. No deployment.
- Design validation: twelve tests and type checks pass, migration applied locally, desktop/mobile browser QA passed, and the Cloudflare adapter build passed in a clean local copy that avoids the existing dev-server output lock.

- Organizer confirmed default capacity 30; clarified four upcoming dates with the first two normal and the later two gray. Added Amsterdam-aware recurrence/deadline calculations, idempotent generation preserving cancellations/edits, public status labels, and read-only calendar previews while venue setup is incomplete. Added default-capacity migration and schedule/integration tests. No deployment.
- Verification: 12 tests and Svelte/TypeScript checks pass; capacity migration applied locally. Client/server compilation succeeds, but final adapter packaging is blocked by a Windows lock on `.svelte-kit/cloudflare` while the local development server is running.

- Read handoff instructions and all six documentation files; copied working guidance to repository root while retaining originals.
- Added architecture risk review, missing decisions and incremental delivery gates.
- Started SvelteKit, TypeScript, Tailwind, Cloudflare adapter, Drizzle schema/migrations and isolated local D1 tests.
- Added all 20 database tables, registered custom capacity triggers, eight passing tests and CI for check/test/build/local migrations. Patched dependency advisories; installation audit reports zero vulnerabilities.
- No product behavior changes, paid services, production settings or deployment.


# Changelog

## 2026-10-15

- Added a yellow, green-text Allergy badge before participant roles when retained dietary/allergy notes are present.

- Matched Role and Additional guests control heights and bottom alignment.

- Kept participant Role and Additional guests fields in two columns on mobile.

- Restored participant role labels beside names on mobile.

- Fixed stray checkbox markup, enlarged payment/reimbursement checkboxes to 32px, and allowed mobile controls to wrap without crowding labels.

- Moved Paid/Reimbursed labels before their checkboxes, aligned at the far right with full-label touch targets.

- Removed the redundant per-chef reimbursement helper line; gathering totals and expense controls remain available.

## 2026-10-14

- Reformatted and grouped `schema.ts`; added repeatable Prettier tooling. Formatting alone generates no migration.
- Added the local shared organizer login and admin overview, paginated registration/waiting lists, role/contact/comment edits, cancellations, gathering date/venue/capacity edits, and contacted-person FIFO promotion. Confirmed Saturday cutoff and gathering-day midnight/19:00 boundaries for special dates.
- Added immediate recipe publishing, search/category public pages, ordered ingredients/steps, browser-generated WebP variants in local R2, cover/order/alt-text controls and ownership/version checks. Admin writes, audit records and notification intents commit atomically. Migration 0005 applies locally.
- Browser verification covered login/logout, synthetic recipe publication, photo conversion/upload/public rendering and mobile layout. Synthetic content was removed; existing participant/gathering data was preserved. Production admin and registration remain disabled; SMTP/reset delivery and deployment remain pending.
- Admin verification: 66 automated tests, type checks and the Cloudflare adapter build pass. The registration location card follows the next gathering’s venue; changed addresses without verified coordinates use an OpenStreetMap search link rather than an incorrect embedded marker.

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


- Combined gathering, registration and waiting-list management with next-gathering default, status-ordered colored badges and compact editors. Added one-off gatherings and organizer-only name-only guests, with explicit atomic capacity/meal overrides and preserved waiting-list priority. Added distinct No-show attendance and seven-day cleanup. Migration 0006 applies locally; synthetic browser QA data removed and existing registrations preserved.

- Refined organizer gathering management into two adjacent columns: gathering details on the left and participants on the right, stacking on mobile. Gathering selection navigates immediately; the add-unique-gathering button replaces Show beside the selector. Participant rows have zero gaps and thin dividers. Type checks and desktop/390px browser checks pass; no data changes or deployment.

- Added organizer count chips for occupied/available seats, fixed meals and per-status totals across the complete gathering. Generalized Add person wording for WhatsApp/in-person attendees using the existing name-only organizer flow. Payment-tracking workflow remains pending organizer clarification; public email requirements and all capacity/privacy rules are unchanged.

- Simplified the gathering summary to a single green occupied-seat chip and an adjacent compact starter/main/dessert budget chip. Server calculates €2/€3/€2 per confirmed person, including chefs and manual additions, without subtraction. Removed available-seat and meal-snapshot chips; preserved pricing, meal allocation and payment scope.

## 2026-10-15

- Count only confirmed people in the participant heading. Added auto-saving status dropdowns with constrained reversals, on-site paid checkbox and editable amounts, including corrections after 19:00 while identity records exist. Added additional-guest fields and atomic whole-group confirmation/wait-list behavior; capacity/meals/budgets count people and volunteer slots count lead registrants. Additive migrations 0007/0008 retain seven-day payment/group deletion. No online payment processing or deployment.
- Added cancellation-source state so status reversals cannot circumvent undecided deadlines or waiting-list contact rules. Local migrations 0007–0009 applied; 79 automated tests pass. Synthetic group/payment browser QA verified immediate updates, reversal, retained payments and mobile layout; synthetic data removed and existing participant records preserved. Nothing deployed.

- Refined mobile organizer layout: inline gathering selector/+ button, visually hidden page headings, larger right-aligned Paid checkbox and €7 amount-field steps while retaining typed cent amounts. Verified 320/390px fit and keyboard stepping; synthetic QA data removed, existing participants preserved, nothing deployed.

- Removed participant status-count chips; replaced organizer Free labels with actual chef costs and reimbursement controls. Added recorded income/cost/outstanding/final-balance summary, preserving reimbursements when costs are corrected. Migration 0010 applies locally; 81 tests and 320/390px browser checks pass. Synthetic test records removed; nothing deployed.

- Unified chef/payment amount fields with € prefixes and right alignment; removed the visible Cost label and cash-explanation paragraph. Captured desktop/mobile previews with 16 synthetic participants including 3 chefs, then removed the test gathering and participants. Type and 320/390px layout checks pass; real records preserved, nothing deployed.

- Grouped chefs first with a thicker final divider; matched expense/payment number sizes and checkbox alignment.

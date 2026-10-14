# Registration increment — 14 October 2026

## Confirmed organizer decisions

- Public signup is limited to the next two gatherings. Later dates open at local midnight following the occurrence two dinners before them. Both the UI and atomic registration/confirmation writes enforce the opening instant; clients cannot submit early by changing the form or request time. Existing records are preserved.

- Private management links expire when dinner ends (22:00 Amsterdam for generated events).
- Offer an optional undecided checkbox. Undecided reserves neither a seat nor a meal.
- Both confirmed and waiting-list chefs/helper chefs may see the private coordination invitation. Guests, undecided people, cancelled registrations and cancelled gatherings may not.

## Implemented slice

Waiting-list amendment: post-cutoff edits/cancellations now freeze the confirmed-at-cutoff meal snapshot before changing a registration. Local operations automatically promote eligible waiting-list participants through Sunday and queue notification intents; new signups/undecided confirmation cannot jump eligible waiting-list participants. See WAITING_LIST.md for the runner and remaining Monday/admin gates.

Homepage registration uses a SvelteKit action and Zod validation, localized field errors, full name/email/role, optional dietary notes and comments, and separate explicit dietary consent. Trim/lowercase email normalization matches the database constraint. Optional text is limited to 2,000 characters; name to 160 and email to 254. No group bookings, payments, participant accounts or course selection.

The single INSERT SELECT decides confirmed/undecided/waiting_list while D1 serializes the write; existing database triggers enforce total capacity, both three-person volunteer limits and any fixed meal ceiling. Event status and Saturday cutoff are checked in the write using both request time and database time. Registration, token-hash row and deduplicated participant/organizer email intents commit as one batch. Missing/cancelled/closed events cannot create orphan email intents.

A signed random submission credential gives idempotent retries. Domain-separated HMAC management credentials are unguessable and reconstructible for the later email renderer, while D1 stores only their SHA-256 hashes. The HMAC key is a server binding; do not rotate it mid-event without planning link reissuance and queued-email rendering. Existing token hashes, explicit revocation and dinner-end expiry govern access. No raw bearer tokens, dietary details or rendered email bodies are stored in operational logs/outbox payloads.

The private page shows status, event/venue, price, private-link saving instructions and the actual email-delivery limitation. It supports undecided-to-confirmed before cutoff subject to capacity, cancellation before dinner ends, and dietary/comment edits. Role changes require organizer approval and have no participant write path. Late cancellation/dietary warnings are shown; changed late dietary details queue organizer alerts. Monday confirmed cancellations before dinner time queue vacancy attention. General waitlist promotion remains the next increment.

Mutation versions reject stale requests. The new `registration_mutations` receipt table uses a CHECK on SQLite `changes()` to abort the D1 batch if a conditional update affects no row; this prevents a losing request from queuing an email for another request's successful update. Token revocation/expiry is rechecked in the UPDATE, not only when loading the record. Failed outbox writes roll back the registration or edit.

Private responses and POST responses use no-store; management responses also carry noindex/nofollow/noarchive and the site-wide no-referrer header. Invalid links render a generic page without throwing/logging a URL containing the bearer token. Do not enable URL/path logging for these endpoints in future infrastructure.

## Local setup

Run `npm run db:setup:local`, then restart `npm run dev`. The local bootstrap applies migrations, fills the next four occurrence records without replacing edits/cancellations, and creates an ignored `.dev.vars` signing key and enablement flag if absent. Existing explicit settings are preserved. It never deploys, runs remote migrations or sends mail.

Bindings:

- `MANAGEMENT_TOKEN_SECRET`: generated locally, minimum 32 characters; never commit or print it.
- `REGISTRATION_ENABLED=true`: local test opt-in. Production builds remain closed regardless of this flag until the next launch gates are implemented.
- `WHATSAPP_INVITE_URL`: organizer-supplied secret, optional during local testing. Without it, eligible volunteers see a contact-organizer message. Do not paste a real invite into source, docs or a public response.

Use synthetic `example.invalid` details for tests. SMTP is unconfigured: outbox rows are durable intent, not delivered emails. No confirmation claims email was sent.

## Remaining gates

SMTP transport/renderer, retry worker, automatic waitlist promotions, Saturday allocation policy, cron jobs, admin role approvals, abuse/rate limits, complete bilingual privacy notice and retention jobs are subsequent increments. Outbox `purge_at` uses the confirmed dinner-end + seven elapsed 24-hour days deadline. Local retention cleanup is implemented; see PRIVACY_CLEANUP.md. Production cron and external-system deletion remain pending. Cleanup must cover registration identity/dietary fields, token rows, mutation receipts where appropriate, outbox recipients, mailboxes and restores. This increment must not be exposed for real public registrations before those gates pass.

No deployment. No private coordination invitation has been invented or committed.

Verification: thirty-one tests and Svelte/TypeScript checks pass; local migrations apply; the Cloudflare adapter build passes in a clean local copy. Browser testing covered a synthetic undecided signup, confirmation, comment update and cancellation. Synthetic rows and queued emails were removed afterward. Git ignores both local signing settings and local D1 data.

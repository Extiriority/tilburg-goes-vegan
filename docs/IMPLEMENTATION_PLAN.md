# Implementation plan

Local admin increment now covers the shared login, registration/waiting lists with safe edits, gathering editing/cancellation, gathering-day manual promotions and recipe/photo publication. Production auth validation, email/password-reset delivery, R2 provisioning approval and launch operations remain separate gates. See ADMIN.md.

Local meal allocation and automatic waiting-list promotion through Sunday are implemented, with atomic notification intents and a combined privacy/waiting-list watcher. Authenticated contacted-person promotion is implemented locally; email delivery and production scheduling remain subsequent gates. See WAITING_LIST.md.

The two-gathering registration window is enforced server-side with Amsterdam midnight opening dates and visible bilingual date notices. No cron or database migration is needed for opening; the next request evaluates the current time.

Local privacy cleanup is implemented and tested, with once-only and minute-watch commands. Production Cron integration, backup restore gating and mailbox/Excel procedures remain launch gates. See PRIVACY_CLEANUP.md.

Phase 3 local slice is implemented: signup, undecided confirmation, cancellation, dietary/comment updates, hash-only private management credentials and atomic outbox intents. Production remains disabled pending SMTP, promotions, abuse protections, privacy review and retention operations. See REGISTRATION.md.

See [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) for the 14 October review, additional unresolved decisions and the concrete incremental gates. The initial scaffold covers the foundation and schema portion only; it does not complete later business workflows or production validation spikes.

Phase 0: verify Cloudflare free-tier limits, D1 transaction semantics, SMTP transport, scheduled execution and backup/export feasibility. Phase 1: scaffold SvelteKit, Tailwind, Drizzle, CI and localization. Phase 2: schema and event generation. Phase 3: registration state machine and management links. Phase 4: emails, cron and waitlist. Phase 5: admin, recipes and R2 media. Phase 6: privacy cleanup, analytics, accessibility and launch checks.
Open decisions: additional organizer recipients; approved WhatsApp invite URL; official privacy-controller contact details; SMTP configuration; detailed cancellation-event edge cases; domain and deployment credentials.
Do not fabricate these values. Use placeholders in development, document decisions in CHANGELOG and request organizer confirmation before production launch.

## Definition of done

Automated tests must cover 14-day recurrence across DST; next-four generation and cancellation exceptions; role slots and total capacity under concurrent signups; 80% public status boundary; Saturday cutoff; undecided state; waitlist ordering and Saturday meal allocation; Sunday-to-Monday promotion switch; organizer manual Monday cutoff; venue-change notifications; duplicate-email prevention; language choice; dietary consent; retention deletion; token expiration; email retries and idempotency.
Use unit tests for pure business rules, integration tests against local D1 for schema and transactions, and browser end-to-end tests for registration, admin and mobile accessibility. Include failure injection for SMTP and cron reruns.
Acceptance requires passing tests, verified backup restore, secrets configured, bilingual privacy notice reviewed and organizer approval of final content.

Completed local admin increment: combined gathering/participant view, status ordering/colors and compact editors, one-off gatherings, name-only walk-ins with explicit atomic capacity/meal overrides, and distinct No-show attendance. Additive migration 0006 preserves existing signup checks/data. Validation covers concurrent guests, rollback, stale edits, waiting-list priority, one-off date handling and seven-day deletion. Production gates and the no-deploy instruction remain in effect.

15 October increment: confirmed-person heading, instant status dropdowns with constrained reversals, local on-site payment checkbox/amount, and all-or-nothing group registrations. Verify concurrent grouped capacity, fixed meal ceilings, unchanged volunteer slot limits, stale writes, restoration rejection, payment correction after 19:00 and seven-day deletion before local migration. No deployment.

Local actual-cost increment: remove per-status count chips, add chef actual-cost/reimbursement controls and an actual-money balance. Migration 0010 is applied locally. Verified stale writes, cost correction without rewriting reimbursement, missing/zero costs, cancelled-record inclusion and seven-day deletion; 81 tests pass. No deployment.

# Implementation plan

Phase 0: verify Cloudflare free-tier limits, D1 transaction semantics, SMTP transport, scheduled execution and backup/export feasibility. Phase 1: scaffold SvelteKit, Tailwind, Drizzle, CI and localization. Phase 2: schema and event generation. Phase 3: registration state machine and management links. Phase 4: emails, cron and waitlist. Phase 5: admin, recipes and R2 media. Phase 6: privacy cleanup, analytics, accessibility and launch checks.
Open decisions: actual default venue/address; event capacity; organizer mailbox and recipient list; approved WhatsApp invite URL; logo and image assets; official privacy-controller contact details; SMTP configuration; exact meal-allocation algorithm and Monday vacancy handling; detailed cancellation-event edge cases; domain and deployment credentials.
Do not fabricate these values. Use placeholders in development, document decisions in CHANGELOG and request organizer confirmation before production launch.

## Definition of done

Automated tests must cover 14-day recurrence across DST; next-four generation and cancellation exceptions; role slots and total capacity under concurrent signups; 80% public status boundary; Saturday cutoff; undecided state; waitlist ordering and Saturday meal allocation; Sunday-to-Monday promotion switch; organizer manual Monday cutoff; venue-change notifications; duplicate-email prevention; language choice; dietary consent; retention deletion; token expiration; email retries and idempotency.
Use unit tests for pure business rules, integration tests against local D1 for schema and transactions, and browser end-to-end tests for registration, admin and mobile accessibility. Include failure injection for SMTP and cron reruns.
Acceptance requires passing tests, verified backup restore, secrets configured, bilingual privacy notice reviewed and organizer approval of final content.

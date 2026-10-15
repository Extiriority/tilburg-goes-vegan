# Local reminder queue

The local operations runner queues Saturday 10:00 Europe/Amsterdam reminders for undecided website registrations, and Sunday 18:00 reminders for confirmed registrations. Saturday uses the gathering's agreed Saturday 16:00 cutoff; Sunday is the latest Sunday before its dinner date, including special dates. DST conversion uses the reminder date's offset.

Run `npm run operations:run:local` once, or `npm run operations:watch:local` for minute checks. No messages are sent. SMTP, bilingual message rendering and production scheduling remain pending. A queued intent is not proof of delivery.

Late runs catch up only before Saturday cutoff for undecided people and before dinner starts for confirmed people. Cancelled gatherings, cancelled/waiting-list registrations, anonymized records and organizer-added people without email are excluded. Conditional writes recheck gathering dates, status and database time. A unique key per registration/reminder type prevents duplicate intents across repeated or concurrent runs; edits do not reset that key.

Outbox records contain recipient, template, locale and registration/event references, never dietary text, rendered bodies or raw private links. Existing scheduled-end +7-day cleanup deletes them. Any future sender must recheck current status and expiry before delivery; existing stale queued reminders must not be sent after cancellation or expiry.

Verification covers exact deadlines, both DST changes, concurrent deduplication, late-run exclusions, database-clock guards, failed-write recovery and identity cleanup. No database schema change or deployment is required for reminders.

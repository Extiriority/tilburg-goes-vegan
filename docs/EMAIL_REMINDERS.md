# Local reminder queue

The local operations runner queues Saturday 10:00 Europe/Amsterdam reminders for undecided website registrations, and Sunday 18:00 reminders for confirmed registrations. Saturday uses the gathering's agreed Saturday 16:00 cutoff; Sunday is the latest Sunday before its dinner date, including special dates. DST conversion uses the reminder date's offset.

Run `npm run operations:run:local` once, or `npm run operations:watch:local` for minute checks. No messages are sent. SMTP, bilingual message rendering and production scheduling remain pending. A queued intent is not proof of delivery.

Late runs catch up only before Saturday cutoff for undecided people and before dinner starts for confirmed people. Cancelled gatherings, cancelled/waiting-list registrations, anonymized records and organizer-added people without email are excluded. Conditional writes recheck gathering dates, status and database time. A unique key per registration/reminder type prevents duplicate intents across repeated or concurrent runs; edits do not reset that key.

Outbox records contain recipient, template, locale and registration/event references, never dietary text, rendered bodies or raw private links. Existing scheduled-end +7-day cleanup deletes them. Any future sender must recheck current status and expiry before delivery; existing stale queued reminders must not be sent after cancellation or expiry.

Verification covers exact deadlines, both DST changes, concurrent deduplication, late-run exclusions, database-clock guards, failed-write recovery and identity cleanup. No database schema change or deployment is required for reminders.
## Local Mailgun sandbox check

To test the persisted local queue, submit a confirmed guest registration through the local site using dummy details and your verified inbox, then run `./scripts/test-mailgun-local.ps1 -Queue` from the repo root. Use that same inbox when prompted. Each run claims at most one due confirmation for that address; it skips expired or cancelled registrations and other message types. The HTML and plain-text confirmation use the registration language and include the date, venue and existing private management link. The sender verifies the link against its stored hash and does not store the rendered message or rewrite the link for tracking. Open the email on the computer running the site at localhost:5173. If the signing key changed or the link is invalid, create a fresh test registration.

SMTP acceptance is recorded as sent (check the inbox or Mailgun logs for actual delivery). Explicit temporary rejections become eligible again after one minute, then two minutes, with at most three attempts. Run the command again to process a due retry. Unclear responses are held as failed, and interrupted claims stay in sending status without automatic reclaim. Check Mailgun logs before any manual recovery. No production delivery, scheduled sender or broad queue drain is enabled.

Run `./scripts/test-mailgun-local.ps1 -Registration` to exercise a real synthetic registration in a temporary in-memory D1 database, verify its single queued confirmation, and send the dummy confirmation to your verified sandbox inbox. The recipient you enter is used only for SMTP and is never stored in D1. No private links are included. This is a local integration check, not a persistent outbox delivery worker.

From the project folder in PowerShell, run `./scripts/test-mailgun-local.ps1`. Enter the full sandbox SMTP username, one verified recipient address and the replacement password at the hidden prompt. The command submits one dummy message over STARTTLS on port 587. It saves no credentials and never reads or drains the registration outbox. A successful submission means Mailgun accepted it; check the inbox or Mailgun logs for delivery.


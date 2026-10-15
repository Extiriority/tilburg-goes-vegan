# Database design

Admin migration `0005_nifty_silver_surfer.sql` adds `admin_login_limits`, non-identifying `admin_write_receipts`, and optimistic recipe versions. Existing event/registration versions and foreign-key/capacity constraints remain in use. `schema.ts` is formatted and grouped by domain; formatting alone produced no schema changes. See ADMIN.md.

Meal allocation is confirmed as the Saturday-cutoff confirmed count. The existing `events.meal_allocation` field stores the one-time snapshot; cancellation/edit services freeze it before post-cutoff writes, and existing capacity triggers enforce the ceiling. No new migration is needed. See WAITING_LIST.md.

Retention interpretation is now confirmed: elapsed UTC +24 hours and +7×24 hours from scheduled dinner end. Cleanup uses existing tables and foreign-key cascades; no new migration is needed. Participant rows are deleted, with only non-identifying cleanup counts retained. See PRIVACY_CLEANUP.md.

Registration increment adds `registration_mutations` in `0004_living_micromax.sql`. Unique registration/version receipts and an applied-row CHECK ensure failed conditional edits roll back the entire D1 batch, including emails. Existing registrations, token rows and outbox schemas remain compatible. See REGISTRATION.md.

Executable foundation: `src/lib/server/db/schema.ts`, generated `drizzle/0000_wooden_fenris.sql`, and custom `drizzle/0001_capacity_guards.sql`. UTC epoch milliseconds are used consistently. Identity columns permit NULL only after anonymization; active email uniqueness is a partial index. Capacity triggers cover inserts, promotions, role changes and event capacity reductions, with a nullable meal ceiling until the confirmed-count snapshot is frozen at cutoff. Services must still enforce deadlines, authorized state transitions and optimistic versions, and batch changes with outbox intents. Token expiry is dinner end; retention uses elapsed time from scheduled dinner end. Referenced venue rows must be treated as immutable snapshots.

Recommended D1 tables: settings, venues, events, registrations, registration_tokens, admin_users, admin_sessions, password_reset_tokens, recipes, recipe_ingredients, recipe_steps, dishes, media_assets, dish_media, recipe_media, email_outbox, email_attempts, audit_events, scheduled_job_runs and privacy_cleanup_runs.
Core relations: event has many registrations; venue may be default or overridden by event; recipe and dish have ordered media links; outbox messages reference event/registration where appropriate; audit events reference administrative actions without duplicating sensitive dietary details.
Prefer integer timestamps (UTC milliseconds) or ISO UTC strings consistently. Store Europe/Amsterdam as event timezone. Normalize email for uniqueness; use surrogate IDs (ULID/UUID) and explicit foreign keys. Sensitive text is excluded from audit logs.

## Constraints and concurrency

Key constraints: unique event occurrence date (or recurrence key); unique active event/email registration via a normalized-email strategy that supports cancelled historical records; role slot and capacity limits enforced in a write transaction or equivalent serialized D1 write path; unique outbox idempotency key; unique cron operation per event/trigger.
D1 SQLite has specific transaction and binding limitations; validate atomic multi-statement behavior using the deployed Workers/D1 APIs. Do not assume an ordinary application-side count followed by insert is concurrency safe.
Create indexes for registrations(event_id,status,created_at), registrations(event_id,email_normalized), events(starts_at,status), email_outbox(status,next_attempt_at) and scheduled jobs due time. Treat sensitive-data retention as a schema-level design concern.

## Suggested Drizzle entities

| Table | Key fields |
|---|---|
| events | id, occurrence_key, starts_at, timezone, venue_id, capacity, meal_allocation, status |
| registrations | id, event_id, email_normalized, full_name, role, status, language, dietary_notes, comments, created_at |
| registration_tokens | id, registration_id, token_hash, revoked_at |
| email_outbox | id, idempotency_key, recipient, template, locale, status, next_attempt_at |
| recipes | id, slug, title, category, chef_credit, created_at |
| dishes | id, title, description, recipe_id, published_at |
| media_assets | id, r2_key, mime_type, width, height, alt_text |
| admin_users | id, email, password_hash |
| admin_sessions | id, admin_id, session_hash, expires_at |
| privacy_cleanup_runs | id, event_id, cutoff, result |

Schema is conceptual, not executable SQL. Codex must derive migrations and test all constraints.

## Organizer guests and attendance

Migration 0006 adds walk_in_guests (name, comments, event, confirmed/cancelled/no_show status, optimistic version, timestamps and explicit override flag/reason) and registration_no_shows (registration primary key with cascading deletion, timestamp). Public registrations retain required email/name checks. A normal registration marked absent transitions its booking to cancelled and receives a no-show marker in the same transaction.

The confirmed_participants SQL view unions confirmed normal registrations and walk-ins. All capacity, role, meal snapshot and promotion counts use this view; database insert/update triggers cover both participant tables and event limit reductions. An organizer override raises only the selected event limits in the same transaction as the walk-in insert; a failed insert rolls back the increase. The custom view/triggers are hand-written SQL in migration 0006; preserve them in later migrations. No-show markers cascade when registrations are deleted. Walk-ins and override reasons are deleted at dinner end +7 elapsed days, even for cancelled gatherings.

Migrations 0007/0008: nullable paid_at, nonnegative integer paid_amount_cents and extra_guests (0–99, default zero) on registrations/walk_in_guests. confirmed_participants now exposes seats=1+extra_guests. Capacity/meal triggers sum seats while volunteer checks count role-bearing records; update triggers include extra_guests. Group/payment validity triggers preserve integer/range checks. No-show markers remain separate, cascading with registrations. Payment/group details are deleted with identity rows and excluded after retention expires.

Migration 0009 adds previous_status to both participant tables for safe cancellation reversal. It is retained only with the participant row and is deleted at the same identity deadline; it contains an enum-like state, never names or payment details.

Migration 0010 adds chef_cost_cents and chef_reimbursed_cents (nonnegative integers, default zero), plus nullable chef_cost_recorded_at on registrations. Trigger guards enforce integer cents. A separate recorded timestamp distinguishes unknown costs from actual zero cost. Expense corrections preserve reimbursed cents. All three fields cascade away through participant deletion at the identity deadline; audits carry no amounts or participant text.

Structured dietary input uses a TGV_DIETARY_V1-prefixed JSON value within dietary_notes (canonical allergen IDs, Other, preparation and optional legacy text). Existing plain text remains readable. No new column, migration or retention path is introduced.

Migration 0011_short_whiplash adds gathering_dietary: one event-keyed notes value, optimistic version and UTC updated_at. Notes use the same structured dietary encoding; no participant identifiers. Cascade on event deletion, hide and delete at scheduled end +24h.

Migration 0012_damp_frog_thor adds walk_in_guests.source (WhatsApp/unannounced for new quick adds; legacy rows retain other). Existing override columns remain compatible: quick-add accommodation stores a system-generated source reason, never asks for participant/private text. Source is deleted with the walk-in at +7 days.

Migration 0013_naive_vapor adds role (legacy default guest), chef_cost_cents, chef_reimbursed_cents and chef_cost_recorded_at to walk_in_guests. Rebuilt confirmed_participants exposes stored organizer roles. Added role/expense validity and combined volunteer-slot trigger guards. Preserve these custom SQL definitions in later migrations.

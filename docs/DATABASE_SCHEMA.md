# Database design

Meal allocation is confirmed as the Saturday-cutoff confirmed count. The existing `events.meal_allocation` field stores the one-time snapshot; cancellation/edit services freeze it before post-cutoff writes, and existing capacity triggers enforce the ceiling. No new migration is needed. See WAITING_LIST.md.

Retention interpretation is now confirmed: elapsed UTC +24 hours and +7×24 hours from scheduled dinner end. Cleanup uses existing tables and foreign-key cascades; no new migration is needed. Participant rows are deleted, with only non-identifying cleanup counts retained. See PRIVACY_CLEANUP.md.

Registration increment adds `registration_mutations` in `0004_living_micromax.sql`. Unique registration/version receipts and an applied-row CHECK ensure failed conditional edits roll back the entire D1 batch, including emails. Existing registrations, token rows and outbox schemas remain compatible. See REGISTRATION.md.

Executable foundation: `src/lib/server/db/schema.ts`, generated `drizzle/0000_wooden_fenris.sql`, and custom `drizzle/0001_capacity_guards.sql`. UTC epoch milliseconds are used consistently. Identity columns permit NULL only after anonymization; active email uniqueness is a partial index. Capacity triggers cover inserts, promotions, role changes and event capacity reductions, with a nullable meal ceiling until allocation is resolved. Services must still enforce deadlines, authorized state transitions and optimistic versions, and batch changes with outbox intents. Token lifetime and retention cutoff interpretation remain open. Referenced venue rows must be treated as immutable snapshots.

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

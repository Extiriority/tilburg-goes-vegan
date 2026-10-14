# Database design

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

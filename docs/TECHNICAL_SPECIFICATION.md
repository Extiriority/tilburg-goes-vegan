# Tilburg Goes Vegan — Codex Handoff

Version 1.0 | 14 October 2026

Registration-window amendment: only the next two gatherings accept new public registrations. Later gray gatherings open at 00:00 Europe/Amsterdam on the day after the occurrence two dinners earlier (23 November opens 27 October; 7 December opens 10 November). This supersedes the earlier statement that gray styling adds no opening restriction. Saturday cutoff, cancellations and role/capacity rules still apply. Existing registrations are preserved; undecided confirmations also respect opening dates.

Retention amendment: “one/seven days after the gathering” means elapsed +24 hours / +7×24 hours from scheduled dinner end, also for cancelled gatherings. Local cleanup deletes participant rows and linked credentials/email intents rather than retaining potentially linkable histories. See PRIVACY_CLEANUP.md; production scheduling remains pending.

Registration amendment: management links expire when dinner ends; public registration offers an optional undecided choice; confirmed and waiting-list volunteers may access the private coordination invitation. These choices do not alter capacity, deadlines or meal allocation. See REGISTRATION.md.

Design amendment: adopt the designer's visual style while preserving all functional requirements. Confirmed default venue is V39, Veemarktstraat 39, 5038 CT Tilburg; primary contact is tilburg@goesvegan.nl. See DESIGN_ADAPTATION.md for scope and implementation details.

Organizer amendment, 14 October 2026: show four upcoming gatherings: first two dates in normal styling, following two dates in muted gray; default total capacity is 30 people including confirmed volunteers. Per-event overrides remain supported. Gray styling does not change deadlines. Calendar previews remain unavailable for registration until venue setup is complete.

This is the editable source of truth for the 20-page technical specification. Any unresolved deployment capability must be verified before production.

## 01. Executive summary and scope

Tilburg Goes Vegan (TGV) is a compact bilingual website for recurring community vegan dinners in Tilburg, Netherlands. The application manages event discovery, registration, chef and helper-chef participation, waiting lists, transactional email, published recipes and organizer administration. It does not process online payments, manage groceries or replace the organizers’ separate Excel attendance/payment sheet.
Primary outcome: a secure, accessible, maintainable, low-cost website with predictable event operations. Prioritize correctness of capacity, deadlines, notification delivery and personal-data deletion over decorative features.
Audience: organizers, contributors, reviewers and Codex implementation agents. This document records agreed product requirements; any unverified infrastructure capability is explicitly a validation item rather than a promise.

## 02. Project constraints and decisions

Technology: SvelteKit with TypeScript, Tailwind CSS custom components, Cloudflare Workers hosting, Cloudflare D1 SQLite, Drizzle ORM and Drizzle Kit migrations, Cloudflare R2 for published images and private database backups, Zod validation and SvelteKit form actions. Cloudflare Web Analytics supplies privacy-oriented traffic statistics.
No shadcn UI. No participant accounts. No online payments. No participant export. No automated shopping lists or chef course selection. A single shared organizer login is accepted, with password reset via the primary organizer email.
Language: English and Dutch. Browser language selects initial language with English fallback; a manually selected language persists. Recipe content is not automatically translated.

## 03. Public information architecture

Homepage sections: introduction and purpose; how the dinners work; next four gatherings with registration status; volunteering; dish showcase carousel; recipes link; contact/social channels; privacy and legal footer. Individual gathering pages explain schedule, price, location, role options and registration rules.
Additional routes: /events/[slug], /registration/manage/[token], /recipes, /recipes/[slug], /privacy, /admin/login, /admin, /admin/events, /admin/registrations, /admin/recipes, /admin/email-failures and password-reset pages. Route names are proposed implementation conventions, not externally promised URLs.
Use semantic HTML, keyboard-accessible controls, meaningful image alt text, visible form errors and mobile-first layout.

## 04. Visual design and localization

Design should reflect the existing TGV logo: warm, welcoming and community-oriented. Proposed palette: cream #FFF9E9, deep green #145E24, leaf green #82B33D, pink #E90083 and yellow #FFEC18. Ensure WCAG-appropriate contrast for body text and controls; decorative colors should not carry meaning alone.
Provide localized UI strings, validation errors, email templates and privacy notice in English and Dutch. Store registration language and use it for transactional emails. User language choice overrides browser detection and persists using a minimal preference mechanism. Content supplied as recipes and showcases remains in its original language.
Avoid publishing WhatsApp coordination invitation links in public page markup or unprotected responses.

## 05. Gathering schedule and lifecycle

First gathering: Monday 26 October 2026; recur every 14 days in Europe/Amsterdam. Automatically maintain four future gathering records, preserving individual changes. Normal schedule: chefs arrive 17:00; other guests arrive 18:00 for socializing, games and pool; dinner 19:00–22:00.
Each gathering has its own venue, description, capacity, registration cutoff, status and registration records. Defaults are configurable and copied into new gatherings; changing a default does not silently mutate existing gatherings. Event cancellation preserves history, marks the event cancelled and triggers notification to registered participants.
Generation must be idempotent and not recreate cancelled occurrences or override organizer edits.

## 06. Venue and capacity configuration

Store a default venue and allow per-event override. On a venue change, notify confirmed and waiting-list participants; consider undecided participants too if their event information would be affected. Display the effective venue in public event pages and reminders.
Store default total participant capacity and per-event override. All confirmed chefs, helper chefs and paying guests occupy a place. Undecided and waiting-list participants do not. Capacity reductions cannot silently remove confirmed participants; reject invalid reductions or require explicit organizer resolution.
Public availability displays status labels only: Places available below 80% occupancy; Almost full at 80% to below 100%; Waiting list at 100%; Registration closed after cutoff; Cancelled if cancelled. Do not show numerical attendee counts.

## 07. Roles and registration form

Roles: Guest (€7), Helper chef (€7, maximum three), Chef (free, maximum three). Volunteer roles count toward total capacity. Chef slots are not assigned by starter/main/dessert in the website; course selection, ingredients, budget and coordination take place through WhatsApp. There is no prior-attendance gate and no automatic WhatsApp membership check.
Form fields: required full name, email and role; optional dietary requirements/allergies and comments. Require clear explicit consent for sensitive dietary information where applicable, separate from the main registration action. One active registration per normalized email per event; use server-side enforcement and database constraints where feasible.
Successful volunteer registrations receive the private coordination invite on the success page, in confirmation email and via their private management link. Never reveal it before successful registration.
Payment is collected on site before dinner: €7 for guests and helper chefs, free for chefs. Organizers track payments and attendance in a separate Excel file; the website has no online payments or exports.

## 08. Registration state machine

Registration statuses: confirmed, undecided, waiting_list and cancelled. New registration becomes confirmed if the requested role and total capacity are available before the cutoff; otherwise waiting-list where eligible. Undecided does not reserve a meal or seat. Organizer approval is required for role changes and must recheck limits.
Permitted transitions: undecided -> confirmed (before cutoff and subject to capacity), undecided -> cancelled, confirmed -> cancelled, waiting_list -> confirmed (promotion), waiting_list -> cancelled. Organizer-managed exceptional changes must be audited. Reject stale requests or resolve conflicts transactionally.
An opaque, unguessable management token provides account-free access to the participant’s own record; store only a hash of the token and protect it from referrer leakage and logging.

## 09. Deadlines and waiting list

Saturday before each Monday event: undecided reminder at 10:00, then public registration and undecided confirmation cutoff at 16:00, Europe/Amsterdam. Meal allocation is fixed at cutoff. Late cancellations are permitted with a warning; dietary changes after cutoff warn the participant and notify organizers.
Waiting list is first-come-first-served. Automatic promotion after a cancellation is permitted through Sunday, but must never exceed the Saturday meal allocation. On Monday, promotions are manual only: organizer contacts the next eligible person, then confirms the promotion by 19:00. No public new registrations after Saturday cutoff even if places open.
Enforce deadlines in server actions independently of cron; a delayed job must not reopen registration or over-allocate meals.

## 10. Participant communications

Send registration confirmation, waiting-list placement/promotion, cancellation and management-link emails. Send a Sunday 18:00 local reminder to confirmed participants containing effective venue, event schedule, payment instructions and private management link. Send Saturday 10:00 reminder to undecided participants.
Notify organizers of new chef/helper-chef signups, volunteer cancellations, late dietary changes and Monday vacancies requiring manual attention. Notify confirmed and waiting-list participants of venue changes. Notify all registered participants when an event is cancelled. Do not notify organizers for every ordinary guest signup.
Email language follows participant’s stored language. Delivery must be retryable, logged and idempotent; admin can view failures and retry.

## 11. Recipes and dish showcase

Organizers publish recipes with title, optional description, course category (starter/main/dessert), ingredients with quantities, preparation steps, multiple photos and optional chef credit. Recipe listing supports search and category filtering. Recipe content remains in its authored language, independent of website UI language.
The homepage carousel includes all published dishes, including simple showcases with no full recipe, ordered newest first. Dishes and recipes do not need association with a gathering. Multiple images support cover selection and manual image ordering. Only organizers can create, edit or publish content. Saving publishes immediately; no draft workflow.
Store optimized public image variants in R2 and retain original image copies outside the website under organizer responsibility.

## 12. Admin experience and permissions

Single shared organizer account with email/password; no 2FA by current decision. Use secure password hashing, rate limiting, secure HTTP-only cookies, CSRF-aware form handling and server-side access checks. Sessions expire at browser-session end. Password reset uses a single-use link valid for 30 minutes sent to the primary organizer address; reset invalidates active sessions.
Dashboard allows event creation/edit/cancellation, default venue/capacity settings, participant registration and waitlist review, Monday manual promotions, role-change approval, recipes/images, notification recipient configuration and failed-email retries.
Primary organizer email is required; additional recipients optional. Send organizer alerts individually or using BCC so addresses are not exposed.

## 13. Relational database model

Recommended D1 tables: settings, venues, events, registrations, registration_tokens, admin_users, admin_sessions, password_reset_tokens, recipes, recipe_ingredients, recipe_steps, dishes, media_assets, dish_media, recipe_media, email_outbox, email_attempts, audit_events, scheduled_job_runs and privacy_cleanup_runs.
Core relations: event has many registrations; venue may be default or overridden by event; recipe and dish have ordered media links; outbox messages reference event/registration where appropriate; audit events reference administrative actions without duplicating sensitive dietary details.
Prefer integer timestamps (UTC milliseconds) or ISO UTC strings consistently. Store Europe/Amsterdam as event timezone. Normalize email for uniqueness; use surrogate IDs (ULID/UUID) and explicit foreign keys. Sensitive text is excluded from audit logs.

## 14. Schema constraints and concurrency

Key constraints: unique event occurrence date (or recurrence key); unique active event/email registration via a normalized-email strategy that supports cancelled historical records; role slot and capacity limits enforced in a write transaction or equivalent serialized D1 write path; unique outbox idempotency key; unique cron operation per event/trigger.
D1 SQLite has specific transaction and binding limitations; validate atomic multi-statement behavior using the deployed Workers/D1 APIs. Do not assume an ordinary application-side count followed by insert is concurrency safe.
Create indexes for registrations(event_id,status,created_at), registrations(event_id,email_normalized), events(starts_at,status), email_outbox(status,next_attempt_at) and scheduled jobs due time. Treat sensitive-data retention as a schema-level design concern.

## 15. Scheduling and idempotency

One hourly Cloudflare Workers Cron Trigger is the baseline scheduler. It maintains four upcoming events, processes due notifications, checks event deadlines and retention, and initiates database backups. The cron frequency is hourly, so exact 10:00, 16:00 and 18:00 behavior depends on running at those hours in Europe/Amsterdam; convert to UTC carefully for DST.
Persist idempotency keys for each event and notification type. Email sends must be deduplicated even if cron retries. Never rely exclusively on cron for public registration deadlines or waitlist state. Make job failures visible in admin and retry safely.
Cloudflare runtime limits, SMTP transport support, D1 export and R2 backup mechanisms require a deployment spike before final implementation.

## 16. Email transport and reliability

Use the existing TGV SMTP mailbox as the desired sender. Configure credentials as Cloudflare deployment secrets, not editable through the admin dashboard. Check whether the chosen SMTP transport supports outbound Workers networking and provider requirements on ports 465/587. Port 25 is unsuitable.
Implement an email outbox: create message intent in the same logical operation as a registration change, assign unique idempotency key, attempt delivery, record provider response and retry with bounded exponential backoff. Provide admin failure view and manual retry.
If direct SMTP is not compatible, pause for organizer approval of an alternative transport. Do not silently change provider or claim delivery without confirmation.

## 17. Privacy, consent and retention

GDPR/AVG: privacy notice in English and Dutch for organizer/legal review. Explain controller identity, purposes, lawful bases, processors, cross-border transfers where relevant, retention, contact, rights and complaints to Autoriteit Persoonsgegevens. Dietary/allergy information may be special-category data and requires appropriate Article 9 condition, with separate explicit consent proposed.
Delete dietary information one day after the gathering; delete or irreversibly anonymize name, email and general registration comments seven days after the gathering. Apply analogous rules to cancelled events based on scheduled event date, subject to justified exceptional handling. Preserve only genuinely anonymous statistics and event details.
Personal-data deletion must account for email copies, backups, logs and the separate organizer-maintained Excel sheet. A 30-day backup retention creates delayed physical deletion; restore must immediately reapply expired-data cleanup. No claim of complete deletion from every external system without verification.

## 18. Security and operational resilience

Protect admin and participant endpoints against enumeration, brute force, CSRF, XSS, injection and replay. Hash passwords with a Workers-compatible, appropriately costed algorithm. Store secrets in environment bindings; do not commit credentials or WhatsApp invite links. Apply least-privilege R2 and D1 access, CSP and security headers, rate limits and file-upload validation.
R2 recipe photos are not separately backed up by project decision; organizers retain originals. D1 backups target private R2 daily with 30-day retention, monitoring and periodic restore testing, but feasibility of D1 export in the chosen execution environment must be proven. Do not expose backup objects publicly.
Provide structured, privacy-minimized logs and an incident response checklist for organizers.

## 19. Testing and acceptance criteria

Automated tests must cover 14-day recurrence across DST; next-four generation and cancellation exceptions; role slots and total capacity under concurrent signups; 80% public status boundary; Saturday cutoff; undecided state; waitlist ordering and Saturday meal allocation; Sunday-to-Monday promotion switch; organizer manual Monday cutoff; venue-change notifications; duplicate-email prevention; language choice; dietary consent; retention deletion; token expiration; email retries and idempotency.
Use unit tests for pure business rules, integration tests against local D1 for schema and transactions, and browser end-to-end tests for registration, admin and mobile accessibility. Include failure injection for SMTP and cron reruns.
Acceptance requires passing tests, verified backup restore, secrets configured, bilingual privacy notice reviewed and organizer approval of final content.

## 20. Implementation plan and open questions

Phase 0: verify Cloudflare free-tier limits, D1 transaction semantics, SMTP transport, scheduled execution and backup/export feasibility. Phase 1: scaffold SvelteKit, Tailwind, Drizzle, CI and localization. Phase 2: schema and event generation. Phase 3: registration state machine and management links. Phase 4: emails, cron and waitlist. Phase 5: admin, recipes and R2 media. Phase 6: privacy cleanup, analytics, accessibility and launch checks.
Open decisions: additional organizer recipients; approved WhatsApp invite URL; official privacy-controller contact details; SMTP configuration; exact meal-allocation algorithm and Monday vacancy handling; detailed cancellation-event edge cases; domain and deployment credentials.
Do not fabricate these values. Use placeholders in development, document decisions in CHANGELOG and request organizer confirmation before production launch.

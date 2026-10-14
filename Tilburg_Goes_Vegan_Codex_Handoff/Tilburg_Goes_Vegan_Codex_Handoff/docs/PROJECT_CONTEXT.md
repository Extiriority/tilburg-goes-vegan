# Project context and decision register

## Executive summary and scope

Tilburg Goes Vegan (TGV) is a compact bilingual website for recurring community vegan dinners in Tilburg, Netherlands. The application manages event discovery, registration, chef and helper-chef participation, waiting lists, transactional email, published recipes and organizer administration. It does not process online payments, manage groceries or replace the organizers’ separate Excel attendance/payment sheet.
Primary outcome: a secure, accessible, maintainable, low-cost website with predictable event operations. Prioritize correctness of capacity, deadlines, notification delivery and personal-data deletion over decorative features.
Audience: organizers, contributors, reviewers and Codex implementation agents. This document records agreed product requirements; any unverified infrastructure capability is explicitly a validation item rather than a promise.

## Project constraints and decisions

Technology: SvelteKit with TypeScript, Tailwind CSS custom components, Cloudflare Workers hosting, Cloudflare D1 SQLite, Drizzle ORM and Drizzle Kit migrations, Cloudflare R2 for published images and private database backups, Zod validation and SvelteKit form actions. Cloudflare Web Analytics supplies privacy-oriented traffic statistics.
No shadcn UI. No participant accounts. No online payments. No participant export. No automated shopping lists or chef course selection. A single shared organizer login is accepted, with password reset via the primary organizer email.
Language: English and Dutch. Browser language selects initial language with English fallback; a manually selected language persists. Recipe content is not automatically translated.

## Public information architecture

Homepage sections: introduction and purpose; how the dinners work; next four gatherings with registration status; volunteering; dish showcase carousel; recipes link; contact/social channels; privacy and legal footer. Individual gathering pages explain schedule, price, location, role options and registration rules.
Additional routes: /events/[slug], /registration/manage/[token], /recipes, /recipes/[slug], /privacy, /admin/login, /admin, /admin/events, /admin/registrations, /admin/recipes, /admin/email-failures and password-reset pages. Route names are proposed implementation conventions, not externally promised URLs.
Use semantic HTML, keyboard-accessible controls, meaningful image alt text, visible form errors and mobile-first layout.

## Visual design and localization

Design should reflect the existing TGV logo: warm, welcoming and community-oriented. Proposed palette: cream #FFF9E9, deep green #145E24, leaf green #82B33D, pink #E90083 and yellow #FFEC18. Ensure WCAG-appropriate contrast for body text and controls; decorative colors should not carry meaning alone.
Provide localized UI strings, validation errors, email templates and privacy notice in English and Dutch. Store registration language and use it for transactional emails. User language choice overrides browser detection and persists using a minimal preference mechanism. Content supplied as recipes and showcases remains in its original language.
Avoid publishing WhatsApp coordination invitation links in public page markup or unprotected responses.

## Gathering schedule and lifecycle

First gathering: Monday 26 October 2026; recur every 14 days in Europe/Amsterdam. Automatically maintain four future gathering records, preserving individual changes. Normal schedule: chefs arrive 17:00; other guests arrive 18:00 for socializing, games and pool; dinner 19:00–22:00.
Each gathering has its own venue, description, capacity, registration cutoff, status and registration records. Defaults are configurable and copied into new gatherings; changing a default does not silently mutate existing gatherings. Event cancellation preserves history, marks the event cancelled and triggers notification to registered participants.
Generation must be idempotent and not recreate cancelled occurrences or override organizer edits.

## Venue and capacity configuration

Store a default venue and allow per-event override. On a venue change, notify confirmed and waiting-list participants; consider undecided participants too if their event information would be affected. Display the effective venue in public event pages and reminders.
Store default total participant capacity and per-event override. All confirmed chefs, helper chefs and paying guests occupy a place. Undecided and waiting-list participants do not. Capacity reductions cannot silently remove confirmed participants; reject invalid reductions or require explicit organizer resolution.
Public availability displays status labels only: Places available below 80% occupancy; Almost full at 80% to below 100%; Waiting list at 100%; Registration closed after cutoff; Cancelled if cancelled. Do not show numerical attendee counts.

## Roles and registration form

Roles: Guest (€7), Helper chef (€7, maximum three), Chef (free, maximum three). Volunteer roles count toward total capacity. Chef slots are not assigned by starter/main/dessert in the website; course selection, ingredients, budget and coordination take place through WhatsApp. There is no prior-attendance gate and no automatic WhatsApp membership check.
Form fields: required full name, email and role; optional dietary requirements/allergies and comments. Require clear explicit consent for sensitive dietary information where applicable, separate from the main registration action. One active registration per normalized email per event; use server-side enforcement and database constraints where feasible.
Successful volunteer registrations receive the private coordination invite on the success page, in confirmation email and via their private management link. Never reveal it before successful registration.
Payment is collected on site before dinner: €7 for guests and helper chefs, free for chefs. Organizers track payments and attendance in a separate Excel file; the website has no online payments or exports.

## Registration state machine

Registration statuses: confirmed, undecided, waiting_list and cancelled. New registration becomes confirmed if the requested role and total capacity are available before the cutoff; otherwise waiting-list where eligible. Undecided does not reserve a meal or seat. Organizer approval is required for role changes and must recheck limits.
Permitted transitions: undecided -> confirmed (before cutoff and subject to capacity), undecided -> cancelled, confirmed -> cancelled, waiting_list -> confirmed (promotion), waiting_list -> cancelled. Organizer-managed exceptional changes must be audited. Reject stale requests or resolve conflicts transactionally.
An opaque, unguessable management token provides account-free access to the participant’s own record; store only a hash of the token and protect it from referrer leakage and logging.

## Deadlines and waiting list

Saturday before each Monday event: undecided reminder at 10:00, then public registration and undecided confirmation cutoff at 16:00, Europe/Amsterdam. Meal allocation is fixed at cutoff. Late cancellations are permitted with a warning; dietary changes after cutoff warn the participant and notify organizers.
Waiting list is first-come-first-served. Automatic promotion after a cancellation is permitted through Sunday, but must never exceed the Saturday meal allocation. On Monday, promotions are manual only: organizer contacts the next eligible person, then confirms the promotion by 19:00. No public new registrations after Saturday cutoff even if places open.
Enforce deadlines in server actions independently of cron; a delayed job must not reopen registration or over-allocate meals.

## Participant communications

Send registration confirmation, waiting-list placement/promotion, cancellation and management-link emails. Send a Sunday 18:00 local reminder to confirmed participants containing effective venue, event schedule, payment instructions and private management link. Send Saturday 10:00 reminder to undecided participants.
Notify organizers of new chef/helper-chef signups, volunteer cancellations, late dietary changes and Monday vacancies requiring manual attention. Notify confirmed and waiting-list participants of venue changes. Notify all registered participants when an event is cancelled. Do not notify organizers for every ordinary guest signup.
Email language follows participant’s stored language. Delivery must be retryable, logged and idempotent; admin can view failures and retry.

## Recipes and dish showcase

Organizers publish recipes with title, optional description, course category (starter/main/dessert), ingredients with quantities, preparation steps, multiple photos and optional chef credit. Recipe listing supports search and category filtering. Recipe content remains in its authored language, independent of website UI language.
The homepage carousel includes all published dishes, including simple showcases with no full recipe, ordered newest first. Dishes and recipes do not need association with a gathering. Multiple images support cover selection and manual image ordering. Only organizers can create, edit or publish content. Saving publishes immediately; no draft workflow.
Store optimized public image variants in R2 and retain original image copies outside the website under organizer responsibility.

## Admin experience and permissions

Single shared organizer account with email/password; no 2FA by current decision. Use secure password hashing, rate limiting, secure HTTP-only cookies, CSRF-aware form handling and server-side access checks. Sessions expire at browser-session end. Password reset uses a single-use link valid for 30 minutes sent to the primary organizer address; reset invalidates active sessions.
Dashboard allows event creation/edit/cancellation, default venue/capacity settings, participant registration and waitlist review, Monday manual promotions, role-change approval, recipes/images, notification recipient configuration and failed-email retries.
Primary organizer email is required; additional recipients optional. Send organizer alerts individually or using BCC so addresses are not exposed.
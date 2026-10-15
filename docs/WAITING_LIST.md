# Meal allocation and waiting-list operations

Admin update: contacted-person manual promotion is now implemented locally. For special dates, automatic promotion stops at gathering-day midnight and manual promotion is permitted that day before 19:00, with Saturday 16:00 registration cutoff unchanged. See ADMIN.md.

Organizer decision: Saturday 16:00 Europe/Amsterdam meal allocation equals the confirmed participant count, including confirmed chefs and helper chefs. Undecided, waiting-list and cancelled registrations reserve no meal. The event's persisted `registration_cutoff` is authoritative; generated events use that Saturday deadline.

## Implemented local slice

- Freeze `events.meal_allocation` once when the cutoff is due. Registration edits/cancellations include that snapshot before their update in the same D1 batch. Thus a late cancellation cannot reduce the snapshot even if the scheduler has not run yet. No public GET writes are introduced.
- Automatically fill available places through Sunday. Select the earliest eligible waiting-list row ordered by `created_at`, then ID for deterministic ties. Skip chef/helper-chef rows while their three-place role limit is full; do not change anyone's requested role.
- Recheck event status, event timestamp, opening time, total capacity, volunteer limits, meal ceiling and the Monday boundary inside the conditional write. After Saturday, a missing snapshot blocks promotion rather than inventing meals.
- Queue localized participant promotion email intents and organizer alerts for promoted volunteers in the same batch. A failed outbox write rolls back the promotion. Concurrent workers cannot duplicate the transition or its messages. SMTP remains unconfigured; these messages are not sent.
- New signup and undecided confirmation cannot bypass an already eligible waiting-list person. Cancelling and re-registering creates a new record with a new queue position; there is no role-change path here.
- Automatic promotion stops at Monday 00:00 Amsterdam, including delayed writes that cross the boundary. Existing cancellation handling queues Monday vacancy attention before dinner starts. Monday promotion requires organizer contact and the authenticated admin action, which enforces 19:00; there is no public bypass endpoint.

Run local operations once:

```powershell
npm run operations:run:local
```

For automatic local checks, leave this running in a separate terminal:

```powershell
npm run operations:watch:local
```

It runs immediately, then 60 seconds after each completed pass. Privacy cleanup runs before waiting-list processing. This replaces the need for a separate privacy watcher while it is running. `npm run dev` alone does not start operations. Ctrl+C stops it. Remote bindings are disabled, there are no remote/time-override arguments, and only aggregate counts are logged. No production scheduler or deployment is configured.

## Limits and remaining gates

Meal allocation assumes registration mutations go through the application services. Direct SQL changes after cutoff or restoring a historical database without its snapshot cannot reconstruct the original confirmed-at-cutoff count; do not use direct edits as organizer operations. Restore cleanup and production scheduler integration remain launch gates. Do not expose these flows publicly until email delivery and production admin validation are completed.

No schema migration is required: the existing nullable meal allocation and database capacity triggers enforce the ceiling. A snapshot is never recomputed by this service once present. Future admin event editing must preserve fixed allocation and reject reductions below confirmed participants.

Tests cover snapshot timing, all registration states, delayed-scheduler cancellation, FIFO/ties and role eligibility, zero allocation, pre-cutoff vacancies, Sunday/Monday boundaries through DST, concurrent workers, idempotency, cancellation and injected outbox failure. Actual local operations found no due changes.

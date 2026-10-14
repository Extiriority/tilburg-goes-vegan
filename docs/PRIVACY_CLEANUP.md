# Local privacy cleanup

Organizer decision: retention uses elapsed UTC time from the scheduled dinner end, including cancelled gatherings. Dietary notes and consent timestamps expire after exactly 24 hours; participant identity and comments expire after exactly 7×24 hours. DST does not shift these durations.

Run once against the local development database:

```powershell
npm run privacy:cleanup:local
```

For automatic local checks, leave this running in a separate terminal:

```powershell
npm run privacy:watch:local
```

The watcher runs immediately, then every 60 seconds after the previous run completes. Stop it with Ctrl+C. It only runs while that process is open; `npm run dev` does not start it. Downtime is handled by processing overdue data on the next run. Both commands use Wrangler's local persisted bindings with remote bindings explicitly disabled. They do not deploy, contact SMTP or accept remote/time-override arguments. Apply local migrations first with `npm run db:setup:local`.

## Stored data coverage

- At +24 hours: clear dietary notes and consent timestamps for all registration states.
- At +7 days: delete registrations and associated outbox rows. Foreign-key cascades remove management-token hashes, mutation receipts and email-attempt rows. Event-linked organizer messages are removed too, even if a message's own purge deadline is later.
- Independently: delete outbox rows when their own `purge_at` deadline is reached, including messages without an event/registration.
- Preserve event/venue details and one cleanup receipt per event/kind containing only deadline, completion time and affected registration count. Participant IDs and precise registration histories are deleted rather than described as anonymous statistics.

Each event's cleanup and receipts commit atomically. Repeated/concurrent runs do not duplicate receipts. Existing receipts never suppress future sweeps, so restored expired records are removed again. The runner logs only aggregate counts and generic failure messages, never participant details or credentials.

## Limits and production gate

This is a local cleanup implementation and watcher, not a deployed Cron Trigger. The production scheduler must call the same service hourly and run it before resuming registrations/email delivery after a backup restore. A database restore must not expose expired records before cleanup succeeds. Production registration remains disabled.

Deletion covers logical database records. It does not claim secure erasure from SQLite storage pages, backups, external logs, delivered mailboxes or the organizers' separate Excel sheet. Backup retention/restore controls and external-system deletion still need implementation and organizer procedures. No emails have been sent by this increment.

Verification: 38 tests pass, including seven privacy integration cases for +24h/+7d boundaries across a DST change, all participant states, cancelled events, catch-up, concurrent/repeated runs, restored data, outbox expiry and injected transactional rollback. Type checks report no errors/warnings. A real local run found no expired records and deleted nothing.

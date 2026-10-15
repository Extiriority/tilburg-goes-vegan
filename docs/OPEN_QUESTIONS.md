# Items requiring organizer or technical confirmation

Resolved special-date policy: Saturday 16:00 registration cutoff; automatic promotion ends at gathering-day midnight; contacted-person manual promotion on gathering day before 19:00. The organizer approved the local shared admin login for tilburg@goesvegan.nl. Production password/reset/runtime parameters remain launch checks. See ADMIN.md.

Resolved meal-allocation algorithm: confirmed participants at Saturday cutoff, including volunteers. FIFO promotion selects the earliest role-eligible participant, with ID as a deterministic timestamp tie-breaker. Contacted-person confirmation is implemented in the local authenticated admin panel. See WAITING_LIST.md.

Resolved retention anchor: scheduled dinner end, elapsed UTC +24 hours / +7×24 hours, including cancelled gatherings. See PRIVACY_CLEANUP.md.

 additional organizer recipients; approved WhatsApp invite URL; official privacy-controller contact details; SMTP configuration; detailed cancellation-event edge cases; domain and deployment credentials.


## Validation spikes

- Verify Cloudflare Workers SMTP compatibility with existing mailbox.
- Verify D1 backup/export from scheduled Worker and private R2 upload.
- Verify atomic registration updates and unique active email enforcement.
- Verify cron execution and DST behavior for Netherlands local deadlines.

Resolved organizer guest/attendance decisions: allow an explicit organizer override for extra seats/meals; require an acknowledgement and reason and increase only that gathering’s limits atomically. Keep public signup email-required. Add a distinct No-show attendance status, available from dinner start through identity retention. Name-only guests share seven-day cleanup and have no email/private link. The unified view groups by status and preserves FIFO within each group.

Pending organizer workflow clarification: which fields are maintained in the Google Docs participant list, how paid/unpaid and attendance are marked, who updates them, and how duplicate website/WhatsApp entries are reconciled. Generic organizer Add person and unified counts are available; no payment-status fields or document import have been added yet. Any payment tracking must remain on-site administration, with no online payments or export.

Resolved 15 October: payment checkbox/amount corrections remain available while identity data exists, including after 19:00. Status restoration preserves existing limits and waiting-list contact rules. Additional-guests field excludes the registrant; extras are €7 guests, role applies to the lead only, and group confirmation/wait-list status is atomic. Remaining document workflow/import questions are not resolved by this slice.

Resolved 15 October: chefs pay first and are reimbursed for actual ingredient costs. The budget is an estimate; the gathering's recorded balance is actual received payments minus actual chef costs, with outstanding reimbursement and cash shown separately. Long-term accounting/export and document workflow remain outside this increment.

Resolved: additional organizer-entered dietary reports supplement website reports at gathering level, with confirmation of participant agreement and +24h deletion. Empty-state wording is No allergens reported (mobile No reports), not an allergy-free claim.

Resolved: Add person defaults to WhatsApp with an Unannounced alternative. The quick-add flow no longer asks for override reasons or an extra acknowledgement. Organizer addition accommodates the whole party atomically; existing waiting-list priority remains unchanged.

Resolved status refinements: no-show from gathering-day midnight; no new organizer undecided selections; auto-cancel undecided at Saturday 16:00; only offer new waiting-list status at full capacity. Existing capacity/contact/meal rules still govern restoring Confirmed.

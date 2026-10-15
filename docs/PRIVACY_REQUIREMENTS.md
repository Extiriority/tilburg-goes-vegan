# Privacy and retention

Recipe YouTube tutorials render a local load button first. No YouTube iframe or remote thumbnail loads until the visitor chooses to load the tutorial. The resulting youtube-nocookie.com embed still connects to a third party; the bilingual UI and privacy page explain this.

The local organizer panel is authenticated, no-store and noindex. Admin queries omit identity after +7 days and dietary data after +24 hours even if cleanup is delayed. Dietary notes are view-only; organizer edits do not invent participant consent. Audits record action/event/admin only; no participant text or bearer credentials. Recipe image conversion strips original metadata before optimized variants are uploaded. See ADMIN.md for access and remaining production gates.

Confirmed 14 October 2026: count elapsed UTC time from scheduled dinner end, including cancelled gatherings: +24 hours dietary cleanup and +7×24 hours participant deletion. Local cleanup and an opt-in minute watcher are implemented; production scheduling and external-system deletion remain pending. See PRIVACY_CLEANUP.md.

GDPR/AVG: privacy notice in English and Dutch for organizer/legal review. Explain controller identity, purposes, lawful bases, processors, cross-border transfers where relevant, retention, contact, rights and complaints to Autoriteit Persoonsgegevens. Dietary/allergy information may be special-category data and requires appropriate Article 9 condition, with separate explicit consent proposed.
Delete dietary information one day after the gathering; delete or irreversibly anonymize name, email and general registration comments seven days after the gathering. Apply analogous rules to cancelled events based on scheduled event date, subject to justified exceptional handling. Preserve only genuinely anonymous statistics and event details.
Personal-data deletion must account for email copies, backups, logs and the separate organizer-maintained Excel sheet. A 30-day backup retention creates delayed physical deletion; restore must immediately reapply expired-data cleanup. No claim of complete deletion from every external system without verification.

## Operational checks

The homepage location card contacts OpenStreetMap only after the visitor clicks “Show map”. Before that click it renders a local decorative placeholder with no OpenStreetMap resources or preconnect. The address and external directions link remain available independently. Include this optional third-party map in the bilingual privacy notice before launch.

- Review privacy notice in English and Dutch before publication.
- Validate lawful basis and consent UX with the organizers.
- Purge dietary information at event + 1 day and identifiable registration data at event + 7 days.
- Ensure backup restores rerun expired-data cleanup.
- Document deletion in separate Excel and email systems.

Organizer-only walk-ins require only a name, with optional operational comments and an override reason when extra capacity/meals are acknowledged. They have no email, management token or email-outbox entry. Avoid putting dietary/allergy information in general comments or override reasons; consent-based dietary information belongs in the participant form. Walk-in identities/comments/override reasons are excluded from admin responses and deleted at scheduled dinner end +7×24 hours, including cancelled gatherings. No-show markers follow the same retention through registration deletion. Audit actions contain no guest names, notes or override reasons.

Group bookings store only the lead registrant's identity and the number of additional guests. On-site paid timestamp/amount (integer cents) is linked to that registration and removed at the same scheduled-end +7-day deadline, including cancelled gatherings; no payment history is copied to anonymous audit rows. Amount corrections stay available while the identity row exists. No card/bank details or payment-provider integration are collected.

Actual chef costs and reimbursement amounts are stored with the participant record and deleted at scheduled dinner end +7×24 hours, including cancelled gatherings. They are excluded from expired organizer responses and never copied to audit payloads. No receipt uploads, bank/card details or indefinite financial history are introduced.

Organizer dietary information is now shown at gathering level for confirmed bookings only, deduplicated and without registration identifiers or person-linked fields in the combined panel response. Free text can still identify someone; this is not guaranteed anonymization. Existing consent and +24h retention still apply.

Structured allergen choices reduce unnecessary free text; optional Other/preparation text instructs visitors not to include names or medical history. Gathering summaries show category presence, deduplicated details, no participant links/counts, and exclude non-confirmed bookings. This does not guarantee anonymity. Explicit consent and +24h dietary purge apply to the entire structured value, including legacy notes.

Organizer-entered external poll dietary requirements require explicit confirmation of participant agreement. Store them only at gathering level, without names or source-poll links. Cleanup deletes gathering_dietary at scheduled dinner end +24h including cancelled gatherings; queries hide expired data even before cleanup. Audit records contain only action, event and organizer IDs, not dietary text.

Quick-add source is a minimal category (WhatsApp or unannounced), without poll links, messages or extra contact data. It follows the walk-in identity's scheduled-end +7-day deletion. System accommodation reason contains only the source category.

Organizer chef roles and cost/reimbursement fields remain on walk_in_guests and are deleted with identity at scheduled dinner end +7 days. No email, receipt uploads or permanent financial history are introduced.

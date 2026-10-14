# Privacy and retention

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

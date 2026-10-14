# Items requiring organizer or technical confirmation

Resolved retention anchor: scheduled dinner end, elapsed UTC +24 hours / +7×24 hours, including cancelled gatherings. See PRIVACY_CLEANUP.md.

 additional organizer recipients; approved WhatsApp invite URL; official privacy-controller contact details; SMTP configuration; exact meal-allocation algorithm and Monday vacancy handling; detailed cancellation-event edge cases; domain and deployment credentials.


## Validation spikes

- Verify Cloudflare Workers SMTP compatibility with existing mailbox.
- Verify D1 backup/export from scheduled Worker and private R2 upload.
- Verify atomic registration updates and unique active email enforcement.
- Verify cron execution and DST behavior for Netherlands local deadlines.

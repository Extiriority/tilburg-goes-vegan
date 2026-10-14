# Items requiring organizer or technical confirmation

 actual default venue/address; event capacity; organizer mailbox and recipient list; approved WhatsApp invite URL; logo and image assets; official privacy-controller contact details; SMTP configuration; exact meal-allocation algorithm and Monday vacancy handling; detailed cancellation-event edge cases; domain and deployment credentials.


## Validation spikes

- Verify Cloudflare Workers SMTP compatibility with existing mailbox.
- Verify D1 backup/export from scheduled Worker and private R2 upload.
- Verify atomic registration updates and unique active email enforcement.
- Verify cron execution and DST behavior for Netherlands local deadlines.

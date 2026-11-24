# Private Cloudflare staging

The GitHub staging branch runs verification only. The Access-protected
`tilburg-goes-vegan-staging` Worker can keep serving Hello World while storage
is prepared. Do not connect production resources, add a production hostname,
or copy local registrations or credentials.

1. Authenticate with `npx wrangler login`, then use `npx wrangler whoami`
   to verify you are in the same Cloudflare account as the protected Worker.
2. Create an empty D1 database called `tgv-staging` and a private R2 bucket
   called `tgv-media-staging`. If R2 asks to enable billing, review and approve
   that separately. Keep public bucket access disabled.
3. Copy `wrangler.staging.example.jsonc` to
   `wrangler.staging.local.jsonc` in the project root. Replace the database ID
   placeholder with the staging D1 UUID. Confirm the Worker and bucket names
   match the staging resources. The local copy is ignored by Git.
4. Apply the schema only to staging:
   `npx wrangler d1 migrations apply tgv-staging --remote --config wrangler.staging.local.jsonc`.
   Verify the database name and account before accepting the prompt.
5. Set the exact HTTPS staging Worker origin, the HTTPS Access team domain and
   the Access application's **Application Audience (AUD)** in the staging
   config. The app refuses all dynamic staging requests unless it verifies
   an Access assertion for that origin, issuer and audience. Keep **All
   traffic** Access enabled to cover static assets as well.
   Store a fresh `MANAGEMENT_TOKEN_SECRET` as a Worker Secret when uploading
   the app version. If an ignored `.env.staging-secrets` file has been
   prepared, supply it to the staging upload only; never print or commit it.
   Do not upload Mailgun credentials yet: the hosted sender is not ready.
6. Verify the placeholder still requires Cloudflare Access in a private window.
   The only allow policy should list the exact tester addresses.

After verifying Access and running `npm run check` and `npm test`, build and
deploy from PowerShell:

```powershell
$env:TGV_STAGING_BUILD = '1'
npm run build
Remove-Item Env:TGV_STAGING_BUILD
```

Once the build succeeds, run:

```powershell
npx wrangler deploy --config wrangler.staging.local.jsonc --secrets-file .env.staging-secrets --no-autoconfig
```

Verify that a fresh private window still prompts for Access and that signing
in shows the site. Bootstrap test gatherings and a staging organizer account
before testing registration and admin workflows. Configure hosted sandbox mail
before testing delivery. Keep the release workflow verification-only.

Access key retrieval uses `redirect: 'manual'` and rejects non-success responses.
Workers does not implement `redirect: 'error'`. The staging deployment fetches
live keys and no longer needs a key snapshot that expires after seven days.

If an upstream outage causes `key-fetch` after Access sign-in, staging can temporarily
use `ACCESS_KEY_SNAPSHOT` in its ignored Wrangler config. Set it to a JSON
string containing `issuer`, `expires` (Unix milliseconds), and `keys` (the
public JWK array fetched over HTTPS from the configured issuer’s
`/cdn-cgi/access/certs` endpoint). Use a short expiry and refresh from that
endpoint if the outage persists. The Worker prefers live keys and requires a
matching key and a valid signature when it uses the snapshot.

To send one sandbox confirmation, create a confirmed test registration using
a Mailgun-authorized address. From the project root, run
`./scripts/test-mailgun-local.ps1 -Queue -Staging` and enter the sandbox SMTP
credentials at the prompts. The ignored `.env.staging-mail` file must define
`MAILGUN_STAGING_RECIPIENTS` as a comma-separated list of approved addresses.
Keep the staging management signing secret in `.env.staging-secrets` and sign
in to Wrangler first. The SMTP password is prompted for each run. Check the
inbox and open the private link while signed in to staging.

The hosted SMTP sender is a separate Worker, `tilburg-goes-vegan-staging-mail`,
with no public routes. Its ignored `wrangler.staging-mail.local.jsonc` config
uses the staging D1 binding, `nodejs_compat`, `APP_ENV=staging`, the staging
origin, the sandbox SMTP username, the two approved recipient addresses, and
a once-per-minute Cron Trigger. Deploy it with the staging management signing
key and use Wrangler's interactive secret prompt for the SMTP password:

```powershell
npx wrangler deploy --config wrangler.staging-mail.local.jsonc --secrets-file .env.staging-secrets --no-autoconfig
npx wrangler secret put MAILGUN_SMTP_PASSWORD --config wrangler.staging-mail.local.jsonc
```

The sender uses Cloudflare’s native TLS socket to reach Mailgun on port 465
and checks SMTP authentication before claiming eligible confirmations.
It shares the manual sender's atomic claim, retry and uncertain-send handling.
Check the inbox after making a fresh confirmed test registration. To disable
delivery, delete the sender’s `MAILGUN_SMTP_PASSWORD` secret.

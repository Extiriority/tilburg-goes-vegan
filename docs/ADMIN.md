# Local organizer panel

The organizer panel is available at `/admin` in development. It is deliberately disabled in production builds. No deployment, paid service provisioning or SMTP delivery was performed.

## Local access

The local migration and organizer setup have been applied. After restarting the development server, open `/admin` and log in with the configured primary organizer email (`tilburg@goesvegan.nl`). The generated password is the `LOCAL_ADMIN_PASSWORD` value in ignored `.dev.vars`. Do not paste it into chat, commit it or share it in a public document.

For a fresh local database:

```powershell
npm run db:setup:local
npm run admin:setup:local
npm run dev
```

Setup preserves existing credentials; it does not reset a password. The organizer explicitly approved provisioning this local shared login. Database reset removes the account; rerunning setup recreates it using the ignored local password.

## Implemented sections

1. **Overview:** registration, waiting-list, gathering and recipe totals.
2. **Gatherings and participants:** one selected gathering with paginated status-ordered lists. Expand an entry to correct its name/email, approve a role change, edit comments or cancel. Dietary information is read-only: organizers cannot manufacture participant consent. Database constraints recheck normalized email uniqueness, total capacity, role limits and the meal ceiling. Expired identity/dietary fields are excluded from admin responses even if the local cleanup process is not running.
3. **Gatherings:** edit the date/time, venue/address, description and capacity of existing recurrence records, or cancel with explicit confirmation. The immutable recurrence key prevents automatic generation from recreating an edited occurrence. Venue edits create a snapshot instead of changing another gathering's address. Date/time changes are rejected after the original meal cutoff/snapshot; capacity reductions must respect confirmed participants and the fixed meal allocation. Management-token expiry and outbox retention follow a successfully changed dinner end. Notifications are queued for confirmed, waiting-list and undecided participants; no email is claimed sent.
4. **Recipes:** create or edit a title, slug, description, category, optional chef credit, ordered ingredients/quantities and preparation steps. Saving publishes immediately; there are no drafts or automatic content translations. Public `/recipes` provides search/category filtering and links to individual recipes. The homepage links to recipes once content exists.
5. **Recipe photos:** upload multiple JPG/PNG/WebP images, converted in the browser to WebP at up to 1600px and 640px before transfer. Local R2 stores the optimized variants; organizers retain originals. Up to eight images per upload and twelve per recipe. Edit alternative descriptions, numeric ordering and cover selection. Server validation checks file headers, dimensions, byte limits and recipe ownership; stale image updates fail. Failed attachment writes remove their newly uploaded objects. Uploaded images are served only when linked to a published recipe.

## Confirmed special-date rules

- Registration closes at the latest Saturday 16:00 Amsterdam before dinner. For a Saturday evening dinner, that day's 16:00 cutoff applies; an earlier Saturday dinner uses the previous Saturday.
- Automatic waiting-list promotion stops at midnight on the gathering day, including a gathering moved away from Monday.
- On the gathering day, the organizer must contact the earliest eligible waiting-list person, tick the contact acknowledgement, then confirm their place before 19:00 Amsterdam. Finished/cancelled gatherings cannot be promoted. Capacity, volunteer role limits and fixed meals still apply.
- Registration opening follows actual preceding dinners, so a date override updates the relevant later opening dates. The canonical calendar is the fallback when earlier stored occurrences are absent. Current first two signup dates remain available subject to the cutoff.

## Security and consistency

Every admin page/action resolves the session server-side; mutations independently require organizer authorization. Passwords use salted PBKDF2-SHA512 with 100,000 iterations. Only a hash of each random 256-bit session token is persisted. Cookies are HTTP-only, SameSite Strict, Secure on HTTPS, and have no persistent browser expiry. Database sessions have an additional 24-hour maximum; logout removes the session. A persistent global limiter permits five login attempts per fifteen-minute window for the one shared account. Responses are private/no-store and noindex; SvelteKit's same-origin form protections remain enabled.

Optimistic versions and `admin_write_receipts` abort the whole D1 batch when a conditional write loses a race. Audit records store the organizer, event and action, never participant names, dietary notes, comments or raw credentials. Participant notifications and audit writes commit with the change. Existing retention cleanup removes linked participant/outbox records as before; admin receipts contain no participant identifiers.

Schema formatting is repeatable with `npm run format:schema`. Formatting alone caused no migration. Migration `0005_nifty_silver_surfer.sql` adds login throttling, anonymous write receipts and recipe versions for the admin functionality.

## Validation and remaining gates

Automated coverage includes authentication hashing/session expiry/throttling, every mutation's unauthenticated access check, stale edits, role/capacity constraints, gathering rescheduling/cancellation, notification rollback, contacted-person FIFO promotion and exact 19:00 cutoff, Amsterdam DST validation, special-date rules, recipe publication and local R2 image ownership/order.

Browser verification checked login redirect/login/logout, publishing a synthetic recipe, browser photo conversion and local R2 upload, public recipe rendering and 390px layout without horizontal overflow. Synthetic recipe/images were removed afterward; existing participant records and gatherings were not edited. Type checks and a clean-copy Cloudflare adapter build pass.

All 73 tests pass. Location cards follow the next gathering's effective venue. An overridden address without verified map coordinates uses an external OpenStreetMap search link; the default V39 address retains its verified click-to-load embed.

Production remains closed pending SMTP/password-reset delivery, runtime password-hashing cost/security review, deployed rate-limit and session validation, R2 operational approval/configuration, restore/backup controls, scheduled execution, complete privacy review and final accessibility checks. Cloudflare documents [Web Crypto support](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/); a successful local build does not prove production CPU budgets. No password-reset bypass or public administrator setup endpoint was introduced.

## Combined gathering and participant workflow

The Gatherings tab now contains the registration and waiting lists. It defaults to the next scheduled gathering, with a compact selector, description, counts and Edit gathering disclosure. Participants are ordered Confirmed, Waiting list, Undecided, No-show, Cancelled; each status has text and a color badge. Expand a name to edit it, email/role (normal registrations), or notes. Cancellation requires confirmation. Contacted-person waiting-list confirmation retains the existing FIFO and 19:00 rules. The old registration URL redirects here.

Use **+ Add a unique gathering** for a one-off date, location, capacity and description. It does not alter the recurring calendar anchor. Use **+ Add a surprise guest** for an organizer-only, name-only walk-in: no email, private link or email notification is generated. Guests count toward seats and frozen meals. Normally limits block additions; checking the extra-seat/meal acknowledgement and giving a reason atomically raises only this gathering’s limits as needed. The eligible waiting list has priority until 19:00 on gathering day, including when an override is requested.

**Mark no-show** is separate from cancellation and appears for confirmed participants after dinner starts. It is available until identity cleanup, including after dinner ends. Fixed meal counts remain unchanged; the attendance status ceases to count as a confirmed place. Walk-in notes and override reasons must not contain dietary/allergy details. Guests/notes/reasons and no-show markers disappear at the seven-day identity deadline.

Migration 0006 was applied locally. Browser checks created, edited and cancelled a synthetic guest in a synthetic one-off gathering, confirmed selection preservation and checked 390px layout; that synthetic gathering/guest was then removed. Existing participant records were preserved. Nothing deployed.

Layout refinement: the gathering information and participant list sit side by side on desktop and stack on narrow screens. The gathering dropdown updates both panels immediately without a Show button (a submit fallback remains for disabled JavaScript). The adjacent + Add a unique gathering button expands its form below the toolbar. Participant rows form one continuous bordered list with thin separators and no gaps. Keyboard focus stays on the selector during navigation, and a live status announces loading.

Participant summaries now use chips for occupied/available seats, frozen meals and all five statuses. Status counts cover the whole gathering, including organizer-entered people, independently of list pagination. Generic **Add person** replaces the surprise-guest wording: organizers can enter people joining via WhatsApp or in person using only a name, as guests. Existing capacity, meal, waiting-list, override and privacy rules remain in force. Website registrations still require email. Payment tracking awaits confirmation of the organizer’s current document workflow.

Confirmed budget display: the selected gathering has one compact green “confirmed / capacity seats filled” chip and an adjacent “Budget €starter / €main / €dessert” chip on the same row. Calculate server-side using all confirmed participants, including chefs, helper chefs and organizer-entered guests: €2 / €3 / €2 per person, with no subtraction. For 30 confirmed people the display is €60 / €90 / €60. Waiting-list, undecided, cancelled and No-show people are excluded. This is a live planning budget, not payment income or the frozen meal allocation; chef pricing and fixed-meal rules are unchanged. Course names are provided in the chip’s accessible label and tooltip. Available-seat and meal-snapshot chips were removed.

## Group registrations and on-site payment records (15 October 2026)

The public registration form and organizer Add person form accept **additional guests** (0–99), excluding the registrant. Only the registrant takes the selected volunteer role; all additional people are €7 guests. The complete group becomes confirmed, waiting-list or undecided together. Capacity, availability, fixed meals and €2/€3/€2 budgets count every person; volunteer limits count only the lead registrant. Group edits and restoration cannot exceed capacity or fixed meals. Cancel/status changes apply to the whole group. Admin rows show name + extra guest count; participant heading counts confirmed people, while pagination still counts registration records. Status chips count people across the full gathering.

Status badges are now dropdowns that save immediately. Cancelling requires no separate checkbox/button. Restoring a status still checks current capacity, role limits, active email uniqueness, opening/deadline rules and waiting-list priority; a freed place cannot be guaranteed. Waiting-list confirmation requires ticking Contacted and remains limited to the gathering-day before-19:00 window. No-show requires confirmed status and dinner having started. Versions prevent stale controls overwriting another change, and notification intents/audits remain atomic.

Paid checkbox and euro amount record money received **on site**, without processing payments. Default amount is €7 per guest/helper and additional person; the lead chef remains free. Amount can record multiple people or an extra contribution. Solo unpaid chefs show Free. Paid/unpaid and amount can be corrected after 19:00 and after dinner, while the participant record exists; the seven-day identity deadline still applies. Unchecking clears the stored payment marker/amount. Status changes do not manufacture refunds or clear an actual payment automatically. No payment amounts or identities are copied into audit records.

Migrations 0007/0008 add payment timestamp, integer cents and additional-guest count. Group/payment data is deleted with participant records at scheduled dinner end +7×24h, including cancelled events. No import, export, online payments or deployment is introduced.

Migration 0009 adds previous_status on participant rows. Cancellation stores its source state so restoring a cancelled undecided/waiting entry cannot bypass confirmation deadlines or contact requirements; legacy cancellations without known history use the conservative cutoff. Whole-group waiting/undecided choices are supported by public registration; organizer-added groups retain the confirmed/cancelled/no-show statuses and explicit limit override from the original Add person flow.

Validation: all 79 automated tests pass. Browser QA verified a synthetic three-person group, an extra €28 payment, instant cancellation and restoration with payment preserved, and 390px layout without overflow. The synthetic row was removed; existing participants were preserved. Local migrations 0007–0009 are applied. Nothing deployed.

Mobile organizer refinement: gathering selector and an icon-only + button share one row; the button retains its accessible name. Organizer/gathering page headings are visually hidden on narrow screens while retained for screen readers. Status, amount and the larger 24px Paid checkbox follow matching DOM/visual order, with payment on the right and 44px touch targets. Number-input spinner/keyboard steps use €7; manually entered cent amounts remain valid. Desktop labels remain visible. Type checks and 320/390px browser checks pass; synthetic group/payment data removed.

## Actual chef expenses and balance (15 October 2026)

Removed the per-status count chips above the participant list. Chef rows replace Free with actual ingredient cost and Reimbursed controls; chef participation remains free. Chefs pay first and are reimbursed for their actual recorded cost, regardless of the estimated course budget. Amounts save on leaving the field; the reimbursement checkbox records that the full current cost has been reimbursed. Editing cost does not change money previously recorded as reimbursed: any difference remains payable (or is labeled over-reimbursed). A chef with additional guests still has a separate on-site income/payment control for those guests.

The gathering summary uses all retained participant records, including cancelled/no-show entries whose money was received/spent: Received = recorded participant payments; Chef costs = actual costs; To reimburse = actual costs minus recorded reimbursements; Balance after costs = received minus actual costs. Cash after reimbursements is shown separately. Missing costs for confirmed chefs make the balance provisional; entering an actual zero cost clears that notice. Course budgets stay estimates and do not drive the balance.

Migration 0010 adds integer-cent costs, reimbursements and a recorded-cost timestamp to normal registrations, with nonnegative/integer guards. Expense/payment records are editable until identity retention expires and are deleted with the participant at scheduled end +7 days. This records on-site bookkeeping only; it does not transfer money, store receipts, assign courses or create permanent financial histories.

Validation: 81 tests pass, including cost corrections after reimbursement, stale writes, actual balance calculations, missing/zero costs and retention. Browser QA verified a €14 received / €13.50 cost / €12.50 reimbursed example: €1 still due, €0.50 balance after costs and €1.50 cash remaining. Mobile 320/390px fit checked; both synthetic records removed and existing participants preserved. Nothing deployed.

Amount-field refinement: chef costs and participant payment inputs use the same € prefix and field styling, aligned on the right. The visible Cost label is removed while the accessible name remains. Removed the recorded-payments/cash explanatory sentence from the balance panel. Screenshot QA used an isolated future synthetic gathering with 16 confirmed people (3 chefs), €91 received and €89 actual costs, producing a €2 balance; all preview records were removed afterward. Desktop and 320/390px layouts checked without horizontal overflow. Nothing deployed.

Removed the redundant per-chef reimbursement helper line. Expense controls and gathering reimbursement totals remain available.

Chef registrations appear first, with status/FIFO ordering within the chef and remaining groups and a thicker divider below the final chef. Chef costs and contributions share number typography and aligned checkbox columns.

Paid/Reimbursed text precedes the checkbox in both DOM and visual order. Checkboxes align at the right edge; the entire label remains a minimum 44px-high touch target.

Payment/reimbursement checkboxes are 32px with zero native margins and a 44px minimum label height. Narrow participant controls wrap as needed, retaining right alignment and unbroken labels.

Participant role labels remain visible beside names on mobile, wrapping long labels when needed.

The participant editor keeps Role and Additional guests side by side in a two-column row at mobile widths.

Role and Additional guests controls use matching 48px heights and bottom alignment, including when labels wrap.

Participants with retained dietary/allergy notes show a yellow Allergy/Allergie badge with green text before their role, including on mobile. It disappears when the notes are purged or excluded after the dietary retention deadline.

The combined gathering participant editor hides the email field and preserves the saved email when other details are edited. Public registration still requires email for participant communications.

Valid chef cost edits immediately preview total costs, outstanding reimbursements and balance before saving on blur. Preview/Saving notices distinguish unsaved values. Responses refresh authoritative totals; errors remove the preview and restore the stored cost while showing the error. Server validation, versions and reimbursement history are unchanged.

Chef grocery costs save on committed change as well as blur, with a pending guard against duplicate submissions, native validation feedback and a Saved confirmation.

Amount fields now use typing-only editing with decimal mobile keyboards: native spinner arrows are hidden and Up/Down increments disabled. Grocery costs save on blur only, superseding change-event saving, to prevent repeated writes when stepping values. Live preview and Saved feedback remain.

Removed the Saved confirmation label; Saving and error feedback remain available.

Removed per-chef Saving text as well; shared gathering feedback and inline errors remain.

To reimburse has a yellow background with green text while outstanding cents are positive; the highlight clears at zero and follows live previews.

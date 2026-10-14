# Designer handoff adaptation — 14 October 2026

Subsequent organizer amendment: gray dates now indicate registration has not opened, superseding the original styling-only rule below. Cards and disabled form choices show the opening date; only the next two gatherings accept signup, subject to the existing cutoff. Openings are midnight Amsterdam after the dinner two occurrences earlier.

The organizer supplied the official Instagram and Facebook profiles; these appear as external footer links without social embeds. Chef role copy now mentions help and tips from professional chefs. The organizer approved describing TGV as a nonprofit community initiative in the bilingual introduction.

The hero divider uses larger, simple two-leaf sprout silhouettes following the user's visual feedback.

Current registration status supersedes the initial disabled preview described below: a local-only registration slice is now available after local setup. Production remains closed. See REGISTRATION.md for implemented actions, private management, email-delivery limitations and remaining gates.

User approved the visual direction in `TGV-DESIGN.md` and the accompanying `index.html`, and confirmed V39, Veemarktstraat 39, 5038 CT Tilburg, and tilburg@goesvegan.nl. Product requirements take precedence over the mockup.

Implemented in SvelteKit: paper/butter/forest palette with raspberry actions, Fredoka 400–600 and Karla, photo hero with mobile crop and dark overlay, a gently curved cream edge with sparse sprout silhouettes (a subsequent user-requested visual refinement), thin borders and 3px corners, subtle card shadow, evening cards, photo gallery, four-date agenda, volunteering roles, recipes empty state, registration preview, footer and mobile action bar. The first two agenda dates use normal styling; the following two are gray with readable contrast and dashed borders. Gray styling adds no opening restrictions.

Both languages have localized copy and image descriptions. The POST language action validates its input and saves a preference cookie. Fonts are bundled locally; there are no Google Fonts calls. Only optimized image variants from the designer's `img/` directory are copied to `static/img/`; large originals remain outside the app. Published content uploads still target R2 in the later content increment.

Language switching is progressively enhanced: text changes immediately, a background POST saves the HTTP-only cookie, and event data/scroll/images remain in place. A locale store belongs to each layout instance, avoiding shared SSR state and keeping client navigation consistent. Failed saves restore the previous locale and display an error; requests are serialized by disabling the switch while saving. Without JavaScript, the form retains its POST/redirect behavior.

The visual form is disabled and accepts no participant data. It shows full name, email, the agreed three roles, gathering, optional dietary information, explicit dietary consent and comments. Registration actions, undecided flow, tokens, notifications and privacy cleanup remain subsequent tested increments. No group bookings, five-person cooking limit, Craft CMS, recipe submissions, comments, news module, invented recipes or fake dates were introduced.

Confirmed venue/contact defaults are installed by migration without overwriting already configured defaults or changing existing events. The page shows the confirmed contact and location; persisted event venue overrides are used in the hero and agenda. The privacy page is an explicitly pending-review summary, not a completed legal notice. Final domain, social links, controller identity and image permissions review remain prelaunch items. The supplied social image uses Dutch copy; locale-specific social artwork remains a later content refinement.

No deployment or publication. The designer's source files remain untouched.

Validation: Svelte/TypeScript reports zero errors/warnings; all twelve automated tests pass, including confirmed defaults and generation invariants; the new migration applies locally. Browser QA checked desktop and 390px mobile layouts, no horizontal overflow, loaded photos, disabled form controls, the first-two/later-two date styling and language persistence after reload. A clean local copy builds with the Cloudflare adapter; building into the existing `.svelte-kit/cloudflare` output remains blocked by the running development server's Windows directory lock.

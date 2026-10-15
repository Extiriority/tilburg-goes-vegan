# Recipe editor

Recipe allergens: an optional organizer checklist uses the shared allergen catalog, including Coconut and secondary cross-contact categories. Only explicitly selected categories are stored and shown as possible-allergen chips on the public recipe. An empty selection makes no allergen-free claim; categories are never inferred from ingredient prose. These are recipe facts, not participant dietary information. Migration 0018 adds validated recipe allergen JSON (default []).

Photo cropping: choose a new file or Adjust current photo, then use zoom and horizontal/vertical position sliders with a live 4:3 preview. Use crop prepares both optimized WebP sizes locally; Upload/Replace persists them through the existing version-checked path. Moving a slider invalidates prepared files until Use crop is pressed again. Adjusting an existing image uses its saved optimized version; retain the original for future wider crops. No change reaches storage until the upload/replace action.

The YouTube iframe uses strict-origin referrer policy so its required player identification contains only the site origin, never the recipe path or query. Global no-referrer protection remains in place for other requests, including private registration links. This avoids YouTube error 153 caused by an entirely missing referrer.

Migration 0017 adds optional serving count (1–1000) and total time in minutes (1–10080). Both display on cards and recipe details only when provided. Serving weight in grams remains a separate per-serving value and is also shown on cards when present. Existing recipes retain NULL for unspecified values; no timing or serving count is inferred.

Organizer recipes use separate quantity/ingredient rows and numbered preparation fields. Filling the final row adds another blank row; empty trailing rows are omitted on save. Recipe notes grow the same way. Choose Link on a note, then click ingredient or preparation fields (or their keyboard-accessible Link buttons) to attach/remove references. Done exits linking. Deleting a row updates remaining references. Numbered public links jump to notes and back to their targets.

Slugs are generated server-side from titles: normalized lowercase letters/numbers and hyphens, maximum 120 characters. Duplicate slugs fail without overwriting another recipe. Changing a title changes its URL; no automatic redirect history is included in this increment. Existing ingredient/step records remain readable, including multiline preparation text.

Optional metadata: serving grams and kcal per serving, entered by the organizer; no daily percentages or inferred nutrition. Optional YouTube URLs accept only HTTPS YouTube video links and persist a validated video ID. The public tutorial uses youtube-nocookie.com and connects only after Load YouTube tutorial is clicked.

Photos are optional after the first save: choose one image, replace it or delete it, and edit its accessible description. The image is automatically the recipe/showcase cover. New uploads replace all previous recipe photos atomically. Legacy multiple photos remain until an explicit replace/delete action, which the editor explains. Old unreferenced full/thumbnail objects are deleted; failed storage cleanup retains asset metadata and retries on the next photo operation. Images still referenced by another recipe/showcase are preserved. R2 setup/deployment remains a separate gate.

Cook Mode is off by default and requests the browser's screen wake lock only on explicit activation. It shows the actual active/unavailable state, reacquires when returning to the visible page, and releases when switched off or leaving the page. Browser/system restrictions can prevent it from keeping the screen awake.

Migration 0016 adds recipe notes, YouTube video ID, serving grams and kcal. Ordered lists and notes publish atomically with optimistic recipe version checks. Recipe bodies are rendered as text, never raw HTML.

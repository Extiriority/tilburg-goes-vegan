# Accessibility checks

The homepage and registration forms use semantic controls, labels, localized document language, image descriptions, visible focus styles and reduced-motion support. Agenda dates expose one complete localized date; visual ordinals are decorative.

Registration errors reference their fields through `aria-describedby`. Enhanced failed submissions focus the first invalid control, or the error summary when no field is identified. Management consent errors reference their checkbox; management success and error feedback receives focus after enhanced actions. Private-link copy instructions remain associated with the link field, with a separate polite status message. Language controls expose full language names and 32×44px targets.

Scroll padding/margins reserve space for the sticky header and mobile action bar. At widths up to 400px the duplicate header registration action is hidden; the bottom registration action remains available.

Verified locally on 14 October 2026:

- A synthetic submission lacking dietary consent was rejected before database writes; focus moved to the checkbox and its specific error was associated correctly.
- Keyboard navigation at 320px kept the focused consent control between the header and bottom action bar.
- No horizontal document overflow at 320px and 640px, covering narrow-screen reflow sizes comparable to a 1280px viewport at 400% and 200% zoom. Actual browser zoom has not been tested.
- Contrast calculations: muted agenda text against paper2 4.79:1, body muted text against paper 5.99:1, white action text against raspberry 5.00:1, error text against its background 7.05:1.

Remaining launch checks: real screen-reader navigation (for example NVDA), actual 200–400% browser zoom, contrast over all photographic backgrounds, loaded map keyboard behavior, and complete management flow review. These targeted checks do not certify WCAG conformance.

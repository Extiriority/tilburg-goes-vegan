# Instructions for Codex

Read `docs/TECHNICAL_SPECIFICATION.md`, `docs/DATABASE_SCHEMA.md`, `docs/PRIVACY_REQUIREMENTS.md`, `docs/IMPLEMENTATION_PLAN.md`, and `docs/OPEN_QUESTIONS.md` before changing code. Treat them as product requirements, not as proof that every infrastructure feature is feasible.

- Stack: SvelteKit, TypeScript, Tailwind custom components, Cloudflare Workers, D1, Drizzle, R2, Zod.
- Keep all business decisions server-side. Use explicit state transitions and atomic capacity handling.
- No participant accounts, online payments, export, course selection, or public WhatsApp invite.
- Use Europe/Amsterdam for event scheduling and UTC for persisted timestamps.
- Treat privacy as a core feature: dietary purge +1 day; identifying data purge/anonymization +7 days.
- Never commit secrets, real participant data or private WhatsApp invitation links.
- Write tests for deadlines, concurrent capacity, waiting list, idempotency and deletion.
- Work incrementally. First inspect repository, identify uncertainties, propose milestones, then implement a small tested slice.
- Ask for approval before choosing third-party paid services or altering agreed product behavior.
- Maintain a concise changelog and update docs when requirements change.

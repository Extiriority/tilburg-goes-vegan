# Tilburg Goes Vegan — Codex handoff

This ZIP contains an editable technical handoff and matching 20-page PDF. It is **not** an implemented website.

## Start
1. Extract into a new Git repository.
2. Open the repository with Codex.
3. Ask Codex to read `AGENTS.md` and `docs/`, validate risks, and scaffold phase 1.
4. Provide real venue, capacity, organizer contact and credentials separately; never commit secrets.

## Suggested first Codex prompt
> Read AGENTS.md and all docs. Audit the specification for contradictions and platform feasibility, especially SMTP, D1 atomic registration and backups. Produce an incremental plan. Then scaffold the project, Drizzle schema and tests without deploying or inventing missing settings.

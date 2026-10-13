# CLAUDE.md

## Git rules

### Commits
- Don't commit or push unless I say so.
- Max 4 words per title.
- No generic verbs ("Add", "Update", "Fix", "Implement"). Write titles casually, like a person talking.
  Examples: "Login is ready", "Login finally works", "Faster dashboard loads", "Killed that memory leak", "Dark mode everywhere"
- No "Co-Authored-By: Claude" lines.

### Branching
- Never commit directly to `main`/`master`. Use a feature branch.
- Don't create new branches unless I say so.

## Package manager
- Use npm only. Never yarn or pnpm.

## Secrets
- Never commit .env files or print their contents.
- Never hardcode API keys, DB URLs, or tokens.

## Database
- Never run destructive migrations (`prisma migrate reset`) without asking first.
- Run `prisma generate` after editing schema.prisma.

## Docker
- Don't modify Dockerfiles or docker-compose.yml without asking first.

## Scope
- Don't refactor unrelated code while fixing a bug or adding a feature.
- Ask before adding new dependencies.

## Testing
- Run existing tests before declaring a task done.
- Don't delete or skip failing tests to force a pass.

## Code style
- TypeScript: no `any` unless justified with a comment.
- Function components + hooks only, no class components.
- Tailwind: use theme tokens, not hardcoded hex colors.

## Commands
- `npm run dev` — start dev server
- `npm test` — run tests
- `npm run lint` — lint check
Run lint + tests before committing.

## Copy
See COPY.md for marketing/landing page copy rules.

## SEO
See SEO.md for on-page SEO rules.

## Design
See DESIGN.md for typography and design system rules.

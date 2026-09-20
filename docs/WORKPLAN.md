# Workplan: Stabilise, Collect Leads, Onboard Clients

Source: [AGENCY_PLATFORM_AUDIT.md](AGENCY_PLATFORM_AUDIT.md) (section numbers below refer to it).
Goal: a freelancer can capture a lead, follow it up, win it, and onboard the client, with every detail typed once.
Status: **plan only, nothing started.** Effort is a rough estimate for one developer (S = under 1 day, M = 1 to 3 days, L = 3 to 5 days).

## Working rules (from CLAUDE.md)

- One feature branch per phase, never commit to `main`. Commit titles: max 4 words, casual, no "Add/Update/Fix/Implement", no Co-Authored-By line.
- `npm` only. **No new dependencies without asking first.** This plan needs none.
- After any `schema.prisma` edit run `prisma generate`. Never run `prisma migrate reset`. Test migrations on a Neon dev branch, not production.
- Do not touch Dockerfiles or docker-compose without asking.
- Do not delete or skip failing tests. Run lint and tests before each commit.
- Tailwind theme tokens only, no hex colors. Function components and hooks only. No `any` without a comment.
- Do not refactor unrelated code.

## Phase overview

| Phase | Name | Outcome | Effort | Branch |
|---|---|---|---|---|
| 0 | Safety net | Tests and lint run and pass | S | `fix-test-lint` |
| 1 | Blockers and security | Contracts deployable, no owner escalation, tenant leaks closed | M | `security-blockers` |
| 2 | Client record | One `Client` table with a stage, backfilled from existing data | L | `client-record` |
| 3 | Collecting leads | Manual and public lead capture, follow-ups, lead list | L | `lead-capture` |
| 4 | Client onboarding | Convert, invite from record, checklist, intake form | L | `client-onboarding` |
| 5 | Finance basics (next, after onboarding) | Payment record, invoice lock | M | `payments-basics` |

Phases 0 and 1 are prerequisites. Phases 2 to 4 are the focus. Phase 5 is listed so it is not forgotten; it is not required for leads and onboarding.

---

## Phase 0: Safety net

**Why first:** 30 of 39 backend test files fail to load and lint crashes, so no later change can be verified (audit §40, P0-3, P0-4).

| # | Task | Files | Done when |
|---|---|---|---|
| 0.1 | Add `resolve.alias` for `@` to `./src` in vitest config | `backend/vitest.config.ts` | `npm test` loads all 39 files |
| 0.2 | Triage any tests that now fail for real reasons; fix the code or the test expectation, never skip or delete | `backend/src/**/*.spec.ts` | All backend tests pass |
| 0.3 | **Partly done.** ESLint is not a dependency of either app. `lint` now runs `tsc --noEmit`. Real ESLint needs new packages: **needs your approval** | `backend/package.json` | Decision pending |
| 0.4 | Confirm frontend `next lint` works; same fix if not | `frontend/` | Frontend lint runs |
| 0.5 | Decide what to do with the 3 uncommitted changes (greeting text, `baseUrl` removal, `icon.svg`): commit them on this branch or discard | git | Working tree is clean |

**Exit check:** `npm test` and `npm run lint` pass in both apps.

---

## Phase 1: Blockers and security

| # | Task | Ref | Files | Done when |
|---|---|---|---|---|
| 1.1 | Create the missing migration for `contract` and `contract_version`. Generate with `--create-only` on a dev branch, review the SQL, then apply | D1, P0-1 | `backend/prisma/migrations/` | A database built only from migrations has both tables |
| 1.2 | Diff migrations against the schema with a shadow DB to find any other drift | D2 | prisma CLI | No unexpected diff, or drift documented |
| 1.3 | Only owners may invite or promote to `owner`. Hide "owner" in the admin UI. Add a test | SEC-1, P0-2 | `clients.service.ts`, `clients.controller.ts`, `clients/page.tsx` | Admin invite with role owner returns 403 |
| 1.4 | **Deferred.** Require verified email to accept an invitation. Could lock out invited clients if Neon Auth does not enforce verification at sign-up; verify against a live sign-up first | SEC-7 | `organizations.service.ts` | Unverified user gets a clear error |
| 1.5 | Validate `Contract.clientId` is a member of the org on create and update | SEC-2 | `contracts.service.ts` | Foreign user id returns 400 |
| 1.6 | Remove `status` from the contract PATCH DTO, or whitelist it | SEC-5 | `contracts.dto.ts`, `contracts.service.ts` | Arbitrary status rejected |
| 1.7 | Scope search: resolve org members first, filter `clientProfile` by org | SEC-3 | `search.service.ts` | Test proves no cross-org company leak |
| 1.8 | **Done differently:** explicit guards on `notifications`, `push` and `auth/me` (a global guard would break the org-less onboarding/account routes). Original idea: make `AuthGuard` global with `@Public()` opt-out; keep public routes explicit (branding public, webhooks, token signing, health) | SEC-4 | `app.module.ts`, public controllers | Unauthenticated `/notifications` returns 401, public routes still work |
| 1.9 | Manual `paid` sets `paidAt` and `paidAmount` and notifies; block line-item edits unless `draft` | F1, F2 | `invoices.service.ts` | Tests cover both |
| 1.10 | Add a regression test for each fix above | | specs | Tests fail without the fix |
| 1.11 | Reconcile README and `railway.json` with the real layout (no root `package.json`). **Confirm with you how production is deployed first** | §3.5 | `README.md`, `railway.json` | Docs match reality |

**Exit check:** tests and lint pass; migration applied on a dev branch; manual smoke test of invite, contract create, search, invoice paid.

---

## Phase 2: Client record

The hinge for everything after it. All changes are **additive and nullable**; portal access (`Member`, `ProjectClient`) is not changed.

| # | Task | Files | Done when |
|---|---|---|---|
| 2.1 | Design review with you: confirm fields and stages (see decisions below) | audit §46.1 | You approve the field list |
| 2.2 | Add `Client` model: org FK, name, company, email, phone, whatsapp, website, industry, location, `stage` (`lead`, `active`, `past`, `lost`), source, interestedIn, estimatedBudgetCents, priority, nextFollowUpAt, lostReason, notes, ownerId, archivedAt. Indexes on `(organizationId, stage)` and `(organizationId, nextFollowUpAt)` | `schema.prisma` | `prisma generate` succeeds |
| 2.3 | Add `ClientContact` (clientId, optional userId, name, email, phone, isPrimary) | `schema.prisma` | Same |
| 2.4 | Add nullable `clientId` to `Project`, `Invoice`, `Contract`, `Document` | `schema.prisma` | Same |
| 2.5 | Migration file (non-destructive), tested on a Neon dev branch | `prisma/migrations/` | Applies cleanly |
| 2.6 | Backfill script: for each `Member(role=member)` create a `Client` (from `ClientProfile` and Neon Auth user) plus `ClientContact`; set `Project.clientId` from the first `ProjectClient`; idempotent and re-runnable | `backend/src/database/backfill-clients.ts` | Run twice, no duplicates; counts match |
| 2.7 | `clients` API: list (filter by stage, source, follow-up due; search), get, create, update, archive. Every query scoped by `organizationId`. Owner/admin only | new `backend/src/client-records/` module (new name avoids clashing with the existing `clients` module that manages members) | Endpoint tests including tenant isolation |
| 2.8 | Keep `maxClients` plan counting as is until you decide (open question) | `billing` | No behaviour change |
| 2.9 | Generalise `ActivityLog`: nullable `projectId`, add `clientId`, `entityType`, `entityId`, `kind` (`note`, `call`, `whatsapp`, `email`, `meeting`, `system`), `occurredAt`. Route contract writes through `ActivityService` | `schema.prisma`, `activity/`, `contracts.service.ts` | Existing rows still valid |
| 2.10 | Activity API: add manual entry, list by client | `activity/` | Tests |

**Exit check:** existing portal, invoices and contracts behave exactly as before; new tables populated by the backfill.

---

## Phase 3: Collecting leads

| # | Task | Files | Done when |
|---|---|---|---|
| 3.1 | Sidebar: add **Leads** (and later Clients) entry; move Team under Settings | `sidebar-nav.tsx` | Nav updated |
| 3.2 | Leads list page: stage filter, source filter, "follow-up due" filter, sort by next follow-up, empty and loading states | `frontend/src/app/(dashboard)/dashboard/leads/` | Usable with 0, 1, 100 leads |
| 3.3 | "+ Lead" quick add: name plus at least one of email, phone or WhatsApp; everything else optional | same, modal | Under 15 seconds to add |
| 3.4 | Lead detail: fields, stage selector (New, Contacted, Qualified, Proposal sent, Won, Lost with reason), next follow-up date, activity timeline, "Log call/WhatsApp/email/note" | `leads/[id]/` | Status and activity are separate |
| 3.5 | Follow-up reminder: cron (pattern from `document-reminder.task.ts`) builds a daily digest of follow-ups due and overdue for owners; email plus in-app | new task in `client-records/` | Digest arrives once per day, not per lead |
| 3.6 | Dashboard card "Follow-ups today" | `dashboard/page.tsx` | Shows count and links |
| 3.7 | Public lead endpoint `POST /leads/public/:slug`: `@Public()`, resolves org by slug only, strict throttle, honeypot field, length caps, sanitize input, dedupe by email within org (adds activity instead of a second record), org switch to disable | new `leads-public` controller | Security checks below pass |
| 3.8 | Public form page at `/<slug>/contact`, org branding, success state, no file upload | `frontend/src/app/(public)/` | Submits and shows confirmation |
| 3.9 | Owner notification on new lead (in-app and email); set `nextFollowUpAt` to tomorrow | `notifications/`, new React Email template | Owner is notified in seconds |
| 3.10 | Settings: enable or disable form, choose fields, copy public link | `settings/` | Toggle works |

**Security checklist for 3.7:** tenant from slug only; per-IP and per (org, email) throttle; no user-enumeration in responses; payload size limit; escaped output in emails; leads never returned by any portal route (assert with a test).

**Exit check:** acceptance tests 1 to 3 and 6 from audit Appendix D.7.

---

## Phase 4: Client onboarding

| # | Task | Files | Done when |
|---|---|---|---|
| 4.1 | "Mark as Won" turns the lead into an active client and shows two actions: **Create project** and **Send onboarding** | leads detail | No re-entry of details |
| 4.2 | Create project from client: client picker preselected, dates, optional budget field (adds `Project.budgetCents`, nullable) | `projects/page.tsx` modal | One dialog |
| 4.3 | Invite from the client record: prefilled email, project name in the email, clear first action; replace generic invite copy | `clients.service.ts`, `email/templates/invitation.tsx` | Invite mentions the project |
| 4.4 | Link the invited user to the `ClientContact` and the project (`ProjectClient`) automatically on acceptance | `organizations.service.ts` | No manual assign step |
| 4.5 | Notify owner when the invite is accepted | `notifications/` | In-app and email |
| 4.6 | Onboarding checklist: reuse `Task` with new `visibility` (`internal` or `client`) and optional linked entity (document, invoice, form). Default items: Sign agreement, Pay deposit, Complete intake, Upload assets. Items self-tick when the linked object completes | `schema.prisma`, `tasks/` | Ticks without manual action |
| 4.7 | Task visibility flag applied to client task queries (`internal` hidden from portal); default `client` so nothing changes for existing data | `tasks.service.ts` | Test: internal task not returned to a client |
| 4.8 | Intake form: `FormTemplate` and `FormResponse` (JSON answers), one seeded "Website project intake" template using your field list from the brief | `schema.prisma`, new module, seed | Client can save a draft and submit |
| 4.9 | Portal "Get started" home for new clients (checklist first, project list second); portal intake page | `(portal)/portal/` | Empty project list no longer shown as first screen |
| 4.10 | Owner view: onboarding progress on the client detail page; intake answers readable and copyable into project description | `leads/[id]/` or `clients/[id]/` | Visible on one page |
| 4.11 | Client detail page (tabs: Overview, Projects, Invoices, Files, Activity) | `clients/[id]/` | Full history in one place |

**Exit check:** acceptance tests 4 and 5 from Appendix D.7.

---

## Phase 5: Finance basics (after onboarding)

| # | Task | Done when |
|---|---|---|
| 5.1 | `Payment` table (invoice, amount, method, reference, date); manual "Record payment" dialog; Stripe path writes the same record | Partial and offline payments recorded |
| 5.2 | Invoice status derived from payments; add `partially_paid` | Status matches payments |
| 5.3 | One shared `invoiceTotals()` replacing the three calculators | Stats, checkout and PDF agree |
| 5.4 | Overdue invoice notification | Owner notified once |
| 5.5 | Link the Invoices page in the sidebar | Reachable from nav |

---

## Testing approach for every phase

- New endpoints: unit tests for happy path, wrong-org access (404), wrong role (403) and unauthenticated (401).
- Any public endpoint: abuse tests (throttle, oversize payload, duplicate submission).
- Backfill: run twice on a Neon dev branch and compare counts.
- Manual smoke path after each phase: sign in as owner, sign in as a client (or use preview-as-client), confirm nothing in the existing portal regressed.

## Decisions (made 2026-09-20, owner delegated to me)

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Lead stages | New, Contacted, Qualified, Proposal sent, Won, Lost (with reason). Enough. | Discovery and Negotiation are activities, not stages; fewer stages keeps the pipeline honest. |
| 2 | Public form | Hosted page now. Embed is P3. | Avoids CORS and iframe decisions; a link from the existing site covers it. |
| 3 | Required lead fields | Name plus at least one of email, phone or WhatsApp. Everything else optional. | Lowest friction for quick add and for visitors. |
| 4 | Onboarding checklist | Sign agreement, Pay deposit, Complete intake, Upload assets. Items can be removed per client. | Matches the website-project flow without hard-coding it. |
| 5 | Sign or pay before account | Signing: yes (token links already exist). Paying: needs an account for now. | Reuses shipped behaviour; tokenised payment is P3. |
| 6 | `maxClients` | Count `Client` records with stage `active`. Leads and logins are not counted. | Leads must never hit a plan limit; logins are not the customer. |
| 7 | Production deploy | Assumed from the docs: Railway API, Cloudflare Workers frontend, Neon. Not verified. Task 1.11 (docs cleanup) is not blocking. | Cannot be verified from the repo. |

## Explicitly not in this plan

Milestones, project templates, deliverable approval, expenses and profit reporting, currency, support tickets, meetings, recurring invoices, and all enterprise roadmap items (SSO, webhooks, AI, knowledge base). See audit §55 and §56.

## Suggested order and checkpoints

```
Phase 0 → Phase 1 → [checkpoint: review with you]
Phase 2 → [checkpoint: backfill verified on dev branch]
Phase 3 → [checkpoint: lead capture demo]
Phase 4 → [checkpoint: full lead-to-onboarded-client demo]
Phase 5
```

Do not start Phase 2 until the answers to decisions 1 to 4 are in.

## Progress log

- Phase 0 done (branch merged by owner): `@/` alias fixed, integration specs renamed `*.int.spec.ts` and blocked from the `.env` database (`npm run test:integration` needs `TEST_DATABASE_URL`).
- Phase 1 done on `security-blockers`: owner-invite escalation, contract client and status checks, search scoping, invoice paid and lock rules, guards on 3 controllers, idempotent contracts migration (not applied to any database yet). 1.4 deferred, 1.11 not started.
- Phase 2 done on `client-record`: `Client` and `ClientContact` tables, nullable `clientId` on projects and invoices, generalised activity log, `/client-records` API (stage, lead status, follow-up, lost reason, manual activity), and `npm run db:backfill-clients` (dry run by default, `--apply` to write). **Not run against any database.**
- Phase 3 done on `client-record`: Leads page, add-lead dialog, lead detail with status, won/lost and activity log, public contact form at `/contact/<workspace-slug>` (opt-in switch on the Leads page, off by default), owner notification, daily 08:00 follow-up digest, dashboard "Follow-ups due" card. Email notification for new leads is not built yet (in-app and push only).
- Phase 4 done on `client-onboarding` (contains everything above): checklist with derived completion, portal "Get started" card and questionnaire, invite from the client record with project context, login linked to the client and its projects on acceptance, owner notified on join and on questionnaire submit, project creation from a client, questionnaire answers copied into internal project notes.
- **Design change:** the checklist is its own small table (`onboarding_item`) rather than an extension of `Task`, and completion is read from the linked document, invoice or form. This avoids touching shared task, document and payment code. Task visibility (internal vs client) is therefore still open (old 4.7).
- Still open: real ESLint (needs approval), 1.4 verified email, 1.11 docs/railway cleanup, `maxClients` counting `Client` records, Payment table (Phase 5), task visibility flag.
- **Before merging:** apply the four new migrations to a Neon dev branch and run `db:backfill-clients` there first (dry run, then `--apply`), then click through the checks below.

## Manual check after applying the migrations (about 15 minutes)

1. Leads page: turn the public form on, open the copied `/contact/<slug>` link in a private window, submit with only a WhatsApp number. The lead appears with a follow-up for tomorrow and you get a notification. Submit again with the same email: one lead, two timeline entries.
2. Add a lead by hand, log a call, change its status, mark it lost (reason required), reopen it.
3. Mark a lead Won, then Create project: the dialog is prefilled and the project opens.
4. Start onboarding with "email a portal invitation". Accept the invite in a private window with the same email: you get a "joined the portal" notification, and the client sees a Get started card and the project.
5. As the client, fill in the questionnaire (save draft, then send). Required answers are enforced. As staff, view the answers and copy them into the project notes.
6. Link the agreement step to a document and the deposit step to an invoice. Sign the document and pay or mark the invoice paid: the steps tick themselves.
7. Existing clients: run `npm run db:backfill-clients` (dry run) and check the counts before `--apply`.
8. Regression: existing clients still see their projects, invoices and documents; a client cannot see any lead or another client's checklist.

## Testing log (2026-09-21)

- Backend: 715 unit tests, 43 end-to-end tests over HTTP against a real Postgres, 35 integration tests, mutation check (6 of 6 caught). Migrations verified from an empty database with zero drift. See audit Appendix E.
- Fixed while testing: stale "no organization" session after accepting an invitation, workspace switching ignored by the session cache, case-sensitive email lookup, optimistic tick in the onboarding panel.
- Browser: 25 functional checks (leads, public form, detail, won, create project, onboarding, portal questionnaire, isolation) and 28 dark mode checks passing.
- Found, not fixed (need your decision): undeclared Sentry dependencies (P0), account deletion and admin password reset throwing, custom brand colors not reaching buttons and links.


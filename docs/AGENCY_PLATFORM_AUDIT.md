# Freelancer Client & Project Management Platform
# Full Product & Technical Audit

| | |
|---|---|
| **Repository** | Freelancey (`/Freelancey`, single commit `57414f2`, "Freelancey is Ready") |
| **Audit date** | 2026-09-20 |
| **Scope** | Investigation and documentation only. No source, schema, API, UI, dependency or config was changed. |
| **Working tree at audit time** | 3 uncommitted changes that pre-date this audit: `backend/src/app.controller.ts` (greeting text), `backend/tsconfig.json` (removed `"baseUrl": "./"`), untracked `frontend/public/logo/icon.svg`. Assessed in §3.4; none is harmful. |
| **Conventions** | **[FACT]** = verified by reading code or running a command. **[REC]** = my recommendation, not something that exists. **[UNVERIFIED]** = could not be confirmed without a live database, Neon Auth project, Stripe or R2 credentials. |

Status legend used throughout: ✅ COMPLETE · 🟡 PARTIALLY IMPLEMENTED · ⚠️ NEEDS IMPROVEMENT · 🔴 MISSING · ❌ BROKEN

Priority legend: **P0** critical (security, data integrity, core blockers) · **P1** core to the freelancer workflow · **P2** important productivity/usability · **P3** future.

---

## How this audit was done (and its limits)

**[FACT] What I did**

- Read the full Prisma schema (799 lines), the single migration, `app.module.ts`, `main.ts`, the auth middleware/guards, all 30 controllers (every route and its decorators, enumerated mechanically), and the service code for projects, tasks, clients, invoices, payments (webhook path), documents (create/send/respond/status/token), contracts, files, comments, updates, search, calendar, activity, organizations, onboarding and auth.
- Read the frontend shell, sidebar, dashboard, project list, project detail (tab structure), clients page (state and API calls), portal project page (tab structure), and the API client.
- Ran `vitest` (backend and frontend), `tsc --noEmit` (backend), and `eslint` (backend). Compared the migration's `CREATE TABLE` list to the schema's `model` list.
- Checked git history (one commit).

**[FACT] What I did not do**

- I did **not** run the application against a live Neon database, Neon Auth project, Stripe or R2. Runtime behaviour, real click counts and rendering are inferred from code. Anything that depends on those is tagged **[UNVERIFIED]**.
- I did not read every line of the ~10k lines of frontend components or every line of `notifications.service.ts` (1,172 lines) and `documents.service.ts` (1,485 lines). I read the parts that decide behaviour and authorization, and grepped the rest.
- No penetration testing. The security review is a code review.

---

# 1. Executive Summary

**The single most important finding.** The repository is **Freelancey**, an already-substantial *client portal + project + invoicing* product for agencies and freelancers. It is **not** a CRM-to-cash system. The "front half" of the workflow you described (Lead → Contacted → Discovery → Qualified → Proposal → Negotiation → Won) does not exist in any form: there is no `Lead`, `Proposal`, `Meeting`, `SupportTicket`, `Milestone`, `Expense`, `Deliverable` or intake-form model in the database. What exists is strong in the "back half": projects, tasks, updates, files, e-signature, invoices, Stripe payment, time tracking, portal, white-labelling.

**The second most important finding.** There is **no Client entity**. A "client" is a *login account* (a Neon Auth user, with a `Member` row of role `member`, an optional `ClientProfile`, and `ProjectClient` rows linking them to projects). You cannot record a client who has no login. That single design decision is why leads, proposals, pre-sale contracts and "client history" have nowhere to live, and it is the main obstacle to your "enter once, flow through" principle.

**Health snapshot**

| Area | Verdict |
|---|---|
| Backend authorization / tenant isolation | Good. Every business query I read is scoped by `organizationId`, and client access goes through `assertProjectAccess` / `ProjectClient`. A few specific holes exist (below). |
| Deployability | ❌ Contracts feature will fail on a database built from migrations (tables missing from the only migration). |
| Test suite | ❌ 30 of 39 backend test files fail to load (unresolved `@/` alias). Only 114 tests actually run. |
| Lint | ❌ `npm run lint` in backend crashes (ESLint 9 with no config). CLAUDE.md requires lint + tests before commits. |
| Contracts | ⚠️ Can be built, previewed and "sent", but the client can never sign or accept one. Status `signed` is unreachable by the app's own logic. |
| Finance | ⚠️ Invoices and Stripe payments work; there is no payment record, no expenses, no project value, no profit view. |
| Workflow automation | 🔴 Effectively none between entities; each transition is a manual, separate action. |
| Activity log | ⚠️ Narrow: only document responses, decision votes and contract events are recorded. |

**Biggest findings, ranked**

1. **P0 — Missing migration for `contract` and `contract_version`.** [FACT] The baseline migration creates 35 tables; the schema declares 37 models; the two absent tables are exactly the contract tables. Any environment provisioned with `prisma migrate deploy` (the production script `db:migrate:deploy`) has no contracts tables.
2. **P0 — Privilege escalation: an `admin` can invite a new `owner`.** [FACT] `POST /clients/invitations` is `@Roles("owner","admin")` and `InviteMemberDto.role` accepts `"owner"`; `inviteMember()` does no role comparison. The UI also offers "owner" in the team-invite dropdown.
3. **P0 — Test and lint gates are broken**, so nothing currently protects the codebase, and CLAUDE.md's "run lint + tests before committing" cannot be satisfied.
4. **P1 — Contract `clientId` is not validated** against the organization; `create()` then reads that user's name/email from the *global* Neon Auth user table into the contract. An admin can pull another tenant's user PII if they know a user id.
5. **P1 — Search leaks across tenants in one place** (`clientProfile.findMany` without `organizationId`) and can miss results because the global user search is capped at 20 *before* org filtering.
6. **P1 — Contracts have no client action** (no accept/sign), no client notification on send, and `PATCH` accepts any free-text `status`.
7. **P1 — Invoice integrity gaps:** manual "paid" does not set `paidAt`/`paidAmount` or notify; line items stay editable after `sent`/`paid`; invoices have no client link of their own (only via project); numbering sorts lexicographically (breaks past `INV-9999`); no currency or discount/tax fields.
8. **P1 — The "Client → Lead → Proposal" gap** (no Client entity, no CRM, no proposal object) is the main product gap versus your target workflow.
9. **Things that are genuinely good and should not be touched:** multi-tenant scoping, the portal/preview-as-client mechanism, the document/e-signature engine with audit trail, Stripe Connect + direct-key payments with idempotent webhooks, time-tracking-to-invoice, project duplication as a template mechanism, the design system.

**Top recommended next steps** (detail in §61)

1. Fix the four P0 items (migration, invite escalation, test alias, lint config). Small, mechanical, high value.
2. Fix the P1 integrity items (contract clientId, search, invoice paid handling, contract status).
3. Introduce a lightweight **Client record independent of a login** and a **stage** on it (lead → active → past), rather than building a separate CRM. This unlocks leads, follow-ups and proposals cheaply.
4. Add **Proposal** by reusing the existing Contract/Document machinery, and wire **accepted → project + deposit invoice** as the first automation.
5. Add **Milestones** (or reuse task groups) and a **deliverable review** loop, reusing the existing decision-task and document-response mechanisms.

---

# 2. Product Understanding

**[FACT] What the product is today.** A multi-tenant SaaS/self-hostable portal where an *organization* (an agency or freelancer) manages *projects* for *clients*, and each client logs into a white-labelled portal to see updates, tasks, files, contracts, invoices, sign documents and pay invoices. Positioning in README: "open-source client and project management platform for freelancers".

**[FACT] Actors**

| Actor | Represented as | Access |
|---|---|---|
| Freelancer / agency owner | `Member.role = "owner"` | Everything, including payments/billing/settings |
| Teammate | `Member.role = "admin"` | Everything except owner-only actions (settings write, Stripe, role changes, rates) |
| Client | `Member.role = "member"` + `ProjectClient` rows | `/portal/*` and the `mine`/client-scoped API routes |
| Anonymous signer | `DocumentAccessToken` (hashed token) | Public token-based signing endpoints for one document |

**[FACT] The product's implied workflow today**

```
Owner signs up → creates Organization (setup wizard)
   → invites client by email (client must create a login)
   → creates Project (name + description only)
   → assigns client(s) to project
   → adds Tasks / Updates / Files / Time / Notes
   → uploads a PDF as a Document (quote/proposal/contract/nda) OR builds a Contract from a template
   → creates Invoice (manual, or generated from time entries) → sends → client pays via Stripe or off-platform
```

**[REC] How this maps to your target.** Your target adds a pre-sale phase (lead → proposal), a structured client-review loop for design/dev work, a support/maintenance phase, and a "where do I stand with this client" view. The current product already covers roughly the middle 55% of your target workflow.

**[REC] Guardrail restated.** The right direction is *general freelancer platform*, not website-agency ERP. Every website-specific need in your brief (intake questionnaire, project template, contract template) should be expressed as **configurable content** (a template, a form definition) on top of generic objects, not as website-only tables. The existing contract template is currently website-specific in code (§14); that is the one place this guardrail is already bent.

---

# 3. Existing Project Architecture

## 3.1 System diagram

```
                     ┌─────────────────────────────┐
   Browser           │  Next.js 15 (App Router)     │   Cloudflare Workers via OpenNext
   (owner/admin/     │  route groups:               │   (wrangler.jsonc); README also says Vercel
    client)          │   (auth) (dashboard) (portal)│
                     │   (setup)  api/auth proxy    │
                     └───────┬─────────────┬────────┘
                             │ Bearer JWT   │ /api/auth/* proxy (first-party cookie)
                             ▼              ▼
                     ┌───────────────┐   ┌──────────────────┐
                     │ NestJS 11 API │   │ Neon Auth        │  (Managed Better Auth)
                     │ prefix /api   │◄──┤ JWKS verify      │
                     └───┬───┬───┬───┘   └──────────────────┘
                         │   │   └── Stripe (Connect + direct keys + platform billing)
                         │   └────── Cloudflare R2 (S3 API, private bucket)
                         ▼
                  Neon Postgres (Prisma 6)  +  read-only raw access to neon_auth."user"
                         │
                  Email: Resend or SMTP (per-org settings) · Web Push (VAPID per org) · Sentry
```

## 3.2 Request pipeline (backend) — [FACT]

1. `SessionMiddleware` (all routes): reads `Authorization: Bearer <jwt>`, verifies via JWKS, loads the Neon Auth user by raw SQL, resolves active organization from the `active_org` cookie (only if the user is a member) or the most recently joined org, and caches the result **30 s per token**.
2. `PreviewModeMiddleware`: honours `X-Preview-As: <userId>` only for owner/admin, only to impersonate a `member`-role user in the same org, and `PreviewModeGuard` makes that request read-only.
3. Global guards: `ThrottlerGuard` (100 req/min default), `PlanGuard` (billing limits, only when `BILLING_ENABLED=true`), `PreviewModeGuard`.
4. **Per-controller** `@UseGuards(AuthGuard, RolesGuard)` — authentication is *opt-in per controller*, not global. See §30 for the consequence.
5. Services scope every query by `organizationId`; client routes additionally call `assertProjectAccess` or query `ProjectClient`.

## 3.3 Module inventory — [FACT]

`account, activity, auth, billing, branding, calendar, clients, comments, common, contracts, database, documents, email, embeds, files, health, invoices, labels, mail, notes, notifications, onboarding, organizations, payments, prisma, projects, search, settings, setup, shared, tasks, time-entries, updates`. 27,351 lines of TypeScript in `backend/src` (including ~14k lines of specs).

## 3.4 The three uncommitted changes — [FACT]

| Change | Assessment |
|---|---|
| `app.controller.ts`: "Freelance" → "Freelancey" in the `GET /` greeting | Cosmetic; safe. |
| `tsconfig.json`: removed `"baseUrl": "./"` | Safe for builds: Nest CLI's path-rewrite hook defaults `baseUrl` to `./` (verified in `@nestjs/cli/lib/compiler/hooks/tsconfig-paths.hook.js`), and `tsc --noEmit` passes. **It is not the cause of the failing tests** — I re-ran vitest with the HEAD tsconfig (baseUrl restored) and got the identical 30 failures. |
| `frontend/public/logo/icon.svg` (untracked) | Asset; commit or ignore. |

## 3.5 Stale structure documentation — [FACT]

The README and `railway.json` describe a monorepo with `backend/packages/{database,email,shared}` as npm workspaces (`@freelancey/database`, etc.) and a root `package.json` ("`npm run dev -w backend`"). **There is no root `package.json` in the repository**, and the code has moved those packages to `backend/src/{database,email,shared}` imported through the `@/` alias. `backend/packages/*` on disk contains only ignored build leftovers. `railway.json`'s `buildCommand` (`npm run build -w @freelancey/database -w @freelancey/shared ...`) can therefore not work as written unless Railway is configured with a different root/override. **[UNVERIFIED]** how production is actually deployed; the docs and config are inconsistent with each other.

---

# 4. Repository Structure

```
Freelancey/
├── CLAUDE.md  COPY.md  README.md  LICENSE  .nvmrc  railway.json
├── docs/Everything-You-Need-To-Know.md         (env vars, deployment, roadmap)
├── backend/
│   ├── prisma/  schema.prisma (37 models) · neon-auth.schema.prisma (generate-only) · migrations/20260824212536_init
│   ├── src/     33 modules (see §3.3)
│   └── packages/  ← stale, ignored build output only
└── frontend/
    ├── src/app/  (auth) (dashboard) (portal) (setup) api/auth
    ├── src/components/  ui/ (design system) + domain components
    ├── src/lib/  api.ts, auth/, branding, formatting
    ├── DESIGN_SYSTEM.md                        (says it is a "NextAdmin port"; refers to a `dashboard/` reference folder that is not in this repo)
    └── public/sw.js (push service worker)
```

- **[FACT]** Two independent apps, no shared package: `frontend/src/shared/index.ts` is a **duplicate copy** of `backend/src/shared/index.ts` (constants and types such as `PROJECT_STATUSES`, `ROLES`, `CONTRACT_*`). They can drift silently. **[REC, P2]** decide a single source of truth (copy at build time, or a tiny workspace package) — only if drift actually becomes a problem.
- **[FACT]** No `e2e/` directory is committed although `.gitignore` and `.env.example` mention e2e runs.

---

# 5. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15.5 App Router, React 19, Tailwind 3, `class-variance-authority`, lucide-react, `react-pdf` 9 | No form library, no data-fetching library (raw `apiFetch` + `useState`/`useEffect`), no global state library |
| Backend | NestJS 11, class-validator/transformer, Pino, Helmet, Throttler, `@nestjs/schedule` | |
| DB | Neon Postgres, Prisma 6 | `directUrl` for migrations |
| Auth | Neon Auth (Managed Better Auth), JWT verified with `jose` via JWKS | Frontend proxies `/api/auth/*` so the session cookie is first-party |
| Storage | Cloudflare R2 via S3 SDK | A `local.storage.ts` still exists in the tree although docs say "no local fallback" |
| Email | React Email templates; Resend or SMTP, per organization, secrets encrypted with `APP_ENCRYPTION_SECRET` | |
| Payments | Stripe: platform billing (SaaS plans), Stripe Connect and direct-key mode for client invoices | |
| PDF | `pdfkit` (invoices, contracts), `pdf-lib` (signing) | |
| Observability | Sentry (opt-in), Pino | |
| Hosting | Cloudflare Workers (frontend, `wrangler.jsonc`), Railway (API), Neon | README badges also list Vercel |

**[REC]** No technology change is recommended. Every concrete problem found (missing migration, test alias, lint config) is configuration, not a technology mismatch.

---

# 6. Authentication & Authorization

## 6.1 Authentication — [FACT]

- Sign-in/up is handled by Neon Auth; the API never sees passwords. The API verifies the JWT (`stack-auth.client.ts`) and looks up the user from `neon_auth."user"` via a read-only raw query (`neon-auth-users.repository.ts`).
- Onboarding: any authenticated user without an org can `POST /onboarding/signup` to create an organization (throttled to 5/min; can be disabled with `ALLOW_SIGNUPS=false`). New org is seeded with 4 project statuses, branding, settings and the free plan.
- Clients arrive by **invitation**: `POST /clients/invitations` creates an `Invitation` (7-day expiry) and emails `…/accept-invite?id=<invitationId>`. `acceptInvitation` requires the signed-in user's email to equal the invitation email, then creates the `Member` row.

## 6.2 Authorization model — [FACT]

Three roles: `owner`, `admin`, `member` (= client). Enforced by `@Roles()` on routes and by service-level checks.

| Capability | owner | admin | member (client) |
|---|---|---|---|
| Projects/tasks/files/invoices/contracts/documents CRUD | ✅ | ✅ | ❌ (except explicit `mine` endpoints) |
| Post updates/comments on assigned projects | ✅ | ✅ | ✅ |
| Create checkbox task ("request") on assigned project | ✅ | ✅ | ✅ (`POST /tasks/mine`) |
| Vote on decision tasks, respond/sign documents | – | – | ✅ |
| Upload files to assigned project | ✅ | ✅ | ✅ (`/files/upload/mine`, project not archived) |
| Pay invoices | – | – | ✅ (project-assigned only) |
| Settings write, Stripe, member rate, change role | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ |
| Time tracking, notes, search, calendar | ✅ | ✅ | ❌ |

## 6.3 Findings

| # | Finding | Sev | Type |
|---|---|---|---|
| A1 | **Admin can invite an owner.** `clients.controller.ts:136-153` + `InviteMemberDto` (`@IsIn(["owner","admin","member"])`) + `inviteMember()` has no check that inviter's role ≥ invited role. The clients page sends `role: teamInviteRole` where the dropdown allows `"owner"`. An admin can therefore mint owners (who can then remove the real owner, change payments, delete projects). | P0 | Priv-esc |
| A2 | **Three controllers have no auth guard**: `notifications`, `push`, `auth/me`. They read `req.user.id` / `req.organization.id` directly. Unauthenticated calls therefore throw a `TypeError` → HTTP **500** rather than 401 (Sentry noise, and the pattern is fragile: a future edit that forgets a guard is silently public). | P1 | Robustness |
| A3 | `acceptInvitation` does not check `emailVerified`. Anyone who can register (unverified) with the invited address *and* holds the invitation id could accept. The id is only delivered by email, so exploitability is low. | P2 | Hardening |
| A4 | Removing a client (`DELETE /clients/:id`) deletes `ProjectClient` rows but leaves `Contract.clientId`, `Task.requestedById`, `DocumentResponse.userId` etc. pointing at a user with no membership. Data is retained (good for history) but there is no "former client" concept in the UI (shows "Unknown"). | P2 | Integrity |
| A5 | Session cache (30 s per token) means a removed member keeps access for up to 30 s. Acceptable. | Info | |
| A6 | Comment delete and update-edit do not re-check project access for the author (update edit does; comment delete doesn't). A client removed from a project could still delete their own old comment. Trivial. | P3 | |

**[FACT] What is done well:** JWKS verification, `active_org` cookie validated against membership, preview-as restricted to owner/admin → member, read-only enforced server-side, encrypted secrets, decision-vote secrecy until all clients have voted (§19), hashed document access tokens, Stripe webhook org/account cross-checks, upload extension blocklist, SSRF-hardened link unfurling (`safe-fetch.ts`).

---

# 7. Database Architecture

## 7.1 Entities — [FACT] (37 Prisma models)

```
TENANCY         Organization · Member · Invitation
PROJECTS        Project · ProjectClient · ProjectStatus · ProjectNote · ProjectUpdate · Comment
                Task · DecisionOption · DecisionVote
FILES/DOCS      File · Document · DocumentVersion · DocumentResponse · SignatureField
                DocumentAuditEvent · DocumentAccessToken
CONTRACTS       Contract · ContractVersion
FINANCE         Invoice · InvoiceLineItem · TimeEntry
CLIENT INFO     ClientProfile
SETTINGS/BRAND  SystemSettings · Branding
BILLING (SaaS)  SubscriptionPlan · Subscription
COMMS           Notification · PushSubscription · ActivityLog
TAGGING         Label · ProjectLabel · TaskLabel · FileLabel · MemberLabel
EXTERNAL        neon_auth.user (no Prisma model; raw read-only queries)
```

## 7.2 Relationship map — [FACT]

```
Organization 1─* Member ─(userId, plain string)→ neon_auth.user
Organization 1─* Invitation
Organization 1─1 SystemSettings, Subscription
Organization 1─* Label, TimeEntry            ← the ONLY child tables with a real FK to Organization

organizationId as a PLAIN STRING (no FK) on: Project, File, ProjectUpdate, Task, Comment,
   Invoice, ProjectNote, ClientProfile, Branding, ProjectStatus, Document, Notification,
   PushSubscription, ActivityLog, Contract

Project 1─* Task, File, ProjectUpdate, Invoice(nullable, SetNull), ProjectNote,
            Document, Contract, ActivityLog, TimeEntry, ProjectLabel
Project *─* User via ProjectClient(projectId, userId)     ← the only "client ↔ project" link
Client attributes: ClientProfile(userId, organizationId)  ← company/phone/address/website/description
Invoice 1─* InvoiceLineItem 1─* TimeEntry (invoiceLineItemId)
Document 1─* Response, SignatureField, AuditEvent, AccessToken, Version
Contract 1─* ContractVersion ; Contract.clientId = userId (no FK, not validated)
```

## 7.3 Findings

| # | Finding | Sev |
|---|---|---|
| D1 | **`contract` and `contract_version` tables are not in the only migration.** Migration has 35 `CREATE TABLE`; schema has 37 models. Verified: `grep -c contract migration.sql` = 0. Databases created via `db:push` work; databases created via `migrate deploy` do not. | **P0** |
| D2 | **Only one migration exists** (`20260824212536_init`) yet the README's quick start uses `db:push`. So the schema history is not tracked; schema drift beyond contracts cannot be excluded. **[UNVERIFIED]** — a proper check needs `prisma migrate diff` against a shadow DB. | P1 |
| D3 | **No FK from most tables to `Organization`.** Cascade deletion is implemented by hand in `account.service.ts` (a hand-maintained delete list). Any new table added without updating that list orphans data on org deletion (Contract tables are not in the list I read, though they cascade via Project). | P2 |
| D4 | **All user references are unconstrained strings** (`Member.userId`, `ProjectClient.userId`, `Task.assigneeId`, `Contract.clientId`, …) pointing into Neon Auth's schema. This is a deliberate, documented decision (schema comment). Consequence: no referential integrity, orphan ids possible, N+1-style batch lookups (`neonAuthUsers.findMany`) everywhere. Reasonable trade-off; keep, but see §46 for a **Client** table that reduces reliance on it. | Info |
| D5 | **`Invoice` has no `clientId`.** Client visibility is derived: invoice → project → `ProjectClient`. An invoice without a project cannot be seen or paid by any client (`findOneMine` and checkout both throw), yet the API allows creating one (`projectId` optional). | P1 |
| D6 | **No money fields on `Project`** (no budget/value/currency). "Project value / paid / outstanding" is not computable per project except by summing invoices. | P1 |
| D7 | **No currency on `Invoice`** (amounts are integer cents; currency comes from `STRIPE_CURRENCY` env / frontend `formatCurrency` hard-coded to `$`). Multi-currency freelancers cannot be served. | P1 |
| D8 | `Invoice.status`, `Task.status`, `Document.status`, `Contract.status`, `Project.status` are all **free strings**, validated only in DTOs/services. Contract `status` is not validated at all in the DTO (`@IsString() @IsOptional()`). | P1 |
| D9 | `Invoice.invoiceNumber` uniqueness is `(organizationId, invoiceNumber)` (good), but next-number logic uses `orderBy invoiceNumber desc` (string sort) in `create` and `createUploaded`; `time-entries.generateInvoice` correctly orders by `createdAt` and even comments on the bug. `INV-9999` → next is `INV-10000`, which string-sorts lower, so the "last" invoice stays `INV-9999`, the unique constraint collides, and the code retries 3× then fails. Unlikely for a freelancer; fix is trivial. | P2 |
| D10 | Indexes are sensible (org, project, composite `projectId,status` on Task, time-entry composite). Missing: `Invoice(status, dueDate)` for the hourly overdue job and dashboards; `Notification` has no retention/cleanup. | P3 |
| D11 | `Document.options` is a comma-separated string; `DocumentAuditEvent.metadata` and `ActivityLog.detail` are stringly-typed. | P3 |
| D12 | `ActivityLog.type` comment lists 3 values, but the contracts service writes `"contract_response"`, and `CreateActivityDto.type` is a 3-value union. Works because the column is a string, but the contract writes bypass the typed service. | P3 |
| D13 | Sequential invoice numbering is per-org text `INV-####` with no configurable prefix/format. | P3 |
| D14 | `Task` doubles as three things: a to-do (`checkbox`), a client-request (`requestedById` set by a client), and a client decision (`decision` with options and votes). Clever and useful, but it is why there is no place for "deliverable" or "milestone". See §17–19. | Info |

**Seed data — [FACT]** `src/database/seed.ts` seeds only the three subscription plans (Free/Pro/Lifetime). No demo data.

---

# 8. Existing Features Inventory

Verified by tracing controller → service → schema → frontend caller. "End-to-end" means I found the UI, the endpoint, the service logic and the persistence, and they agree.

| # | Feature | Status | Where | Notes |
|---|---|---|---|---|
| 1 | Organization setup wizard | ✅ | `(setup)/setup/*`, `setup/*` | Profile, email config, first project, invite client. |
| 2 | Auth (email/password, magic link, reset, verify) | ✅ | Neon Auth + `(auth)/*` | Delegated. |
| 3 | Multi-org membership + org switch | ✅ | `organizations/*` | `active_org` cookie. |
| 4 | Team (owner/admin) invites & role changes | ⚠️ | `clients/*` | Admin→owner escalation (A1). |
| 5 | Client invites, profile, remove, reset password | ✅/⚠️ | `clients/*` | Client == login account (see §11). |
| 6 | Projects CRUD, archive, duplicate, export, labels, status pipeline | ✅ | `projects/*` | Duplicate copies tasks (works as template). |
| 7 | Customizable project statuses | 🟡 | `ProjectStatus` | Table + validation exist; **no UI/API to edit them** found (only `GET /projects/statuses`); `PROJECT_STATUSES` constant hard-codes 4. Dashboard "in progress/completed" stats hard-code slugs `in_progress`/`completed`. |
| 8 | Tasks (checkbox), ordering, assign, due date, status | ✅ | `tasks/*` | Statuses: open/in_progress/done/cancelled. Assignee must be owner/admin. |
| 9 | Client task requests | ✅ | `POST /tasks/mine` | Client can create & cancel own open requests. |
| 10 | Decision tasks (multiple-choice, secret voting) | ✅ | `tasks/*` | Effective lightweight approval mechanism. |
| 11 | Project updates + attachments + link previews | ✅ | `updates/*`, `embeds/*` | |
| 12 | Comments on updates and tasks | ✅ | `comments/*` | |
| 13 | Internal notes (admin only) | ✅ | `notes/*` | |
| 14 | Files: upload, link, download, labels | ✅ | `files/*` | Private R2, size limit per org. |
| 15 | Documents: upload PDF as quote/proposal/contract/NDA, send, expire, remind, version, void | ✅ | `documents/*` | The real "proposal/e-sign" engine. |
| 16 | E-signature: field placement, draw/type signature, signing order, audit trail, certificate, tokenized signing links | ✅ | `documents/*`, `signing-viewer.tsx` | Strong. |
| 17 | Client accept/decline on documents | ✅ | `POST /documents/:id/respond` | |
| 18 | Contract builder (template → editable content → PDF) | 🟡 | `contracts/*` | No client action, no client notification, one website-specific template. §14. |
| 19 | Invoices: itemized + uploaded PDF, PDF export, send, status | ⚠️ | `invoices/*` | Integrity gaps (§21). |
| 20 | Invoice payments via Stripe (Connect or direct keys) | ✅ | `payments/*` | Idempotent webhook; Checkout reuse. |
| 21 | Time tracking (timer, manual, report, CSV) → invoice | ✅ | `time-entries/*` | Notably complete. |
| 22 | Calendar (task due, project start/end, invoice due) | ✅ | `calendar/*` | Read-only; admin only. |
| 23 | Global search | 🟡 | `search/*` | Projects, tasks, files, clients only; leak and cap bugs (§28). |
| 24 | Notifications: in-app, email, web push | ✅ | `notifications/*` | Event list in §26. |
| 25 | Labels (projects, tasks, files, members) | ✅ | `labels/*` | |
| 26 | Branding / white-label / custom domain | ✅ | `branding/*`, `settings/*` | Custom-domain verify endpoint exists **[UNVERIFIED]** DNS logic. |
| 27 | Client portal | ✅ | `(portal)/*` | §22. |
| 28 | Preview-as-client | ✅ | `preview-mode.*` | |
| 29 | CSV export (projects, invoices, people, tasks, time) | ✅ | | With CSV-injection escaping (`csv.ts`). |
| 30 | SaaS billing/plans (Free/Pro/Lifetime) | ✅ | `billing/*` | Off by default (`BILLING_ENABLED`). |
| 31 | Account deletion with cleanup | ✅ | `account/*` | |
| 32 | Telemetry consent, Sentry | ✅ | | |
| 33 | Reports | 🟡 | `reports/time` only | Sidebar "Reports" lands on the time report; no revenue/profit/aging reports. |
| 34 | Global Invoices page | ⚠️ | `/dashboard/invoices` | **Exists but is not linked from the sidebar** (orphan; reachable only by URL). Invoices are otherwise per-project tab only. |
| 35 | Dashboard | ⚠️ | `/dashboard` | §9. |

## 8.1 Complete API surface (summary) — [FACT]

~190 routes. Per-controller counts: documents 30, clients 14, invoices 13, payments 12, projects 13, tasks 12, contracts 14, files 8, settings 10, branding 8, time-entries 10, updates 9, labels 6, comments 5, setup 4, others ≤ 4. Full route list was enumerated mechanically from decorators during this audit; the notable authorization observations are in §30 and §32.

---

# 9. Dashboard Analysis

**[FACT]** `/dashboard` shows 4 stat cards (Total Projects, In Progress, Outstanding Receivables, Total Collected) and a "Recent Projects" table (5 rows).

| Issue | Detail |
|---|---|
| Fake references | The `Ref.` column is `PROJ-000{index+1}` computed from row position, not a stored identifier. It changes as projects are added; it looks like a real ID and is not. |
| Misleading copy | "Unpaid balance for period" / "Net paid revenue" — there is no period filter and "net" is not computed (no expenses). |
| Unused data | The page types `project.clients[].user.name` but the API returns `clients: [{ userId }]` — client names are never shown. |
| Currency | `formatCurrency` renders `$` regardless of org currency. |
| Missing what a freelancer opens the app for | No "due/overdue tasks", no "invoices overdue", no "awaiting client response" (documents pending, decisions open), no "recent activity/what changed", no "follow-ups today" (impossible: no leads). |
| Loading/error | Skeleton for stats ✅; recent-projects errors are `console.error` only (no user message). |

**[REC, P1]** Replace with a "What needs me today" dashboard using data that already exists: overdue + due-soon tasks, overdue invoices, documents/decisions waiting on clients, unread client comments, then money summary. No new tables required.

---

# 10. Lead / CRM Analysis

**[FACT] Nothing exists.** `grep` for lead/prospect/pipeline/crm/follow-up across schema and source returns nothing relevant. There is no lead entity, status, source, follow-up date, lost reason, or activity.

| Requested | State |
|---|---|
| Lead fields (name, company, email, phone, WhatsApp, website, industry, location, source, service, budget, priority, notes, next follow-up, assigned) | 🔴 MISSING (only `ClientProfile.company/phone/address/website/description` exist, and only for logged-in clients) |
| Statuses New→Contacted→Discovery→Qualified→Proposal→Negotiation→Won / Lost | 🔴 MISSING |
| Lead status vs lead activity | 🔴 MISSING |
| Conversion lead→client | 🔴 MISSING (the closest equivalent is "invite a client by email") |
| Follow-up reminders | 🔴 MISSING (a reminder mechanism exists for *documents*: `reminderEnabled`, `document-reminder.task.ts`, reusable pattern) |
| Lost reasons | 🔴 MISSING |

## 10.1 Status vs activity — recommended model [REC]

Keep them separate, exactly as you described:

- **Status** = *where the relationship is* (a single value on the record, few values, changes rarely). Drives filters and the pipeline board.
- **Activity** = *things that happened* (append-only, many, timestamped, typed: note, call, WhatsApp, email, meeting, proposal sent…). Drives the timeline and "last contacted".

The existing `ActivityLog` is project-scoped (`projectId` required). To serve both, generalize it (§46).

## 10.2 Overengineering warning [REC]

A solo freelancer needs: a list, a status, a next-follow-up date, a source, a budget, notes, and "convert". They do **not** need lead scoring, sequences, assignment rules, or custom pipelines. Build the small version (§54).

---

# 11. Client Management Analysis

## 11.1 What exists — [FACT]

`Client = neon_auth.user + Member(role="member") + ClientProfile(company, phone, address, website, description) + ProjectClient rows`. The Clients page (1,106 lines) has two tabs: **Team** and **Clients**, with invite-by-email, pending-invite list with copyable links, remove, reset password, profile edit, role change, hourly rate, labels, CSV export.

## 11.2 Assessment against your "central relationship record" ideal

```
Client
 ├── Contacts        🔴  one login = one person; no multiple contacts per client company
 ├── Projects        ✅  via ProjectClient (many-to-many)
 ├── Proposals       🟡  Documents of type quote/proposal, attached to a *project*, not a client
 ├── Contracts       🟡  attached to a project; Contract.clientId is a loose userId
 ├── Invoices        🟡  attached to a project only (no client link of its own)
 ├── Payments        🔴  no Payment record (see §21); only Invoice.paidAt/paidAmount
 ├── Files           🟡  attached to a project only
 ├── Meetings        🔴
 ├── Support         🔴
 └── Activity        🟡  project-scoped only; nothing at client level
```

There is **no client detail page**. The Clients page is a table with an inline profile editor; there is no view that answers "what is the full history with this client?".

## 11.3 Problems — [FACT]

| # | Problem | Sev |
|---|---|---|
| C1 | **A client cannot exist without a login.** You cannot record a prospect, a client who never logs in, or a client's second contact. Every proposal/contract/invoice for a not-yet-onboarded client is impossible. | P1 (architectural) |
| C2 | **Duplicates are structurally possible**: the same real client invited twice with different emails becomes two `Member`s, two profiles. There is no merge. | P2 |
| C3 | **Company data is per-login, not per-company.** Two contacts at the same company would each need a profile. `ClientProfile` is keyed `(userId, organizationId)`. | P2 |
| C4 | Removing a client member leaves history referencing "Unknown". | P2 |
| C5 | Plan limits count `Member`s with role member as "clients". | Info |
| C6 | Cross-tenant: a user can be a client in org A and staff in org B; isolation is correct (org scoping) but `search.service` looks up `ClientProfile` by `userId` only (see S1). | P1 |

**[REC]** See §46: add a `Client` table (the business/relationship), make `ProjectClient` link *contacts* (logins) as today, and let invoices/contracts/proposals hang off `clientId`. Keep the invite/login flow unchanged for portal access. This is the highest-leverage structural change.

---

# 12. Client Discovery / Intake Analysis

**[FACT] Nothing exists.** No questionnaire, no intake form, no stored requirements. The only free-form storage of this kind of information is `Project.description`, `ClientProfile.description`, `ProjectNote`, and uploaded files.

| Requested item | State |
|---|---|
| Business name/overview/history, vision, values, audience, goal, USP, products/services, competitors | 🔴 (only `ClientProfile.description` free text) |
| Pages, functionality, branding, logo, colors, fonts, content, images, videos, CTA | 🔴 |
| Domain, hosting, technical requirements | 🔴 |
| Client completes it in the portal | 🔴 |
| Data connects to project / reused in contract | 🔴 (`buildDefaultContractContent` reads only the project name/description/dates/tasks and client name/email/company/address) |

## 12.1 Recommended shape [REC, keeps it general]

Do **not** create a table per field. Create a **generic "Form template + Form response"** primitive:

```
FormTemplate(orgId, name, fields JSON[{key,label,type,required,section}])
FormResponse(orgId, templateId, clientId, projectId?, answers JSON, status draft|submitted, submittedAt)
```

Ship one seeded template, "Website project intake", containing exactly your list. A photographer or copywriter loads a different template. Clients fill it in the portal (they are already authenticated users). "Reuse" then means: contract/proposal builders can read `answers` to prefill scope, pages, deliverables, domain/hosting. This satisfies "enter once" without a website-ERP schema.

---

# 13. Proposal Analysis

**[FACT] There is no Proposal object.** A "proposal" today is a **PDF you upload** as a `Document` with `type = "proposal"` (or quote), then `requiresApproval` (accept/decline) and/or `requiresSignature`.

| Requested | State |
|---|---|
| Client, project, scope, deliverables, services, pricing, optional services, timeline, payment terms, revision limits, validity, T&Cs as *structured data* | 🔴 (all live inside an uploaded PDF the tool cannot read) |
| Lifecycle Draft→Sent→Viewed→Accepted / Rejected / Expired | 🟡 Document statuses: `draft, pending, accepted, declined, signed, voided, expired` — no `viewed` status (a `viewed` audit event exists via `track-view`), expiry is automatic via an hourly job |
| Client accepts in portal or by emailed link | ✅ (respond / token signing) |
| Accepted → contract/project/invoice | 🔴 no automation; `updateDocumentStatus` only sets status, notifies admins, writes activity |
| Requires a project first | ❌ **design blocker**: `Document.projectId` is required, so you cannot send a proposal to a lead or client before a project exists. The project must be created *before* the sale. |

**[REC]** Do not build a second document engine. Add a **structured Proposal** (line items reusing `InvoiceLineItem`'s shape, scope text, validity, payment terms), render it to PDF with the existing `pdfkit` service, and send it through the **existing Document accept/sign + audit + reminder + expiry machinery**. Allow `projectId` to be nullable on the proposal (attach `clientId`) and create the project on acceptance. That reuses ~80% of what exists.

---

# 14. Contract Analysis

## 14.1 Two parallel systems — [FACT]

| | `Document` (type=contract) | `Contract` (builder) |
|---|---|---|
| Source | Uploaded PDF | Structured JSON content + template |
| Signing | ✅ full e-sign, audit, certificate, tokens | 🔴 none |
| Client action | accept/decline/sign | **view + download PDF only** |
| Client notified on send | ✅ email/in-app/push | 🔴 none (service writes an ActivityLog row only) |
| Statuses reachable | draft→pending→signed/declined/expired/voided | draft→sent→viewed→… **`signed` is never set by any code path** (only via `PATCH` with arbitrary `status`) |
| Versions | ✅ | ✅ (`ContractVersion` snapshot at send) |
| DB present in migrations | ✅ | ❌ tables missing (D1) |

Result: a freelancer can spend time in the contract builder, click Send, and the client will not be told, cannot sign, and the status can never legitimately become `signed`. The portal UI even has a "Signed" badge that nothing can produce.

## 14.2 Specific findings — [FACT]

| # | Finding | Sev |
|---|---|---|
| K1 | Tables missing from migration (D1) | P0 |
| K2 | `create()` takes `dto.clientId` and calls `neonAuthUsers.findUnique(clientId)` + `clientProfile.findUnique` **without checking the user belongs to this org or this project**. Name/email/company/address of any user in the global auth table can be copied into the contract and read back. `update()` also accepts an arbitrary `clientId`. | P1 |
| K3 | `PATCH /contracts/:id` accepts any `status` string (also bypasses "editing a sent contract creates a new version" if `content` absent). An admin can set `signed` by hand. | P1 |
| K4 | `voidContract` and `send` do not check the caller's org beyond the `findFirst`, fine; but `voidContract` allows voiding a `signed` contract with no reason recorded. | P2 |
| K5 | `send()` freezes a version snapshot (good) but never emails or notifies. | P1 |
| K6 | Template list is a constant with **one** entry, "Website Design & Development Agreement"; `buildDefaultContractContent` fabricates defaults (total = hourly rate × 40 h or $2,500; deposit; "15 days / 1.5% per month" late fee) that the freelancer must notice and edit. Silent defaults in a legal document are risky. | P2 |
| K7 | No renewal, expiry, effective-date reminders, or link to a `Client`. | P3 |
| K8 | No `Contract` ↔ `Invoice` link (deposit invoice cannot be generated from the payment schedule even though the schedule is stored in `content.payment`). | P1 |

**[REC]** Decide one path. The lowest-effort, highest-value path: let the contract builder **produce a PDF and hand it to the Document engine** (upload as `Document` type contract with signature fields pre-placed). Then the builder becomes an authoring tool and signing/audit/notification are inherited. Retire the parallel `sent/viewed/signed` lifecycle. Alternatively add sign/accept endpoints to `Contract`, but that duplicates the signing engine.

---

# 15. Project Management Analysis

## 15.1 Verified — [FACT]

Create (name + description only; modal has no client, dates or budget), edit (dates inline on detail page), archive/unarchive, delete (owner only), duplicate (tasks and optionally clients), status pipeline (4 defaults), labels, per-project hourly rate, CSV export, plan limit gating.

| Requested | State |
|---|---|
| Name, client, description, start, deadline | ✅ (client assigned *after* creation via `client-assignment.tsx`) |
| **Budget / value** | 🔴 |
| **Progress %** | 🔴 no computed or stored progress anywhere (searched schema and services) |
| Milestones | 🔴 (§18) |
| Deliverables / approvals | 🟡 (via documents and decision tasks) |
| Project activity | 🟡 (updates timeline merges updates + limited activity events) |
| Completion flow | 🟡 status "Completed" is just a value; nothing happens (no summary, no final invoice prompt, no handover, no client notification) |
| Archiving | ✅ but archived projects become **invisible to clients** (`archivedAt: null` in client queries) with no warning |

## 15.2 Problems

| # | Problem | Sev |
|---|---|---|
| P1 | "Create project for existing client" is 5+ steps (§28) and the creation modal cannot set client. | P1 |
| P2 | Status `slug` is hard-coded in stats (`in_progress`, `completed`) although statuses are meant to be customizable — but there is no UI to customize them anyway (§8 #7). | P2 |
| P3 | `update()` replaces the whole `ProjectClient` set (delete + create in a transaction) — safe but re-adds rows with new ids (loses `createdAt`). | P3 |
| P4 | `duplicate` copies the *source project's dates verbatim* and has no "shift dates" — for a template use-case, start/end from an old project are wrong by default. | P2 |
| P5 | `findAll` search matches project *name* only (not description). | P3 |
| P6 | Deleting a project cascades to invoices? **No** — `Invoice.projectId` is `SetNull`: invoices survive but become client-invisible orphans. Good for finance history, but the UI does not say so. | P2 |

---

# 16. Project Template Analysis

**[FACT] There is no template feature.** The only reuse mechanism is **Duplicate project** (`POST /projects/:id/duplicate`): copies name (new), description, dates, labels, optionally clients, and **all tasks reset** (status `open`, no dates, no assignee, decision options and labels preserved).

| Requested | State |
|---|---|
| Reusable "Website project" template | 🟡 achievable *today* by keeping a dummy project and duplicating it |
| Phases with nested tasks (Discovery → Requirements…) | 🔴 tasks are flat; `Task` has **no parent, no group, no phase** |
| Templates separate from real projects | 🔴 the dummy project would appear in project lists, counts and plan limits (`maxProjects`) |

**[REC]** Do not build a template engine yet. Two cheap steps deliver 90% of it: (1) add an optional `phase`/`groupName` string on `Task` (renders as headings, doubles as the milestone grouping in §18), (2) add `isTemplate boolean` on `Project` so template projects are hidden from lists, dashboards and limits and offered in a "New project from template" picker. Ship one seeded "Website project" template containing your Discovery/Design/Development/QA/Launch/Handover list as data.

---

# 17. Task Management Analysis

| Requested | State | Detail |
|---|---|---|
| Create / edit / delete / reorder | ✅ | Drag-and-drop ordering (`PUT /tasks/reorder`) |
| Assignment | ⚠️ | One assignee, must be owner/admin; clients can't be assigned; **team "members"**, i.e. staff below admin, don't exist |
| Due dates | ✅ | Feeds calendar |
| Priorities | 🔴 | no field |
| Statuses | ⚠️ | `open / in_progress / done / cancelled`; your target `Backlog / To Do / In Progress / Review / Client Review / Done` is not supported (no Review, no Client Review). Status change notifications exist. |
| Checklists / subtasks | 🔴 | |
| Comments | ✅ | |
| Attachments | 🔴 | files belong to projects, not tasks |
| Estimated time | 🔴 | |
| Actual time | ✅ | `TimeEntry.taskId` |
| Milestone relation | 🔴 | |
| Client-visible vs internal tasks | 🔴 | **Every task on a project is visible to every assigned client** (`findByProjectForClient` returns all tasks). There is no `internal` flag. Freelancers must not put internal to-dos ("chase supplier", "fix my hack") in a client-visible project. |

**Findings**

- **P1:** No internal/client-visible distinction on tasks (also on files: every project file is visible to every assigned client — `assertProjectAccess` is project-level only; there is no per-file visibility flag). This affects trust and is the practical reason to keep internal notes elsewhere.
- **P2:** `Task.status` update validation lets a client-requested task go `open → done` etc. without a "review" step; `closedAt` is only set for decisions.
- **P2:** `notifyTaskCreated` is fired on every admin task creation (email to all clients?). **[UNVERIFIED]** volume; creating 20 template tasks by hand could email the client 20 times. Check `notifyTaskCreated` batching before adding templates.

**[REC]** Add `Task.priority` (low/normal/high), `Task.visibility` (`internal|client`), optional `Task.phase`, and a `review`/`client_review` status. Do not add subtasks/checklists/attachments until a real user asks.

---

# 18. Milestone Analysis

**[FACT] Milestones do not exist** and there is no project progress calculation.

**[REC] Recommendation on simplicity.** A milestone is only useful if (a) the client sees it, (b) it can be tied to a payment, and (c) progress is derived, not typed. Recommended minimal design: `Milestone(projectId, name, order, dueDate, status, amountCents?)`; `Task.milestoneId?`; progress = done tasks ÷ non-cancelled tasks *within* the milestone; milestone `amountCents` lets "Milestone completed → create invoice draft" become the payment automation. Do **not** compute a weighted project percentage; show "3 of 5 milestones complete" — it is honest and needs no maths. Also note the contract builder already stores a payment schedule with `milestoneName` — a natural bridge.

---

# 19. Client Review & Approval Analysis

| Requested | State |
|---|---|
| Deliverable as an object | 🔴 no `Deliverable` model |
| Versions of a deliverable | 🟡 only for *documents* (`DocumentVersion`, restore, upload new version) — this is versioning for PDFs, not design comps |
| Client approve / request changes | 🟡 Document `accept/decline` (+ reason). Decision tasks give multiple-choice selection. There is **no "request changes" state** distinct from decline, and no threaded feedback tied to a version. |
| Comments attached to the right version | 🔴 comments attach to updates and tasks only |
| Approval history | ✅ for documents (`DocumentAuditEvent`, `DocumentResponse` with IP/UA/timestamp); ✅ for votes (ActivityLog) |
| Visual review (image/URL pin comments) | 🔴 (link previews exist for Figma/Loom via `embeds`) |

## 19.1 What works well [FACT]

- Decision tasks hide vote counts until *all* assigned clients have voted (`findByProjectForClient`) — thoughtful anti-bias behaviour.
- Documents record who accepted/declined, IP, UA and reason; a "completion certificate" can be generated.

## 19.2 Recommendation [REC]

Reuse, don't invent: a **Deliverable = a Document (or a File/link) with `requiresApproval`** plus a third response `changes_requested` and a required comment. Versions already exist for Documents; extend `ALLOWED_ACTIONS` and `updateDocumentStatus` with `changes_requested` (reverts to `pending` on new version). Add "deliverable" as a `Document.type`. This is a small change relative to a new subsystem, and it finally gives an approval history for design work. Allow `File`s (images, links to Figma) to be approval targets via the same path only if needed.

---

# 20. File & Document Management Analysis

| Requested | State |
|---|---|
| Files belong to client / project / task / proposal / contract / deliverable / invoice | 🟡 Files belong to a **project** only; Documents/Invoices link to a File; no client-level or task-level files |
| Upload / download | ✅ Private R2; download streams through API or signed URL; both check project access |
| Permissions | ✅ project-level (`assertProjectAccess`); ⚠️ no per-file visibility (all clients on a project see everything) |
| Storage | ✅ R2; 200 MB interceptor cap vs org setting default 50 MB (setting enforced in service) |
| Metadata | ✅ name, mime, size, uploader, description, labels |
| Versioning | ✅ documents only |
| Organization | 🟡 flat list + labels, no folders |
| Safety | ✅ extension blocklist, filename sanitization, path-traversal guard on the (unused) local provider |
| Quota | ✅ `PlanLimit("storage")` (only when billing enabled) |

**Findings**

- **P1:** Client-visible-by-default (see §17) — add a per-file visibility flag (`internal`/`client`), default `client` to preserve behaviour.
- **P2:** `local.storage.ts` is dead code contradicting the docs ("no local-disk fallback"). Remove or document.
- **P3:** Files uploaded by clients are not distinguished from agency files in the schema beyond `uploadedById`.

---

# 21. Finance Analysis

## 21.1 What exists — [FACT]

- **Invoices:** number `INV-####`, project (optional), line items (qty × unit price, integer cents) or uploaded PDF with a single `amount`, due date, notes, status `draft→sent→(overdue)→paid|cancelled`, PDF export, email on send, Stripe Checkout, hourly cron flips `sent`→`overdue` when `dueDate < now`, client-facing list (`draft`/`cancelled` hidden).
- **Time → invoice:** entries get a frozen rate; `generate-invoice` bundles unbilled billable entries into line items and links them (`invoiceLineItemId`) so they can't be billed twice.
- **Stripe:** Connect or the org's own keys; checkout metadata verified against org; idempotent `updateMany where status != paid`; sets `paidAt`, `paidAmount`, `stripePaymentIntentId`.
- **Stats:** `GET /invoices/stats` (count, total, paid, outstanding = sent + overdue) — used by the dashboard.

## 21.2 Gaps against your list

| Requested | State |
|---|---|
| Invoice: client | 🔴 derived via project only (D5) |
| Discount, tax | 🔴 |
| Payment terms | 🟡 `notes` free text; no "Net 14" that derives `dueDate` |
| Currency | 🔴 |
| **Payment entity** (amount, client, project, invoice, method, reference, date) | 🔴 There is no `Payment` table. "Payment" = fields on the invoice. **Partial payments, deposits and offline payments (bank transfer, M-Pesa, cash) cannot be recorded.** Offline is the norm for many freelancers (the org has `paymentInstructions` displayed to clients, meaning off-platform payment is anticipated). |
| Expenses (amount, category, project, vendor, date, receipt) | 🔴 no model |
| Project value / paid / outstanding | 🔴 no project value (D6); paid/outstanding computable only via invoices |
| Revenue / expenses / profit | 🔴 revenue only via invoice stats; no expenses, no profit. Reports contain only time. |
| Recurring invoices | 🔴 (roadmap item, unchecked) |

## 21.3 Integrity findings — [FACT]

| # | Finding | Sev |
|---|---|---|
| F1 | Manual transition to `paid` via `PUT /invoices/:id` **does not set `paidAt`/`paidAmount`** and **does not notify**; only the Stripe path does. Manual is the only way for offline payments. | P1 |
| F2 | `update()` lets you replace `lineItems` on **sent, overdue and paid** invoices (no status guard). A paid invoice's total can change after the client paid. | P1 |
| F3 | State machine: `overdue` can never return to `sent` (e.g., if you extend the due date); `draft → paid` blocked (fine). | P2 |
| F4 | `uploaded` invoices: amount cannot be edited after creation (DTO has no `amount`). | P2 |
| F5 | Numbering sort bug beyond 9999 (D9). | P3 |
| F6 | Overdue cron runs on every API replica; harmless (idempotent) but there is no "invoice became overdue" notification at all, so overdue is invisible unless someone opens the invoice list. | P1 |
| F7 | Stats totals are computed by raw SQL with a `LEFT JOIN` on line items (correct) but there is no discount/tax, so future fields must update **two** places (SQL here, `calculateInvoiceTotal` in payments, and PDF). Three parallel total calculations are a maintenance hazard. | P2 |
| F8 | `stats` "paid" uses invoice *status*, not `paidAmount`; a partial Stripe payment isn't representable. | P2 |
| F9 | Global invoice list page is not in navigation (§8 #34). | P2 |

**[REC]** Don't build accounting. Add exactly: `Payment(invoiceId, amountCents, method, reference, paidAt, recordedById)`, with invoice `status` derived (`paid` when Σpayments ≥ total, `partially_paid` otherwise); an `Expense(projectId?, category, vendor, amountCents, date, receiptFileId?)` table; `Project.budgetCents`. That yields Project Value / Paid / Outstanding and Revenue / Expenses / Profit in a single small report. Consolidate total calculation into one shared function.

---

# 22. Client Portal Analysis

## 22.1 What exists — [FACT]

`/portal/projects` (list) and `/portal/projects/[id]` (1,621-line page) with tabs **Updates, Tasks, Files, Contracts, Invoices**; `/portal/settings`; `/portal/sign/[token]` for tokenized signing. White-label theming per org/custom domain.

| Capability | State |
|---|---|
| View projects / status | ✅ (list + detail) |
| Progress / milestones | 🔴 |
| Relevant tasks (all) | ✅ (⚠️ no internal/client distinction) |
| Create requests | ✅ |
| Vote on decisions | ✅ |
| Upload files | ✅ |
| View/accept/sign documents | ✅ |
| View contracts | ✅ view/PDF only (K-series) |
| View invoices, pay | ✅ Stripe, or read payment instructions |
| Download documents | ✅ |
| Request changes on work | 🔴 |
| Support requests | 🔴 |
| Communication | ✅ comments on updates/tasks; ❌ no direct messaging (roadmap item unchecked) |
| Meetings | 🔴 |
| Profile/settings | ✅ |

## 22.2 Isolation review — [FACT]

Good. I traced `projects/mine`, `tasks/mine`, `updates/mine`, `files/*`, `invoices/mine`, `documents/mine`, `contracts/mine`, `payments/checkout` — all require `ProjectClient` membership for the requested project and the org id of the request. Changing an id in a URL cannot cross tenants in any of these; changing a project id within a tenant returns 403 unless the client is assigned. Exceptions are the specific issues in §30.

## 22.3 Portal UX concerns

- One 1,621-line page component holds all tabs — maintainability risk (§33).
- No overview: after login a client lands on a project list (`/portal` → redirect). A client with several projects has no "what needs my attention" list (unsigned documents, unpaid invoices, open decisions).
- Archived projects disappear from the portal without notice.

---

# 23. Communication Analysis

| Requested | State |
|---|---|
| Internal notes | ✅ `ProjectNote`, admin only |
| Client comments | ✅ on updates and tasks |
| Activity timeline | 🟡 updates + limited activity events (§29) |
| Emails | ✅ outbound transactional only; no inbound, no per-client email history |
| Messages / chat | 🔴 (roadmap "In-portal messaging" unchecked) |
| Calls / WhatsApp | 🔴 (relevant for your market; WhatsApp is not a field anywhere) |
| Meetings | 🔴 |

**[REC]** For freelancers, the highest-value "communication" feature is a **manual activity log entry** (call / WhatsApp / email / meeting note with a date) attached to a client. It captures reality without integrating any channel. Skip chat: comments + email notifications already cover asynchronous updates.

---

# 24. Meeting Analysis

**[FACT] Nothing exists** (no meeting model, no scheduling, no agenda/notes/decisions/action items). The calendar shows tasks, project start/end and invoice due dates only.

**[REC, P3 → P2 for you]** A meeting is just an *activity of type meeting* with `scheduledAt`, `link`, `agenda`, `notes`, and action items that create tasks. Implement as a typed entry in the client/project activity log (§29), not a new subsystem. Calendar integration (Google) is a separate later item.

---

# 25. Support & Maintenance Analysis

**[FACT] Nothing exists** (no ticket model, no website/asset registry, no retainer).

**[REC]** Model support as a **Project of type "Support"** (or a project flagged `kind = support`) with tasks and the existing client "request" task feature: `POST /tasks/mine` already lets a client raise a request and cancel it. Adding statuses `waiting_on_client` and `resolved`, a priority, and file attachments to that flow gives 80% of a ticket system with no new entity. A `Maintenance` project per client (recurring invoice later) matches "Project completed → Handover → Maintenance". Build a real ticketing module only if you sell support to many clients.

---

# 26. Notification Analysis

## 26.1 Events implemented — [FACT]

| Event | In-app | Email | Push | Recipient |
|---|---|---|---|---|
| Project update posted | ✅ | ✅ | ✅ | clients |
| Task created (by admin) | ✅ | ✅ | ✅ | clients |
| Task status changed / assigned | ✅ | ✅ | ✅ | requester / assignee |
| Client request created | ✅ | ✅ | ✅ | admins |
| Decision closed | ✅ | ✅ | ✅ | clients |
| Comment | ✅ | ✅ | ✅ | counterpart |
| Document uploaded/sent, responded, reminder, signing turn | ✅ | ✅ | ✅ | clients / admins |
| Invoice sent, invoice paid | ✅ | ✅ | ✅ | clients / admins |
| Stripe disconnected | ✅ | ✅ | ✅ | owners |

## 26.2 Missing — [FACT]

Contract sent/signed · invoice overdue · task due soon · follow-up due · new lead · project completed · support request. Per-user preferences/mute: none found.

## 26.3 Assessment

The system is a good fit for "client-facing" events. It is **not** proactive for the freelancer: nothing tells *you* what is overdue. **[REC, P1]** Add a daily digest (one email/push) with overdue invoices, tasks due today, documents unresponded > N days — instead of many new per-event notifications. This avoids notification overload.

**[UNVERIFIED]** `notifyTaskCreated` fires per task; bulk creation from a template could spam clients (§17).

---

# 27. Automation Analysis

## 27.1 Existing — [FACT]

| Automation | Where |
|---|---|
| Invoice `sent` → `overdue` after due date (hourly) | `invoice-overdue.task.ts` |
| Document reminder emails at intervals | `document-reminder.task.ts` |
| Document expiry (hourly) | `document-expiry.task.ts` |
| Access-token cleanup (daily) | `document-token-cleanup.task.ts` |
| Stripe webhook → invoice paid + notification | `payments.service.ts` |
| All-clients-responded → document `accepted`/`signed` | `documents.service.ts` |
| Time entries → invoice line items | `time-entries.service.ts` |
| Org creation → seed statuses/branding/settings/free plan | `auth.service.ts` |

## 27.2 Requested chain vs reality

| Trigger → Action | State |
|---|---|
| Lead won → create client → onboarding | 🔴 (no lead) |
| Proposal accepted → create contract | 🔴 (accepted only sets status + notifies) |
| Contract signed → create invoice | 🔴 |
| Payment received → start project | 🔴 (payment only flips status) |
| Project completed → handover → maintenance | 🔴 |
| Milestone done → draft invoice | 🔴 (no milestones) |

## 27.3 Recommended automations, ordered by value/effort [REC]

1. **Document (proposal/contract) accepted/signed → draft deposit invoice** (button first, auto later). Highest value: it removes the retyping of price. Requires structured price data (proposal object).
2. **Client invite accepted → notify owner** (currently none).
3. **Invoice overdue → notify owner and (optionally) nudge client.**
4. **Project completed → prompt "create final invoice? send handover checklist?"** Prompt, not silent automation.
5. Daily digest (§26).

Keep automation as *prompted suggestions with one click* rather than a rules engine; the roadmap's "trigger-action engine" is overkill for a solo freelancer (§43).

---

# 28. Search Analysis

**[FACT]** `GET /search?q=` (owner/admin only). Searches: projects (name, description; non-archived), tasks (title, description), files (filename), clients (members with role `member`, by Neon Auth name/email, plus company).

| # | Finding | Sev |
|---|---|---|
| S1 | **Cross-tenant leak:** `clientProfile.findMany({ where: { userId: { in: memberUserIds } } })` has **no `organizationId` filter**. If a person is a client in two organizations, org A's search shows the `company` they entered for org B. | P1 |
| S2 | **Correctness:** `neonAuthUsers.searchByNameOrEmail(q, 20)` is a *global* search across all tenants' users limited to 20, and only afterwards filtered to this org's members. In a multi-tenant database a common name (e.g. "john") will fill the 20 with other tenants' users and hide this org's clients. It also queries other tenants' user data on every search (only ids are used, but it is unnecessary). | P1 |
| S3 | Not searched: invoices (number), contracts, documents, updates, comments, notes, labels. Each `take: 5` with no "see all". | P2 |
| S4 | Plain `ILIKE '%q%'`; no ranking. Acceptable at freelancer scale. | Info |
| S5 | Members query filters `role: "member"` so staff are not findable; fine. | Info |

**[REC]** Fix S1/S2 by resolving members first (`member.findMany({organizationId})` → user ids → user lookup), then adding invoices and documents/contracts to the search. No search engine needed.

---

# 29. Activity & Audit Log Analysis

## 29.1 What is recorded — [FACT]

| Store | Scope | Events |
|---|---|---|
| `ActivityLog` | project | document responses (accepted/declined/signed…), decision votes, decision closed, contract created/sent/voided |
| `DocumentAuditEvent` | document | created, sent, viewed, signed, accepted, declined, voided, expired, reminder_sent, downloaded (with IP/UA) |
| `Notification` | per user | transient, not an audit trail |

## 29.2 What is **not** recorded

Lead/client created, project created/status changed, task created/completed, file uploaded/deleted, invoice created/sent/edited/paid/cancelled, payment received (except transient notification), member invited/removed/role-changed, settings changed, login. **Financial and permission changes leave no audit trail.** Given F2 (invoice edits after payment) and A1 (role escalation), that gap matters.

## 29.3 Also

- `ActivityLog` requires `projectId`; nothing at client/org level.
- The activity feed is merged into the project *Updates* timeline (frontend), so the "what happened today" view exists only inside a project.
- Contract writes bypass `ActivityService` and its typed union (D12).

**[REC, P1/P2]** Extend `ActivityLog` (make `projectId` optional, add `clientId`, add `entityType/entityId`), write via one helper, and record the ~10 events in your §25 list plus role/invoice changes. Provide a per-client timeline and a per-project timeline from the same table. Do not build a separate "audit" system.

---

# 30. Security Review

**Overall: better than typical for a codebase of this maturity.** Tenant scoping is consistent; most findings are edge cases.

## 30.1 Findings table

| ID | Finding | Evidence | Sev | Fix direction |
|---|---|---|---|---|
| SEC-1 | Admin → owner escalation via invitation | `clients.controller.ts` invite; `clients.dto.ts` role enum; `inviteMember` | **P0** | Only owners may invite `owner`; admins limited to `admin`/`member`. Also hide "owner" from the admin UI |
| SEC-2 | Contract `clientId` unvalidated → reads any user's name/email from global auth table | `contracts.service.ts` `create`/`update` | P1 | Require the id to be a member of this org (ideally a project client) |
| SEC-3 | Search `ClientProfile` lookup without `organizationId`; global user search | `search.service.ts` | P1 | Scope by org; resolve members first |
| SEC-4 | Three controllers without guards; unauthenticated → 500 | `notifications`, `push`, `auth/me` | P1 | Add `AuthGuard` (or make guard global with `@Public()` opt-out — see §45) |
| SEC-5 | Contract `status` free-text via PATCH | `contracts.dto.ts` | P1 | Remove `status` from the DTO or whitelist |
| SEC-6 | Invoice line items editable after paid | `invoices.service.update` | P1 | Block edits unless `draft` |
| SEC-7 | `acceptInvitation` ignores `emailVerified` | `organizations.service.ts` | P2 | Require verified email |
| SEC-8 | Client-visible-by-default for all project tasks/files | §17/§20 | P2 | Visibility flag |
| SEC-9 | No audit trail for role/financial changes | §29 | P2 | Log |
| SEC-10 | Comment delete lacks project re-check | `comments.service.remove` | P3 | Add `assertProjectAccess` |
| SEC-11 | Auth is opt-in per controller | `app.module.ts` | P2 | Global guard + `@Public()` |
| SEC-12 | Session cache 30 s; role removal delay | `session.middleware.ts` | Info | Accept |
| SEC-13 | Helmet CSP on the API is API-appropriate; CORS restricted to `WEB_URL` (single origin). **Custom domains** for the portal: the frontend is served from another origin, so API CORS with a single `WEB_URL` origin means the *custom domain portal calls will be blocked* unless requests are proxied. **[UNVERIFIED]** how the custom-domain feature calls the API. | `main.ts` | P2 | Verify |
| SEC-14 | Rate limiting: global 100/min; signup 5/min; token-signing public endpoints use the global limit (not tightened). Tokens are hashed and unguessable; fine. | | P3 | |
| SEC-15 | Secrets: encrypted with AES key from `APP_ENCRYPTION_SECRET` (min 32 in prod, default rejected). One key for everything; no rotation path. | `main.ts`, settings service | P3 | |
| SEC-16 | `.env.example` contains placeholders only; `.gitignore` excludes `.env`. No secrets found in tracked files. | | ✅ | |
| SEC-17 | Password handling delegated to Neon Auth (nothing stored locally). | | ✅ | |

## 30.2 IDOR test matrix (code-traced, not executed) — [FACT]

| Resource | Org isolation | Client-project isolation | Result |
|---|---|---|---|
| Project | `findFirst({id, organizationId})` | `clients.some(userId)` | ✅ |
| Task | ✅ | `ProjectClient` check | ✅ |
| File download/URL | ✅ | `assertProjectAccess` | ✅ |
| Update attachment | ✅ | access check | ✅ |
| Comment | ✅ (by target) | `assertProjectAccess` | ✅ |
| Invoice (client) | ✅ | `ProjectClient` on `invoice.projectId`; projectless → 403 | ✅ |
| Invoice PDF (client) | ✅ | same **[UNVERIFIED — controller path `mine/:id/pdf` not fully read]** | likely ✅ |
| Document (client) | ✅ | assignment check | ✅ |
| Contract (client) | ✅ | `findOneByClient` checks project assignment | ✅ |
| Notification | by `userId` + org | n/a | ✅ (no guard, §SEC-4) |
| Contract → user lookup | ❌ | | SEC-2 |
| Search → profile | ❌ | | SEC-3 |

---

# 31. Database / Data Model Review

See §7 for entity mapping. Consolidated review:

**What's sound:** Cascade on child rows, composite uniques where they matter (`[organizationId, invoiceNumber]`, `[projectId,userId]`, `[taskId,userId]` votes), the partial unique index that allows one running timer per user (hand-written SQL in the migration), version tables with `[contractId, version]` unique, hashed access tokens, integer cents.

**What's risky:** see D1–D14. In priority order: missing migration (D1), single-migration/`db push` drift risk (D2), no `clientId` on financial/contract docs (D5, K-series), free-string state machines (D8), no organization FKs (D3).

**Naming:** table names are snake_case singular via `@map` (consistent); `ProjectUpdate.attachmentKey` maps to legacy column `image_key` (remnant of when only images were allowed).

---

# 32. API Review

- **Style:** REST under `/api`, DTO validation with `whitelist + forbidNonWhitelisted` (unknown properties rejected — good), `AllExceptionsFilter`, Pino logging, pagination via `PaginationQueryDto` + `paginatedResponse`.
- **Route shape is inconsistent**: client-scoped variants are named `mine` in some controllers (`/projects/mine`, `/tasks/mine/:projectId`, `/invoices/mine`, `/contracts/mine/:id`) but the *same path* serves both roles in others (`/files/project/:projectId`, `/comments/*`, `/updates` POST). The rule "role decided by decorators here, by service checks there" is easy to get wrong. **[REC, P2]** Document it in one table (the one in §6.2 is a start) and add a controller-level default of "deny unless decorated".
- **Response shapes:** most lists `{data, meta}`/`{data,total,page,limit}` — the frontend defines two different `PaginatedResponse` shapes (`meta.total` on the dashboard; `total` at top level on the project page). One of them is wrong for a given endpoint unless the backend returns both. **[UNVERIFIED]** which; check `paginatedResponse`.
- **No API versioning, no OpenAPI/Swagger.** Fine for a first-party frontend.
- **Webhooks:** Stripe (platform billing), Connect, direct per-org — signature verified, raw body enabled. ✅
- **Long-running work in request:** PDF generation and signing are synchronous; fine at current scale.
- **Idempotency:** Stripe webhook is idempotent; invoice creation retries on unique collision (3×).

---

# 33. Frontend Architecture Review

| Aspect | Observation |
|---|---|
| Data fetching | Hand-rolled `apiFetch` + `useEffect`/`useState` in every page. No cache, no request dedupe, repeated `/organizations/me` fetches (clients page, etc.), and JWT fetched per request via `authClient.token()`. Works; will feel slow and be repetitive as features grow. A data library is **not required now**; a small `useApi` hook would remove most boilerplate. |
| Large components | `portal/projects/[id]/page.tsx` (1,621 lines), `clients/page.tsx` (1,106), `files-section.tsx` (>1,200), `task-detail-modal.tsx` (913), `contract-builder-modal.tsx` (641). These mix data fetching, state and markup. Refactoring risk rises with each feature. |
| Routing | Route groups clean: `(auth) (dashboard) (portal) (setup)`. Role redirect on login (`owner/admin→/dashboard`, `member→/portal`). **[UNVERIFIED]** whether a client manually visiting `/dashboard` is bounced by the frontend (backend authorization still protects data). |
| Error handling | No `error.tsx` / `not-found.tsx` at app level (only under `login/[slug]`); unhandled render errors show Next's default. |
| Forms | Controlled inputs, ad-hoc validation; server DTOs are the real validation. |
| Design system | Strong: token-driven, documented (`DESIGN_SYSTEM.md`), reusable `ui/*` primitives incl. modal, sheet, table, tabs, toast, skeletons, empty states. **DO NOT CHANGE.** Docs refer to a `dashboard/` reference directory that isn't in the repo — cosmetic doc rot. |
| Shared types | Duplicated `shared/index.ts` (drift risk). |
| Tests | 1 frontend test file (link embeds, 42 tests). No component/e2e tests committed. |
| PWA | `sw.js` for push. |
| i18n | English strings inline. |

---

# 34. UX / UI Review

Evaluated from code, from the perspective of a freelancer and of a client. **[UNVERIFIED]** for pixel-level and mobile layout; I did not render the app.

## 34.1 Strengths

- Consistent, calm design language; skeleton loaders on dashboard and portal; empty states with an action on the projects list; toast + confirm modals; keyboard-friendly global search (`global-search.tsx`).
- Project detail page is tabbed by *work type* (Updates / Tasks / Files / Time / Contracts / Invoices / Notes) — easy to learn.
- Client can be previewed-as (read-only) — excellent for "what does my client see?".

## 34.2 Weaknesses

| # | Issue |
|---|---|
| U1 | Navigation is **Overview / Projects / Calendar / Clients / Reports / Settings**. There is no Invoices, Contracts or Documents entry point although invoice and contract pages exist (`/dashboard/invoices` is orphaned). Finance is only reachable inside a project. |
| U2 | "Clients" tab mixes **Team** and **Clients** under one nav item; the `/dashboard/team` route just redirects to it. Naming and IA conflict with your mental model. |
| U3 | No client detail page (§11). |
| U4 | Project creation modal omits client, dates and budget; the client is then assigned in a separate control on the project page. |
| U5 | Dashboard does not surface work needing attention (§9). |
| U6 | Contract "Send" gives no indication the client is *not* notified and *cannot* sign (K-series). |
| U7 | Archived projects vanish for clients silently. |
| U8 | Status pipeline customisation implied by settings has no UI (§8 #7). |
| U9 | Fake `PROJ-000n` references (§9). |
| U10 | Hard-coded `$` currency. |

## 34.3 Step counts for common tasks (from code paths) — [FACT unless noted]

| Task | Today | Steps / friction |
|---|---|---|
| Add a lead | **Impossible** | No entity. Workaround: invite by email (creates a login-bound client, sends an email immediately). |
| Convert a lead to a client | **Impossible** | n/a |
| Create a project for a *new* client | Clients → Invite (email) → *client accepts on their own* → Projects → New Project (name, description) → open project → assign client. **≈ 8 actions across two people**; the project can't be assigned to a client who hasn't accepted the invite. |
| Create a project for an existing client | Projects → New → name/desc → Create → open → client-assignment → pick client → (set dates inline) — **≈ 6 actions**; no client/date/budget in the create form. |
| Create tasks from a standard set | Duplicate an old project (2-3 steps) — but it copies old dates and appears in lists, or add tasks one by one. |
| Create a proposal | Author a PDF **outside** the app → project → Files → Upload as Document (type proposal, approval toggle, optional signature placement, expiry) → Send. **The same price is typed again** on the invoice. |
| Send a proposal | Document → Send (notifies clients). ✅ 1 step once uploaded. |
| Record a payment | Invoice → status dropdown → "paid" (no date, no method, no reference, no amount). Online: client pays via Stripe (automatic). |
| Create an invoice from a contract/proposal | Not possible; retype line items. |
| Generate invoice from tracked time | Project → Time → Generate (1 dialog) ✅ |
| Complete a project | Change status to Completed. Nothing else happens. |
| Get client approval | Upload doc with approval toggle → send → client responds. ✅ Or decision task. There is no "request changes". |

**Unnecessary duplicate entry:** price (proposal PDF → contract → invoice), client identity (invite email → profile → contract parties), project dates (project → contract).

---

# 35. Complete Workflow Analysis

Legend: ✅ works and carries data · 🟡 works with manual re-entry · 🔴 no support.

## 35.1 Current-state map

```
 LEAD ──🔴──► CLIENT ──✅invite──► (client logs in)
                │
                └─🟡 assign ─► PROJECT ──✅──► TASKS / UPDATES / FILES / TIME / NOTES
                                  │
        PROPOSAL 🔴 (PDF upload as Document, project required first)
                                  │ (no data flows)
        CONTRACT 🟡 (builder: no client action)  or  Document e-sign ✅
                                  │ (no data flows)
        DELIVERABLE / REVIEW 🟡 (document accept/decline; no "request changes")
                                  │
        INVOICE 🟡 (retype; from time ✅) ──► SENT ──► PAID  (Stripe ✅ | manual 🟡)
                                  │
        COMPLETION 🟡 (status only) ──► HANDOVER 🔴 ──► SUPPORT 🔴
```

## 35.2 Transition-by-transition audit (your eight questions)

Q1 next entity created · Q2 info carried · Q3 duplicate entry · Q4 relationship stored · Q5 leaves workflow · Q6 manual work · Q7 status updated · Q8 activity recorded

| Transition | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 |
|---|---|---|---|---|---|---|---|---|
| Lead → Client | n/a — no lead | | | | | | | |
| Client → Proposal | ✅ upload | ❌ nothing prefilled | ✅ retyped | ⚠️ to *project* only | yes (external PDF) | high | ✅ doc status | ✅ audit |
| Proposal accepted → Contract | ❌ | ❌ | ✅ | ❌ | yes | high | – | ✅ activity |
| Contract → Project | ❌ (project must pre-exist) | ❌ | – | ✅ `projectId` | – | – | – | – |
| Contract signed → Invoice | ❌ | ❌ (payment schedule stored, unused) | ✅ | ❌ | yes | high | – | ❌ |
| Project → Tasks | ✅ (duplicate) | ✅ | – | ✅ | no | low | – | ❌ |
| Task done → Milestone | n/a | | | | | | | |
| Deliverable → Review → Approval | 🟡 | – | – | ✅ | no | low | ✅ | ✅ |
| Approval → Invoice | ❌ | ❌ | ✅ | ❌ | yes | med | – | ❌ |
| Time → Invoice | ✅ | ✅ | ❌ none | ✅ | no | low | ✅ | ❌ |
| Invoice sent → Paid | – | – | – | ✅ | no (Stripe) | manual if offline | ⚠️ (F1) | ❌ |
| Paid → Start project | ❌ | | | | | | | |
| Project complete → Delivery/Maintenance | ❌ | | | | | | ✅ (status) | ❌ |

## 35.3 Target workflow map (adapted to what exists) [REC]

```
                           CLIENT (relationship record — NEW, independent of login)
   stage: lead · active · past                                    ├─ contacts (logins → portal)
                                                                  ├─ activity timeline (notes, calls, WhatsApp, meetings)
   LEAD ──► CONTACTED ──► DISCOVERY ──► QUALIFIED                 └─ everything below hangs off clientId
                                          │
                                    (intake form NEW ─ answers reused)
                                          ▼
                                     PROPOSAL (NEW, structured; reuses Document send/accept/audit/reminder/expiry)
                              ┌───────────┴───────────┐
                              ▼                       ▼
                          ACCEPTED                LOST / EXPIRED (reason)
                              │
                 (one-click suggestions, not silent automation)
                              ├─► CONTRACT   (builder → Document e-sign)
                              ├─► PROJECT    (from template; client + dates + budget carried)
                              └─► DEPOSIT INVOICE (price carried)
                                          │
                                    PROJECT ── Milestones (NEW, minimal) ── Tasks (priority, visibility, phase)
                                          │                │
                                      Files/Time       Deliverables = Documents (requiresApproval)
                                                           │
                                                CLIENT REVIEW ──► Approved | Changes requested (NEW state)
                                                           │
                                            Milestone done ──► invoice draft (suggested)
                                                           ▼
                                     INVOICE ──► Payment(s) (NEW) ──► paid
                                                           ▼
                                   COMPLETE ──► handover checklist ──► SUPPORT project ("Maintenance")
```

Existing pieces (✅) are reused everywhere shown; the only genuinely new tables are `Client`, `Payment`, `Expense`, `Milestone`, and (optionally) `Proposal`, `FormTemplate/FormResponse`, `Activity` generalisation.

---

# 36. Information Flow Analysis

**Where each piece of information is entered and where it must currently be retyped [FACT]:**

| Information | First entered | Retyped in |
|---|---|---|
| Client name/email | Invite email | `ClientProfile` (company, address…), Contract parties (auto-copied ✅ from user + profile), Document (n/a), Invoice (n/a: uses project link) |
| Company/address | Client profile | Contract parties ✅ auto-copied; not on invoice PDF **[UNVERIFIED: PDF may show client details]** |
| Project scope & deliverables | Project description / tasks | Contract scope (auto-copies description + task titles ✅) — but not the *proposal* |
| Price | Proposal PDF (outside app) | Contract payment section (defaulted, must be overwritten), Invoice line items |
| Dates | Project start/end | Contract dates (auto ✅) |
| Hourly rate | Project/member | Time entries (frozen ✅), invoice line items (auto ✅), contract (defaults ✅) |

Good: contract creation *does* pull from project and client — the one place "enter once" already works. The break is at price and at everything before the project exists.

---

# 37. Duplicate Data Entry Analysis

| # | Duplication | Cost | Fix |
|---|---|---|---|
| DUP-1 | Price/scope retyped: proposal → contract → invoice | Every project | Structured proposal; carry line items (§13, §27) |
| DUP-2 | Client identity: email at invite, company at profile | Every client | Client record first; invite from it |
| DUP-3 | Requirements captured in chat/docs then retyped into scope | Every project | Intake form answers prefill scope (§12) |
| DUP-4 | Tasks re-entered for each website | Every project | Project templates (§16) |
| DUP-5 | Payment received offline → status flip + mental note of method/date | Every offline payment | Payment record (§21) |
| DUP-6 | Related client history scattered across projects | Ongoing | Client timeline (§29) |

---

# 38. Missing Features (verified absent) — [FACT]

Leads/CRM · follow-ups · lost reasons · Client entity independent of login · multiple contacts per client · client detail page · intake/discovery forms · structured proposals · proposal without a project · contract accept/sign · milestones · project progress · project budget/value · deliverables & change requests · task priority/checklists/subtasks/attachments/estimates/internal visibility · file visibility · project templates · phases · Payment records/partial payments · Expenses · profit reporting · currency · discount/tax · recurring invoices · meetings · support tickets · maintenance/retainers · messaging · notification preferences · daily digest · automation between entities · audit log for finance/permissions · search across invoices/docs/contracts · dashboard "needs attention" · custom project status UI.

# 39. Partially Implemented Features

| Feature | What's there | What's missing |
|---|---|---|
| Custom project statuses | table, validation, seeding | UI/API to edit; dashboard hard-codes slugs |
| Contracts | builder, versions, PDF | client action, notification, migration, `signed` path, more templates |
| Proposals | uploaded Document w/ accept/decline | structured data, project-less, follow-on automation |
| Approvals | documents + decision tasks | change requests, per-version comments |
| Search | 4 entities | invoices, docs, contracts; correctness fixes |
| Finance | invoices, Stripe, time→invoice | payments, expenses, currency, project value |
| Activity log | 3 event types + contract | most events; client-level |
| Reports | time | revenue, aging, profit |
| Templates | duplicate project | true templates, phases, hidden from lists |
| Team | owner/admin | staff-below-admin role; task assignment to them |

# 40. Broken Features

| # | Item | Evidence |
|---|---|---|
| ❌1 | **Contracts on migrated databases** | Tables absent from migration |
| ❌2 | **Contract signing lifecycle** — `signed` unreachable; portal offers no way | §14 |
| ❌3 | **Backend test suite** — 30/39 files fail to load | `Failed to load url @/database …` (also at HEAD tsconfig) |
| ❌4 | **Backend lint** — `npm run lint` errors: ESLint 9 with no flat config | eslint output "migration guide" |
| ❌5 | **Unauthenticated calls to notifications/push/auth-me → 500** | code |
| ❌6 | **Manual "paid" leaves `paidAt`/`paidAmount` null and sends no notification** | `invoices.service.update` |
| ❌7 | **Search misses org clients when the query matches ≥20 users platform-wide; leaks profile company across orgs** | S1/S2 |
| ❌8 | **Railway build command references nonexistent workspaces** | `railway.json` vs no root `package.json` **[UNVERIFIED in production]** |
| ❌9 | **README quick-start commands (`npm run dev -w backend`, root workspaces)** cannot work | no root package.json |

# 41. Features Needing Improvement

Dashboard (§9) · Clients page IA (§34) · Invoice edit rules and payment recording (§21) · Task model (visibility, priority, statuses) (§17) · Document approval "request changes" (§19) · Duplicate project (shift dates, template flag) (§15/16) · Notifications (digest, overdue) (§26) · Portal overview page (§22) · Global invoices page (link it) · Contract default values (K6) · Docs accuracy (§3.5).

---

# 42. Features That Should Remain Unchanged (DO NOT CHANGE)

| Area | Why |
|---|---|
| **Tenant scoping pattern** (`findFirst({id, organizationId})` everywhere; `assertProjectAccess`; `ProjectClient` gate) | Consistent and correct; the foundation of safety. Copy it for every new entity. |
| **Neon Auth integration** (JWKS verify, read-only user repository, first-party cookie proxy) | Working and deliberately loose-coupled; no reason to change. |
| **Document / e-signature engine** (fields, signing order, hashed tokens, audit events, certificate, reminders, expiry, versions) | Best-engineered subsystem; the correct base for proposals, contracts and deliverable approval. Extend, don't replace. |
| **Stripe Connect + direct-key payments and webhook idempotency** | Careful org/account cross-checks; leave alone. |
| **Time tracking → invoice line items** (frozen rate, one running timer per user partial index, no double billing) | Complete and correct. |
| **Decision tasks with secret voting** | Clever, useful for client choices; also the model for "approve one of these options". |
| **Preview-as-client** | Great UX and safely read-only. |
| **Design system and `ui/*` components** | Cohesive; matches your token/no-hardcoded-hex rule. |
| **Encrypted per-org settings, per-org email provider** | Suits self-hosting/white-label. |
| **DTO whitelist + forbid unknown** | Keep. |
| **Integer-cents money representation** | Keep; add currency next to it. |
| **Project duplicate transaction logic** | Correct "shape not state" cloning; extend rather than rewrite. |
| **CSV export with injection protection** | Keep. |

---

# 43. Overengineering / Unnecessary Features

Classification for the *target product* (solo freelancer), not for the code that exists.

| Item | Class | Comment |
|---|---|---|
| SaaS billing/plans, plan guards, lifetime deals | Optional | Only matters if you host it for others; already off by default. Don't extend. |
| Custom domains | Optional | Nice for white-label; adds CORS/DNS complexity (SEC-13). Don't extend. |
| Web Push + VAPID per org | Optional | Works; email covers the need. Don't add more push events. |
| Multi-org membership | Optional | Harmless. |
| Roadmap: SAML/SSO, granular permissions, webhooks/Zapier, knowledge base, dashboard widgets, AI assistant, embeddable widgets, i18n | **Unnecessary now** | Enterprise/platform features; remove from the near roadmap. |
| Roadmap: trigger-action automation engine | **Unnecessary** | One-click suggestions cover it. |
| Lead scoring, sequences, custom pipelines, assignment rules | **Unnecessary** | Would turn CRM into HubSpot. |
| Website-specific tables (pages, sitemap, hosting registry) | **Unnecessary / harmful** | Use form templates and templates-as-data. |
| Full ticketing (SLA, escalation) | Optional / postpone | Task-based support is enough. |
| Full accounting (ledger, tax, multi-account) | **Unnecessary** | Payments + expenses + one profit view. |
| Chat / messaging | Optional | Comments + email suffice. |
| Weighted project progress % | **Unnecessary** | Use "n of m milestones". |
| Subtasks/checklists/attachments per task | Optional (P3) | Only if requested. |
| Calendar view | Useful | Already built. |
| Global search | Useful | Keep, fix. |

**Essential for your target (the "spine"):** Client record + stage; follow-up date; proposal → accept; project from template; tasks with visibility; milestones (light); deliverable approval with changes; invoice + payments; expenses (light); client portal; activity timeline; daily digest.

---

# 44. Automation Opportunities

Ranked by (time saved per project) ÷ (implementation effort). All assume the data-model additions in §46.

| Rank | Automation | Type | Prereqs | Effort |
|---|---|---|---|---|
| 1 | Proposal accepted → create project (from template) + client link + draft deposit invoice | One-click on acceptance screen | Client, structured proposal, project template | M |
| 2 | Contract signed → suggest deposit invoice from stored payment schedule | Suggestion | Contract path resolved (§14) | S |
| 3 | Invoice overdue → notify owner; optional client reminder at +3/+7 days | Cron (job already exists) | none | S |
| 4 | Milestone completed → draft invoice for milestone amount | Suggestion | Milestones | S |
| 5 | Project completed → checklist (final invoice, handover doc, create Maintenance project) | Prompt | none | S |
| 6 | Lead follow-up due → daily digest | Cron | Client.nextFollowUpAt | S |
| 7 | Client accepted invite → notify owner and suggest "create project" | Event | none | XS |
| 8 | Intake submitted → notify owner; prefill proposal scope | Event | Forms | M |
| 9 | Recurring maintenance invoice | Cron | Payments | M (P3) |

Dependencies are explicit in §58.

---

# 45. Security Improvements (all [REC])

| Order | Change | Ref |
|---|---|---|
| 1 | Restrict who can invite/promote `owner` (owner only); hide in UI for admins; add a test | SEC-1 |
| 2 | Validate `Contract.clientId` (org member; ideally project client) on create/update | SEC-2 |
| 3 | Scope search profile lookup by org; resolve org members before global user search | SEC-3 |
| 4 | Make `AuthGuard` global with an explicit `@Public()` opt-out (a decorator already exists) — eliminates the "forgot the guard" class and the 500s | SEC-4, SEC-11 |
| 5 | Remove/whitelist `status` on contract PATCH; whitelist all status transitions server-side | SEC-5, D8 |
| 6 | Lock invoice content after `draft` (allow notes/due date only); record who/when in activity | SEC-6 |
| 7 | Require verified email to accept invitations | SEC-7 |
| 8 | Add visibility flag to tasks and files | SEC-8 |
| 9 | Activity log for role changes, invoice status changes, member removal | SEC-9 |
| 10 | Verify CORS for custom domains | SEC-13 |
| 11 | Add regression tests for each tenant-isolation rule (after tests run again) | — |

---

# 46. Data Model Recommendations (all [REC])

Design rule: **additive, nullable, backward compatible; no rewrite of existing tables.** Every new table gets `organizationId` (with a real FK) and is queried through the existing scoping pattern.

## 46.1 New: `Client`

```
Client
  id, organizationId (FK)
  name, company, email, phone, whatsapp, website, industry, location
  stage        lead | active | past | lost         ← "status"
  source, interestedIn, estimatedBudgetCents, priority
  nextFollowUpAt, lostReason, notes
  ownerId (assigned member userId)
  createdAt, updatedAt, archivedAt

ClientContact                 ← optional; a login (user) belonging to a client
  id, clientId, userId? , name, email, phone, isPrimary
```

- `ProjectClient` stays as the **portal-access** link. Add `Project.clientId` (nullable). Backfill: for existing `Member(role=member)`, create a `Client` (from `ClientProfile`) + `ClientContact`, set `Project.clientId` from the first `ProjectClient`.
- Add nullable `clientId` to `Invoice`, `Contract`, `Document` (proposal), `File`; keep `projectId`.
- **Lead → client = change `stage`. No copy, no conversion table.** This is the "enter once" answer for CRM; it also removes DUP-2 and C1–C3.
- Alternative considered and rejected: a separate `Lead` table with a conversion step — duplicates fields and creates the conversion problem you want to avoid.

## 46.2 Generalise `ActivityLog`

Make `projectId` nullable; add `clientId`, `entityType`, `entityId`, `summary`; add `kind` for manual entries (`note|call|whatsapp|email|meeting`) with `occurredAt`. One table backs lead activity, client timeline, project timeline and the audit trail. Keep existing rows valid.

## 46.3 Finance

```
Payment    id, orgId, invoiceId, clientId?, projectId?, amountCents, method, reference, paidAt, recordedById, stripePaymentIntentId?
Expense    id, orgId, projectId?, clientId?, category, vendor, amountCents, date, receiptFileId?, billable
Invoice +  currency, clientId, discountCents?, taxRatePct?, paymentTermsDays?
Project +  budgetCents, currency
```

Invoice status derived from payments (`partially_paid` added). Replace three total calculators with one `invoiceTotals()`.

## 46.4 Work structure

```
Milestone  id, projectId, name, order, dueDate, status, amountCents?
Task +     priority, visibility (internal|client), phase?, milestoneId?
File +     visibility
Project +  isTemplate, kind (project|support)
Document + type "deliverable", response "changes_requested"; clientId; projectId nullable for proposals
```

## 46.5 Forms

`FormTemplate` and `FormResponse` (JSON) as in §12.1.

## 46.6 Structural hygiene

- Add the missing migration (contract tables) and switch to **migrations-only** going forward; stop documenting `db push` as the workflow.
- Enums (Prisma `enum`) or DB `CHECK` constraints for statuses on Invoice, Contract, Document, Task.
- Add real FKs `organizationId → organization` on new tables; consider a one-time migration adding them to old tables.
- Index `Invoice(organizationId, status, dueDate)`.

---

# 47. UX Recommendations (all [REC])

1. **Nav:** Overview · **Clients** (new, with stage filter and detail page) · Projects · **Finance** (Invoices + Payments + Expenses) · Calendar · Reports · Settings. Move **Team** under Settings (it isn't a client).
2. **Client detail page** = the relationship record: header (stage, next follow-up), tabs Overview / Projects / Proposals & Contracts / Invoices / Files / Activity. Everything with one click and no navigation through projects.
3. **"What needs me" dashboard** (§9).
4. **Project create dialog**: client picker (with "+ new client" inline), template picker, dates, budget. One dialog.
5. **Quick add** (`+` menu): lead, project, task, invoice, time entry.
6. Portal home: "Waiting on you" (unsigned documents, unpaid invoices, open decisions, pending intake).
7. Contract Send confirmation clarifying what the client will experience (until §14 is resolved, disable Send).
8. Show "This invoice is locked" affordances after send.
9. Replace fake `PROJ-000n` with real numbering or remove.
10. Client-visible badge on tasks/files (eye icon) so freelancers see what the client sees.
11. Add `error.tsx` / `not-found.tsx`; user-visible errors instead of `console.error`.
12. Currency-aware formatting.

# 48. Workflow Recommendations (all [REC])

- Treat the workflow as **stage on Client + suggestions on transitions**, not a hard state machine. Skipping stages is allowed (existing client → new project directly; lead → lost with a reason).
- Every transition offers a **single primary action** that carries data forward (accept → "Create project & deposit invoice").
- Never require a project before a proposal.
- Keep manual override everywhere; automation is a *prefill*, never a lock.
- Log every transition to the activity timeline.

---

# 49. Feature Priority Matrix

| Feature | Value to freelancer | Effort | Depends on | Priority |
|---|---|---|---|---|
| Fix contracts migration | Unblocks feature | XS | – | **P0** |
| Fix admin→owner escalation | Security | XS | – | **P0** |
| Repair tests + lint | Enables safe change | S | – | **P0** |
| Contract clientId validation, search scoping, invoice paid handling, contract status whitelist, invoice lock | Integrity/security | S | – | **P1** |
| Global auth guard | Safety | S | – | P1 |
| **Client entity + stage + follow-up** | Very high | M | migration hygiene | **P1** |
| Client detail page + activity timeline | Very high | M | Client | P1 |
| Payments + manual payment recording | High | M | – | P1 |
| Proposal (structured) → accept → project + deposit invoice | Very high | M-L | Client, Payments | P1 |
| Task visibility + file visibility | High (trust) | S | – | P1 |
| "Needs me" dashboard + overdue notification/digest | High | S-M | – | P1 |
| Project templates (isTemplate, phase) | High | S-M | – | P2 |
| Milestones | Medium-High | M | Templates | P2 |
| Deliverable approval with "changes requested" | High for design work | M | Documents | P2 |
| Intake forms | Medium-High | M | Client | P2 |
| Expenses + profit view | Medium | M | Payments | P2 |
| Currency/discount/tax | Medium | S-M | – | P2 |
| Contract resolution (builder → Document e-sign) | High | M | – | P2 (P1 if you use the builder) |
| Manual activity entries (calls/WhatsApp/meetings) | Medium-High | S | Activity generalisation | P2 |
| Support as project kind | Medium | S | Client | P2 |
| Search expansion | Medium | S | – | P2 |
| Recurring invoices | Medium | M | Payments | P3 |
| Notification preferences | Low-Med | S | – | P3 |
| Messaging, SSO, webhooks, AI, KB, widgets | Low | L | – | P3/never |

---

# 50. P0 Critical Issues

| ID | Issue | Why P0 | Fix | Effort |
|---|---|---|---|---|
| P0-1 | Contract tables absent from migrations | Feature fails in migrated environments; deploy blocker | Generate a migration for `contract`, `contract_version` (create with `prisma migrate diff`/`migrate dev --create-only` against a **dev branch**, then review). Do **not** `migrate reset`. | XS |
| P0-2 | Admin can invite owner | Privilege escalation to full control incl. removing the real owner | Server-side rule + UI + test | XS |
| P0-3 | Tests can't load (alias) | No safety net; violates CLAUDE.md gate | Add `resolve.alias { "@": "./src" }` to `vitest.config.ts` — then triage any tests that fail for real reasons | XS-S |
| P0-4 | Lint crashes | Same gate | Add an ESLint flat config (`eslint.config.mjs`) or pin ESLint 8 to match the script | XS-S |

*Note:* P0-3/4 are "process" P0s — I rate them P0 because every subsequent change in this plan is unprotected without them, and the project rules say tests and lint must pass before commits.

# 51. P1 Core Improvements

1. Contract `clientId` validation (SEC-2)
2. Search scoping/correctness (SEC-3)
3. Global AuthGuard + `@Public()` opt-out (SEC-4/11)
4. Contract status whitelist; resolve contract sign path (K3, §14)
5. Invoice: lock after draft; set `paidAt/paidAmount` + notify on manual paid; overdue notification (F1, F2, F6)
6. Client entity, stage, follow-up date, source, budget, lost reason (§46.1)
7. Client detail page and timeline (§47)
8. Payment record and manual payment entry (§21)
9. Structured proposal → accept → project + deposit invoice (§13, §44)
10. Task/file visibility (SEC-8)
11. "Needs me" dashboard + daily digest (§9, §26)
12. Reconcile docs/`railway.json`/README with reality (§3.5)

# 52. P2 Important Improvements

Project templates (`isTemplate`, `phase`, date shifting) · Milestones · Deliverable approval with change requests · Intake forms · Expenses and profit report · Currency/discount/tax/payment terms · Manual activity entries (calls/WhatsApp/meetings) · Support as a project kind · Search expansion · Link Invoices in nav · Status pipeline editor · Dedup `shared` types · Invoice number sort fix · Remove dead `local.storage.ts` · Client merge · Comment-delete access re-check · Verified-email requirement · `error.tsx`/`not-found.tsx` · Break up 1,000+ line components when next touched.

# 53. P3 Future Features

Recurring invoices/retainers · Notification preferences · Priority/checklist/subtask/attachments on tasks · Google Calendar integration · Client merge/dedupe tooling · Contract renewals · Multiple contract templates · E-sign on contract builder output at scale · Inbound email logging · CSV import of leads · Webhooks · i18n · Messaging.

---

# 54. Recommended V1 Scope

**Goal of V1:** *A freelancer can take a lead all the way to a paid invoice without leaving the app or retyping the price.* Everything else waits.

1. **Stabilise (P0 + integrity P1)** — §50, §51 items 1–5.
2. **Client record with stage** (lead → active → past/lost), follow-up date, source, budget, notes; Clients list with stage filter; client detail page with Projects / Invoices / Files / Activity.
3. **Manual activity entries** on a client (call, WhatsApp, email, meeting, note).
4. **Structured proposal** (line items + scope + validity + terms) sent through the existing Document engine; project no longer required.
5. **On acceptance:** one-click "Create project" (client, dates carried) + "Create deposit invoice" (price carried).
6. **Payments** (manual and Stripe unified) and the invoice lock.
7. **"Needs me" dashboard** and overdue-invoice notification.
8. **Task visibility** (internal vs client).

Explicitly *not* in V1: milestones, intake forms, expenses, support, templates, currency.

# 55. Recommended V2 Scope

Project templates + phases; milestones with milestone-based invoice suggestions; deliverable approval with "changes requested" and versions; intake forms with prefill of proposal scope; expenses and a revenue/expenses/profit report; currency, discount, tax, payment terms; contract path unified into the Document engine; search expansion; daily digest polish.

# 56. Recommended V3 Scope

Support/maintenance flow (support project kind, waiting-on-client status, maintenance retainer + recurring invoice); notification preferences; meetings with action items → tasks (+ calendar link); portal "waiting on you" home; multiple contract/proposal templates; client dedupe/merge; import/export of leads; only then consider any roadmap platform items.

---

# 57. Recommended Implementation Order

```
0. Safety net        P0-3 tests, P0-4 lint            (nothing else is safe without this)
1. Deploy blockers   P0-1 contract migration, docs/railway reconciliation
2. Security          P0-2 owner-invite, SEC-2/3/4/5/6, verified email
3. Finance basics    Payment table + manual paid fix + invoice lock + overdue notification
4. Client model      Client + stage + contacts; backfill from Members/ClientProfile; add clientId to Invoice/Contract/Document
5. Client UX         Clients list/detail, activity generalisation + manual entries, nav rework
6. Proposal          structured proposal on Document engine → accept → project + deposit invoice
7. Dashboard         "needs me", digest
8. Trust             task/file visibility flags
   ── V1 ships ──
9. Templates + milestones
10. Deliverable approval loop
11. Intake forms
12. Expenses/profit, currency
13. Contract unification
14. Support/maintenance
```

Rationale: steps 0–3 are cheap and de-risk everything; step 4 is the architectural hinge (everything in V1/V2 hangs off `clientId`); step 6 delivers your headline benefit.

# 58. Dependencies Between Features

```
Tests/lint fixed ──► every change below
Contract migration ──► any contract work
Payment table ──► partial payments, expenses/profit, recurring invoices, project "paid/outstanding"
Client entity ──► leads, follow-ups, client timeline, proposals-without-project, intake forms,
                   support-as-project, invoice/contract clientId, search of clients
Activity generalisation ──► lead activity, client timeline, meetings, audit of finance/permissions
Structured proposal ──► proposal→invoice price carry, proposal→project, contract prefill
Project templates (isTemplate, phase) ──► milestones (grouping), "project from proposal"
Milestones ──► milestone invoice suggestions
Document "changes_requested" ──► deliverable review loop
Contract path decision ──► contract→invoice, contract notification/sign
Currency ──► Payment amounts, Expense amounts, reports (add early on new tables even if UI arrives later)
```

# 59. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Client-entity migration breaks existing portal access or plan-limit counts (`maxClients` counts members) | Med | High | Additive columns; keep `ProjectClient`/`Member` as the access model; backfill script tested on a Neon **branch**; keep counting rule until decided |
| Schema drift (single migration, `db push` habit) surprises production | Med | High | Diff against a shadow DB now; migrations-only from here |
| Test suite revival reveals broken tests | Med | Low-Med | Timebox triage; don't delete/skip tests (project rule) |
| Scope creep into CRM/ERP | High | High | §43 list; V1 explicit exclusions |
| Two contract systems persisting | Med | Med | Decide in V2; disable Send meanwhile |
| Large frontend components slow new features | Med | Med | Extract only when touching; no rewrite |
| Notification spam from template task creation | Med | Med | Batch/suppress for bulk creation |
| CORS/custom-domain assumptions | Low-Med | Med | Verify SEC-13 before promoting custom domains |
| Production/deploy config mismatch (railway.json) | Med | High | Verify actual deploy; update docs |
| Dependency additions (CLAUDE.md requires asking first) | – | – | Nothing in this plan requires new dependencies |

# 60. Final Recommendations

1. **Trust the foundation; fix the edges.** The multi-tenant model, e-signature engine, Stripe/time-to-invoice and portal are solid — do not rebuild them.
2. **The hinge is the Client record.** One additive table plus a `stage` delivers leads, follow-ups, history and proposals-before-projects without a separate CRM.
3. **Reuse Documents as the sales engine** (send → view → accept/decline → expire → remind → audit) rather than building another.
4. **Finance needs a Payment record**, not more invoice statuses.
5. **Resolve the two contract systems** instead of extending both.
6. **Be ruthless about the roadmap**: remove SSO, webhooks, AI, KB, widgets, i18n and trigger engines from the near-term list.
7. **Fix the safety net first**, or nothing else here can be verified.
8. **Update the docs** so a new contributor (or a future you) is not misled by the monorepo/workspace story.

---

# 61. What Should We Build Next?

1. **What should be fixed first?** In this order: (a) vitest alias + ESLint config so tests and lint run; (b) generate and review the missing contracts migration on a dev branch; (c) block admins from creating owners; (d) contract `clientId` validation, search scoping, contract status whitelist, invoice lock and manual-paid handling. Estimated: a few days.
2. **What should be built next?** The Client record with stage/follow-up/timeline and the client detail page; then Payments; then the structured Proposal with "accept → project + deposit invoice". That is V1 (§54).
3. **What should be improved?** Dashboard ("needs me"), navigation (add Finance, move Team), project creation dialog (client/template/dates/budget), task and file visibility, notifications (overdue + digest).
4. **What should not be touched?** Everything in §42, especially tenant scoping, the Document/e-sign engine, Stripe, time tracking, preview-as-client and the design system.
5. **What dependencies exist?** See §58. The two big ones: safety net before everything, and Client entity before leads/proposals/timeline.
6. **What should be postponed?** Milestones, intake forms, expenses/profit, currency, templates (V2); support/maintenance, meetings, preferences, recurring invoices (V3); all enterprise/platform roadmap items indefinitely.
7. **What should the next development phase contain?** *Phase 1 "Stabilise" (§50–51)* then *Phase 2 "Client → Proposal → Paid" (§54)*. Acceptance test for Phase 2: create a lead, log a call, send a proposal to it, have it accepted from the portal link, click one button to create the project and deposit invoice, record a bank-transfer payment, and see the full history on the client page — with the price typed exactly once.

---

# Appendix A — Verification log

| Check | Command / method | Result |
|---|---|---|
| Backend tests | `npx vitest run` in `backend/` | 30 files failed to load, 9 passed; 114 tests pass. Failure: `Failed to load url @/database` / `@/shared` / `@/email` |
| Same, with HEAD `tsconfig.json` (baseUrl restored, run via a scratch config) | vitest with `tsconfigFile` override | Identical: 30 failed / 9 passed |
| Frontend tests | `npx vitest run` in `frontend/` | 1 file, 42 tests, pass |
| Type check | `npx tsc --noEmit` in `backend/` | No errors |
| Lint | `npx eslint src/` in `backend/` | Aborts: ESLint 9 "migration guide" (no config) |
| Migration vs schema | `grep 'CREATE TABLE'` vs `grep '^model '` | 35 tables vs 37 models; `contract`, `contract_version` missing (`grep -c contract migration.sql` = 0) |
| Nest path-alias build behaviour | Read `@nestjs/cli/.../tsconfig-paths.hook.js` | `baseUrl` defaults to `./`; removing it from tsconfig is build-safe |
| Route/guard enumeration | Mechanical listing of every `@Controller/@Get/…/@Roles/@UseGuards` | 30 controllers; `notifications`, `push`, `auth` have no guard |
| Root package.json | `ls package.json` / `git ls-files` | absent |

# Appendix B — Files most relevant for the next phase

| Concern | Files |
|---|---|
| Owner-invite fix | `backend/src/clients/clients.controller.ts` (invite), `clients.service.ts` (`inviteMember`), `clients.dto.ts`, `frontend/.../clients/page.tsx` (team invite role dropdown) |
| Tests/lint | `backend/vitest.config.ts`, `backend/package.json` (`lint`), ESLint config (absent) |
| Contract migration | `backend/prisma/schema.prisma` (Contract*), `backend/prisma/migrations/` |
| Contract integrity | `backend/src/contracts/contracts.service.ts`, `contracts.dto.ts`, `frontend/src/components/contracts/*` |
| Search fixes | `backend/src/search/search.service.ts`, `auth/neon-auth-users.repository.ts` |
| Invoice/payment | `backend/src/invoices/invoices.service.ts`, `payments/payments.service.ts`, `payments/invoice-total.ts`, `time-entries/time-entries.service.ts` |
| Document engine (reuse) | `backend/src/documents/*`, `frontend/src/components/{document-viewer,signing-viewer,signature-field-placer}.tsx` |
| Client model | `backend/prisma/schema.prisma` (Member, ClientProfile, ProjectClient), `clients/*`, `assert-project-access.ts` |
| Dashboard/nav | `frontend/src/app/(dashboard)/dashboard/page.tsx`, `(dashboard)/sidebar-nav.tsx` |
| Docs to reconcile | `README.md`, `railway.json`, `docs/Everything-You-Need-To-Know.md`, `frontend/DESIGN_SYSTEM.md` |

# Appendix C — Open questions for you (need a decision, not code)

1. **Contracts:** keep the in-app builder and make it feed the Document e-sign engine (recommended), or add sign/accept to the builder's own lifecycle?
2. **"Client" definition and plan limits:** should `maxClients` count `Client` records or portal logins?
3. **Hosting model:** is this only for your own use, or also a hosted product for others? (Determines whether billing/plans/custom-domain code is worth maintaining.)
4. **Currency:** single currency per organization is enough for V1?
5. **Deployment reality:** how is production actually deployed (given `railway.json` and README disagree with the code layout)?

---

# Appendix D — Focus Addendum: Client Onboarding & Collecting Leads

*Added after the audit request was narrowed: the priority is **Client Onboarding** and **Collecting Leads**. This addendum re-cuts the findings above for those two goals. Everything here is investigation and recommendation only; nothing was implemented.*

## D.1 Current state — Lead collection

**[FACT]** Nothing exists: no lead model, no public form, no public lead endpoint, no notification for "new lead". The only public (unauthenticated) endpoints are branding lookups (`GET /branding/public/:slug`, `/domain`, `/instance`, `/logo/:orgId`), token-based document signing, and Stripe webhooks. A visitor cannot contact the freelancer through the platform.

**[FACT] Reusable building blocks already present**

| Need | Existing piece |
|---|---|
| Per-org public identity (slug, branding, custom domain) | `Organization.slug`, `Branding`, `GET /branding/public/:slug`, frontend `login/[slug]` |
| Public endpoint pattern with abuse limits | `@Public()` + `ThrottlerGuard` (per-route `@Throttle` already used on signup) |
| Notify owner (in-app, email, push) | `NotificationsService` + React Email templates |
| Send email via the org's own provider | `MailService` (Resend/SMTP per org) |
| Reminder cron pattern | `document-reminder.task.ts` (reusable for follow-up reminders) |
| Timeline of events | `ActivityLog` (needs generalising, §46.2) |

## D.2 Current state — Client onboarding

**[FACT] What exists**

```
Owner: Clients → Invite (email + role=member) ─► email with /accept-invite?id=<invitationId>
Client: signs up / logs in with the SAME email ─► acceptInvitation ─► Member(role=member) ─► /portal
Owner: opens a project → assigns the client (separate step)
Optional: setup wizard step "invite client" and "first project" (org-level onboarding, not client onboarding)
```

- `ClientProfile` (company, phone, address, website, description) is filled by the owner, or by the client under `/portal/settings` (`PUT /clients/me/profile`).
- Invitation expires in 7 days; pending invites show a copyable link; resend/revoke exist in the clients page **[UNVERIFIED: resend behaviour]**.

**[FACT] What is missing for real onboarding**

| Gap | Effect |
|---|---|
| Client cannot exist before accepting the invite | You cannot prepare a client (profile, project, proposal) while waiting; the project can't be assigned until they log in |
| No intake / discovery questionnaire | Requirements arrive in chat and get retyped (DUP-3) |
| No onboarding checklist (sign contract, pay deposit, send logo/content, fill intake) | Freelancer tracks it manually; client has no "what do I need to do" page |
| Invite email is generic ("You've been invited to X") | No project context, no next step |
| Forced account creation before any value | Friction; a client who just needs to sign or pay must still register (token signing exists for documents only) |
| No owner notification when the invite is accepted | You don't know they are ready |
| Portal lands on the project list; a brand-new client with no project assigned sees an empty list | Confusing first impression |
| Invite email must match sign-up email exactly; unverified email accepted | Support friction and SEC-7 |

## D.3 Recommended design (minimal, generic — [REC])

### D.3.1 Lead collection

1. **`Client` record with `stage = lead`** (from §46.1). No separate Lead table, so conversion is a stage change and nothing is retyped.
2. **Public lead form** at `/<org-slug>/contact` (or `/l/<slug>`), themed with the org's branding. Fields configurable per org, defaults: name, email, phone/WhatsApp, company, website, service interested in, budget range, message. Optional embed snippet later (P3).
3. **Public endpoint** `POST /leads/public/:slug` — `@Public()`, strict throttle (e.g. 5/min/IP), honeypot field, max field lengths, no file uploads in v1, always returns 200-style success (no user-enumeration), dedupes on email within the org by *appending an activity* instead of creating a second record.
4. **On submit:** create `Client(stage=lead, source="website form")`, write an activity entry ("Submitted contact form" with the message), notify the owner (in-app + email), set `nextFollowUpAt = now + 1 day`.
5. **Manual capture** in the app too: "+ Lead" quick add (name + one contact method minimum), because most freelancer leads arrive via WhatsApp, referrals and DMs, not forms.
6. **Lead list**: filter by stage, source, follow-up due; sort by next follow-up. Stages kept small: New → Contacted → Qualified → Proposal sent → Won / Lost (+ lost reason). Your longer list (Discovery, Negotiation) can be added later as optional stages; start with fewer.
7. **Follow-ups**: `nextFollowUpAt` plus a daily digest entry ("3 follow-ups due today"). Reuse the cron pattern.
8. **Status vs activity kept separate** (stage on the record; append-only activity for notes, calls, WhatsApp, emails).

### D.3.2 Client onboarding

1. **Won → Client (stage `active`) in one click.** Prompt: "Create project", "Send onboarding".
2. **Invite from the client record**, not from a blank email box; the record already holds name and email. Invite email names the project and states the first action.
3. **Onboarding checklist per client/project** (generic, template-able): default items — Sign agreement, Pay deposit, Complete intake, Upload assets. Each item **links to the object that completes it** (document to sign, invoice to pay, intake form), and ticks itself when that object reaches its done state. Implement as a small `OnboardingItem` list or as tasks with `visibility=client` and a `linkedEntity`; prefer reusing tasks (they already have client-visible requests and notifications).
4. **Intake form** (generic FormTemplate/FormResponse, §12.1) with one seeded "Website project intake" template; client completes in the portal; answers stored once and readable by proposal/contract builders.
5. **Portal home for a new client** = "Get started" checklist, not an empty project list.
6. **Notify owner** when the invite is accepted, and when each checklist step completes.
7. **Frictionless first steps:** allow signing and paying via tokenised links *before* account creation (signing already works this way; extend the same token idea to the first invoice only if needed — P3).
8. Require verified email on invite acceptance (SEC-7) and fix owner-invite escalation (SEC-1) **before** shipping any of this, since onboarding depends on invitations.

### D.3.3 The combined flow

```
 website form / manual add / referral
            │
            ▼
   CLIENT stage=lead ── follow-up date, activity (notes/calls/WhatsApp) ── LOST (reason)
            │  qualified
            ▼
   Proposal (optional; §13) ── accepted
            │
            ▼
   stage=active ──► [Create project] [Send onboarding]
            │
            ▼
   Onboarding checklist in portal:  Sign agreement → Pay deposit → Complete intake → Upload assets
            │  (each step auto-ticks; owner notified)
            ▼
   Project kickoff (tasks from template)
```

## D.4 Scope for this focus (what to build, what not)

| In scope (P1) | Out of scope for now |
|---|---|
| `Client` table + stage, source, budget, follow-up, lost reason | Lead scoring, sequences, assignment rules |
| Public lead form + endpoint + owner notification | File uploads on the public form, CAPTCHA vendor (add only if spam appears) |
| Manual "+ Lead", lead list, client detail with activity | Custom pipelines, multiple pipelines |
| Convert (stage change) + create project / send onboarding | Inbound email/WhatsApp integration |
| Onboarding checklist with self-ticking items | Full workflow engine |
| Generic intake form (one seeded template) | Per-industry form builder UI (edit JSON/seeded first) |
| Invite from client record, better invite email, accepted-invite notification | SSO / magic-link redesign |

## D.5 Security notes specific to a public lead form [REC]

- The public endpoint is the first unauthenticated *write* path on tenant data. Resolve tenant by slug only; never accept an `organizationId` from the client.
- Throttle per IP and per (org, email); honeypot; cap payload size and field lengths; sanitize with the existing `sanitize-html` util before storing or emailing.
- Do not reveal whether an email already exists.
- Escape all lead-supplied text in notification emails (React Email escapes by default; keep it that way).
- Add an org-level switch to disable the form.
- Owners only: leads are never visible through any `mine`/portal route (a `lead` client has no `ProjectClient` and no login by construction).

## D.6 Dependencies and order (for this focus)

```
0  Tests + lint working                 (P0-3, P0-4)
1  SEC-1 owner-invite fix, SEC-7 verified email     (invites underpin onboarding)
2  Client table + stage + backfill from Member/ClientProfile   (§46.1)
3  Activity generalisation (clientId, manual entries)          (§46.2)
4  Lead list/detail + "+ Lead" + follow-up date + digest
5  Public lead form + endpoint + notification
6  Convert → create project / send onboarding; better invite email; accepted-invite notification
7  Onboarding checklist (tasks with visibility=client, linked entities)
8  Intake form template + portal completion
```

Steps 2–5 deliver "Collecting Leads"; steps 6–8 deliver "Client Onboarding". Each step is shippable on its own.

## D.7 Acceptance tests for this focus

1. A visitor submits the public form; within seconds the owner sees a notification and a new lead with the message in its timeline and a follow-up set for tomorrow.
2. Submitting twice with the same email creates one lead with two timeline entries.
3. The owner adds a lead by hand in under 15 seconds (name + one contact method).
4. Marking a lead Won and clicking "Send onboarding" invites the client by email without re-entering their details.
5. The client accepts the invite and lands on a "Get started" checklist; completing the intake form ticks the item and notifies the owner.
6. A lead-stage record is never returned by any portal endpoint.

## D.8 Questions to confirm before building

1. Should the public form live on the org's custom domain/slug URL only, or also be embeddable on your existing website? (Embed is a small addition but adds CORS/iframe decisions.)
2. Which lead fields are mandatory for you? (Suggested minimum: name + email or phone/WhatsApp.)
3. Which stages do you really use day to day — is New → Contacted → Qualified → Proposal → Won/Lost enough?
4. Default onboarding checklist: is Sign agreement → Pay deposit → Complete intake → Upload assets the right starting set?
5. Should clients be able to complete intake/sign/pay *without* creating an account first?

---

# Appendix E: Corrections and findings from hands-on testing

*Added 2026-09-21 after running the code for real. Where this appendix disagrees with an earlier section, this appendix is right.*

## E.1 How it was tested

| Layer | What was run | Result |
|---|---|---|
| Unit tests | Backend (`npm test`) and frontend (`vitest`) | 715 backend + 52 frontend passing |
| Migrations | All 5 migrations applied to an **empty real Postgres** (embedded, local, throwaway), then `prisma migrate diff` of the live database against `schema.prisma` | Applied cleanly, **zero drift**; the contracts migration re-runs safely on a database that already has the tables |
| Integration specs | The two real-database specs (`*.int.spec.ts`) on the local database | 35/35 (the 3 that timed out earlier were only network latency to the remote database) |
| API end to end | The whole Nest app (real guards, validation, controllers, Prisma) over HTTP, only the JWT check and outgoing mail faked: `backend/src/e2e/` | 43/43: leads, public form (throttling, dedupe, markup stripping, bots), onboarding, portal isolation, invitation acceptance, backfill (dry run, apply, re-run), the earlier security fixes |
| Test strength | Six deliberate mutations (remove tenant scoping, remove the owner-invite rule, remove item ownership, remove the honeypot, remove the invoice lock, restore the session-cache bug) | All six caught by the suite |
| Production build | `nest build` | Succeeds |
| Browser | Chromium driving the real pages against the real backend (an isolated copy of the frontend with only the two auth files replaced by test doubles) | 25 functional checks and 28 dark-mode checks passing |

## E.2 Corrections to earlier sections

| # | Earlier claim | Reality | Evidence |
|---|---|---|---|
| 1 | §8 "Account deletion with cleanup ✅" and the client "reset password" action | **Broken.** `AccountService` calls `stackAuth.verifyPassword`, and admin reset calls `stackAuth.sendPasswordResetEmail`; both (and `getUser`, `deleteUser`) throw "not yet implemented for Managed Better Auth" | `stack-auth.client.ts`, `account.service.ts:59,153`, `auth.service.ts:70` |
| 2 | §8 "White-label branding ✅" | **Partial.** A workspace's primary color only reaches elements that read `--primary` directly. Derived tokens (primary buttons, switches, links, active navigation) stay the default indigo in both the dashboard and the portal. Tested with `#e11d48`: buttons stayed `rgb(87, 80, 241)` | CSS custom properties resolve where they are declared (`:root`), but the layouts override `--primary` on a wrapper element |
| 3 | §5/§40 dependencies | **New P0.** `@sentry/nestjs` (backend) and `@sentry/nextjs` (frontend, including `next.config.ts`) are imported but appear in **neither `package.json` nor either lockfile**. Everything works on this machine only because of leftover packages in the old root `node_modules`. A clean install (CI, Railway, Vercel) fails to build | `grep` of both lockfiles: 0 Sentry entries |
| 4 | §6 "Session cache 30 s: accept" | **Was a real bug, now fixed.** The API cached a session by token only. The client SDK reuses one JWT for many requests, so a user who had just accepted an invitation got `401 Organization context required` for up to 30 seconds, and switching workspace kept showing the old one. Fixed in `session.middleware.ts` (no caching without a membership; the workspace cookie is part of the cache key) with unit tests and an end-to-end regression test | found by the end-to-end suite |
| 5 | (not covered) | **Fixed.** `NeonAuthUsersRepository.findByEmail` was case-sensitive, so a team member whose stored email differed only in case could be invited as a client | end-to-end suite |
| 6 | §7 D2 "cannot exclude drift" | **Resolved.** Migrations and schema match exactly (contracts was the only gap and is now migrated) | `migrate diff` on a real database |

## E.3 An incident worth recording

While reviving the test suite, a spec that calls `time_entry.deleteMany({})` ran against the database named in `backend/.env` (a shared development database) because Prisma loads `.env` by default. Two runs happened before this was noticed. Prevention now in place: unit tests can never reach a real database (`src/test/setup.ts` swaps in an unreachable URL), and real-database specs are named `*.int.spec.ts`, excluded by default, and only run through `npm run test:integration` with an explicit `TEST_DATABASE_URL`.

## E.4 New findings, ranked

| Priority | Finding | Suggested fix |
|---|---|---|
| **P0** | Undeclared Sentry dependencies (E.2 #3) | Declare `@sentry/nestjs` and `@sentry/nextjs` in the respective `package.json` files at the versions currently installed. **Needs your approval (dependency change).** |
| P1 | Account deletion and admin password reset throw (E.2 #1) | Implement against Managed Better Auth's admin API, or hide the two buttons until then |
| P1 | Custom brand color does not reach derived tokens (E.2 #2) | Apply the brand override on `<html>` (a `<style>` block in the layout) instead of a wrapper element |
| P2 | `railway.json`, README and the workspace commands still describe a monorepo that no longer exists (see §3.5) | Update or delete |
| P3 | Frontend has no browser-level tests in the repo | Add Playwright to the frontend if you want the browser suites used in this audit kept (**new dependency, needs approval**) |

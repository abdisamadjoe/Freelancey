# Freelancey Plan

The build spec and the source of truth for this project. Work top to bottom, one phase at a time, tick boxes as items land. The goal is a **production-ready** product that follows the workflow in Appendix A exactly.

Related: [docs/WORKPLAN.md](docs/WORKPLAN.md) (earlier plan for stabilising, leads and onboarding; folded into the phases below).

## Source of truth

Appendix A (the 25-step workflow) is authoritative. If any other part of this file or the code disagrees with it, Appendix A wins and the other part is fixed.

## Core idea

A **Lead** is a potential client. It can enter Freelancey manually, through a public form, referral, import, or another source. Every source lands in the same Lead system.

Freelancey follows a freelancer from "I found this business" to "the project is finished and I'm maintaining it."

Two rules drive every design choice:

1. **Type it once.** Data carries forward: Lead → Proposal → Contract → Client → Project. Nothing is re-entered.
2. **Forms only collect information from the client.** Everything else is a workflow the freelancer runs inside Freelancey.

| Step | Who does it | Where |
|---|---|---|
| Lead, Discovery, Qualified | Freelancer | Freelancey |
| Proposal | Freelancer creates | Freelancey, client responds on a secure link |
| Contract | Freelancey generates, client signs | Freelancey + secure link |
| Client onboarding | Client | Freelancey-hosted public form |
| Project | Freelancer | Freelancey |
| Project brief | Client | Freelancey-hosted public form |
| Tasks, milestones, files | Freelancer | Freelancey |
| Deliverable review | Client | Portal / secure link |
| Support request | Client | Public / secure form |

## Decisions (made, not open)

| Topic | Decision |
|---|---|
| Onboarding and brief forms | **Built into Freelancey** (public token pages, no account). Tally is not used. Reuses `FormTemplate` / `FormResponse`. Submission saves directly, no webhook. |
| Proposal acceptance | Accept button plus typed full name and timestamp, stored with the proposal. Reject takes an optional reason. |
| Lead sources | Fixed set: `manual`, `google_maps`, `website_inquiry`, `referral`, `import`, `other`. Detail goes in notes. |
| ESLint | Not added (needs new packages). `npm run lint` stays `tsc --noEmit`. |
| Dependencies | None added. CSV import uses a small in-repo parser. |
| Branching | Work on the current branch (`dev`). No new branches, never `main`. |
| Commits | None unless asked. |
| Migrations | Additive only (new tables, nullable columns). Never `migrate reset`. |
| Tokens | Random, unguessable, expiring, single-record scope, stored hashed where practical. |

## Working rules (from CLAUDE.md)

- Never commit or push unless told. Never commit to `main`. No new branches unless told. Commit titles: max 4 words, casual, no "Add/Update/Fix/Implement", no Co-Authored-By line.
- `npm` only. No new dependencies.
- After editing `schema.prisma`: `npm run db:generate`. Never run `prisma migrate reset`.
- Don't touch Dockerfiles or docker-compose.
- Run `npm test` and `npm run lint` before declaring a phase done. Never skip or delete failing tests.
- Tailwind theme tokens only (see DESIGN.md), function components and hooks only, no `any` without a justifying comment.
- Marketing copy follows COPY.md, SEO follows SEO.md.
- Never print or commit `.env` contents. No hardcoded keys, URLs or tokens.
- No unrelated refactors.

## What exists today

| Area | State |
|---|---|
| Leads | `Client` rows with `stage = "lead"` and `leadStatus` (new, contacted, qualified, proposal_sent). Manual create, public form (`/contact/[slug]`), follow-up task, `/dashboard/leads` list and detail. |
| Client | One table, `stage`: lead, active, past, lost. Contacts, activity log. |
| Client onboarding | `OnboardingItem` checklist, `FormTemplate` / `FormResponse` intake, portal onboarding page. |
| Projects | Project, tasks, updates, comments, files, notes, time entries, labels, statuses, invoices, payments. |
| Documents | `Document` with versions, signature fields, audit events, access tokens, portal signing at `/portal/sign/[token]`. |
| Contracts | `Contract` + PDF generation. `projectId` is required today, which conflicts with the target flow. |
| Portal | Client portal for projects, onboarding, settings, signing. |

## Gaps against Appendix A

1. No Discovery status or discovery record.
2. No Proposal (model, builder, send, track, accept/reject, expiry).
3. Contract needs a project first; must be creatable from an accepted proposal.
4. No Lead → Client conversion on signature that preserves lead history.
5. No project brief form (second client form, per project).
6. No project templates that create milestones and tasks.
7. No milestones.
8. No meetings or expenses.
9. No deliverables or client review (approve / request changes).
10. No handover.
11. No support tickets.
12. No next-step guidance prompts.
13. No lead import; sources are free text.

## Lifecycle

```text
LEAD SOURCES: Manual | Public inquiry | Referral | Import | Other
        ↓
      LEAD → CONTACTED → DISCOVERY → QUALIFIED
        ↓
    PROPOSAL (draft → sent → viewed → accepted | rejected | expired)
        ↓ accepted                          ↓ rejected / expired
    CONTRACT (draft → sent → signed)       LOST
        ↓ signed
    CLIENT (converted from the lead, history kept)
        ↓
    CLIENT ONBOARDING (public form)
        ↓
    PROJECT → PROJECT BRIEF (public form) → WORKFLOW (milestones, tasks, files)
        ↓
    DELIVERABLE → CLIENT REVIEW → approve | request changes (→ task → re-review)
        ↓
    COMPLETED → HANDOVER → MAINTENANCE → SUPPORT TICKETS
```

## Phase overview

| Phase | Name | Outcome |
|---|---|---|
| 0 | Safety net | Tests and lint run and pass |
| 1 | Lead pipeline | All sources, Discovery stage, activity history |
| 2 | Proposals | Build, send, track, accept or reject |
| 3 | Contracts from proposals | Contract before project; sign → convert to Client |
| 4 | Client onboarding | Next-step prompt, secure form link, saved answers |
| 5 | Projects and brief | Create inside client, project brief form, templates, milestones, meetings, expenses |
| 6 | Deliverables and review | Send, approve, request changes |
| 7 | Completion and handover | Completed gate, handover checklist |
| 8 | Support | Tickets per client and project |
| 9 | Guidance and polish | Next-step banners, pipeline view, import, dashboard |
| 10 | Production readiness | Security, performance, env, observability, deploy checks |

Each phase ends with: tests pass, lint passes, the flow verified, and a report of what was and wasn't verified.

---

## Phase 0: Safety net

- [x] Backend `npm test` loads and passes every spec (43 files, 715 tests).
- [x] `npm run lint` (`tsc --noEmit`) passes in backend; frontend `tsc --noEmit` clean; frontend tests 52 pass.
- [ ] Security blockers from WORKPLAN Phase 1 closed (owner escalation, tenant leaks).
- [x] Baseline recorded 2026-10-09: backend 715 tests, frontend 52 tests, both typechecks clean.

## Phase 1: Lead pipeline

- [x] `leadStatus`: `new`, `contacted`, `discovery`, `qualified`, `proposal_sent`, `lost`. Existing values keep working.
- [x] `source` constrained to the fixed set above.
- [x] **+ New Lead** form: business, contact, email, phone, website, source, service interested in, notes.
- [x] Public inquiry sets `source = website_inquiry`, `status = new`.
- [x] Discovery record on the lead: needs, why, budget, timeline, requirements, notes. Optional discovery form is a later extra.
- [x] Lead activity timeline: calls, WhatsApp, meetings, notes, status changes, follow-up date.
- [x] Mark lead **Lost** with reason (existing: `stage = "lost"` plus `lostReason`; kept instead of a `lost` leadStatus).
- [x] Lead list filters: status, source, follow-up due.

Done when: I can create a lead manually and via the public form, move it to Qualified, and see its full history.

## Phase 2: Proposals

- [x] `Proposal`: `id`, `organizationId`, `clientId`, `title`, `scope`, `deliverables`, `timeline`, `paymentTerms`, `revisionLimit`, `validUntil`, `currency`, `status` (`draft`, `sent`, `viewed`, `accepted`, `rejected`, `expired`), `token`, `sentAt`, `viewedAt`, `respondedAt`, `acceptedByName`, `rejectionReason`, `createdById`.
- [x] `ProposalLineItem`: description, quantity, unit price (cents), `optional`, order. Totals computed.
- [x] Lead page **Create Proposal**, pre-filled from the lead.
- [x] Builder with live total.
- [x] **Send Proposal**: secure link plus email. Lead → `proposal_sent`.
- [x] Public proposal page: view (sets `viewed`), accept with typed name, reject with reason.
- [x] Expiry job marks overdue proposals `expired`.
- [x] Rejected or expired prompts to mark the lead Lost or revise.
- [x] Activity entries for sent, viewed, accepted, rejected.

Done when: accepting on the public page shows **Create Contract** to the freelancer.

## Phase 3: Contracts from proposals, then Client

- [x] `Contract.projectId` optional; add `proposalId`; `clientId` required.
- [x] Re-point contract queries, PDF generation and portal signing that assume a project. Existing contracts keep working.
- [x] **Create Contract** from an accepted proposal with template choice; auto-fills client, scope, price, deliverables, timeline, payment terms. Freelancer edits responsibilities, revisions, termination, confidentiality.
- [x] Send through a secure signing link on the contract itself (typed name, consent, time, IP and browser recorded; no portal account needed): draft → sent → viewed → signed. The older Document signing system is project-bound and stays for project contracts.
- [x] On signed: show "Contract signed. Next step: Create Project"; convert the lead to Client (`stage = "active"`), keeping the lead record, discovery, proposal and contract in the client's history.
- [x] Activity: "Client signed Website Development Agreement".
- [x] Client page **Relationship History**: lead → discovery → proposal → contract → projects.

Done when: signing a contract makes an active client with full history and nothing retyped.

## Phase 4: Client onboarding

- [x] Client page shows "Client onboarding incomplete" with **Send Client Onboarding Form** when no completed onboarding exists.
- [x] `FormLink` (generic, used for onboarding and the project brief): `clientId`, `kind`, hashed `token`, `status` (`pending`, `completed`), `answers`, `createdAt`, `completedAt`, `expiresAt` (30 days).
- [x] Link `/onboarding/[token]`: copy link, send email. WhatsApp later.
- [x] Freelancey-hosted public form, no account. Sections: Business, Audience, Goals, Branding (logo, colours, guidelines, images), Requirements (pages, features, integrations, references).
- [x] Submit saves answers to the client, sets `completed`, logs activity, notifies the freelancer. Reject unknown, expired or reused tokens.
- [x] Client page shows "Onboarding completed".
- [x] Reuse `OnboardingItem` checklist rather than rebuilding it.

Done when: a client fills the link without logging in and the client page shows completed.

## Phase 5: Projects and project brief

- [x] **Client → Projects → New Project** with `clientId` implied. Fields: name, description, start, deadline, budget, type. Pre-fill from the signed contract and link it.
- [x] Project brief: second public form per project, same token mechanism ("tell me about this project"): goals, pages, features, integrations, references, technical requirements, content, deadline, success criteria.
- [x] Project page shows brief status and **Send Project Brief**.
- [x] Readiness check: Onboarding ✓, Brief ✓, Contract signed ✓.
- [x] Project templates (Website: Discovery, Content, UI/UX, Development, Testing, Launch, Handover). Applying one creates milestones and tasks.
- [x] `Milestone` (`projectId`, `title`, `dueDate`, `status`, `order`); tasks may belong to a milestone.
- [x] Meetings and expenses on the project (new), alongside existing tasks, files, comments, time.

## Phase 6: Deliverables and review

- [x] `Deliverable`: `projectId`, `milestoneId?`, `title`, `version`, `status` (`draft`, `in_review`, `changes_requested`, `approved`), files, `sentAt`, `approvedAt`.
- [x] `ChangeRequest`: `deliverableId`, `message`, `status`, `taskId?`.
- [x] Send for review through a secure link (no portal account needed), with optional email. Deliverables are links (Figma, staging site, shared folder) plus a description.
- [x] Client **Approve** or **Request Changes** with message.
- [x] Request creates a linked task; a new version returns it to `in_review`.
- [x] Revision limit from the proposal: show used vs allowed, warn when exceeded.
- [x] Activity entries ("Client approved Homepage Design v2").

## Phase 7: Completion and handover

- [x] **Complete project** gate: tasks, milestones, deliverables approved. Shows blockers; override requires a reason.
- [x] After completion: **Start Handover**.
- [x] Handover checklist: final files, documentation, access information, training, deployment info. The client reads it through a secure link. Passwords are not stored; the form tells the freelancer to share them through a password manager.
- [x] **Handover Complete** logs activity. Client stays active, project stays in history.

## Phase 8: Support

- [x] `SupportTicket`: `clientId`, `projectId?`, `subject`, `message`, `status` (`open`, `in_progress`, `resolved`), `priority`, replies.
- [x] Private, stable support link per client (replaceable) with a public submit form.
- [x] Freelancer inbox with filters, replies, email notifications.

## Phase 9: Guidance and polish

- [x] **Next step** banners on lead, proposal, contract, client and project pages.
- [x] Pipeline board of leads by status.
- [x] CSV lead import with in-repo parser, column mapping, duplicate check on email/website.
- [x] Dashboard: leads by stage, proposals awaiting response, contracts awaiting signature, projects needing review.
- [x] End-to-end test written (`backend/src/e2e/lifecycle.int.spec.ts`). **Not yet run**: it needs a throwaway database (`TEST_DATABASE_URL`) and none was available. Run `npm run test:integration` in `backend/` against a Neon branch.

## Phase 10: Production readiness

- [x] Every new query is scoped by `organizationId` (asserted in each service's unit tests); every public endpoint is rate limited, token scoped, and answers 404 for unknown tokens.
- [x] DTO validation on every new endpoint; no `any` added.
- [x] Environment: `WEB_URL` is now required in production (the API refuses to start without it, since client links are built from it) and documented in `backend/.env.example`. No secrets added or printed.
- [x] Sentry: added `src/instrumentation.ts` and `src/app/global-error.tsx` (no new dependencies). One deprecation notice remains for `sentry.client.config.ts`; it only matters under Turbopack, which the app does not use.
- [x] Production builds pass: `npm run build` in `backend/` and `frontend/` (the frontend build is what Vercel runs). The Cloudflare/OpenNext bundle is not used (deploying to Vercel) and was not verified.
- [x] Migrations are additive (new tables and nullable columns; the only relaxation is `contract.projectId` becoming nullable). Applied to the database configured in `backend/.env`. They were not rehearsed on a separate database branch.
- [x] Loading, empty and error states on every new screen; secret-link pages send `no-referrer`, `no-store` and `noindex` headers. Mobile layout was built with responsive classes but not checked in a browser.
- [x] Final run 2026-10-09: backend 867 tests pass in 55 files, frontend 60 tests pass, both typechecks clean, both production builds pass.
- [ ] `npm run test:integration` (including `lifecycle.int.spec.ts`) against a throwaway database. Not run; no such database was available here.

---

## Cross-cutting requirements

- **Tenant isolation:** all queries scoped by `organizationId`.
- **Activity log:** every status change in this flow writes an `ActivityLog` entry.
- **Notifications:** freelancer notified on viewed, accepted, signed, onboarding done, change requested, ticket created.
- **Tests:** each new service gets unit tests following the existing `.spec.ts` pattern; each phase adds at least one integration path.

## How I work

1. Read this file at the start of each session and take the first unchecked phase.
2. Don't ask questions; apply the decisions above and note any new assumption here.
3. Build in small steps, tick boxes as items land.
4. Run tests and lint, verify the flow, report what passed and what didn't.
5. No commits or pushes until asked.

---

# Appendix A: The workflow (source of truth)

## 1. Where Leads come from

A Lead is a potential client. It can enter Freelancey manually, through a public form, import, referral, etc. Everything eventually enters the same Lead system.

- **A. Manually.** You find a business on Google Maps and call, WhatsApp or email them, or simply want to pursue them. Leads → + New Lead. Enter: Business (ABC Construction), Contact (Ahmed Hassan), Email, Phone, Website, Source (Google Maps), Service interested in (Website), Notes (Website looks outdated). Click Create Lead.
- **B. Public Project Inquiry.** Someone visits your website → Start a Project → public form → Freelancey → New Lead. The system creates the Lead automatically.
- **C. Referral.** Create manually with Source: Referral.
- **D. Import.** Later, CSV/imports.

Sources: Manual, Public Inquiry, Referral, Import, Other → all become LEAD.

## 2. The complete workflow

Follows a real freelancer from "I found this business" to "The project is finished and I'm maintaining it."

**Step 1: Create a Lead.** Option 1: you find the client yourself (for example restaurants in Nairobi → XYZ Restaurant); Leads → New Lead with business name, contact person, email, phone, website, source, notes. Option 2: they fill your public Start a Project form and Freelancey creates the Lead. Both become a Lead with a name, a source (Google Maps or Website Inquiry) and Status: New.

**Step 2: Work with the Lead.** Contact them. Status moves New → Contacted → Discovery → Qualified. Also: follow-up date, notes, calls, WhatsApp, meetings, activities. The Lead record becomes the history of the relationship.

**Step 3: Discovery.** Learn what they need, why, budget, timeline, requirements. Record it inside Freelancey. A Discovery / Requirements form may be sent if necessary, but don't force it; sometimes you talk to the client and enter the information yourself.

**Step 4: Qualified.** You decide it is a real opportunity worth proposing. Set Lead Status to Qualified. Now you can create a proposal.

**Step 5: Create a Proposal.** Inside the Lead: Proposal → Create Proposal. Freelancey already knows client/lead, company, contact, project information; do not re-enter. Add: proposal title, scope, services, deliverables, price, timeline, payment terms, revision limits, validity date, optional services. Example: Website Development: Discovery $200, UI/UX Design $500, Development $1,500, Deployment $200, Total $2,400. Then Send Proposal.

**Step 6: Proposal is sent.** Lead status becomes Proposal Sent. Record Proposal Status: Sent, with the sent date. Track: Sent, Viewed, Accepted, Rejected, Expired.

**Step 7: Client accepts proposal.** Freelancey makes the next step obvious: "Proposal accepted. Create contract." with a Create Contract button. Automatically carry client, project, scope, price, deliverables, timeline, payment terms into the contract. Do not type again.

**Step 8: Create Contract.** Choose a template (Website Development Agreement). Freelancey fills known information. Review/edit: client, project, scope, price, timeline, payment terms, responsibilities, revisions, termination, confidentiality, other terms. Then Send Contract.

**Step 9: Contract is signed.** Record Contract Status: Signed, with the signed date. Activity: "Client signed Website Development Agreement". Show: "✅ Contract signed. Next step: Create Project".

**Step 10: Convert Lead → Client.** The relationship is no longer just a Lead. Create the Client from the existing Lead. Do not delete the Lead history. Client → Relationship History: Original Lead, Discovery, Proposal, Contract, Projects.

**Step 11: Create the Client onboarding.** When the Client is created, check whether onboarding is complete. If not, show "⚠️ Client onboarding incomplete" with [Send Client Onboarding Form].

**Step 12: Generate onboarding form.** Create an onboarding session (Client: XYZ Restaurant, Status: Pending, Created date). Generate a secure link (freelancey.com/onboarding/<token>). Freelancer can Copy Link, Send Email, or eventually Send WhatsApp.

**Step 13: Client fills onboarding.** No Freelancey account needed. Form asks: Business (name, description, industry, location, website, social media), Audience (target customers, demographics), Goals (what to achieve, problem to solve), Branding (logo, colors, brand guidelines, images), Requirements (pages, features, integrations, references). They submit.

**Step 14: Freelancey receives the onboarding.** (The original used Tally and a webhook; the decision is to build the form inside Freelancey, so submission goes straight to the API.) Find the onboarding session, find the Client, save the information, set Onboarding Status = Completed. The Client page says "✅ Onboarding completed".

**Step 15: Create the Project.** Client → Projects → New Project. Because you are inside the Client, clientId is known automatically. Enter project name, description, start date, deadline, budget, project type.

**Step 16: Send Project Brief.** Freelancey asks: "Project requirements haven't been completed." Button: Send Project Brief. This differs from onboarding. Client onboarding: "Tell me about your business." Project brief: "Tell me about this project." Client fills: project goals, pages, features, integrations, references, technical requirements, content, deadline, success criteria.

**Step 17: Project is ready.** Client → Onboarding ✓; Project → Project Brief ✓; Contract → Signed ✓. Work can start.

**Step 18: Create project workflow.** Use a project template. Website Project: 1 Discovery, 2 Content, 3 UI/UX Design, 4 Development, 5 Testing, 6 Launch, 7 Handover. Freelancey creates the milestones/tasks.

**Step 19: Work on the project.** Manage tasks, milestones, files, comments, meetings, time, expenses, deliverables. Everything is connected to the Project.

**Step 20: Send deliverable to client.** Example: Homepage Design v1. Client gets [Approve] and [Request Changes].

**Step 21: Client requests changes.** They click Request Changes and enter a message (for example "Please change the hero section."). Freelancey creates a revision/request associated with the Client, Project and Deliverable. You fix it.

**Step 22: Client approves.** Client clicks Approve. Deliverable Status: Approved. Activity: "Client approved Homepage Design v2."

**Step 23: Finish project.** When tasks, milestones, deliverables and client approvals are complete, mark Project → Completed. Freelancey shows "Project completed. Start Handover".

**Step 24: Handover.** Give the client final files, documentation, credentials/access information, training, deployment information. Then Handover Complete.

**Step 25: Maintenance / Support.** The client remains a Client; the Project remains in history. Later, if the client says "The website has a problem", they submit a Support Request. Freelancey creates a Support Ticket tied to the Client and Project. You handle it.

## Full lifecycle diagram

```text
LEAD SOURCES (Manual / Google Maps, Website Inquiry, Referral)
   → LEAD → CONTACTED → DISCOVERY → QUALIFIED → PROPOSAL
   → Accepted → CONTRACT → SIGNED → CLIENT
   → Rejected → LOST
CLIENT → CLIENT ONBOARDING → PROJECT → PROJECT REQUIREMENTS → PROJECT WORKFLOW
   → Tasks / Milestones / Files
   → DELIVERABLE → CLIENT REVIEW
        → Request Changes → TASK → REVIEW
        → APPROVED → DELIVERY → MAINTENANCE → SUPPORT
```

## The most important design decision

Don't make every step a form. Forms are only for collecting information from the client. Freelancey itself handles the workflow.

- Lead: freelancer works in Freelancey.
- Proposal: freelancer creates in Freelancey.
- Contract: Freelancey generates/sends it.
- Client onboarding: public form.
- Project: freelancer creates in Freelancey.
- Project requirements: public form.
- Tasks: freelancer manages in Freelancey.
- Deliverable review: client portal / public secure link.
- Support: public/secure form.

Manual Lead creation is absolutely part of the core product; Google Maps prospecting is a perfect example of why. The public inquiry is simply an automated Lead creation channel, not the definition of what a Lead is.

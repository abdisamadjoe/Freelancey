# Migration plan: `frontend/` → `dashboard/`

`dashboard/` (the NextAdmin template) is now the real, wired application. `frontend/` was used only as a
spec for features, endpoints and payloads; none of its markup or styling was copied. The backend contract was
checked against the NestJS DTOs (`backend/src/**/*.dto.ts`) and controllers, and against how `frontend/` called them.

Status: every item below is implemented, `npm run build`, `npx tsc --noEmit`, `npm run lint` (0 errors) and
`npm test` (50 tests) pass in `dashboard/`.

## 1. Page / card → backend mapping

| Dashboard route | Built from (template UI) | Backend endpoints |
|---|---|---|
| `/login`, `/login/[slug]` | `Card` + `TextField` + `Button` (centred, template auth look) | Neon Auth via `/api/auth/*` proxy, `GET /organizations`, `POST /organizations/active`, `GET /branding/public/:slug`, `/branding/domain`, `/branding/instance` |
| `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invite` | same | Neon Auth, `POST /onboarding/signup`, `GET /billing/plans`, `GET /health/config`, `POST /organizations/accept-invitation` |
| `/setup` (5-step wizard) | `Card`, stepper, form fields | `GET /setup/status`, `PATCH /organizations/current`, `PUT /branding`, `POST/DELETE /branding/logo`, `PUT /setup/email`, `POST /setup/test-email`, `POST /projects`, `POST /clients/invitations`, `POST /setup/complete` |
| `/dashboard` | home `overview-stats` stat cards + `last-transactions-table` list | `GET /projects/stats`, `/projects?limit=5`, `/invoices/stats`, `/pipeline/summary`, `/client-records?stage=lead&followUpDue=true` |
| `/dashboard/leads` (list + board + import + create + contact form toggle) | `basic-tables` table, `Card`, `Select`, `Dialog` | `GET/POST /client-records`, `PATCH /client-records/:id`, `POST /client-records/import`, `GET/PUT /client-records/lead-form` |
| `/dashboard/leads/[id]` | `Card` sections, forms, list rows | `/client-records/:id` (+`/activity`, `/discovery`, `/contracts`, `/support-link`, `/onboarding*`), `/proposals`, `/contracts/from-proposal/:id`, `/form-links`, `POST /projects` |
| `/dashboard/clients` (People) | `Tabs`, table, `Select` | `/clients` (+`/invitations`, `/:id/role`, `/:id/rate`, `/:id/profile`, `/:id/reset-password`, `/export`), `/billing/subscription`, `/billing/usage` |
| `/dashboard/projects` | card grid, filters | `/projects`, `/projects/statuses`, `/labels`, `/projects/export`, `/client-records?stage=active` |
| `/dashboard/projects/[id]` (12 tabs) | `Tabs`, `Card`, `Dialog`, table rows | `/projects/:id` (+archive, unarchive, duplicate), `/labels/:id/assign`, then per tab below |
| ↳ Updates | `Card` feed | `/updates/timeline/:id`, `/updates`, `/updates/:id`, `/updates/:id/preview-prefs`, `/comments/:type/:id`, `/embeds/resolve`, `/embeds/unfurl`, `/files/:id/download` |
| ↳ Workflow | `Card`, `Progress` | `/projects/:id/readiness`, `/milestones`, `/project-templates`, `/apply-template`, `/form-links` |
| ↳ Tasks | list rows + `Dialog` | `/tasks/project/:id`, `/tasks`, `/tasks/:id`, `/tasks/:id/vote`, `/close`, `/cancel`, `/tasks/project/:id/export` |
| ↳ Deliverables | `Card`, form | `/projects/:id/deliverables`, `/:id/send`, `/milestones` |
| ↳ Files | table rows, `Dialog` | `/files/upload`, `/files/link`, `/files/:id`, `/documents*` (create, send, void, versions, audit trail, certificate, signing links, signature fields) |
| ↳ Time | stat cards, list | `/time-entries` (+`/start`, `/stop`, `/running`, `/generate-invoice`) |
| ↳ Meetings / Expenses / Notes / Handover | `Card`, forms | `/projects/:id/meetings`, `/expenses`, `/notes`, `/completion-check`, `/complete`, `/handover*` |
| ↳ Contracts / Invoices | table rows, `Dialog` | `/projects/:id/contracts`, `/contracts/:id*`, `/invoices*`, `/invoices/upload`, `/invoices/:id/pdf` |
| `/dashboard/contracts/[id]`, `/dashboard/proposals/[id]` | `Card`, forms | `/contracts/:id*`, `/proposals/:id*` |
| `/dashboard/invoices`, `/dashboard/calendar`, `/dashboard/reports/time` | table, grid, stat cards | `/invoices`, `/calendar`, `/time-entries/report` |
| `/dashboard/support`, `/dashboard/support/[id]` | list rows, `Card` | `/support-tickets*` |
| `/dashboard/settings/{account,workspace,billing,payments}` | `Card` forms, `Toggle`, `Select` | `/account*`, `/branding*`, `/organizations/current`, `/labels*`, `/settings*`, `/settings/custom-domain*`, `/billing/*`, `/payments/*` |
| `/portal/projects`, `/portal/projects/[id]`, `/portal/onboarding`, `/portal/settings`, `/portal/sign/[token]` | same shell, `Tabs`, `Card` | `/projects/mine*`, `/updates/timeline/mine/:id`, `/tasks/mine*`, `/documents/mine/:id`, `/documents/:id/respond`, `/contracts/mine*`, `/invoices/mine*`, `/payments/checkout/:id`, `/client-onboarding/mine*`, `/clients/me/profile`, `/documents/sign-via-token/*` |
| `/contact/[slug]`, `/proposal/[token]`, `/contract/[token]`, `/review/[token]`, `/onboarding/[token]`, `/brief/[token]`, `/handover/[token]`, `/support/[token]` | centred `Card` column | `/leads/public/:slug`, `/proposals/public/:token*`, `/contracts/public/:token*`, `/deliverables/public/:token*`, `/forms/public/:token*`, `/handover/public/:token`, `/support/public/:token*` |
| Header search, notifications, user menu, sidebar | template components, data wired | `/search`, `/notifications*`, `/push/*`, `/organizations/me` |

## 2. Field mapping (UI field → backend field)

The data layer types live in `dashboard/src/lib/*.ts` and `dashboard/src/shared/index.ts` (the same types
`frontend/` used) and the request bodies match the DTOs. Money is in cents everywhere (`unitPrice`,
`amountCents`, `estimatedBudgetCents`); forms take dollars and convert. Highlights:

- Lead form: `name, company, email, phone, whatsapp, website, source, interestedIn, estimatedBudgetCents, nextFollowUpAt, notes`.
- Project create: `name, description, clientId, startDate, endDate, budgetCents, projectType, contractId`.
- Invoice line item: `description, quantity, unitPrice (cents)`; upload: multipart `file, projectId, amount (cents), dueDate, notes`.
- Task: `title, description, dueDate, status, assigneeId`; decision: `type: "decision", question, options[{label}]`.
- Document create: multipart `file, projectId, type, title, requiresSignature, requiresApproval, reminderEnabled, reminderIntervalDays`.

## 3. Composed from existing UI (no matching template page existed)

Every page below has no counterpart in the NextAdmin template. Each is composed only from the template's own
`Card`, `Table*`, `Tabs`, `Dialog`, `TextField/Input/TextArea`, `Select`, `Checkbox`, `Toggle`, `Badge`,
`Alert`, `Pagination`, `Skeleton`, `Spinner`, using the same classes as the template pages. The reusable
compositions are in `src/components/app/kit.tsx`: `PageHeader`/`Page`/`PageBody` (home page header and spacing),
`Panel` (Card + header), `StatCard` (home overview-stats card), `DataTable` (basic-tables user table),
`TextInput`/`TextAreaInput`/`SelectInput`/`MultiSelectInput`/`CheckInput`/`SwitchInput` (form-elements markup),
`Modal`/`ConfirmModal` (Dialog), `Notice` (Alert), `AppTabs` (TabRoot), `StatusPill`/`LabelChip` (Badge).

All pages listed in section 1 are composed this way, except the shell/header/sidebar which are the template's own.

## 4. Mismatches and decisions

- **Template demo pages** (charts, ui-elements, form-elements, basic-tables, `/profile/*`, error-page, mail-success,
  terms) were kept untouched but are behind sign-in and no longer in the sidebar. The template's e-commerce home
  at `/` is unreachable because `/` redirects to `/login` (as `frontend/` did); its stat-card markup is reused.
- **Sidebar:** nav data is now role based (`STAFF_NAV` / `PORTAL_NAV`). The "Upgrade to Pro" footer card keeps the
  template markup but its copy and link point at workspace billing. A workspace logo, when set, replaces the
  template mark in the same slot.
- **Header:** the notifications menu no longer links to the template's `/profile/notification` settings page, and
  shows "Enable push" where the template showed "View All".
- **Components touched (internals only, visuals unchanged):** `TabRoot` gained optional `value`/`onValueChange`
  (controlled use, so a tab's content only mounts and fetches once opened); sidebar, header, search, notifications
  and user menu take data from props/context instead of constants.
- **Tabs:** the project detail tabs use the template's `minimal` tab style, not the underline tab bar of `frontend/`.
- **Icons:** `frontend/` used `lucide-react`; the dashboard has `@tailgrids/icons` and its own icon sets, so most
  action buttons are text-only rather than adding a second icon set.
- **Link previews, signature fields and PDF viewing** were reimplemented on the template's components
  (`react-pdf` was added because the PDF viewer needs it).
- **ESLint:** `react-hooks/set-state-in-effect` and `react-hooks/refs` are set to `warn`. The template's own
  components trip them and every data-loading effect would otherwise be an error.
- **Frontend-only behaviours not carried over:**
  - Sentry (`@sentry/nextjs`) is not wired. It was imported but never declared in `frontend/package.json` (the
    audit in `docs/AGENCY_PLATFORM_AUDIT.md` lists it as a P0). The telemetry consent banner and setting still
    work and save `telemetryEnabled`.
  - Cloudflare/OpenNext deployment (`wrangler.jsonc`, `open-next.config.ts`, `deploy:cf`). `plan.md` records that
    production deploys to Vercel, and the OpenNext adapter used by `frontend/` targets Next 15.
  - `lib/theme.ts` and its test: the template already themes with `next-themes`.
- **Dependencies added to `dashboard/`:** `@neondatabase/auth` (login/session), `react-pdf` (document viewer and
  signing), `vitest` (dev, to keep the ported tests).

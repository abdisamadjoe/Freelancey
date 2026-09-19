# Everything You Need To Know

Welcome to Freelancey! This document combines our deployment architecture, environment configuration, and future roadmap.

---

## 1. Deployment Architecture

Freelancey is designed to run on managed cloud infrastructure:
- **Frontend App**: Deployed on **Vercel**
- **Backend API**: Deployed on **Railway**
- **Database**: Hosted on **Neon Postgres**
- **Authentication**: Managed via **Neon Auth**
- **File Storage**: Hosted on **Cloudflare R2**

## 2. Environment Variables

Configuration lives in two per-app `.env` files: `backend/.env` for the API (database, auth, storage, billing) and `frontend/.env` for the web app. Each is kept up to date with every variable that app reads.

### Required Variables

| Variable                  | Description                                                              |
|----------------------------|---------------------------------------------------------------------------|
| `DATABASE_URL`             | Neon Postgres connection string (pooled, used at runtime)                |
| `DIRECT_URL`                | Neon Postgres connection string (direct/unpooled, used by `prisma migrate`) |
| `APP_ENCRYPTION_SECRET`    | App-level secret (min 32 chars) for settings encryption, push-subscription encryption, and payment HMAC signing -- unrelated to authentication |
| `NEON_AUTH_BASE_URL`        | Neon Auth's "Auth URL" from your Neon project's Auth tab (includes the project's db-name path segment) -- needed by both backend (JWKS verification) and frontend (auth proxy route) |
| `NEON_AUTH_COOKIE_SECRET`   | Frontend-only. Signs the auth proxy's first-party session cookies -- not a Neon credential, generate with `openssl rand -base64 32` |
| `R2_ACCOUNT_ID`             | Cloudflare account ID for R2                                              |
| `R2_ACCESS_KEY_ID`          | R2 access key ID                                                          |
| `R2_SECRET_ACCESS_KEY`      | R2 secret access key                                                      |
| `R2_BUCKET_NAME`            | R2 bucket name used for file storage                                     |

`DATABASE_URL`, `DIRECT_URL`, `APP_ENCRYPTION_SECRET`, `NEON_AUTH_BASE_URL`, and the four `R2_*` variables are required everywhere -- the API refuses to start without them. The frontend additionally requires `NEON_AUTH_COOKIE_SECRET`.

### Common Optional Variables

| Variable              | Description                                      | Default                          |
|------------------------|--------------------------------------------------|-----------------------------------|
| `API_URL`              | API URL (internal, server-to-server)             | `http://localhost:3001`          |
| `WEB_URL`               | Web app URL (used for CORS)                      | `http://localhost:3000`          |
| `NEXT_PUBLIC_API_URL`  | Browser-facing API URL (Next.js client-side)     | `http://localhost:3001`          |
| `RESEND_API_KEY`       | Resend API key for transactional email           | -- (setup wizard handles this if unset) |
| `EMAIL_FROM`            | Sender address for outbound email                | --                                |
| `MAX_FILE_SIZE_MB`     | Maximum upload size in megabytes                 | `50`                              |
| `BILLING_ENABLED`      | Set to `true` to enable billing/plan gates (hosted only) | `false`                    |
| `LOG_LEVEL`             | Pino log level                                   | `info`                            |

> **Note on traditional self-hosting:** This project uses a decoupled serverless architecture. `BETTER_AUTH_SECRET`, `STORAGE_PROVIDER`, `UPLOAD_DIR`, `S3_*`, and all Docker/Postgres-container variables have been removed. Authentication is strictly Neon Auth and storage is Cloudflare R2.

## 3. Storage & Authentication Details

### Storage
File storage is Cloudflare R2 only. Set the four `R2_*` variables above; there is no other supported backend and no local-disk fallback.

### Authentication
Authentication is handled by Neon Auth -- Neon's own managed [Better Auth](https://www.better-auth.com) instance, configured from your Neon project's **Auth** tab. The frontend integrates the `@neondatabase/auth` SDK in "proxy" mode: `frontend/src/lib/auth/server.ts` creates the Neon Auth instance and `frontend/src/app/api/auth/[...path]/route.ts` proxies auth requests through the frontend's own origin (so the session cookie is first-party and readable by server components), while `frontend/src/lib/auth/client.ts` is the browser-side client used in React components. The backend verifies Neon Auth JWTs statelessly via JWKS (`backend/src/auth/stack-auth.client.ts`, `backend/src/auth/session.middleware.ts`) rather than validating cookie-based sessions. The frontend forwards the current session's JWT (via `auth.token()`/`authClient.token()`) as an `Authorization: Bearer` header on every backend API call. 

One behavioral note: an admin resetting a client's password now only triggers a reset email, sent from Neon Auth's own infrastructure -- there is no "copy a raw reset link" option, since Neon Auth's mail delivery isn't something this app can intercept.

---

## 4. Roadmap

A living document tracking what's been shipped and what's planned for Freelancey.

### Shipped

- [x] Project management with customizable status pipeline
- [x] File sharing (S3, MinIO, Cloudflare R2, local storage)
- [x] White-label branding (colors, logo)
- [x] Role-based access (owner, admin, client)
- [x] Email/password and magic link authentication
- [x] Multi-tenant organizations
- [x] Billing & subscriptions (Stripe)
- [x] Setup wizard for new organizations
- [x] Email notifications (Resend + SMTP)
- [x] Invoicing with PDF generation
- [x] Task management with drag-and-drop ordering
- [x] Project updates with image attachments
- [x] Internal notes (admin-only)
- [x] Client profiles (company, phone, address, website)
- [x] Account deletion with data cleanup
- [x] Comments & discussions on updates and tasks
- [x] In-app notifications with real-time polling
- [x] Push notifications (Web Push / VAPID)
- [x] Team members (invite admins/owners to organization)
- [x] Tags & labels (cross-entity tagging for projects, clients, tasks, files)
- [x] CSV data export (projects, invoices, people, tasks)
- [x] Dynamic favicon (updates to org logo)

### Planned

#### v1.3 -- Communication & Payments (March 2026)

Make the portal the primary channel between agency and client.

- [x] **Comments & discussions** -- Two-way communication on updates, tasks, and files
- [x] **In-app notifications** -- Real-time alerts for new updates, files, and invoices
- [ ] **In-portal messaging** -- Dedicated project-scoped chat with email fallback
- [x] **Team members** -- Invite additional staff to your organization beyond owner/admin
- [x] **Tags & labels** -- Cross-entity tagging for projects, clients, tasks, and files
- [x] **Client-facing invoice payments** -- Pay invoices directly from the portal (Stripe Connect)
- [ ] **Recurring invoices** -- Auto-generate invoices on a schedule for retainer clients

#### v1.4 -- Contracts, Approvals & Scheduling (April 2026)

Turn the portal into the system of record for client work.

- [ ] **Contracts & proposals** -- Generate, send, and manage agreements
- [ ] **E-signatures** -- Sign off on contracts and deliverables
- [ ] **Client approval workflows** -- Clients can approve/reject deliverables and milestones
- [ ] **Calendar view** -- Visualize project timelines, tasks, and deadlines
- [ ] **Time tracking** -- Log hours against projects and tasks
- [x] **Data export** -- CSV/PDF export for projects, invoices, and client data
- [ ] **Global search** -- Full-text search across projects, files, tasks, clients, and messages

#### v1.5 -- Security & Intelligence (May 2026)

Enterprise auth, automation, and analytics.

- [ ] **SAML/SSO** -- Enterprise single sign-on for teams and clients
- [ ] **2FA/MFA** -- TOTP and passkey support via Neon Auth
- [ ] **Granular permissions** -- Per-project and per-section access control beyond owner/admin/member roles
- [ ] **Activity / audit log** -- Track who did what and when across the organization
- [ ] **Workflow automations** -- Trigger-action engine for automated task assignment, notifications, and status changes
- [ ] **Reporting & analytics** -- Revenue trends, project metrics, client activity, and invoice aging dashboards
- [ ] **Webhooks / Zapier integration** -- Notify external systems of portal events
- [ ] **Knowledge base / help center** -- Self-service docs, FAQs, and guides for clients

#### v2.0 -- Platform & Extensibility (June 2026)

Transform from portal to platform.

- [ ] **Custom domains** -- Serve the client portal on your own domain
- [ ] **Content embedding** -- Embed Figma, Google Docs, Loom, and other external content in project pages
- [ ] **Dashboard customization** -- Drag-and-drop widgets to personalize admin and client dashboards
- [ ] **Embeddable widgets** -- JavaScript snippets for forms, status badges, and file uploads on external sites
- [ ] **PWA / mobile app** -- Installable progressive web app for on-the-go access
- [ ] **Multi-language / i18n** -- Localized portal UI with per-client language preferences
- [ ] **AI assistant** -- Contextual AI for drafting emails, summarizing projects, and answering client questions (self-hosted LLM compatible)

---

Have a feature request? [Open an issue](https://github.com/GroundworkTechnologies/Freelancey/issues) or start a [discussion](https://github.com/GroundworkTechnologies/Freelancey/discussions).

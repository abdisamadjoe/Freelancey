<div align="center">
<a href="https://freelancey.groundwork.co.ke/" target="_blank">
  <img width="100" height="100" alt="icon" src="https://github.com/user-attachments/assets/c5eb99ab-cc87-47c5-9959-e585049ab4a7" />
</a>

# Freelancey

**Freelancey is an open-source client and project management platform for freelancers.**
<br/>

![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white&style=flat)
![Next.js](https://img.shields.io/badge/Next.js-black?logo=nextdotjs&logoColor=white&style=flat)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black&style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat)
![Neon](https://img.shields.io/badge/Neon_Postgres-00E599?logo=neon&logoColor=black&style=flat)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white&style=flat)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white&style=flat)
<br/>
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white&style=flat)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=flat)
![Railway](https://img.shields.io/badge/Railway-131415?logo=railway&logoColor=white&style=flat)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

<br/>

<a href="https://freelancey.groundwork.co.ke/" target="_blank">Website</a> | [Documentation](docs/Everything-You-Need-To-Know.md) | [GitHub Issues](https://github.com/GroundworkTechnologies/Freelancey/issues)

<br/>

Created & maintained by [@abdisamadjoe](https://github.com/abdisamadjoe)

</div>

---

## Overview

Freelancey is an open-source client and project management platform for freelancers. Most freelancers and independent agencies struggle with scattered shared drives, manual spreadsheets, and endless back-and-forth emails to keep clients updated. Freelancey consolidates client management, project tracking, file delivery, e-signatures, and invoicing into a unified self-hosted platform.

Every project lifecycle moves through a structured, auditable workflow:

```
ONBOARDING → PROJECT_CREATION → MILESTONES_&_TASKS → INVOICING_&_DELIVERY → CLIENT_PORTAL_APPROVAL
```

### Key Capabilities

- **Project & Task Management**: Customizable status pipelines, milestone tracking, and task delegation per organization.
- **Client Portal (`/portal`)**: Dedicated, white-labeled portal where clients review project updates, view contracts, and manage deliverables.
- **File Storage & Delivery**: Secure document and file sharing backed by Cloudflare R2 presigned storage.
- **Invoicing & Payments**: Create and send invoices with draft and sent workflows powered by server-side billing management.
- **White-Label Branding**: Branded login pages, custom color schemes, custom domains, and organizational logos.
- **Multi-Tenant Security**: Strict server-side role-based access control (RBAC) separating agency owners, team members, and client users.

---

## Repository layout

| Directory | What it is | Runtime / Tech |
|---|---|---|
| [`backend/`](#the-backend-api) | The REST API server and shared monorepo libraries (database models, email templates, DTO types) | **NestJS 11**, Prisma 6, React Email, Neon Postgres |
| [`frontend/`](#the-frontend-app) | The web application containing agency management dashboards and client portals | **Next.js 15 App Router**, React 19, Tailwind CSS |
| [`docs/`](#documentation) | Architectural guides and environment configuration | Markdown |

```
freelancey/
├── backend/                    # NestJS API Server
│   ├── packages/               #   Monorepo Shared Packages
│   │   ├── database/           #     Prisma schema, migrations & seeders (Neon Postgres)
│   │   ├── email/              #     React Email templates & Resend client
│   │   └── shared/             #     TypeScript types, DTO schemas & constants
│   ├── src/
│   │   ├── auth/               #   Neon Auth / Better Auth session integrations
│   │   ├── billing/            #   Subscription tiers & billing control
│   │   ├── clients/            #   Client accounts & tenant isolation
│   │   ├── contracts/          #   Contracts & e-signature workflows
│   │   ├── files/              #   Cloudflare R2 storage & presigned upload URLs
│   │   ├── invoices/           #   Invoice generation & PDF export
│   │   ├── projects/           #   Project tracking, milestones & task boards
│   │   └── search/             #   Global full-text search engine
│   └── package.json
│
├── frontend/                   # Next.js 15 Authenticated App & Client Portal
│   ├── src/
│   │   ├── app/                #   App router: (dashboard), (portal), (auth), (setup)
│   │   ├── components/         #   UI design tokens, widgets & domain components
│   │   ├── hooks/              #   React data-fetching & state hooks
│   │   └── lib/                #   API client & helper utilities
│   └── package.json
│
├── docs/                       # Configuration and roadmap
```

> **Decoupled Architecture:** Freelancey is built as two completely separate applications: a Next.js frontend and a NestJS backend. They operate independently and must be run in their respective directories.

---

## Prerequisites

- **Node.js 22+** (configured in `.nvmrc` and root `package.json`)
- **npm 10+** (package manager `npm@10.9.8`)
- **Neon Postgres** (Neon cloud database or dev database branch)

---

## Quick start

### Full Stack Local Development

To run the full stack locally, you must run both applications in separate terminal windows.

#### 1. Backend API

```bash
cd backend
npm install
npm run dev                 # Launches NestJS API in watch mode
```

On your first run, you will need to copy `backend/.env.example` to `backend/.env` and fill in your Neon and Neon Auth/R2 credentials. 
To generate the Prisma client and push the schema to your Neon dev branch:
```bash
npm run db:push
npm run db:generate
```

#### 2. Frontend App

```bash
cd frontend
npm install
npm run dev                 # Launches Next.js dev server on http://localhost:3000
```

On your first run, copy `frontend/.env.example` to `frontend/.env`. Ensure you provide the matching `NEON_AUTH_BASE_URL`.

---

## The backend API (`backend/`)

A **NestJS 11** micro-service owning business logic, access control, and data persistence.

- **Authentication**: Managed cookie sessions via Neon Auth / Better Auth mounted at `/api/auth/*`.
- **Data Layer**: Cloud PostgreSQL database powered by **Neon Postgres** and **Prisma ORM** (`packages/database`).
- **File Management**: Direct-to-object storage uploads using Cloudflare R2 presigned S3 URLs (`@aws-sdk/client-s3`).
- **Invoicing**: Dynamic invoice creation, PDF generation via `pdfkit`, and Resend email delivery.
- **Security & Authorization**: Strict server-side guards for multi-tenant isolation across organizations and clients.

### Backend Command Reference

| Command | Purpose |
|---|---|
| `npm run dev -w backend` | Start NestJS development server with hot-reload |
| `npm run build -w backend` | Compile NestJS TypeScript source to `dist/` |
| `npm run start -w backend` | Execute production NestJS application |
| `npm run test -w backend` | Run backend unit and integration tests with Vitest |
| `npm run lint -w backend` | Run ESLint checks across backend modules |

---

## The frontend app (`frontend/`)

The web application serving agency dashboards and client portal views.

- **Framework**: **Next.js 15 App Router + React 19**, styled with Tailwind CSS and Lucide React icons.
- **Dual Interface**:
  - **Agency Dashboard (`/dashboard`)**: Project management, milestone planning, invoice creation, team access, and analytics.
  - **Client Portal (`/portal`)**: Secure client workspace to view assigned project status, inspect deliverables, sign contracts, and review invoices.
- **White-Label Engine**: Customizable primary colors, agency branding logo, and domain routing.

### Frontend Command Reference

| Command | Purpose |
|---|---|
| `npm run dev -w frontend` | Start Next.js development server on port 3000 |
| `npm run build -w frontend` | Build production Next.js assets |
| `npm run deploy:cf -w frontend` | Build and deploy frontend to Cloudflare Workers via OpenNext |
| `npm run lint -w frontend` | Run ESLint checks across frontend pages and components |

---

## Security principles

- **Server-Enforced Access Control**: All authorization rules and tenant boundaries are evaluated server-side.
- **Isolated Multi-Tenancy**: Organization data is compartmentalized; client users are strictly scoped to their explicit projects.
- **Secure Presigned Uploads**: Files are stored in private S3/R2 storage buckets using short-lived presigned URLs.
- **Database Safety**: Serverless data isolation and connection pooling backed by Neon Postgres.

---

## Documentation

| Document | Description |
|---|---|
| [`docs/Everything-You-Need-To-Know.md`](docs/Everything-You-Need-To-Know.md) | Deployment architecture, environment variables, and project roadmap |

---

## Contributing

Contributions to Freelancey are welcome!

1. **Open an issue first**: Discuss bugs or proposed features in a [GitHub Issue](https://github.com/GroundworkTechnologies/Freelancey/issues) before submitting code.
2. **Submit focused PRs**: Keep pull requests small and single-purpose to expedite code review.
3. **Follow repository standards**: Ensure code passes type-checking (`npm run typecheck`), linting (`npm run lint`), and tests (`npm run test`).

---

## Author & License

Created and maintained by **[@abdisamadjoe](https://github.com/abdisamadjoe)**.

Freelancey is open-source software licensed under the [MIT License](LICENSE).

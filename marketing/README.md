# Freelancey marketing site

The public website for Freelancey. Next.js 16, Tailwind CSS v4, no CMS, no client-side JavaScript beyond Next itself.

## Run

```bash
npm install
npm run dev     # http://localhost:3000 (use -p to change the port)
npm run build && npm start
npm run lint
```

## Environment

| Variable               | Purpose                                              | Default                                |
| ---------------------- | ---------------------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, sitemap, Open Graph                   | `https://freelancey.groundwork.co.ke`  |
| `NEXT_PUBLIC_APP_URL`  | Where "Sign in" and "Start free" send people (the app) | `http://localhost:3000`              |

Set both in Vercel before deploying.

## Structure

- `src/app/page.tsx`: the home page (hero, features, how it works, pricing, FAQ, JSON-LD).
- `src/components/laptop.tsx`: the laptop mockup used for every product screenshot.
- `src/lib/site.ts`: URLs, plan data (mirrors `backend/src/database/seed.ts`) and FAQ copy.
- `public/mockups/`: 16:10 dashboard screenshots (Daarly Studio sample data) and notification cards.

Copy, SEO and design rules live in the repo root (`COPY.md`, `SEO.md`, `DESIGN.md`).

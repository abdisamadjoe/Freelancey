# Freelancey marketing site

Marketing site for Freelancey: Next.js (App Router), TypeScript and Tailwind CSS v4. The layout was rebuilt from a saved reference site in `_reference/`; all copy and mockups are specific to Freelancey.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm run lint
```

## Structure

- `src/app` routes: `/`, `/about`, `/features`, `/pricing`, `/contact`, `/request-demo`, `/blog`, `/blog/[slug]`,
  `/integration`, `/integration/[slug]`, `/case-study`, `/changelog/[slug]`, `/privacy-policy`, `/terms-conditions`.
- `src/components/home` one component per home section (hero, stack strip, overview, visibility, growth stack tabs,
  core features, power pack tabs, how it works, testimonials with count-up, integrations, pricing toggle, FAQ
  accordion, blog preview). `layout/` holds navbar (All Pages dropdown, mobile menu), CTA and footer.
- `src/components/illustrations` static product mockups (charts, cards, icons) generated from the saved markup,
  rendered once per breakpoint where the source layout differs.
- `src/app/globals.css` design tokens: colors, type presets, breakpoints, scroll/marquee animations.
- `public/images` original assets with clean names (resized duplicates skipped).
- `_reference/` the saved site, untouched (read-only reference).

## Decisions

- Tailwind v4 is CSS-first, so tokens live in `@theme` in `globals.css` instead of `tailwind.config`.
- Breakpoints from the saved CSS: tablet 768-1199, desktop 1200+, component variants switch at 810.
- Fonts are self-hosted with `next/font/local`: Inter from the saved woff2 files; Geist is not in the saved folder, so
  the latin variable file from Google Fonts was copied into `src/fonts`.
- Framer's "Use for Free" badge is a platform overlay and was not recreated.
- The hero changelog badge is icon-only because its text came from CMS data that is not in the saved HTML.
- Dropdown labels such as `Integration[CMS]` are kept verbatim from the source.
- Images missing from the saved folder (two growth-stack tab screenshots, two power-pack tab screenshots, a
  background texture) render as empty panels.
- Count-up targets (364% / 21X, 248% / 15X) and FAQ answers were read from the running original.
- Phone counters use Geist (source used Plus Jakarta Sans, not saved).
- Pages other than home render their saved copy through `PageContent` (headings and paragraphs in source order);
  their bespoke layouts were not rebuilt section by section.

## Placeholder routes

`/case-study/[slug]` (case study details were not in the saved folder) and `/404` (redirects to the not-found page).

## Content

- Copy lives in the components under `src/components/home`, `src/lib/pages.ts` (other pages, changelog) and
  `src/lib/blog.ts`. It follows `../COPY.md` (no em dashes, no invented numbers or customers).
- Product mockups are drawn in code in `src/components/mocks.tsx` and use sample labels only.
- Pricing shows self-hosted (free, MIT) and hosted (price on request); no prices are invented.
- Colors still follow the reference palette (blue). Swap the tokens in `globals.css` to move to the app's green.

## Deployment and SEO

- **Host:** deploys as a standard Next.js app (Vercel, or any Node 22+ host with `npm run build && npm start`).
- **Environment:** set `NEXT_PUBLIC_SITE_URL` (see `.env.example`). It defaults to `https://freelancey.groundwork.co.ke`
  and drives canonical URLs, the sitemap, `robots.txt` and Open Graph tags.
- **Deploy size:** `.vercelignore` excludes `_reference/` (the saved template, not needed at runtime).
- **SEO** (follows `../SEO.md`): titles use "Freelancey: Tagline", descriptions are under 160 characters, one H1 per
  page, canonical on every page, `sitemap.xml`, `robots.txt`, Open Graph and Twitter cards, a generated OG image,
  JSON-LD (Organization, WebSite, SoftwareApplication, FAQPage on the home page, BlogPosting on articles), and
  `noindex` on the 404 page.
- **Security headers and caching** are set in `next.config.ts`.

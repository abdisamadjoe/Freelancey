# Freelancey Frontend — Design System (NextAdmin port)

The app's UI now follows the **NextAdmin (Next.js admin dashboard)** design language.
`dashboard/` holds the reference implementation of that language; `frontend/` is the
production application and the only place where real data and behaviour live.

> Rule of thumb: take **layout, components, styling and UX patterns** from `dashboard/`,
> take **data, features, actions and API calls** from `frontend/`.

## 1. Where the tokens live

| Layer | File |
| --- | --- |
| CSS variables (light theme) | `frontend/src/app/globals.css` |
| Tailwind theme mapping | `frontend/tailwind.config.ts` |
| Fonts (Manrope + Inter) | `frontend/src/app/layout.tsx` |
| Reusable components | `frontend/src/components/ui/*` (barrel: `@/components/ui`) |

Never hardcode a hex value in a component. Use a semantic token class instead
(`bg-card-background`, `text-text-tertiary`, `border-card-border`, …).

## 2. Core palette

| Purpose | Token / class | Value |
| --- | --- | --- |
| App background | `bg-background-gray-secondary_alt_2` | `#f4f4f5` |
| Surface panel | `bg-card-surface-area` | `#fcfcfd` |
| Card / modal / input surface | `bg-card-background` | `#ffffff` |
| Card border | `border-card-border` | `#e8e8e8` |
| Divider / table border | `border-border-primary` | `#f4f4f5` |
| Strong text | `text-text-primary` | `#18181b` |
| Body text | `text-text-secondary` | `#52525b` |
| Muted text | `text-text-tertiary` | `#71717a` |
| Icons | `text-icon-tertiary` | `#71717a` |
| Brand primary | `bg-brand-500` / `text-neutral-brand-color` | `#5750f1` |
| Brand hover | `bg-brand-600` | `#3c35d8` |
| Input border | `border-card-border`, focus `border-input-primary-focus-border` | `#e8e8e8` / `#5750f1` |

Status colours come from `StatusBadge` / `statusColor()` in
`frontend/src/components/ui/status-badge.tsx` — do not invent new badge palettes.

## 3. Typography

- **Primary font: Manrope** (`font-sans`, the Tailwind default — loaded in
  `src/app/layout.tsx` as `--font-manrope`). Used for all UI text: headings,
  body copy, labels, buttons, nav.
- **Numeric font: Inter** (`font-numeric` — loaded alongside Manrope as
  `--font-inter`). Reserved for numeric *values*: money, metrics, durations,
  table number columns. Always pair it with `tabular-nums` so digits stay
  fixed-width when they change (`className="font-numeric tabular-nums"`).
  Plain prose that happens to contain a number (a sentence, a count inside a
  label) stays on Manrope — this is for isolated numeric values only.
  Reference: `StatCard` (`src/components/ui/stat-card.tsx`) and the invoice
  amount cells in `(dashboard)/dashboard/projects/[id]/components/invoices-section.tsx`
  / `(portal)/portal/projects/[id]/components/portal-invoices-section.tsx`.
- Only three weights are loaded for **both** fonts — `font-normal` (400),
  `font-medium` (500), `font-semibold` (600) — and only these three may be
  used. **Never** use `font-bold`, `font-extrabold` or `font-black`; nothing
  heavier than semibold ever appears in this app. (The one deliberate
  exception is the cursive signature-preview font in `signature-pad.tsx`,
  which is a handwriting simulation, not UI type.)
- Page title: rendered by `PageHeader` (`text-2xl`, `font-medium`).
- Card title: `text-base font-semibold tracking-[-0.2px]`.
- Body / controls: `text-sm`.
- Table header, meta, badges: `text-xs`.
- Metric values: `text-2xl font-semibold`, plus `font-numeric tabular-nums`.

## 4. Shape, spacing, elevation

- Radii: `rounded-lg` for controls, `rounded-xl` for cards/modals/dropdowns,
  `rounded-2xl` for the main shell panel, `rounded-full` for badges/pills.
- Card padding: `p-5`. Modal padding: `px-6 py-5`. Table cell: `px-5 py-3.5`.
- Section rhythm: `space-y-5` between page sections, `gap-5` inside card grids.
- Borders are hairline: prefer `border-[0.5px] border-card-border`.
- Shadows: `shadow-xs` (controls), `shadow-md`/`shadow-lg` (floating layers),
  `shadow-panel` (main shell panel). Avoid heavy shadows.

## 5. Component vocabulary

Import everything from `@/components/ui`:

```
Button, buttonStyles              Card, CardHeader, CardTitle, CardDescription,
Badge, StatusBadge, StatusDot     CardAction, CardContent, CardFooter
Input, Textarea, NativeSelect     Field, Label, FieldError, FieldDescription
Checkbox, Switch                  Modal, ModalHeader, ModalBody, ModalFooter
DropdownMenu, DropdownMenuItem    Tabs, TabList, Tab, TabPanel
TableRoot, TableHeader, TableBody, TableRow, TableHead, TableCell
Pagination                        Skeleton + page skeletons
EmptyState                        Spinner, LoadingState
PageHeader, Breadcrumbs           SearchInput, DataToolbar, PageSection, SectionHeading
StatCard                          Progress, Alert, Avatar, AvatarGroup, Sheet, Tooltip
```

Usage conventions:

- **Page skeleton** — `<PageHeader title description actions breadcrumbs />`, then sections
  separated by `space-y-5`. The app shell already supplies padding and scrolling.
- **Buttons** — `<Button variant="primary|danger|success|ghost"
  appearance="fill|outline|ghost" size="xs|sm|md|lg|xl|xxl">`. Links that look like
  buttons use `buttonStyles({ variant, appearance, size })`.
- **Cards** — `<Card className="p-0 overflow-hidden">` + `DataToolbar` + table for list
  screens; plain `<Card>` with `CardHeader`/`CardContent` for detail panels.
- **Tables** — `TableRoot` inside a `p-0` card; the header row is
  `className="bg-background-gray-secondary_alt"` with `text-xs font-semibold text-text-secondary`
  cells. Row actions use a `DropdownMenu` or a `Button appearance="outline" size="sm"`.
- **Forms** — `Field` wraps label + control + description/error. Inputs are `h-`less;
  use `Input`, `Textarea`, `NativeSelect`.
- **Modals** — `Modal` (portal, Escape/backdrop close) with `ModalHeader`/`ModalBody`/
  `ModalFooter`. Destructive confirmations go through `useConfirm()`.
- **Feedback** — `useToast()` for transient results, `Alert` for inline messages,
  `EmptyState` for "nothing here yet", skeletons (never a bare spinner) for list loading.
- **Icons** — `lucide-react` at `size-4` inside controls, `size-5` in navigation.

## 6. Rules for migrating a screen

1. Keep every piece of logic — state, effects, handlers, `apiFetch` calls, types,
   exported names, prop signatures, routes and redirects. This is a UI migration.
2. Never introduce demo/sample data; render exactly what the API returns.
3. Replace old helpers: `vercel-card` → `Card`, `vercel-button` → `Button`,
   `apple-glass`/`apple-segmented` → shell header / `Tabs`, `[var(--muted)]`-style
   classes → the semantic tokens above.
4. Cover all four states: loading (skeletons), empty (`EmptyState`), error (`Alert`),
   loaded. Preserve responsive behaviour at `sm` / `lg` / `xl`.

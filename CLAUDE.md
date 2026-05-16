# CLAUDE.md — Black Stack Diesel

## Project Identity

Black Stack Diesel (BSD) is a mobile-first web application for diesel truck owners. It provides AI-powered diagnostics, a vehicle-specific parts marketplace, and photo-based troubleshooting. Core principle: **once a user selects their vehicle (year/make/model/engine), every screen filters to show ONLY content relevant to that exact truck.**

**Owner:** Dynamic Innovative Solutions LLC
**Domain:** black-stack-diesel.com
**Repo:** github.com/antelnick-ops/BlackStackDiesel

---

## Design Source of Truth

`app/_legacy/bsd-app.jsx` is the read-only React mockup that defines every color, spacing, layout, and component pattern in the mobile app. **Do not modify it.** Treat it as a frozen design reference — all changes happen in the ported components under `app/src/components/**` and `app/src/screens/**`. The Design System section below extracts its color tokens into `app/src/lib/constants/colors.ts`.

---

## Tech Stack

**Client (mobile-first PWA):**
- **Build:** Vite 5 + React 18
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v3.4 (layout/spacing) + inline style tokens from `src/lib/constants/colors.ts` (color/surface)
- **State:** React Context + custom hooks
- **Persistence:** `localStorage` (namespaced `bsd:*` keys)
- **Icons:** lucide-react
- **PWA:** vite-plugin-pwa (Workbox-generated service worker)

**Server / data:**
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (email/password + Google + Apple OAuth)
- **AI:** Anthropic Claude API for diagnostics chat (model selection deferred)
- **Payments:** Stripe (checkout sessions + webhooks)
- **File Storage:** Supabase Storage (diagnostic photos)
- **Email:** Resend, routed through Cloudflare Email Routing
- **Backend functions:** Vercel serverless functions at `/api/*.js`

**Infra:**
- **Deployment:** Vercel
- **Domain/DNS:** Cloudflare

---

## Project Structure

This file documents the full `C:\dev\BlackStackDiesel\` repo. The active mobile app build lives in `app/` — other directories (`admin/`, `api/`, `scripts/`, `supabase/`) are pre-existing and out of scope for the current 6-phase build plan.

```
BlackStackDiesel/
├── index.html                            # Early access landing page (live)
├── delete-account.html, privacy.html     # Required for OAuth providers
├── favicon.ico, logo.png
├── package.json                          # Root: data-import scripts only (no React deps)
├── vercel.json
├── ARCHITECTURE.md, CLAUDE.md, README.md, LICENSE
├── admin/                                # Admin dashboard (static HTML)
├── api/                                  # Vercel serverless functions
│   ├── create-checkout.js                # Stripe checkout session
│   ├── webhook.js                        # Stripe webhook handler
│   ├── place-apg-order.js                # APG fulfillment
│   ├── poll-apg-tracking.js              # APG tracking poller
│   ├── freight-quote.js, sitemap.xml.js
│   └── products/
├── app/                                  # Vite + React + TS PWA — THE mobile app
│   ├── _legacy/                          # archived: static prototype + bsd-app.jsx mockup
│   ├── public/icons/                     # PWA icons (192/512, maskable)
│   ├── src/
│   │   ├── main.tsx, App.tsx, index.css
│   │   ├── components/   shared / home / parts / product / diagnose /
│   │   │                 account / onboarding / cart / checkout
│   │   ├── screens/      one file per top-level screen
│   │   ├── lib/
│   │   │   ├── constants/    colors.ts (every hex token)
│   │   │   ├── context/      Vehicle, Cart, Conversation, Preferences
│   │   │   ├── hooks/        useDiagnose, useConversations, useGarage, useCart
│   │   │   ├── storage/      localStorage wrapper (bsd:* namespace)
│   │   │   ├── analytics/    diagnostic-chain.ts (anonymized export)
│   │   │   ├── mock-data/    garage, parts, fitment, orders, diagnoses, symptomTags
│   │   │   └── utils/        tagExtraction, idGen, dateFormat, anonymize
│   │   └── types/            Conversation/Message/Resolution/PartReference carry schemaVersion: 1
│   ├── index.html, vite.config.ts, tailwind.config.ts, postcss.config.cjs
│   ├── tsconfig.json, tsconfig.node.json
│   ├── package.json                      # App-scoped deps (React, Vite, Tailwind, etc.)
│   └── TODO.md                           # deferred-fix list
├── data/, docs/, tmp/, vendors/
├── lib/                                  # Root-shared helpers (e.g. emails.js)
├── shared/                               # Shared between api/ and admin/
├── scripts/
│   ├── diagnostics/                      # apg-test-auth, apg-test-api
│   ├── importers/                        # apg/asap feed importers
│   └── ops/                              # asap-coverage-analysis, etc.
└── supabase/                             # SQL migrations, RLS policies
```

---

## Engine Family Keys

| Key | Engines | Trucks |
|-----|---------|--------|
| `cummins59` | 5.9L 12V, 24V, ISB 325 | Ram 2500/3500 1994–2007 |
| `cummins67` | 6.7L ISB, ISB 385, HO 420 | Ram 2500/3500 2007–2024 |
| `ps73` | 7.3L Power Stroke | F-250/350 1999–2003 |
| `ps60` | 6.0L Power Stroke | F-250/350 2003–2007 |
| `ps64` | 6.4L Power Stroke | F-250/350 2008–2010 |
| `ps67` | 6.7L Power Stroke (all gens) | F-250/350 2011–2024 |
| `dmax` | 6.6L Duramax LB7–L5P | Silverado/Sierra 2500/3500 2001–2024 |

## Vehicle Selection Flow
```
Year → Make (only makes with models for that year)
  → Model (only models produced that year)
    → Engine (only engines for that year+make+model)
      → Engine Family resolved → app filters everything
```

---

## Design System

### Aesthetic: Industrial / Dark / Tough

**Source of truth:** `app/_legacy/bsd-app.jsx` — the React mockup that defines every color, spacing, and component pattern. Color tokens are exported from `app/src/lib/constants/colors.ts`. No component file should contain a hardcoded hex value — always import from `@/lib/constants/colors`.

Colors:
```ts
// Primary brand
AMBER         = '#f59e0b'   // CTA / accent
AMBER_DEEP    = '#d97706'   // CTA gradient end
// Surfaces
BG            = '#16161a'   // page background
SURFACE       = '#1f1f24'   // cards
SURFACE_2     = '#2a2a30'   // nested cards / inputs
BORDER        = '#2e2e35'
// Text
TEXT          = '#e8e6e3'
TEXT_MUTED    = '#8b8a87'
TEXT_DIM      = '#5c5b58'
// Status
GREEN         = '#6ee7b7'   // fits / resolved / success
GREEN_BG      = '#0d3221'
GREEN_BORDER  = '#1d5238'
DANGER        = '#f87171'   // destructive
// Overlays
AMBER_ON_BG   = '#1a1207'   // text/icon color on amber buttons
PRODUCT_BG    = '#f5f4f1'   // light placeholder behind product imagery
```

Typography: **Inter** (weights 400/500/600/700/800), loaded from Google Fonts.

Mobile-first: 393×852 reference viewport, bottom nav (Home / Parts / Diagnose / Account), 44px minimum touch targets, `rounded-2xl` cards, `rounded-xl` inner elements, `px-4` page padding.

---

## Critical Rules

1. **Products MUST be filtered by engine_family at the database level.** Never show parts that don't fit the user's truck.
2. **AI responses must reference the user's exact truck and engine.** Generic responses are not acceptable.
3. **Vehicle setup is cascading.** Each selection narrows the next — no orphan options.

---

## Build Plan (mobile app)

The mobile app is being built out from `app/_legacy/bsd-app.jsx` in 6 phases. Stop and review after each.

1. **Scaffold** — Vite + React + TS + Tailwind set up at `app/`, folder structure + stub files + `colors.ts` populated. ✅
2. **Refactor existing screens** — Port Home/Parts/Product/Diagnose/Account out of the monolith into their own files. Replace local state with VehicleContext, CartContext, PreferencesContext, ConversationContext (stub). Persist garage/cart/preferences to localStorage. No design changes.
3. **Onboarding + Cart + Checkout** — 6-step vehicle picker, data-sharing disclosure, cart screen, 3-step checkout, order confirmation.
4. **Ongoing chat + image upload + diagnostic data chain** — Multi-conversation per vehicle, image attachments, symptom tag extraction, resolution flow, cross-diagnosis suggestions, PartReference data model.
5. **Analytics + anonymization** — `lib/analytics/diagnostic-chain.ts` + `lib/utils/anonymize.ts`. The sellable anonymized dataset layer.
6. **Polish + Account wiring** — Loading/empty states, error boundaries, settings detail screens, dev-only "reset onboarding" hatch.

Backend integration (real Anthropic API, real product queries) is deliberately out of scope through Phase 6 — the build plan calls all data sources mocked, with hooks structured so the real API call is a one-file change later.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
APG_API_KEY=
APG_AUTH_URL=https://api.premierwd.com/api/v5/authenticate
APG_API_BASE_URL=https://api.premierwd.com/api/v5
APG_FALLBACK_PHONE=
APG_AUTO_ORDER_ENABLED=false
APG_TRACKING_POLL_ENABLED=false
RESEND_API_KEY=
BSD_OPERATOR_EMAIL=
CRON_SECRET=
```

`BSD_OPERATOR_EMAIL`: Optional. Recipient for new-order notification emails
sent from the Stripe webhook. Falls back to `nick@black-stack-diesel.com` if
unset.

`APG_AUTO_ORDER_ENABLED`: Feature flag. Set to `'true'` to enable automatic
APG order forwarding from the Stripe webhook. Defaults to false (manual
fulfillment). Flip to `true` only after Stage 2 + Stage 3 are tested.

`APG_TRACKING_POLL_ENABLED`: Feature flag. Set to `'true'` to enable APG
tracking polling. Trigger manually via authenticated POST/GET to
`/api/poll-apg-tracking` with `Authorization: Bearer <CRON_SECRET>`.
Defaults to false. Vercel cron not used (Hobby plan doesn't support
crons; can be enabled by upgrading to Pro and re-adding the `crons`
block to `vercel.json`, or by configuring an external cron service like
cron-job.org to hit the endpoint with the bearer token).

`CRON_SECRET`: Optional but recommended. When set, `/api/poll-apg-tracking`
requires `Authorization: Bearer <CRON_SECRET>` header. Vercel cron provides
this automatically. Without it, anyone with the URL can trigger the function
(not destructive but consumes API quota).

Note: `NEXT_PUBLIC_*` prefix is legacy from the original Next.js plan. The serverless functions in `/api/*.js` still read these via `process.env` regardless of prefix. Any new client-side env var consumed by the Vite app must use the `VITE_*` prefix instead.

---

## Code Style

- Functional components only
- Inline `style={{ background: SURFACE }}` for color/surface tokens (per mockup convention); Tailwind for layout/spacing only
- Zod for input validation at every API boundary (Vercel functions, future AI proxy)
- Prices stored as cents in DB, displayed as dollars in UI
- Error boundaries on every top-level screen — one bad screen shouldn't kill navigation
- Every persisted data structure (`Conversation`, `Message`, `Resolution`, `PartReference`, `AnalyticsEvent`) carries a `schemaVersion: 1` field for future migrations

---

## Gotchas

### PostgREST schema cache

After any DDL change to the `public` schema (`ALTER TABLE`, `CREATE TABLE`, `ADD COLUMN`, etc.), the PostgREST API layer caches the old schema and will return `PGRST204` errors on writes referencing new columns. Always run the following in the Supabase SQL editor immediately after any DDL change:

```sql
NOTIFY pgrst, 'reload schema';
```

This applies whether the change is via Supabase migrations, the dashboard SQL editor, or `psql`.

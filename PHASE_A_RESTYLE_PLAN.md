# Phase A — Restyle Plan: `app/_legacy/index.html` ← `app/_legacy/bsd-app.jsx`

**Status:** Audit only. No code changes. Awaiting approval before Pass 1.

**Target file:** `app/_legacy/index.html` (3,561 lines, 198 KB — the live production app served at `black-stack-diesel.com/app/`)
**Design source:** `app/_legacy/bsd-app.jsx` (783 lines — frozen React mockup, treated as read-only)

**Rule reaffirmed:** visual elements (colors, fonts, radii, spacing, layout, shapes) may change. Logic (`fetch()`, Supabase calls, Stripe checkout, chat SSE handling, auth, vehicle-selection cascade, cart state, search/filter logic, event-handler bodies) is frozen. Where a visual change requires JS edits (template strings in `renderCart`, `renderProductDetail`, `appendProductCards`, etc.), it is called out explicitly in Section 5.

---

## SECTION 1 — Visual Inventory (current vs target)

### 1.1 Color palette

| Token | Current (`_legacy/index.html`) | Target (`bsd-app.jsx`) |
|---|---|---|
| Page background | `#07070A` (almost-black) | `#16161a` (slightly lifted) |
| Surface 1 (cards) | `#0D0D12` (`--c1`) | `#1f1f24` (`SURFACE`) |
| Surface 2 (nested) | `#131318`–`#1A1A22` (`--c2`/`--c3`) | `#2a2a30` (`SURFACE_2`) |
| Surface 3 / disabled | `#25252F` (`--c4`) | (no equivalent — use SURFACE_2) |
| Border | `rgba(255,255,255,.055)` (`--glb`) | `#2e2e35` (`BORDER`, solid) |
| Primary accent | `#EDAE0A` gold (`--gold`) | `#f59e0b` amber (`AMBER`) — **distinctly warmer/oranger** |
| Accent deep | `#D4990B` (`--gold2`) | `#d97706` (`AMBER_DEEP`) |
| Accent gradient | `linear-gradient(140deg, #FBBF24, #F59E0B, #D97706)` | `linear-gradient(135deg, AMBER 0%, AMBER_DEEP 100%)` |
| Text primary | `#F1F5F9` (`--t1`) | `#e8e6e3` (`TEXT`) — warmer, less blue |
| Text muted | `rgba(241,245,249,.5)` (`--t2`) | `#8b8a87` (`TEXT_MUTED`, solid) |
| Text dim | `rgba(241,245,249,.22)` (`--t3`) | `#5c5b58` (`TEXT_DIM`, solid) |
| Success / "fits" | `#34D399` (`--grn`) | `#6ee7b7` (`GREEN`) + `#0d3221` (`GREEN_BG`) — paired |
| Danger | `#F87171` (`--red`) | `#f87171` (matches `DANGER` in bsd-app) |
| Misc | `--blu #60A5FA`, `--pur #A78BFA` | — (not used in bsd-app) |

**Net:** the production palette is colder (blue-tinted whites, slate-tinted darks) and uses translucent borders. The target is warmer, flatter, more industrial — solid borders, fewer rgba alphas. **All `var(--*)` tokens in the existing CSS can be remapped at the `:root` level** for a one-shot first pass.

### 1.2 Typography

| | Current | Target |
|---|---|---|
| Primary | **Manrope** 300–800 + **DM Mono** 400/500 | **Inter** 400–800 (one family) |
| Loaded via | `<link href="…fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap">` (line 23) | `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800')` |
| Mono use | `font-family:'DM Mono', monospace` on prices, stats, cart totals, fitment table | bsd-app uses Inter throughout — no mono font |
| Headlines | `mk-headline` 28px/900/-.5px | `text-2xl font-bold leading-tight` (~24px/700) |
| Eyebrows | 10px/800/2.4px tracking, gold (`.mk-eyebrow`) | `text-[10px] font-bold tracking-widest uppercase` (matches closely) |
| Body | 13–14px/500 | 14px/400–500 |

**Net:** **complete font swap** (Manrope/DM Mono → Inter). Weight scale survives. **DM Mono uses (~6 spots: prices, stat values, cart totals, order IDs, fitment text) need a styling decision** — keep monospace for those, or fully unify on Inter? bsd-app.jsx uses Inter for prices, so the cleaner read is unify on Inter.

### 1.3 Top navigation / status bar

| | Current | Target |
|---|---|---|
| Status bar | `.sbar` (line 49 CSS, line 518 HTML) — fake "9:41" + signal/wifi/battery SVGs, 56px tall. Hidden on mobile (`@media(max-width:768px)`) | bsd-app has no fake status bar |
| Notch | `.notch` (line 52) — fake iPhone notch, hidden on mobile | bsd-app has no notch |
| App top bar | None — login → vehicle picker → straight to marketplace (no header on marketplace beyond the `mk-hero`) | `TopBar` component (`<header>`, line 26–51 of bsd-app.jsx): backdrop-blur, BLACK/STACK wordmark with gold `/`, bell with notification dot, optional back button |

**Net:** production has **no real TopBar** — the marketplace screen jumps straight to a hero block (`mk-hero`). bsd-app.jsx defines a global TopBar with logo + notification bell that appears on Home/Parts/Diagnose/Account but not Product. **Adding the TopBar is a new HTML structure**, not a CSS-only change.

### 1.4 Bottom navigation — **largest structural mismatch**

| | Current | Target |
|---|---|---|
| Tabs | **3:** Profile / **AI** (center, elevated, gold-glowing) / Parts | **4:** Home / Parts / Diagnose / Account — all flat, equal weight |
| Shape | Floating pill (`border-radius:100px`), `rgba(7,7,10,.75)` with `backdrop-filter:blur(40px) saturate(1.8)` | Full-width strip with top border, `backdrop-filter:blur-xl`, no rounding |
| Center tab | Elevated 64×64 circle with gold gradient, `margin-top:-22px`, "AI" label outside | (no equivalent — all tabs are uniform) |
| Active state | Tab gets pill background, gold icon | Icon + label both turn amber, `strokeWidth: 2.5` |
| Cart badge | On the cart icon in `.mk-hero` (separate from nav) | On Parts tab in nav (`badge: cartCount`) |

**Net:** **this is a real structural disagreement, not a styling change.** Options to resolve are in Section 5.

### 1.5 Vehicle context

| | Current | Target |
|---|---|---|
| Mechanism | `mk-vp` "vehicle pill" in marketplace hero (line 664) — tap to open vehicle picker (`s-veh` screen, line 586) | `VehicleBar` strip below TopBar (full-width, `px-4 py-2.5`, "Shopping for {Y} {M} {M} · {engine}" + SWITCH chevron). Tap opens `VehicleSwitcher` bottom-sheet (line 71 of bsd-app.jsx) |
| Vehicle picker | Full-screen cascade (`s-veh`) — year → make → model → engine pills, progress bar (`.prog-bar`) | Bottom-sheet shows existing trucks (`garage[]`) with "Add a truck" dashed button. Doesn't show the cascading pills inside the sheet |

**Net:** the production cascade picker (`s-veh`) has no exact analog in bsd-app.jsx — the mockup assumes the user already has trucks in a garage. **Keep the cascade picker as-is**, just restyle the pills/progress bar/buttons to match bsd-app's pill style. Add a bottom-sheet "VehicleSwitcher" pattern when there are 2+ trucks (currently production only has one active vehicle).

### 1.6 Card styling

| | Current | Target |
|---|---|---|
| Card primary | `.g` class: `var(--gl)` (translucent), `backdrop-filter:blur(16px)`, `border-radius:var(--r2)` (18px), `1px solid var(--glb)` | Inline `style={{ background: SURFACE, border: '1px solid BORDER' }}` + `rounded-2xl` (16px). No backdrop-filter. |
| Card small | `.gs` same but `--r` (14px) | `rounded-xl` (12px) |
| Product card | `.pc` (line 274) | Inline `rounded-2xl overflow-hidden` |
| Inner radius | 10–14px | 12–16px |

**Net:** **drop `backdrop-filter` and translucency** from card surfaces. Cards become solid `SURFACE`. Radii: `18px → 16px` for cards, `14px → 12px` for inputs.

### 1.7 Button styling

| | Current | Target |
|---|---|---|
| Primary CTA | `.btn-g` (line 120): full-width 54px, gold gradient `var(--goldg)`, white text with multi-layer shadow, `box-shadow:0 2px 8px..., 0 0 30px rgba(237,174,10,.22), inset 0 1px 0 rgba(255,255,255,.4)` | `style={{ background: 'linear-gradient(135deg, AMBER, AMBER_DEEP)', color: '#1a1207' }}`, `rounded-2xl h-12 font-bold`. **No glow, no text shadow, no inset highlights**. Text color is **dark on amber** (#1a1207), not white. |
| Ghost / secondary | `.btn-gh` (line 413): translucent `var(--gl)` + border + muted text | Inline `style={{ background: SURFACE, border: '1px solid BORDER' }}` + amber text for accents |
| Disabled | `.btn-disabled` (line 405): grey `var(--c4)` | bsd-app doesn't define a disabled state — use opacity-50 |
| Quantity stepper | `.pdm-qty` (line 489): horizontal 3-button group | Inline `flex items-center rounded-2xl overflow-hidden`, `-` `qty` `+` buttons at `w-10 h-12` |

**Net:** **biggest change is dark text on amber buttons.** Today's CTA is white text on gold with heavy shadow stack; target is dark text (#1a1207) on amber, no shadows. This is jarring at first glance — confirm before Pass 1.

### 1.8 Product cards

| | Current | Target |
|---|---|---|
| Layout | 2-column grid (`.pgrid`), 18px radius | 2-column grid, 16px radius |
| Image area | `height:100px`, `rgba(255,255,255,.015)` bg (almost-black), emoji or `<img>` | `aspect-square`, `#f5f4f1` (light cream!) bg, placeholder SVG of a shock absorber |
| Fit badge | `.pc-fit` top-left: green gradient pill "FITS YOUR TRUCK" | Small dark pill top-left with green check + "FITS" |
| Brand | 8px/700/1.2px tracking, dim | 9px/700, dim |
| Title | 11.5px/600, line-clamp-2 | 12px/600, line-clamp-2 |
| Price | 16px/800 in `'DM Mono'`, **gold** | 14px/700 in Inter, **white/TEXT** (not gold) |
| Stage badge | Top-right `.pc-stg` (`.s0`/`.s1`/`.s2`/`.s3`) | (no equivalent in bsd-app) |

**Net:** **product images get a light cream bg instead of nearly-black** — biggest visual shift. Price color changes from gold to white. Stage badges should be preserved (they're product metadata, not decoration).

### 1.9 Product detail (PDM = product detail modal)

| | Current | Target (mapped from `ProductScreen`) |
|---|---|---|
| Container | `.pdm` bottom-sheet (line 419) — slides up 90% height with `border-top-left-radius:28px` | Full-screen `ProductScreen`, scrollable, fixed action bar at bottom |
| Image | `.pdm-img` 280px tall, `var(--c2)` bg, optional carousel | `aspect-square` `#f5f4f1` cream bg with placeholder SVG, brand chip top-left, heart icon top-right |
| Title | 22px/800 (`.pdm-name`) | 24px/700 (`text-2xl font-bold`) |
| Price | 28px/800 mono gold (`.pdm-price`) | 30px (`text-3xl`)/700 in TEXT color, with smaller `.95` decimal in TEXT_MUTED |
| Fit badge | Pill: yes/maybe/unknown/no variants (`.pdm-fit-*`) | Inline panel with green checkmark circle + "Fits your {year} {model}" + verification line |
| Specs | 2-col grid (`.pdm-specs`) with mono values | Vertical key/value rows in a single card with separators |
| Fitment | Either "universal", "structured rows" (`.pdm-fitment-rows`), or text blob (`.pdm-fitment`) | List of model cards with green check |
| CTA bar | `.pdm-cta-row` at bottom: qty stepper + Add to cart button | Same shape — fixed `bottom-[72px]` (above bottom nav), qty stepper + gradient amber button |

**Net:** the production PDM stays as a bottom-sheet (it's working UX); restyle within that container. Key changes: cream image bg, larger title, white price.

### 1.10 Chat UI

| | Current | Target (from `DiagnoseScreen`) |
|---|---|---|
| Container | `.ai-conv` (line 209) — vertical stack, `gap:14px`, scrollable, padding-bottom 80px | Same — `space-y-3`, `pb-40` |
| User bubble | `.ai-msg.user .ai-bubble` (line 215): gradient `rgba(237,174,10,.18 → .1)`, gold border, `border-radius:18px 18px 4px 18px`, max-width 78% | **Solid amber bg** (`AMBER`), dark text (`#1a1207`), `rounded-2xl` with `borderBottomRightRadius: 0.5rem`, max-width 85% |
| Assistant bubble | `.ai-msg.assist .ai-bubble`: `var(--c1)` bg + border, `border-radius:18px 18px 18px 4px` | `SURFACE` bg + `BORDER`, same asymmetric radius, max-width 85% |
| Streaming cursor | `.ai-cursor`: 7×13 gold rectangle, blinks | bsd-app uses a "Diagnosing..." pill with pulsing Sparkles icon (different visual idiom) |
| Composer | `.ai-composer` (line 227): fixed `bottom:80px`, translucent, blur, textarea + circle send button | `rounded-2xl px-4 py-2.5` with `SURFACE` bg + `BORDER`, textarea + 36×36 gradient send square |
| Stop button | `.ai-stop` red square (line 235) | bsd-app doesn't define a stop button — **preserve current stop button** (SSE cancellation is real functionality) |
| Rich content | bsd-app defines `ai-steps` (numbered list card), `ai-parts` (parts cards inline), `system` (centered pill confirmation) — **none of these exist in production** | Optional additions, not required for restyle |

**Net:** keep SSE streaming logic and stop button intact. Restyle bubbles + composer. **Do not add steps/parts cards** unless explicitly scoped — that's a feature change, not a restyle.

### 1.11 Profile / Account

| | Current | Target (from `AccountScreen`) |
|---|---|---|
| Header | `.p-head` (line 740): centered 76×76 avatar with gold gradient, name, email | Left-aligned 64×64 surface tile with initial, name, location, "BSD Member" badge with amber dot |
| Vehicle card | `.p-truck` (line 746): horizontal card with gold-gradient icon tile + truck name/engine + Edit button | "My Garage" list of trucks with active highlighted by amber border, truck icon, name + year/make/model + engine, chevron right |
| Stats grid | `.p-grid` (line 755): 3-col grid of orders/spent/items with gold mono numbers | (no equivalent — bsd-app doesn't show stats on Account) |
| List rows | `.p-list` + `.p-row` (line 762): icon + label + chevron, items: Order History, Payment Methods, Saved Addresses, Notifications, Help & Support | Settings list in a single card with separators: Shipping address, Notifications, Preferences, Sign out (danger) |
| Sign out | `.so-btn` (line 361): full-width 48px, red border, transparent bg | List row with red text + LogOut icon, no chevron |

**Net:** **preserve the stats grid and current row labels** (Order History, Payment Methods, etc. — those are real features). Restyle the avatar (move to left-aligned, drop circular gradient). Restyle vehicle card to look like bsd-app's "My Garage" item. Restyle list rows to use bsd-app's card-with-separators pattern.

### 1.12 Status colors

| Status | Current | Target |
|---|---|---|
| Success ("fits", "in stock", order delivered) | `var(--grn) #34D399` + `rgba(52,211,153,.08)` bg | `GREEN #6ee7b7` + `GREEN_BG #0d3221` + `GREEN_BORDER #1d5238` (three-token system) |
| Warning ("freight quote", "paused") | `#FF6B2C` orange (hardcoded in many places) | (no equivalent — bsd-app doesn't use orange/warning) |
| Error / danger | `var(--red) #F87171` | `DANGER #f87171` (matches) |
| Info | `var(--blu) #60A5FA` | (no equivalent) |

**Net:** **warning orange `#FF6B2C` is used heavily for paused-checkout banner, freight-quote buttons, quote chips.** bsd-app has no orange. Options: (a) keep orange for warning states (it's load-bearing UX), (b) remap warnings to muted amber. Recommend (a) — orange differentiates "needs action" from "primary CTA".

---

## SECTION 2 — What Will Change (visual only)

Each row: element / current / target / complexity. Complexity scale: **S** = pure CSS at `:root` or `<style>` level / **M** = CSS plus a few class-name swaps in HTML / **L** = CSS + edits to JS template strings or HTML structure.

| # | Element | Current → Target | Cx |
|---|---|---|---|
| 1 | `:root` color tokens (`--bg`, `--c1`–`--c4`, `--gl*`, `--gold*`, `--t1`–`--t4`, `--grn`, `--red`) | Remap to bsd-app palette (warmer ambers, solid borders, lifted bg) | S |
| 2 | Font family | Manrope + DM Mono → Inter (single family, weights 400–800) | S |
| 3 | Font import `<link>` (line 23) | Replace Google Fonts URL | S |
| 4 | `.mono` class + all `font-family:'DM Mono'` overrides | Remove → Inter inherits | S |
| 5 | Card surfaces (`.g`, `.gs`, `.pc`, modal panels) | Drop `backdrop-filter`, use solid `SURFACE` | S |
| 6 | Border radii: `--r 14 → 12`, `--r2 18 → 16`, `--r3 24 → 24` (keep) | Token update | S |
| 7 | Primary CTA `.btn-g` | Drop multi-shadow stack, change text to `#1a1207`, simplify gradient | S |
| 8 | Ghost button `.btn-gh` | Solid surface + border, amber text | S |
| 9 | Quantity stepper `.pdm-qty` | Match bsd-app shape (`rounded-2xl` outer, `w-10 h-12` buttons) | S |
| 10 | Login screen `#s-login` | Update spacing/typography; logo block (`.l-logo`) loses heavy gradient + outer-ring | M |
| 11 | Vehicle picker pills `.pill` (line 171) | Match bsd-app pill (`SURFACE` + `BORDER` default, amber gradient + amber border when selected) | M |
| 12 | Progress bar `.prog-bar` (line 163) | bsd-app has no equivalent — keep, simplify to amber dots | S |
| 13 | Marketplace hero `.mk-hero` (line 63) | Already close — retune eyebrow color, vehicle pill border to BORDER, drop gold border | M |
| 14 | Vehicle pill in hero `.mk-vp` | Compress, drop translucent bg, use SURFACE | M |
| 15 | Cart icon in hero `.mk-cart` | Match TopBar bell-button shape (40×40, rounded-full, SURFACE + BORDER) | S |
| 16 | Category tabs `.ct` (line 252) | Same shape, retint selected to amber gradient | M |
| 17 | Stage row `.stg` (line 255) | Same retint as category tabs | M |
| 18 | Dropdowns `.dd` (line 258) | SURFACE bg, BORDER, restyle chevron | S |
| 19 | Search box `.sbox` (line 261) | Match bsd-app: SURFACE bg, BORDER, leading search icon | S |
| 20 | Active filter chips `.afc-chip` (line 268) | Restyle from orange-bordered to BORDER + amber tint | S |
| 21 | Product card markup (built in JS: `appendProductCards` line 2309) | Update template: rounded-2xl, cream image bg, smaller fit badge, white price (drop DM Mono) | **L** |
| 22 | Product card emoji/SVG image area | Change bg from near-black to `#f5f4f1`; optionally add placeholder shock SVG when no real image | **L** |
| 23 | Stage pill on cards `.pc-stg` (`.s0`–`.s3`) | Preserve, restyle to match bsd-app pill palette | S |
| 24 | Vehicle strip `.vstrip` on marketplace (line 686) | Restyle to match bsd-app's VehicleBar (full-width below header), SURFACE, amber chevron | M |
| 25 | Cart drawer `.cd-sh` (line 309) | Update bg/border, drop translucency. Cart items (`renderCart` line 1780) restyled in template | **L** |
| 26 | Cart item template (in `renderCart`) | Smaller emoji, SURFACE_2 bg, drop DM Mono on price | **L** |
| 27 | Cart totals `.cd-tot` | Drop DM Mono, drop gold on total, use TEXT | S |
| 28 | Product detail modal `.pdm` (built in `renderProductDetail` line 2785) | Cream image bg, larger title (text-2xl), white price (drop DM Mono on price + specs) | **L** |
| 29 | PDM fit badge `.pdm-fit-*` | Use GREEN_BG + GREEN_BORDER + GREEN palette | M |
| 30 | PDM specs `.pdm-specs` (2-col mono grid) | Vertical key/value rows in single card | **L** (template edit) |
| 31 | PDM CTA bar (qty + add) | Match shape from bsd-app `ProductScreen` bottom bar | M |
| 32 | Profile header `.p-head` | Left-aligned tile-avatar, name + email + member badge with amber dot | M |
| 33 | Profile vehicle `.p-truck` | Restyle to match bsd-app's My Garage item card | M |
| 34 | Profile stats `.p-grid` | Preserve, drop DM Mono, drop gold | S |
| 35 | Profile list rows `.p-row` | Restyle to single card with separators (no individual row backgrounds) | M |
| 36 | Sign out `.so-btn` | Move into the settings list as a danger row with LogOut icon | M |
| 37 | Order history modal (built in `showOrderHistory`/`showOrderDetail` line 3380/3416) | Restyle order rows to match bsd-app's "Recent orders" card | **L** |
| 38 | Feedback modal (line 833 HTML + `submitFeedback`) | Restyle inputs/buttons; preserve all logic | M |
| 39 | Freight quote modal (line 882 HTML + `submitFreightQuote`) | Same: restyle, preserve logic. The orange `#FF6B2C` accents need a decision (Section 5) | M |
| 40 | Core info modal (line 808 HTML) | Restyle inputs/buttons; preserve logic | M |
| 41 | Generic `appModal` (`showModal` line 3363) | Restyle panel; modal-overlay backdrop simplify | M |
| 42 | Checkout paused banner `.banner-paused` (line 401) | Decision needed (Section 5) on whether to keep orange or remap | M |
| 43 | Chat user bubble `.ai-msg.user .ai-bubble` | Solid amber bg, dark text — major visual shift | S |
| 44 | Chat assistant bubble `.ai-msg.assist .ai-bubble` | SURFACE bg, BORDER | S |
| 45 | Chat composer `.ai-composer` | Match bsd-app composer (rounded-2xl, SURFACE, gradient send square) | M |
| 46 | Streaming cursor `.ai-cursor` | Keep functionality. Optional: replace with a Sparkles pulse | S |
| 47 | Background blobs `.blob-1`/`.blob-2`/`.blob-3` (line 41–46) | bsd-app has no animated blobs. **Decision (Section 5):** remove for cleaner look, or keep as ambient texture | S |
| 48 | Noise overlay `.phone::after` (line 47) | bsd-app has no noise. Same decision as blobs | S |
| 49 | Status bar `.sbar` + `.notch` | bsd-app has no fake status bar. Already hidden on mobile (line 389). **Decide whether to keep on desktop** (Section 5) | S |
| 50 | Phone-frame container `.phone` (line 39) | Already adapts: mobile = full screen, desktop = framed mockup. Restyle border-radius/border subtly | S |
| 51 | Login social buttons `.soc-b` | Match bsd-app surface + border treatment | S |
| 52 | Sign-up terms checkbox `.terms-check` | Already close; retint accent-color to amber, link color to AMBER | S |
| 53 | Bottom nav `.bnav` / `.ni` / `.ni.center` | **STRUCTURAL — see Section 5.** Decision needed before Pass 12 | **L** |
| 54 | Modal overlay `.modal-overlay` / `.pdm-overlay` | Simplify backdrop (remove blur), match bsd-app `#000000aa` overlay | S |
| 55 | Toast `.pdm-share-toast` (line 460) | Restyle to dark surface + amber border instead of orange bg | S |
| 56 | Card animations `@keyframes fadeIn` (line 391) | Preserve — visual delight, no logic | — |
| 57 | High-contrast media query (line 285) | Update token mappings to new palette | S |

**Counts:** ~57 visual items. ~12 are L-complexity (require JS template edits). Bulk is S/M (CSS-only or class swaps).

---

## SECTION 3 — What Will NOT Change (frozen)

### Network calls (3 fetch() endpoints)

1. **`fetch('/api/create-checkout', { method:'POST', headers:{...}, body: JSON.stringify({ items, ...}) })`** at line 1935 inside `doCheckout()`. Frozen including request body, response handling (`data.url` redirect to Stripe), and error branch (`alert('Checkout error: ...')`).
2. **`fetch('/api/freight-quote', { method:'POST', body: JSON.stringify({...}) })`** at line 3101 inside `submitFreightQuote()`. Frozen including payload, success UI swap (`#freightQuoteForm` → `#freightQuoteSuccess`), and reference number echo.
3. **`fetch(FN_URL, { method:'POST', headers:{ 'Accept':'text/event-stream', ... }, body:... })`** at line 3806 inside the chat send handler. `FN_URL = ${SUPABASE_URL}/functions/v1/chat`. Frozen including SSE handling: `res.body.getReader()` (line 3823), `TextDecoder` (line 3824), buffer parsing (line 3830), event parsing, error path (line 3855), and stream reset (line 3935). Stop-button logic (cancel mid-stream) is frozen.

### Supabase auth (8 method calls — all frozen verbatim)

- `sb.auth.signUp({ email, password })` (line 1140)
- `sb.auth.signInWithPassword({ email, password })` (line 1142)
- `sb.auth.signInWithOAuth({ provider, options })` for `google` and `apple` (line 1188)
- `sb.auth.resetPasswordForEmail(email, { redirectTo })` (line 1233)
- `sb.auth.signOut()` (line 1395)
- `sb.auth.getSession()` (line 1406)
- `sb.auth.getUser()` (lines 3028, 3381)
- `sb.auth.updateUser({ data: ... })` (lines 1042, 1072)

### Supabase DB calls (frozen)

- `sb.from('profiles').upsert({ ... })` (lines 1049, 1077, 1165, 1448)
- `sb.from('orders').select(...)` (lines 1325, 3384)
- `sb.from('order_items').select(...)` (line 3429)
- `sb.from('products').*` (lines 1990, 2073, 2499, 2506, 2612)
- `sb.from('feedback').insert(payload)` (line 3035)
- `sb.rpc('get_distinct_product_categories')` (line 2150)
- `sb.rpc('get_distinct_product_brands_filtered', { p_category })` (line 2151)
- `sb.rpc(...)` at line 2238 (product search RPC)

### Stripe

- `/api/create-checkout` is the **only** Stripe touchpoint in this file. Server-side checkout session creation, browser redirect to `data.url`. Frozen.
- The `CHECKOUT_ENABLED` feature flag (line 922) and the paused-checkout banner/modal pair (`dismissCheckoutBanner`, `showCheckoutPausedModal`, `initCheckoutBanner` lines 1905/3306/3312) are **logic** — frozen. The banner's *visual* styling (orange) is open for restyle (see Section 5).

### Vehicle selection cascade

All of `initYrs` (1501), `expYrs` (1509), `ldMakes` (1542), `ldModels` (1561), `ldEngs` (1572), `mkPill` (1490), `vehBack` (1588), `confirmV` (1616), `resetVeh` (1626), `applyVehicle` (1259), `saveVehicleToAccount` (1036), `clearVehicleFromAccount` (1066), `getStoredVehicle` (1011), `vehicleObjIsComplete` (1007), `updateMkVehiclePill` (1023), `updateSplitYearNotice` (1289) are frozen. The pill *visuals* change; the pill *behavior* and the cascade *order* (year → make → model → engine) does not.

### Product browsing / search / filter logic

`buildQueryFilters` (1967), `queryProducts` (1986), `queryTotalCount` (2072), `hasActiveFilters` (2283), `getEmptyStateMessage` (2291), `rebuildProductCategoryDropdowns` (2146), `rebuildBrandDropdown` (2206), `scoreProductForVehicle` (1687), `getVehicleAliases` (1674), `cleanImageUrl` (1640), `getPrimaryImage` (1654), `getAllImages` (1662), `getCatEmoji` (1736), `onFilterChange` (3263), `loadProducts` (3207), `loadMoreProducts` (3243), `renderActiveFilterChips` (3607), `clearOneFilter` (3656), `clearAllFilters` (3680), `updateResultsHeader` (3174), `updateLoadMoreButton` (3186), `handleDeepLink` (2601). All frozen.

### Cart state

`saveCart` (1754), `addToCart` (1757), `removeFromCart` (1770). The state mutation is frozen. The HTML emitted by `renderCart` (1780) is restyled — but the data flow, items contract, and totals math are frozen.

### Product detail logic

`openProductDetail` (2487), `closeProductDetail` (2521), `pdmShare` (2543), `showShareToast` (2586), `pdmCarouselStep` (2638), `pdmGotoSlide` (2643), `pdmRenderCarousel` (2648), `updateProductSeoTags` (2660), `setMetaTag` (2755), `setLinkTag` (2765), `setJsonLd` (2774), `pdmQty` (2944), `pdmAddToCart` (3120). All frozen. The HTML emitted by `renderProductDetail` (2785) is restyled — data/markup-structure decisions about *which* fields render and *when* stay the same.

### Routing / navigation

`go(id)` (1418), `nav(el)` (1423), `showNav`/`hideNav` (1428–1429), `toggleCart` (1467), `uProg` (1469), `sG`/`hG` (1477–1478), `hPrev`/`sPrev` (1479–1483). Screen-show logic is frozen; the visual treatment of the active nav state changes.

### Auth flow

`handleAuth` (1119), `oAuth` (1186), `toggleAuthMode` (1094), `syncSignupButtonState` (1108), `showForgot`/`hideForgot` (1196–1207), `sendResetLink` (1216), `showTermsAcceptScreen` (1431), `acceptTermsAndContinue` (1442), `onAuth` (1346), `proceedToVehicleOrApp` (1372), `handleSignOut` (1394), `checkSession` (1404), `updateProfileBasics` (1309), `loadProfileStats` (1323). All frozen.

### Modals — open/close logic

`showModal` (3363), `closeAppModal` (3368), `orderStatusBadge` (3372), `showOrderHistory` (3380), `showOrderDetail` (3416), `showPaymentMethods` (3506), `showSavedAddresses` (3516), `showNotifications` (3543), `saveNotifPrefs` (3565), `showHelpSupport` (3573), `openCoreInfoModal` (2949), `closeCoreInfoModal` (2952), `openFeedbackModal` (2959), `closeFeedbackModal` (2986), `selectPriority` (2990), `submitFeedback` (2997), `openFreightQuoteModal` (3053), `closeFreightQuoteModal` (3071), `submitFreightQuote` (3075). Open/close + state mutation is frozen. The HTML emitted by `showOrderHistory`/`showOrderDetail`/`showPaymentMethods`/`showSavedAddresses`/`showNotifications`/`showHelpSupport`/`showModal` is restyled — but each modal still shows the same content.

### Third-party scripts

- Supabase UMD `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js">` (line 13) — frozen
- `<script src="/shared/shipping.js">` (line 14) — frozen
- Meta Pixel (lines 497–512) — frozen

### Meta / SEO

`<head>` meta tags (Open Graph, Twitter card, canonical URL, manifest link, apple-touch-icon, theme-color), favicon path, manifest path, deep-link handling, `updateProductSeoTags` and helpers. **One restyle-compatible exception:** the `<meta name="theme-color" content="#07070A">` (line 6) should change to `#16161a` to match the new BG so iOS / Android browser chrome matches the app bg. That is a 1-character meta change, not a real frozen-zone violation.

### Service worker

`/app/sw.js` cache version may need a bump when this file ships, but the SW itself is not modified.

---

## SECTION 4 — Proposed Implementation Order

Each pass is independently reviewable. After every pass: hard-refresh the deployed app (or local preview), walk through the affected screen, confirm visual + functional (auth still works, cart still adds, etc.).

**Pass 1 — Color tokens + font swap (foundation)**
- Replace `<link rel="stylesheet" href="...Manrope&family=DM+Mono..">` with Inter Google Fonts link
- Remap every `:root` token: `--bg`, `--c1`–`--c4`, `--gl*`, `--gold*`, `--goldg`, `--t1`–`--t4`, `--grn`, `--red`, `--r`/`--r2`/`--r3`
- Update `body { font-family: 'Inter', ... }`
- Remove `.mono` font-family declarations (let elements inherit Inter)
- Update `<meta name="theme-color">` to new BG
- Update `@media (prefers-contrast: more)` token mappings (line 285)
- **Expected effect:** the whole app shifts to the new palette and font in one stroke. Many subsequent passes are then class-level retouches that look smaller than they would otherwise.

**Pass 2 — Buttons, cards, inputs (atomic primitives)**
- Restyle `.btn-g` (drop heavy shadow stack, dark text on amber, simplified gradient)
- Restyle `.btn-gh`
- Restyle `.fi` input fields (SURFACE bg, BORDER, focus state with amber ring)
- Restyle `.g` / `.gs` cards (solid SURFACE, drop backdrop-filter)
- Restyle `.dd` dropdowns
- Restyle `.sbox` search box
- Restyle `.modal-panel`
- **Validation:** every button, input, card across all screens now uses the new palette. Auth still works.

**Pass 3 — Login + sign-up + forgot-password screen (`#s-login`)**
- Restyle `.l-logo` (drop heavy gradient ring), `.l-mark`, `.l-sub`, `.sep`, `.soc-b`, `.fpw-*`, `.terms-check`
- **Validation:** sign-in / sign-up / Google OAuth / Apple OAuth / forgot-password all still flow correctly.

**Pass 4 — Vehicle picker screen (`#s-veh`)**
- Restyle `.pill` (default + `.sel` state)
- Restyle `.prog-bar` / `.pb`
- Restyle `.vprev` preview card
- **Validation:** year → make → model → engine cascade still works; selected vehicle saves; resetting clears.

**Pass 5 — Marketplace hero, filters, search (`#s-mkt` upper region)**
- Restyle `.mk-hero`, `.mk-vp`, `.mk-cart`, `.mk-eyebrow`, `.mk-headline`
- Restyle `.vstrip`
- Restyle `.cats` / `.ct`
- Restyle `.stg-row` / `.stg`
- Restyle `.afc-chip` / `.afc-clearall`
- **Validation:** filtering, category selection, search input all still drive product queries.

**Pass 6 — Product grid (`#s-mkt` lower region) — first L-complexity pass**
- Restyle `.pc`, `.pc-img`, `.pc-fit` (and `.pc-unknown`, `.pc-universal`), `.pc-stg` + variants, `.pc-bd`, `.pc-br`, `.pc-pr`, `.pc-core`, `.ab`, `.feed-msg`, `.feed-empty`
- Edit `appendProductCards` (line 2309) template string to emit new class structure / new fit-badge shape / cream image bg
- Edit `clearAndRenderProducts` (line 3134) if it emits HTML
- Edit `getEmptyStateMessage` (line 2291) if needed for new style
- **Validation:** infinite-scroll loads more, fit badges show correctly, stage badges render.

**Pass 7 — Cart drawer (`.cd`, `.cart-*`) — L-complexity**
- Restyle `.cd-sh`, `.cd-h`, `.cd-t`, `.cd-tot`
- Edit `renderCart` (line 1780) template string for cart items + subtotals + freight banner
- Restyle `.cart-ship-quote-banner`, `.cart-core-disclosure`
- **Validation:** add / remove items, freight-quote banner appears on oversize, totals match, checkout button click still calls `doCheckout()`.

**Pass 8 — Product detail bottom-sheet (`.pdm`, `.pdm-*`) — L-complexity**
- Restyle `.pdm-img`, `.pdm-body`, `.pdm-brand`, `.pdm-name`, `.pdm-cat`, `.pdm-price-row`, `.pdm-fit-badge` + variants, `.pdm-section`, `.pdm-desc`, `.pdm-features`, `.pdm-specs`, `.pdm-spec`, `.pdm-fitment*`, `.pdm-cta-row`, `.pdm-qty`, `.pdm-add`
- Edit `renderProductDetail` (line 2785) for new spec rendering, larger title, cream image bg
- Update `.pdm-carousel*` for any visual changes
- **Validation:** open detail, swap images via carousel, share via `pdmShare` works, qty stepper + add-to-cart works.

**Pass 9 — Profile screen (`#s-pro`) — L-complexity**
- Restyle `.p-head`, `.p-av`, `.p-name`, `.p-email`, `.p-truck`, `.p-grid`, `.p-st`, `.p-list`, `.p-row`, `.so-btn`
- Edit `showOrderHistory` (3380) + `showOrderDetail` (3416) HTML emission
- Edit `showPaymentMethods` (3506), `showSavedAddresses` (3516), `showNotifications` (3543), `showHelpSupport` (3573) modal HTML
- **Validation:** all profile sub-modals open with correct data and styling.

**Pass 10 — AI chat (`#s-ai`)**
- Restyle `.ai-empty`, `.orb`, `.ai-t`, `.ai-d`, `.ai-j`, `.ai-msg.user .ai-bubble` (solid amber + dark text), `.ai-msg.assist .ai-bubble`, `.ai-bubble.err`, `.ai-cursor`, `.ai-composer`, `#aiInput`, `.ai-send`, `.ai-stop`
- **Validation:** send message, stream renders char-by-char, stop button cancels mid-stream, error bubble appears on fail.

**Pass 11 — Modals (feedback, freight quote, core info, generic appModal)**
- Restyle `#fbOverlay` panel inputs / `.fb-prio` buttons
- Restyle `#freightQuoteOverlay` panel inputs
- Restyle `#coreInfoOverlay`
- Restyle `#appModalOverlay`
- Restyle `.modal-overlay` backdrop (simplify blur)
- Restyle `.banner-paused` + `.banner-paused-x` (decision pending in Section 5)
- **Validation:** each modal opens, submits / closes correctly.

**Pass 12 — Bottom nav (`.bnav`, `.ni`, `.ni.center`, `.cbdg`) — STRUCTURAL**
- *Requires structural decision from Section 5.* Whichever path is chosen, restyle base nav background to flat strip vs floating pill, restyle active states, update cart badge placement.

**Pass 13 — Polish: status bar, blobs, noise, phone-frame container, animations**
- Apply decisions from Section 5 on `.sbar` / `.notch` / `.blob-*` / `.phone::after`
- Tune `.phone` border / radius
- Confirm all `@keyframes` still feel right with new palette
- Audit any remaining hardcoded hex values not behind `:root` tokens
- Final regression sweep of all screens

---

## SECTION 5 — Risks and Open Questions

### R1 — Bottom nav structure mismatch [BLOCKER for Pass 12]

The production app has **3 bottom-nav tabs** (Profile / **AI** elevated center / Parts) — the elevated gold-glowing center AI button is the single most distinctive UI element in the production app. bsd-app.jsx has **4 flat tabs** (Home / Parts / Diagnose / Account) with no elevated center.

The two designs **cannot both be true**. Three options:

- **(a) Restyle in place — keep 3 tabs + elevated AI center.** Lowest risk. Update colors/blur/borders to match bsd-app palette but preserve the floating-pill shape and the elevated AI button. The "differentiator" stays. **Recommended for Phase B** — least disruptive, preserves user habit, no nav-routing changes.
- **(b) Restructure to 4 flat tabs.** Adds a Home tab that doesn't exist today (production has no Home screen — login → vehicle picker → marketplace). Adds an Account-vs-Profile naming change. Removes the elevated AI button. Higher risk: changes user muscle memory, requires new "Home" screen content.
- **(c) Hybrid — 4 flat tabs but elevate the Diagnose tab.** Pragmatic compromise. Requires deciding where Home content comes from.

**Need your decision before Pass 12.** Default to (a) unless you say otherwise.

### R2 — 161 JS-applied styles + 220 DOM lookups means many "visual" changes touch JS

Grepping the file: **161** occurrences of `.style.` / `.classList.` / inline `style=` HTML / `innerHTML =` / `insertAdjacentHTML`, and **220** occurrences of `getElementById` / `querySelector` / `querySelectorAll`. This breaks the clean "CSS = visual, JS = logic" line you proposed.

Concretely, ~12 visual items in Section 2 require editing JS **template strings** (not logic):

- `appendProductCards` — product card HTML (line 2309)
- `clearAndRenderProducts` — feed render (line 3134)
- `renderCart` — cart item HTML (line 1780)
- `renderProductDetail` — product detail modal HTML (line 2785)
- `pdmRenderCarousel` — image carousel slides (line 2648)
- `renderActiveFilterChips` — filter chip strip (line 3607)
- `showOrderHistory` / `showOrderDetail` — order modals (3380, 3416)
- `showPaymentMethods` / `showSavedAddresses` / `showNotifications` / `showHelpSupport` — settings modals
- `showModal` — generic modal (3363)

**My proposed rule for these:** edit the template string (the `'<div class="...">...</div>'` literal) freely, but **do not modify** any variable interpolation, conditional, loop, or event-handler binding inside the template. I will flag each L-complexity pass explicitly when I'm about to touch JS.

Also: many HTML elements have **inline `style="..."` attributes hardcoded in the HTML** (not in `<style>`). Examples on lines 534, 547, 552, 578, 619, 656, 729, 734, 736, 769–772, 808–869, 882–910. These bypass the `:root` token system. **Fixing them mid-pass is unavoidable** if we want a clean palette — flagging so you know we'll be editing them.

### R3 — Login screen has no analog in bsd-app.jsx

bsd-app.jsx assumes a logged-in user — no login, no sign-up, no forgot-password, no Google/Apple OAuth buttons. The production `#s-login` screen has all of those. Pass 3 will restyle it using **inferred** styles (Inter font, AMBER buttons, SURFACE inputs) but the layout/composition is invented — there's no mockup to copy. **Worth a quick visual review after Pass 3.**

### R4 — Vehicle picker UX divergence

The production `#s-veh` is a **multi-step cascade picker** (Year → Make → Model → Engine), each step a row of pills, with a progress bar. bsd-app.jsx assumes the user has trucks already in a `garage[]` array and presents a **bottom-sheet switcher** to switch between them. There's no "add a new truck" cascade in the mockup.

**Plan:** keep the cascade picker (real production functionality) and only restyle the pills/progress/preview-card to bsd-app's pill aesthetic. **Do NOT introduce a garage with multiple trucks** — that's a feature, not a restyle.

### R5 — Warning orange `#FF6B2C` has no bsd-app equivalent

The orange `#FF6B2C` is used for: paused-checkout banner (line 401, 656), freight-quote chips (line 268, 329), freight-quote CTA (line 333, 903), share toast (line 460), cart freight nudge (line 326), toggle on-state (line 411). bsd-app.jsx uses only amber + green + danger-red — no warning orange.

**Decision needed:** (a) **keep orange** as the warning color (it's load-bearing UX — distinguishes "needs your attention" from amber CTA), or (b) **remap warnings to muted amber** (cleaner palette but harder to differentiate from CTAs).

**Recommend (a)** — keep orange for warnings; document it as an intentional addition to the bsd-app palette in the new CLAUDE.md.

### R6 — DM Mono on prices / stats / order IDs

Production uses `'DM Mono'` for prices, cart totals, profile stats, order IDs, fitment table values (~12 places). bsd-app.jsx uses Inter for everything. Removing DM Mono is a one-line CSS change but changes the visual character of prices significantly (proportional vs monospaced).

**Recommend:** drop DM Mono, unify on Inter (matches mockup). Prices will look slightly less "industrial" but more cohesive.

### R7 — Glass-morphism / blobs / noise / fake status bar / fake notch

The production app's `.phone` container is styled as a phone mockup on desktop with: animated blurred color blobs (`.blob-1/2/3`, lines 41–46), an SVG noise overlay (`.phone::after`, line 47), a fake iOS status bar (`.sbar`, line 49 — hidden on mobile), and a fake notch (`.notch`, line 52 — hidden on mobile). On mobile (the actual production user surface), the noise + blobs still render but the sbar/notch don't.

bsd-app.jsx has none of these — it's a clean flat dark surface. **Decisions:**

- **Blobs:** remove? (cleaner) or keep at reduced opacity? Recommend **remove on mobile, keep at low opacity on desktop mockup**.
- **Noise:** remove? Recommend **remove on mobile, keep on desktop**.
- **`.sbar` + `.notch`:** keep desktop-only? They make the desktop mockup feel more "app-like." Recommend **keep**.
- **`.phone` container:** definitely keep — it's the responsive mobile/desktop adapter.

### R8 — Backdrop-filter blur is everywhere

Many production surfaces use `backdrop-filter: blur(16px)` or `blur(40px)`. bsd-app uses `backdrop-blur-xl` on TopBar and BottomNav only (~2 places). Dropping blur globally would change the visual feel substantially (loss of glass effect). **Recommend:** drop blur on cards/buttons/modals; keep on the bottom nav and any sticky-top headers.

### R9 — Lucide icons in bsd-app vs inline SVGs in production

bsd-app.jsx uses `lucide-react` components (`<Sparkles />`, `<Truck />`, `<ChevronRight />`, etc.). Production uses inline `<svg>` elements with hand-coded paths. **No change recommended** — keeping inline SVGs avoids adding any dependency. We will just confirm the icon *shapes* (chevrons, trucks, sparkles, bells, etc.) match across both files where they appear. Most do.

### R10 — Folder rename: `app/_legacy/` → `app/...`

The folder name `_legacy/` is misleading since this is the live production app. Rename considerations:

- **Vercel routing:** the app is served at `black-stack-diesel.com/app/` which maps to `app/_legacy/index.html` (per `<link rel="canonical" href="https://black-stack-diesel.com/app/">` at line 22 and `<link rel="manifest" href="/app/manifest.json">` at line 11). The actual route resolution depends on `vercel.json` (not yet read in this audit). **Confirm before renaming.**
- **Service worker:** `app/_legacy/sw.js` is the registered SW. SW scope is path-bound — renaming changes the scope and may strand the existing SW on users' devices. Cache version bump won't help; the registration URL changes.
- **Manifest:** `/app/manifest.json` references icons by relative path. Renaming the folder breaks those URLs.
- **Internal links:** the `<link rel="canonical">` and Open Graph URLs are hardcoded to `/app/`.

**Recommendation: do the rename AFTER restyling is complete and merged**, as a separate atomic change. The restyle should not block on the rename, and combining them in one PR makes both harder to review. The rename should be its own PR with: (1) directory move, (2) `vercel.json` route updates, (3) SW registration migration, (4) manifest icon paths, (5) canonical + OG URL updates, (6) deploy + monitor for 24h before declaring done.

**Equally valid alternative:** keep the directory name `_legacy/` permanently and just update the proposed CLAUDE.md to call out that "`_legacy` is a misnomer — this is the live production app." Lower risk, but the naming will keep confusing future Claude sessions.

### R11 — bsd-app.jsx is a Tailwind + React mockup; production is hand-written CSS + vanilla JS

bsd-app.jsx uses Tailwind utility classes (`px-4 py-2.5 rounded-2xl`) with inline `style={{ }}` for color tokens. Production uses semantic CSS classes (`.btn-g`, `.mk-vp`) with all rules in the `<style>` block. **No translation framework needed** — bsd-app is a *visual* source, not a literal copy-paste source. I will translate Tailwind utilities into equivalent CSS rules attached to the production class names. This is exactly the work, and I'm flagging it so there are no surprises that the new CSS won't look "Tailwind-like" structurally.

---

## Open questions to resolve before Pass 1

| # | Question | Default if not answered |
|---|---|---|
| Q1 | Bottom nav: (a) keep 3 tabs + elevated AI, (b) restructure to 4 flat tabs, (c) hybrid? | (a) |
| Q2 | Warning orange `#FF6B2C`: (a) keep as warning color, (b) remap to muted amber? | (a) |
| Q3 | DM Mono on prices/stats: (a) drop, unify on Inter, (b) keep mono? | (a) |
| Q4 | Background blobs + noise on mobile: (a) remove, (b) keep at reduced opacity? | (a) remove |
| Q5 | Desktop phone-frame `.sbar` + `.notch`: (a) keep, (b) remove? | (a) keep |
| Q6 | Folder rename `_legacy/` → `app/`: (a) defer until after restyle merges, (b) rename first, (c) never rename (just document)? | (a) defer |
| Q7 | Backdrop-filter blur: (a) drop on cards/modals, keep on sticky nav, (b) drop everywhere, (c) keep everywhere? | (a) |
| Q8 | Multiple-vehicle garage UI from bsd-app.jsx: (a) skip — keep single active vehicle, (b) add it as a feature? | (a) skip |

---

**End of Phase A.** Awaiting approval (and answers to Q1–Q8) before Pass 1.

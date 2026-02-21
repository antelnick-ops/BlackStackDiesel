# Diesel Hub

A mobile-first web application for diesel truck owners — AI diagnostics, vehicle-specific parts marketplace, and photo-based troubleshooting.

---

## Overview

Diesel Hub is built for diesel truck owners and mechanics. Users register, input their exact vehicle (year, make, model, engine), and the entire app filters to show **only** content relevant to that specific truck. No guesswork, no wrong parts.

### Core Features

- **Login / Registration** — Email + password, Google & Apple OAuth placeholders
- **Smart Vehicle Setup** — Cascading selection (Year → Make → Model → Engine) with real diesel truck data. Each step filters the next — a 2002 Dodge Ram 2500 only shows the 5.9L 24V Cummins ISB and 8.0L V10.
- **AI Diagnostics** — Chat interface with engine-specific suggested problems, photo upload, and context-aware responses referencing the user's exact truck and known issues
- **Marketplace** — Vehicle-filtered parts catalog with categories, search, cart system, checkout, and order tracking
- **Profile** — Vehicle display, order stats, account management

### Supported Vehicles

| Make | Models | Year Range | Diesel Engines |
|------|--------|------------|----------------|
| Dodge | Ram 2500, Ram 3500 | 1994–2024 | 5.9L 12V Cummins, 5.9L 24V Cummins ISB, 5.9L Cummins ISB 325, 6.7L Cummins ISB, 6.7L Cummins ISB 385, 6.7L Cummins HO 420 |
| Ford | F-250, F-350 | 1999–2024 | 7.3L Power Stroke, 6.0L Power Stroke, 6.4L Power Stroke, 6.7L Power Stroke (Gen1/2/3) |
| Chevrolet | Silverado 2500HD, 3500HD | 2001–2024 | 6.6L Duramax LB7, LLY, LBZ, LMM, LML, L5P (Gen1/2) |
| GMC | Sierra 2500HD | 2001–2024 | 6.6L Duramax (all variants) |

---

## Project Structure

```
diesel-hub/
├── public/
│   └── index.html          # Main application (self-contained SPA)
├── src/
│   ├── data/
│   │   └── vehicles.json   # Vehicle database (make/model/year/engine mappings)
│   │   └── parts.json      # Parts catalog keyed to engine families
│   ├── styles/
│   │   └── variables.css   # Design tokens / CSS custom properties
│   └── ...                 # Future component extraction
├── docs/
│   └── ARCHITECTURE.md     # Technical architecture notes
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Git
- A web browser (Chrome recommended)
- Optional: Node.js 18+ (for future build tooling / dev server)

### Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/diesel-hub.git
cd diesel-hub

# Open directly in browser
open public/index.html

# OR use a local server (recommended for file upload features)
npx serve public
# → App running at http://localhost:3000
```

### First-Time Git Setup

```bash
# Initialize repo (if starting fresh)
cd diesel-hub
git init
git add .
git commit -m "Initial commit: Diesel Hub MVP"

# Connect to GitHub
git remote add origin https://github.com/YOUR_USERNAME/diesel-hub.git
git branch -M main
git push -u origin main
```

---

## Tech Stack (Current)

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (single-file SPA) |
| Fonts | Google Fonts — Teko + Work Sans |
| Styling | CSS Custom Properties, mobile-first |
| State | In-memory JavaScript object |
| Build | None required (static file) |

## Recommended Next Steps (Production Roadmap)

### Phase 1 — Foundation
- [ ] Extract JS/CSS into separate files
- [ ] Add a bundler (Vite recommended)
- [ ] Convert to React or Vue component architecture
- [ ] Move vehicle/parts data to external JSON files
- [ ] Add form validation on login/registration

### Phase 2 — Backend
- [ ] Set up API (Node/Express, Python/FastAPI, or Supabase)
- [ ] User authentication (Firebase Auth, Supabase Auth, or Auth0)
- [ ] PostgreSQL database for users, vehicles, orders
- [ ] Parts inventory management system
- [ ] Integrate real AI API (Anthropic Claude / OpenAI) for diagnostics chat

### Phase 3 — Marketplace
- [ ] Stripe payment integration
- [ ] Real product images and inventory
- [ ] Shipping integration (EasyPost, Shippo)
- [ ] Order tracking with carrier APIs
- [ ] Reviews and ratings system

### Phase 4 — Mobile Native
- [ ] Wrap in Capacitor or React Native for App Store / Play Store
- [ ] Push notifications for order updates
- [ ] Camera integration for photo diagnostics
- [ ] Offline mode for saved vehicle data

---

## Environment Variables (Future)

When backend services are added, create a `.env` file:

```env
# Auth
AUTH_PROVIDER=firebase
FIREBASE_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dieselhub

# AI Diagnostics
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Shipping
EASYPOST_API_KEY=xxxxx
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/add-turbo-parts`)
3. Commit your changes (`git commit -m 'Add turbo parts category'`)
4. Push to the branch (`git push origin feature/add-turbo-parts`)
5. Open a Pull Request

---

## License

MIT — See [LICENSE](LICENSE) for details.

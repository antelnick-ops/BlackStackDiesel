# Black Stack Diesel

AI-powered diagnostics and parts for diesel trucks. Built by truck people, for truck people.

**Live site:** [black-stack-diesel.com](https://black-stack-diesel.com)

---

## Current Status: Early Access Landing Page

The site is currently a pre-launch landing page collecting early interest while the full application is being built.

### Landing Page Includes
- Hero with brand intro and coming soon badge
- Feature breakdown (AI Diagnostics, Vehicle-Filtered Parts, Photo Troubleshooting, Smart Setup, Order Tracking, Engine Knowledge)
- App preview mockup
- Supported engine platforms (Cummins, Power Stroke, Duramax — 1994–2024)
- Email signup form (to be wired up)
- Facebook social link
- Footer with Dynamic Innovative Solutions LLC legal

### Full Application (In Development)
The complete BSD mobile app is in `app/` and includes:
- Login / Registration with auth
- Smart vehicle setup (Year → Make → Model → Engine cascading filters)
- AI diagnostics chat with engine-specific knowledge + photo upload
- Vehicle-filtered parts marketplace with cart and checkout
- Order tracking
- User profile with vehicle management

---

## Tech Stack

| Layer | Service |
|-------|---------|
| Domain & DNS | Cloudflare |
| Email | Cloudflare Email Routing |
| Frontend Hosting | Vercel |
| Backend (planned) | Supabase |
| Payments (planned) | Stripe |

---

## License

MIT — See [LICENSE](LICENSE) for details.

© 2026 Dynamic Innovative Solutions LLC. All rights reserved. Black Stack Diesel™

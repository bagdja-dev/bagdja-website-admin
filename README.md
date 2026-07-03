# Bagdja Website Admin

CMS panel Next.js App Router + [HeroUI](https://heroui.com) untuk **Bagdja
Website Builder**. Lihat [`../plan.md`](../plan.md) untuk blueprint lengkap.

## Stack

- Next.js 14 (App Router) + React 18
- TypeScript
- Tailwind CSS 3
- HeroUI React (`@heroui/react`)
- OAuth 2.0 + PKCE → Bagdja Auth (Phase 5)

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Default port: **5004** → `http://localhost:5004`

## Struktur

```
app/
├── layout.tsx              # Root layout + HeroUIProvider
├── providers.tsx           # Client providers wrapper
├── page.tsx                # Landing / placeholder
├── globals.css             # Tailwind base
├── auth/                   # (Phase 5) login callback
├── select-website/         # (Phase 5) pilih website jika akses > 1
└── [website_slug]/         # (Phase 5+) dashboard per-website
    ├── dashboard/
    ├── pages/
    ├── sections/
    ├── templates/
    └── staff/
components/                 # Reusable UI components
lib/                        # API client, auth helpers
```

## Phase 1 Checklist

- [x] Scaffold Next.js App Router
- [x] Integrasi HeroUI + Tailwind
- [x] Halaman landing sementara
- [x] Konfigurasi env untuk API/Auth

Lanjutan (Phase 5+):

- [ ] OAuth callback + session cookie
- [ ] Middleware auth guard
- [ ] Halaman "Pilih Website"
- [ ] Sidebar navigasi dashboard
- [ ] Page builder + CRUD konten
- [ ] Staff invitation UI

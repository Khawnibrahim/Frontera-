# Frontera Portal (Lovable frontend)

React + Vite UI from Lovable. Talks to **Supabase Auth** for login and **Nest** (`../backend`) for scheduling APIs.

## Prerequisites

Use the **same Supabase project** for:

- `.env` (this folder) → `VITE_SUPABASE_*` (browser login)
- `../backend/.env` → `SUPABASE_URL` (JWT verification)
- `../backend/.env` → `DATABASE_URL` (API data)

If these point at different projects, login will work in the UI but Nest will reject tokens or return empty data.

## Local end-to-end

**Terminal 1 — API**

```bash
cd ../backend && npm run start:dev
# or: cd ../backend && npm run docker:up
```

**Terminal 2 — Portal**

```bash
cp .env.example .env   # first time; fill Supabase anon key from dashboard
npm install
npm run dev
```

Open **http://localhost:8080**, sign in as internal staff or provider, then use corporate onboarding / scheduling screens that call Nest.

## Env vars

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/public key |
| `VITE_FRONTERA_API_URL` | Nest base URL (default `http://localhost:3000`) |

Nest API calls attach `Authorization: Bearer <supabase_access_token>` automatically.

## Notes

- Most pages still read/write **Supabase directly** (RLS). Only onboarding admin flows use Nest via `src/lib/adminApi.ts` today.
- Invite password setup uses Nest HTML at `GET/POST /accept-invite` (email link), not this SPA route.

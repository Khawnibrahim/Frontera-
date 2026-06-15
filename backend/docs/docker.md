# Docker local development

## Architecture

```text
postgres:16  →  migrate (db:migrate + db:seed:all)  →  api (nest start --watch)
     ↑                                                    |
     └──────────── DATABASE_URL (no SSL) ─────────────────┘
```

## Files

| File | Role |
|------|------|
| `docker-compose.yml` | Services: `postgres`, `migrate`, `api` |
| `Dockerfile` | Node 22 Alpine; `development` target for local |
| `docker/postgres/init/` | `pgcrypto` + minimal `auth` schema for seeds |
| `.env.docker.example` | Host-side API against Docker Postgres on `127.0.0.1:5432` |

## Missing modules or `Cannot find type definition file for ...`

The API container uses **`node_modules` from the Docker image** (not a host mount). Only `./src` is mounted for hot reload.

After changing `package.json` / `package-lock.json`:

```bash
docker compose build api
docker compose up api
```

If things are still broken, reset volumes and rebuild:

```bash
docker compose down -v
docker compose up --build
```

## Cannot reach http://localhost:3000

1. Wait for the log line: `Frontera API listening on http://0.0.0.0:3000` (first start compiles ~10–15s).
2. Use **http** (not https): `http://localhost:3000/health` or `http://127.0.0.1:3000/health`.
3. Swagger is at `http://localhost:3000/api` (not `/`).
4. Check mapping: `docker ps` → `0.0.0.0:3000->3000/tcp` on `frontera-api-1`.
5. Port conflict: if something else uses 3000, stop it or change compose to `'3001:3000'` and use port 3001 on the host.
6. Restart API after code change: `docker compose restart api`.

## Reset database

Postgres init scripts run only on **first** volume creation:

```bash
npm run docker:reset
```

The `migrate` service runs **`db:seed:all`** = onboarding catalog (dropdowns, facility list, PDF staff) + test data (providers, time-off, PRN/SET monthly rows). Re-run seeds without wiping the volume:

```bash
docker compose run --rm migrate sh -c "npm run db:seed:all"
```

## Environment (`.env`)

The `api` service uses `env_file: .env`, so values you already have — **`SUPABASE_URL`**, `SUPABASE_JWT_SECRET`, `SES_FROM_EMAIL`, etc. — are passed into the container.

Compose **overrides** only:

| Variable | Docker full stack value |
|----------|-------------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/frontera` |
| `DATABASE_SSL` | `false` |

Your `.env` Supabase **database** URL is ignored in full-stack mode so the API talks to local Postgres. Auth/JWT still use your Supabase project from `SUPABASE_URL`.

To use **Supabase cloud Postgres** with Dockerized API only, skip the bundled DB:

```bash
docker compose up api --build
# Remove DATABASE_URL override from compose, or run API on host with npm run start:dev
```

## Supabase vs Docker DB

| | Docker Postgres | Supabase cloud |
|--|-----------------|----------------|
| Schema | Same Drizzle migrations | Same |
| `auth.users` | Stub table + seed inserts | Managed by Supabase Auth |
| JWT | From `.env` `SUPABASE_URL` / `SUPABASE_JWT_SECRET` | Production path |
| RLS policies | Functions only (`0001_*.sql`); policies in Supabase dashboard | Full |

## Production deploy

Lambda deploy is unchanged (`npm run deploy` / Serverless). Docker is **local dev only**.

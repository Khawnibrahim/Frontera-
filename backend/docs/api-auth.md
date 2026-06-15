# API authentication & authorization (signed-in users)

How portal users stay secure when calling the Nest API after sign-in.

Related: [onboarding-invite-flow.md](./onboarding-invite-flow.md) · [ADR-0002](./adr/0002-scheduling-workflow-backend-shape.md) · Q1 delivery plan.

---

## Supabase Auth or JWT?

**Both — they are the same thing in this stack.**

| Term | What it means here |
|------|------------------|
| **Supabase Auth** | Product that handles sign-up, sign-in, password reset, sessions |
| **JWT (access token)** | What Supabase **issues** after sign-in — a signed JSON Web Token |
| **Nest “JWT guard”** | Code that **verifies** that Supabase-issued token on each API request |

There is **no separate** Frontera-issued login system planned. Lovable does **not** send username/password to Nest on every API call. It sends:

```http
Authorization: Bearer <supabase_access_token>
```

That string **is** the Supabase session access token (a JWT). Nest validates signature and claims using `SUPABASE_JWT_SECRET` or Supabase **JWKS** (`SUPABASE_URL`).

---

## Request flow (signed in)

```text
Provider / corporate user
  → signs in on Lovable (email + password)
  → Supabase Auth returns access_token (+ refresh_token)

Every API call to Nest:
  Lovable → HTTPS → API Gateway → Lambda (Nest)
    Header: Authorization: Bearer <access_token>
    Nest guard: verify JWT → attach user id + role to request
    Service: business rules + DB queries scoped to that user
```

Password is used **once** at sign-in (to Supabase). All later Nest calls use the **JWT only**.

---

## Two layers of security

### 1. Authentication (who are you?)

**Planned Q1 — not fully implemented in code yet** (`CONTEXT.md`).

- Global or per-route **guard** on `admin/*` and `provider/*`.
- Reject missing/invalid/expired tokens → `401 Unauthorized`.
- Extract `sub` (user UUID) from JWT → maps to `auth.users.id` / `profiles.user_id`.

Verify with either:

- **HS256** + `SUPABASE_JWT_SECRET` (JWT secret from Supabase dashboard), or  
- **JWKS** from `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`

### 2. Authorization (what may you do?)

JWT proves identity; **roles and assignments** decide permission.

| Source | Use |
|--------|-----|
| `user_roles.role` | `admin`, `internal_staff`, `provider_user`, `client_user` |
| `assignments` / `org_memberships` | Recruiter ↔ provider, client org scope |
| Route prefix | `admin/*` → staff roles only; `provider/*` → `provider_user` (and maybe admin) |

Examples:

- Provider cannot call `POST /admin/scheduling/requests/:id/approve`.
- Recruiter only sees review queue rows for their providers/sites (repository filters + JWT user id).

---

## Nest vs Supabase direct access (Lovable)

Lovable may talk to **two** backends:

| Target | Auth | Enforcement |
|--------|------|-------------|
| **Nest API** | Bearer JWT | Nest guard + service-layer checks (required) |
| **Supabase Postgres** (client SDK) | Same JWT passed to Supabase | **RLS** policies in Postgres |

Nest uses `DATABASE_URL` (pooler / service role) and often **bypasses RLS**. So Nest must **not** trust “any valid JWT” alone for row access — it must **enforce roles and scoping in code** (repositories/services), even when the token is valid.

RLS still matters for anything the FE reads/writes **directly** against Supabase.

---

## What is secure today vs planned

| Item | Status |
|------|--------|
| Swagger `addBearerAuth()` | Documented expectation only |
| JWT guard on routes | **Q1 — planned, not shipped** |
| Routes enforce roles | **Planned** with guard + `@Roles()` or separate controllers |
| Public routes | `GET /health` only (typical) |
| Onboarding invite / accept | Special case: token + then JWT (see onboarding doc) |

Until the guard ships, **do not assume** APIs are protected in dev.

---

## FE responsibilities (Lovable)

1. On sign-in: use Supabase client `signInWithPassword` (or SSO later).
2. Store session; attach `Authorization: Bearer <access_token>` to **every** Nest `fetch`.
3. Refresh session when expired (`refreshSession`) before retrying Nest calls.
4. On `401` from Nest: redirect to login.
5. Never send password to Nest API routes.

---

## Env vars

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Project URL; JWKS URL derived from this |
| `SUPABASE_JWT_SECRET` | Verify HS256 JWTs (if not using JWKS only) |
| `DATABASE_URL` | Nest DB connection (separate from user JWT) |

---

## Implementation checklist (Q1)

- [ ] `AuthModule` + `SupabaseJwtGuard` (or Passport JWT strategy)
- [ ] Apply guard to `Admin*` and `Provider*` controllers (not `health`)
- [ ] `@Roles('internal_staff', 'admin')` on `admin/*`
- [ ] `@Roles('provider_user')` on `provider/*` (admin override if needed)
- [ ] Pass `request.user.id` into repositories for scoping
- [ ] Integration tests: no token → 401; wrong role → 403

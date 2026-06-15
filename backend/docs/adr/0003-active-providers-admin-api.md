---
status: accepted
---

# Active Providers admin screen — Nest API

The Lovable **Active Providers** admin screen lists onboarded providers with search, filters, a data table, and Excel export. Dummy UI data is replaced by this backend.

## Decision

Implement under **`GET /admin/providers`** (and related routes) in Nest, backed by Drizzle queries on existing tables. Lovable calls the API with Supabase JWT when the auth guard ships; until then routes are open in dev.

### Active provider definition

A row appears when **all** of:

1. `user_roles.role = 'provider_user'` for `profiles.user_id`
2. At least one `assignments` row with `status = 'active'` for that `provider_id` (= `profiles.user_id`)

Pending invites without an active assignment are excluded.

### Search (`q`)

Case-insensitive match on `profiles.full_name`, `profiles.email`, or `profiles.provider_id` (external id).

### Filters

| Query param | Matches |
|-------------|---------|
| `recruiterId` | `profiles.recruiter_id` |
| `liaisonId` | `profiles.liaison_id` |
| `state` | `profiles.state` **or** any linked `work_sites.state` |
| `city` | any linked `work_sites.city` |
| `region` | `profiles.region` **or** any linked `work_sites.region` |
| `specialty` | `profiles.specialty` (exact, case-insensitive) |
| `employmentType` | `profiles.employment_type` (e.g. `W2`, `1099`) |

### Table columns (API DTO)

| UI column | Source |
|-----------|--------|
| Provider | `fullName`, `email`, `scheduleSummary` |
| Contact | `email`, `phone` |
| Specialty / State | `specialty`, `state` |
| Type | `employmentType` |
| Work Sites | `workSites[]` from `provider_work_sites` → `work_sites.facility_name`; empty → `[]` (UI shows `-`) |
| Recruiter | `recruiterName` |
| Provider Liaison | `liaisonName` |

**Schedule line:** `profiles.work_schedule` when set; otherwise derived from primary `provider_work_sites.weekly_schedule` JSON (see `formatScheduleSummary` in providers service).

### Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/providers` | Paginated list (`page`, `pageSize`, filters) |
| `GET` | `/admin/providers/filter-options` | Distinct values for filter dropdowns |
| `GET` | `/admin/providers/export` | Excel download (same filters, no pagination cap) |

### Export

Server-generated `.xlsx` via `exceljs`, same columns as the table. Max **10_000** rows per export.

**Lovable / browser download:** call `GET /admin/providers/export` with the same filter query params as the table, then save the response as a **blob** (never `response.text()` or `JSON.parse` — that corrupts the file on Lambda). Example:

```typescript
const res = await fetch(`${API_URL}/admin/providers/export?${params}`);
if (!res.ok) throw new Error(await res.text());
const blob = await res.blob();
// trigger download from blob URL
```

Do not build `.xlsx` client-side from list JSON unless you map columns exactly; prefer the API export. Lambda uses base64 for this content-type (`src/lambda.ts` `binarySettings`).

## Consequences

- Filter dropdowns are computed from current DB data (not a static enum).
- Second recruiter/liaison in seed data supports filter testing.
- Auth guard will restrict to `internal_staff` / `admin` when implemented.

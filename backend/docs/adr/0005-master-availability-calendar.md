---
status: accepted
---

# Master Availability Calendar — corporate admin screen

Corporate **Master Availability Calendar** shows provider availability across companies (Frontera / 4tress), with shared filters, **table** and **month calendar** views, and Excel export. Replaces dummy Lovable data.

Related: [scheduling-workflow.md](../scheduling-workflow.md) Phase 3, [0004-onboard-new-provider.md](./0004-onboard-new-provider.md) (`profiles.company`), [0003-active-providers-admin-api.md](./0003-active-providers-admin-api.md).

## Decision

Implement under **`GET /admin/master-availability/*`** in Nest (new routes on `SchedulingModule` or dedicated controller). Same auth posture as other admin APIs: open in dev until JWT guard ships.

**Read model:** one **availability row per provider per calendar day** (and optional time window), derived from Postgres — not a separate `master_availability` table in v1.

---

## UI → API

| UI control | API |
|------------|-----|
| Company toggle (Frontera / 4tress) | Query `company` — must match `profiles.company` (`onboarding_companies` seed) |
| Liaison filter (All / one) | `liaisonId` — `profiles.liaison_id` |
| Status filter (All / one) | `status` — `time_off_requests.status` enum |
| Region filter (All / one) | `region` — `profiles.region` or primary linked `work_sites.region` |
| Search bar (provider or specialty) | `q` — `profiles.full_name`, `profiles.email`, `profiles.specialty` (case-insensitive) |
| View toggle **Table** / **Calendar** | `view=table` \| `view=calendar` on list route, or separate calendar route (see below) |
| Month navigation (calendar + table date scope) | `monthYear` — ISO date first of month, e.g. `2026-05-01` |
| Export table | `GET /admin/master-availability/export?view=table` |
| Export calendar | `GET /admin/master-availability/export?view=calendar` |
| Filter dropdown values | `GET /admin/master-availability/filter-options` |

---

## Company selection

| Toggle | `profiles.company` |
|--------|-------------------|
| Frontera | `Frontera` |
| 4tress | `4tress` |

- Exactly one company active at a time (FE toggle); API receives `company` on every request.
- Providers with other `company` values are excluded until added to `onboarding_companies`.

---

## Filters (AND between dimensions)

| Param | When omitted | When set |
|-------|----------------|----------|
| `company` | **Required** in v1 (no “all companies” aggregate) | Exact match on `profiles.company` |
| `liaisonId` | All liaisons | `profiles.liaison_id` |
| `status` | All statuses | `time_off_requests.status` for rows in range; see **Status semantics** |
| `region` | All regions | `profiles.region` **or** any `provider_work_sites` → `work_sites.region` |
| `q` | No text filter | ILIKE on full name, email, specialty |
| `monthYear` | Current month (server default) | Restrict rows to that calendar month |

**Provider scope:** same as Active Providers — `user_roles.role = provider_user` and `assignments.status = active` for selected `company`.

---

## Status semantics

Statuses come from `time_off_status` on underlying `time_off_requests`:

| Value | Meaning in UI |
|-------|----------------|
| `pending_review` | Submitted, not yet approved |
| `approved` | Counts toward published availability |
| `denied` | Shown when filtering; excluded from “finalized” views unless filter selected |
| `cancelled` | Withdrawn |

**Table “Status” column:** `time_off_requests.status` for that day row.

**Calendar:** same status per cell entry; FE may de-emphasize `denied` / `cancelled` when filter is “All”.

Optional later: include `monthly_availability_requests.status` for PRN month-level banner (not submitted / submitted / approved).

---

## Data sources (read model v1)

| `profiles.schedule_type` | Primary source for a day cell |
|--------------------------|-------------------------------|
| `set` | Baseline from primary `provider_work_sites.weekly_schedule` (day-of-week match) **merged** with `time_off_requests` for that `request_date` (`add_day`, `modify_shift`, `remove_day`, `swap`) |
| `prn` | `time_off_requests` for that `request_date` from PRN monthly submit (typically `add_day` / availability rows) |

| Field | Source |
|-------|--------|
| Provider | `profiles.full_name` |
| Liaison | `profiles.liaison_name` |
| Date | `time_off_requests.request_date` (table); calendar day bucket |
| Time Available | `start_time`–`end_time` formatted, or derived from `weekly_schedule` JSON for set providers |
| Status | `time_off_requests.status` |
| Specialty | `profiles.specialty` |
| Region | `profiles.region` or primary site region |
| Notes | `time_off_requests.notes` |

**Open (v2):** facility-scoped filter (`workSiteId`); finalized-month gate (`schedule_finalizations`).

---

## Table view

**Columns (order):** Provider, Liaison, Date, Time Available, Status, Specialty, Region, Notes

| Column | API field |
|--------|-----------|
| Provider | `providerName`, `providerUserId` |
| Liaison | `liaisonName` |
| Date | `date` (ISO date) |
| Time Available | `timeAvailable` (display string, e.g. `8:00 AM – 5:00 PM`) |
| Status | `status` |
| Specialty | `specialty` |
| Region | `region` |
| Notes | `notes` |

**Pagination:** `page`, `pageSize` (default 25, max 100). Sort default: `date` asc, then `providerName` asc.

### Example row

```json
{
  "providerUserId": "a0000000-0000-4000-8000-000000000002",
  "providerName": "Alex Provider",
  "liaisonName": "Anthony Kendall",
  "date": "2026-05-15",
  "timeAvailable": "8:00 AM – 5:00 PM",
  "status": "approved",
  "specialty": "Hospitalist",
  "region": "Region 1",
  "notes": null
}
```

---

## Calendar view

**Scope:** one month per request (`monthYear=2026-05-01` → May 2026).

**Layout (FE):** weekday headers (Mon–Sun) + day numbers 1…N; same filter set as table.

**API shape:** days array with entries per date — FE renders grid; **provider color is FE-only** (stable hash of `providerUserId` → palette).

```json
{
  "monthYear": "2026-05-01",
  "monthLabel": "May 2026",
  "weeks": [
    {
      "days": [
        {
          "date": "2026-05-01",
          "weekday": "Friday",
          "dayOfMonth": 1,
          "entries": [
            {
              "providerUserId": "...",
              "providerName": "Alex Provider",
              "liaisonName": "Anthony Kendall",
              "timeAvailable": "8:00 AM – 5:00 PM",
              "status": "approved",
              "specialty": "Hospitalist",
              "region": "Region 1",
              "notes": null
            }
          ]
        }
      ]
    }
  ]
}
```

- Days outside the month (padding cells) are omitted or sent with `inMonth: false` (implementation choice; FE can pad locally).
- Multiple providers on the same day → multiple `entries` (stack or truncate in FE).

---

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/master-availability/filter-options` | Companies, liaisons, statuses, regions (for dropdowns) |
| `GET` | `/admin/master-availability` | Table view (`view=table`, default) — paginated rows |
| `GET` | `/admin/master-availability/calendar` | Calendar view for `monthYear` |
| `GET` | `/admin/master-availability/export` | Excel: `view=table` or `view=calendar`; same filters as list |

### Query parameters (list, calendar, export)

| Param | Required | Notes |
|-------|----------|--------|
| `company` | yes | `Frontera` \| `4tress` |
| `monthYear` | calendar: yes; table: recommended | `YYYY-MM-DD` first of month |
| `liaisonId` | no | UUID |
| `status` | no | `pending_review` \| `approved` \| `denied` \| `cancelled` |
| `region` | no | string |
| `q` | no | search |
| `page` | table only | default 1 |
| `pageSize` | table only | default 25, max 100 |
| `view` | export only | `table` \| `calendar` |

---

## Export

| Export | Format | Content |
|--------|--------|---------|
| Table | `.xlsx` | Same columns as table view; max **10_000** rows; respects filters |
| Calendar | `.xlsx` | One sheet: rows = date × provider (or wide month grid — product TBD); same filters |

Server-generated via `exceljs` (same pattern as Active Providers export).

---

## Frontend-only

| Behavior | Owner |
|----------|--------|
| Company toggle UI (two buttons) | FE — sends `company` query param |
| Table vs calendar toggle | FE — calls table or calendar endpoint |
| Provider colors on calendar | FE — map `providerUserId` → color |
| Month prev/next | FE — changes `monthYear` |
| Debounced search | FE — updates `q` |

---

## Edge cases

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| M1 | No rows in month | Empty `items` / empty `entries` per day |
| M2 | `status=approved` only | Only approved `time_off_requests` (set baseline TBD v2) |
| M3 | Provider no liaison | `liaisonName` null; still listed |
| M4 | Multiple sites / regions | Region = `profiles.region` or primary site |
| M5 | Set provider, no time_off row | v1: show baseline from `weekly_schedule` for matching weekdays; v1 stub may omit until implemented |
| M6 | PRN, no submission for month | No rows unless `time_off_requests` exist |
| M7 | Export over 10k rows | Truncate or 400 — document limit in response header (future) |
| M8 | Invalid `company` | 400 — must be allowed catalog value |
| M9 | Same provider multiple slots one day | Multiple table rows or multiple `entries` |

---

## Implementation status

| Piece | Status |
|-------|--------|
| ADR (this doc) | Accepted |
| `GET /admin/master-availability/filter-options` | **Built** |
| `GET /admin/master-availability` (table) | **Built** |
| `GET /admin/master-availability/calendar` | **Built** |
| `GET /admin/master-availability/export` | **Built** |
| Set-schedule baseline merge in read model | **Built** (weekdays from primary `weekly_schedule`) |

---

## Consequences

- Distinct from per-facility routes `GET /admin/scheduling/calendars/availability` (work-site scoped).
- Company filter aligns with onboarding `onboarding_companies` (Frontera, 4tress).
- Calendar colors stay in Lovable to avoid API churn.
- Realtime optional later (Supabase on `time_off_requests`); v1 polling on month/filter change.

## Related

- `docs/scheduling-workflow.md` — Phase 3 corporate calendars  
- `src/repository/persistence/db/schema.ts` — `time_off_requests`, `monthly_availability_requests`, `provider_work_sites`  
- `scripts/seed/onboarding-catalog-data.ts` — company list  

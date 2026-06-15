---
status: accepted
---

# PRN Availability — corporate admin screen

Corporate reviewers view **PRN provider monthly availability submissions** in **Queue** and **Calendar** views. Same filter bar as Schedule Change Approvals; data scoped to `profiles.schedule_type = prn`.

Related: [0006-schedule-change-approvals.md](./0006-schedule-change-approvals.md), [scheduling-workflow.md](../scheduling-workflow.md) Phase 3 (`CorporatePRNAvailability.tsx`).

## Decision

Read-only v1 under **`GET /admin/prn-availability/*`**. Approve/deny month or days deferred until the screen adds review actions.

**Data:**

| Layer | Table | Role |
|-------|--------|------|
| Month submission | `monthly_availability_requests` | One row per provider × `month_year`; status `requested` \| `submitted` \| `approved` \| `denied` |
| Per-day grid | `time_off_requests` | PRN batch submit rows (typically `add_day`); `time_off_requests.status` for day-level review state |

**Pending count (tab header):** `monthly_availability_requests.status = submitted` for filtered PRN providers.

---

## UI → API

| UI control | API |
|------------|-----|
| Company toggle (Frontera / 4tress) | `company` (required) |
| Provider search | `q` |
| Liaison multi-select | `liaisonIds` |
| Region multi-select | `regions` |
| Queue view | `GET /admin/prn-availability/queue` |
| Calendar view | `GET /admin/prn-availability/calendar?monthYear=YYYY-MM-01` |
| Pending tab count | `GET /admin/prn-availability/summary` |
| Filter dropdowns | `GET /admin/prn-availability/filter-options` |

Query params match Schedule Change Approvals (`liaisonIds` / `regions` comma-separated or repeated). Optional `pendingOnly=true` on queue.

---

## Queue response

Groups by **provider × month**:

- Month row from `monthly_availability_requests` (status, deadline, `submittedAt`, `noChanges`)
- `days[]` from `time_off_requests` in that month (deduped to latest per provider+date)
- `pendingDayCount` — days with `time_off_requests.status = pending_review`

---

## Calendar response

Month grid (Sun–Sat), up to 4 provider chips per day + overflow count. Chips include day `status` and linked `monthlyStatus`.

---

## Provider scope

Same as other admin lists: `profiles.company`, `schedule_type = prn`, `user_roles.role = provider_user`, active `assignments`.

---

## Endpoints

| Method | Path |
|--------|------|
| GET | `/admin/prn-availability/filter-options` |
| GET | `/admin/prn-availability/summary` |
| GET | `/admin/prn-availability/queue` |
| GET | `/admin/prn-availability/calendar` |

**Status:** Built (read-only).

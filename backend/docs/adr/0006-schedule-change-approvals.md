---
status: accepted
---

# Schedule Change Approvals — corporate review screen

Corporate reviewers approve or deny provider **time-off / schedule-change** requests. Lovable implements **List** (queue + bulk actions) and **Calendar** (month overview) against the same `time_off_requests` data.

Related: [0005-master-availability-calendar.md](./0005-master-availability-calendar.md), [0002-scheduling-workflow-backend-shape.md](./0002-scheduling-workflow-backend-shape.md).

## Decision

Implement under **`/admin/schedule-change-approvals/*`** in `SchedulingModule`. Auth: same as other admin routes (open in dev until JWT guard).

**Writes:** Nest updates `time_off_requests` (`status`, `reviewed_by`, `reviewed_at`, `review_notes`, optional `start_time` / `end_time` on approve-with-adjust). Provider email via SES when `SES_FROM_EMAIL` + `FRONTERA_APP_URL` are set.

**Realtime:** FE may subscribe to Supabase Realtime on `time_off_requests`; Postgres remains source of truth whether the write came from List or Calendar.

---

## UI → API

| UI control | API |
|------------|-----|
| Company toggle (Frontera / 4tress) | `company` (required) — `profiles.company` |
| Provider search | `q` — name, email, external `provider_id` |
| Liaison multi-select | `liaisonIds` — repeated or comma-separated UUIDs |
| Region multi-select | `regions` — repeated or comma-separated names |
| List tab pending count | `GET .../summary` → `{ pendingCount }` |
| List view groups | `GET .../list` |
| Calendar month | `GET .../calendar?monthYear=YYYY-MM-01` |
| Review dialog (single) | `GET .../requests/:id` |
| Approve / deny one | `POST .../requests/:id/approve` \| `.../deny` |
| Bulk approve / deny | `POST .../bulk-decide` |
| PACR PDF preview | `GET .../requests/:id/pacr` (metadata; signed URL in Q2) |

---

## List response shape

- Rows are **deduped** to the latest `created_at` per `(provider_id, request_date)` so stale resubmits are hidden.
- **Groups:** `provider × month` with `days[]`, `pendingCount`, optional `scheduleOverloadWarning` when requested off days in that month exceed **50%** of primary-site `weekly_schedule` workdays.
- Query `pendingOnly=true` limits groups to those with at least one `pending_review` day.

---

## Approve / deny rules (v1)

| Action | Rule |
|--------|------|
| Approve | Only `pending_review` → `approved`. Optional `adjustHours` + `startTime` / `endTime` (partial day). |
| Deny | Only `pending_review` → `denied`. **`reviewNotes` required** (single and bulk deny). |
| Bulk | Same status rules; one `reviewNotes` applied to all updated rows. |
| `reviewedBy` | Optional UUID in body until JWT guard supplies reviewer from token. |

**Deferred (Q2+):** liaison PACR email on post-deadline approve; S3 signed URL for PACR preview; strict notice-window validation on approve.

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/schedule-change-approvals/filter-options?company=` | Liaisons, regions, companies |
| GET | `/admin/schedule-change-approvals/summary` | Pending count |
| GET | `/admin/schedule-change-approvals/list` | Grouped list |
| GET | `/admin/schedule-change-approvals/calendar` | Month grid + chips |
| GET | `/admin/schedule-change-approvals/requests/:id` | One row |
| GET | `/admin/schedule-change-approvals/requests/:id/pacr` | PACR metadata |
| POST | `/admin/schedule-change-approvals/requests/:id/approve` | Approve |
| POST | `/admin/schedule-change-approvals/requests/:id/deny` | Deny |
| POST | `/admin/schedule-change-approvals/bulk-decide` | Bulk approve/deny |

---

## Code

- `src/scheduling/schedule-change-approvals/` — controller, service, DTOs  
- `src/repository/persistence/schedule-change-approvals.util.ts` — dedupe, grouping, overload %, deadline helper  
- `src/repository/persistence/repository.ts` — `ScheduleChangeApprovalsRepository`

**Status:** Built.

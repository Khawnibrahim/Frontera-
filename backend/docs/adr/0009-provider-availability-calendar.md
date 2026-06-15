---
status: accepted
---

# Provider portal — Availability Calendar (PRN)

Lovable screen **Availability Calendar**: PRN providers submit the days they **are available** each target month (start/end time, optional notes) for **liaison / corporate approval**.

Related: [0008-provider-portal-scheduling.md](./0008-provider-portal-scheduling.md) (index) · [0007-prn-availability-admin.md](./0007-prn-availability-admin.md) (corporate read mirror) · [scheduling-workflow.md](../scheduling-workflow.md) Phase 2 · [onboarding-invite-flow.md](../onboarding-invite-flow.md).

## Screen summary

| Field | Value |
|-------|--------|
| Lovable screen | **Availability Calendar** |
| Actor | `provider_user` |
| Schedule type | **`prn` only** — redirect `set` providers to the set-schedule screen |
| Corporate mirror | `GET /admin/prn-availability/*` ([0007](./0007-prn-availability-admin.md), read-only v1) |
| Implementation | **Built** — `src/provider/*` |

---

## Decision

Provider portal exposes load + **PRN batch submit** APIs under `/provider/:providerId/*`. Submissions write `monthly_availability_requests` plus per-day `time_off_requests` rows that corporate already lists in the PRN Availability admin screen.

**PACR:** Required only when **at least one** selected day is in a target month **past** its monthly submission deadline. If the entire target month is still on-time (today on or before the last Tuesday of month M−2 for month M), **no PACR** for that submission.

**Optum clinic closures:** Blocked in **Lovable only** for v1; API enforcement of closure dates is deferred.

Deadline logic reuses [schedule-change-approvals.util.ts](../../src/repository/persistence/schedule-change-approvals.util.ts) (`submissionDeadlineForTargetMonth`, `isPastSubmissionDeadline`).

---

## UI → API

| UI section | Method | Path | Notes |
|------------|--------|------|--------|
| Recruiter name, Provider liaison, Client name | GET | `/provider/:providerId/scheduling/context` | `profiles.recruiter_name`, `liaison_name`; client from primary `work_sites` / assignment |
| Schedule change guidelines | — | **FE only** | Static copy in Lovable (see below); no Nest route |
| Month calendar (existing + draft days) | GET | `/provider/:providerId/scheduling/availability?monthYear=YYYY-MM-01` | Prior submission, per-day rows, `deadline`, `isPastDeadline` (for PACR UX + optional deadline label) |
| Review changes → Submit | POST | `/provider/:providerId/scheduling/availability/submit` | PRN batch — see body below |
| PACR file (when late) | POST | `/provider/:providerId/documents/upload` | Returns `documentId` → `pacrDocumentId` on submit |

Auth: same as admin routes today (open in dev). Centralized JWT guard later; `:providerId` must match `jwt.sub` when guard ships.

---

## Schedule change guidelines (FE only)

Short, mostly static copy — **no backend endpoint**. Lovable owns the text (and can show `deadline` / `isPastDeadline` from `GET .../availability` when useful).

Suggested copy for the screen:

1. Availability is due by the **last Tuesday of month M−2** for target month **M** (e.g. last Tuesday of April → submitting for June).
2. **Before** that deadline: adding or removing a workday is allowed within the submission window (**no PACR**).
3. **After** the deadline for month M: schedule changes require advance notice — **2 weeks** to add a day, **1 week** to remove a day; **PACR required**.
4. **PACR** applies only to post-deadline changes; on-time monthly submissions do not need PACR.
5. **Optum clinic closures** are blocked in the UI — no request needed for those dates (FE v1).

---

## Calendar interaction (FE)

1. Provider selects **target month** (`monthYear`, first of month).
2. Click a day → set **startTime**, **endTime**, **notes** (optional).
3. **Multiple days** may be selected before review.
4. **Review changes** opens a summary modal.
5. If the submission is **late** for that target month (past monthly deadline) → provider must complete PACR (online form and/or upload). If **on-time** → no PACR.

### Submit body (`POST .../availability/submit`)

```json
{
  "monthYear": "2026-06-01",
  "noChanges": false,
  "pacrDocumentId": "uuid-or-omit-when-on-time",
  "days": [
    {
      "requestDate": "2026-06-15",
      "startTime": "8:00 AM",
      "endTime": "5:00 PM",
      "notes": "optional",
      "workSiteId": "uuid"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `monthYear` | yes | First day of target month |
| `days` | yes* | *Omit or empty when `noChanges: true` |
| `noChanges` | no | Provider affirms no availability that month |
| `pacrDocumentId` | conditional | Required when target month is past deadline |
| `days[].requestDate` | yes | ISO date in target month |
| `days[].startTime` / `endTime` | yes | e.g. `8:00 AM`, `5:00 PM` |
| `days[].notes` | no | |
| `days[].workSiteId` | yes | Primary or selected site — see open questions |

---

## PACR (post-deadline only)

Generated in **Lovable** (fill online or upload completed PDF). Nest stores the file and links `pacr_document_id` on submit.

**Auto-filled on form (FE):** request submitted by / requested date; practitioner name; agency/account name; availability being added; number of hours added; temporary vs permanent schedule change.

**Provider-filled:** clinic name; location/state; Optum point of contact; internal use provider ID; availability being removed; number of hours removed; change request reason / comments.

**API v1:** `POST /provider/documents/upload` → `pacrDocumentId` on batch submit. Optional later: JSON metadata endpoint for audit fields.

---
## Data written on submit

| Table | Content |
|-------|---------|
| `monthly_availability_requests` | `provider_id`, `month_year`, `deadline` (computed), `status = submitted`, `submission_group_id`, `submitted_at`, `no_changes` |
| `time_off_requests` | One row per day: `change_type = add_day`, `is_unavailable = false`, `status = pending_review`, `start_time`, `end_time`, `notes`, `work_site_id`, `recruiter_id`, `liaison_id` from profile, `client_name`, `submission_group_id`, `pacr_document_id` when late |

Corporate reviewers consume the same rows via [0007](./0007-prn-availability-admin.md).

---

## API validation (v1)

| Rule | Response |
|------|----------|
| Authenticated `provider_user` with `schedule_type = prn` | 403 otherwise |
| Valid `monthYear` (first of month) | 400 |
| `days.length >= 1` or `noChanges: true` | 400 |
| No duplicate `requestDate` in payload | 400 |
| `endTime` after `startTime` | 400 |
| Target month past monthly deadline | `pacrDocumentId` required |
| Target month on-time | `pacrDocumentId` must be omitted |
| Post-deadline per-day change | Enforce **2 weeks** notice to add, **1 week** to remove (relative to `requestDate`) |
| Optum clinic closure dates | **FE only** v1 — not validated on API yet |

---

## Edge cases & open questions

| # | Topic | Status |
|---|--------|--------|
| O1 | Multiple work sites — primary only vs per-day `workSiteId` picker | **Open** |
| O2 | Can provider mark **removal** of availability (`remove_day`) on this calendar? | **Open** |
| O3 | Resubmit same month after corporate **deny** — replace rows vs new `submission_group_id` | **Open** |
| O4 | Submit for months already **finalized** per facility | **Open** — tie to finalization ADR |

---

## FE responsibilities

| Action | Owner |
|--------|--------|
| Schedule change guidelines copy | **FE** |
| Block Optum closure dates on calendar | **FE** v1 |
| PACR form UI + PDF generation/upload | **FE** |
| Redirect non-PRN users | **FE** |
| Disable submit when PACR missing (late month) | **FE** + **API** |

---

## Status

| Item | State |
|------|--------|
| ADR | **Accepted** |
| Nest routes | **Built** — `ProviderModule` under `/provider/:providerId/*` (same open-dev posture as admin) |
| Admin read path | **Built** ([0007](./0007-prn-availability-admin.md)) |

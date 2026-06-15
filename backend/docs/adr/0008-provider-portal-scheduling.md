---
status: planning
---

# Provider portal — index (Phase 2)

Provider-facing APIs for schedule view, submitting changes, PRN monthly availability, invite accept, and finalization checks.

Related: [scheduling-workflow.md](../scheduling-workflow.md) Phase 2 · [onboarding-invite-flow.md](../onboarding-invite-flow.md).

## Decision

Document each Lovable screen in ADRs **before** implementing `src/provider/`. A prior implementation under `src/provider/` was removed to avoid confusion with `src/providers/` (admin Active Providers). Re-introduce as `src/provider/` when implementation starts.

**Auth:** Supabase JWT (`Authorization: Bearer`) per [onboarding-invite-flow.md](../onboarding-invite-flow.md). Q1 guard deferred.

---

## Screen index

| # | Lovable screen | Schedule type | ADR | API status |
|---|----------------|---------------|-----|------------|
| 1 | **Availability Calendar** | PRN | [0009](./0009-provider-availability-calendar.md) | **Built** |
| 2 | *(pending)* | | | |

---

## Cross-cutting (all provider screens)

| Topic | Rule |
|-------|------|
| Naming | `src/providers/` = admin only; provider portal = `src/provider/` |
| Deadline | Last Tuesday of M−2 for target month M — shared util in `schedule-change-approvals.util.ts` |
| PRN vs set | Branch on `profiles.schedule_type` |
| PACR + S3 | Post-deadline submissions; `documents` + `pacr_document_id` on `time_off_requests` |
| Corporate review | Admin routes under `/admin/...` (several built) |

---

## Planned endpoints (rollup — see per-screen ADRs)

| Method | Path | Screen / purpose |
|--------|------|------------------|
| GET | `/provider/:providerId/scheduling/context` | Header: recruiter, liaison, client ([0009](./0009-provider-availability-calendar.md)) |
| GET | `/provider/:providerId/scheduling/availability` | PRN month load + `deadline` / `isPastDeadline` ([0009](./0009-provider-availability-calendar.md)) |
| POST | `/provider/:providerId/scheduling/availability/submit` | PRN batch submit ([0009](./0009-provider-availability-calendar.md)) |
| POST | `/provider/:providerId/documents/upload` | PACR PDF ([0009](./0009-provider-availability-calendar.md)) |
| GET | `/provider/scheduling/profile` | Profile + work sites (TBD screen) |
| GET | `/provider/scheduling/schedule` | Set-schedule month view (TBD) |
| POST | `/provider/scheduling/time-off-requests` | Set-schedule changes (TBD) |
| GET | `/provider/onboarding/invites/validate` | Accept-invite (TBD) |
| POST | `/provider/onboarding/invites/accept` | Accept-invite (TBD) |
| GET | `/provider/scheduling/finalized` | Month finalization gate (TBD) |

**Implementation status:** Screen 1 routes built under `/provider/:providerId/*`; other screens TBD.

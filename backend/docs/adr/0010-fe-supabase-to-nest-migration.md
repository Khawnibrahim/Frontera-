---
status: accepted
---

# Frontend: migrate Supabase calls to Nest API

The Lovable portal (`frontend/`) was built against **Supabase Auth**, **direct Postgres reads/writes** (`supabase.from`), and **Edge Functions** (`supabase.functions.invoke`). The Nest API (`backend/`) now owns scheduling business rules per [ADR-0002](./0002-scheduling-workflow-backend-shape.md) and ships JWT guards on `admin/*` and `provider/*`.

**Decision:** Migrate **all workflow writes**, **admin scheduling reads**, **document upload/download**, and **onboarding bulk** from Supabase client / Edge Functions to **Nest REST** endpoints. The browser sends `Authorization: Bearer <supabase_access_token>` on every Nest call ([api-auth.md](../api-auth.md)).

**Keep on Supabase (do not migrate):**

| Capability | Why |
|------------|-----|
| `supabase.auth.*` (sign-in, sign-out, session, `updateUser` password in portal settings) | Supabase Auth is the identity provider |
| Optional: `notifications` read + Realtime subscription | RLS-safe reads; Realtime is a good fit (may migrate later) |
| Optional: `rpc('log_audit')` on failed login | Low-priority audit hook |

**Retire after migration:**

| Edge function | Replace with |
|---------------|--------------|
| `invite-provider` | `POST /admin/onboarding` (batch) |
| `file-upload` | `POST /provider/:providerId/documents/upload` |
| `file-download` | `GET /admin/schedule-change-approvals/requests/:id/pacr` (+ provider download TBD) |
| `send-transactional-email` | Nest announcements module + SES |

**FE integration pattern:** Extend `frontend/src/lib/fronteraApi.ts` (JWT helper). Add domain clients (`schedulingApi.ts`, `providersApi.ts`, etc.) rather than scattering `fetch` in pages.

---

## Migration inventory

Status key:

| Status | Meaning |
|--------|---------|
| **Done** | FE already calls Nest |
| **Ready** | Nest route exists; FE still uses Supabase — wire FE only |
| **Build** | Nest route not implemented yet |

---

### 1. Onboarding

| FE file | Current Supabase / Edge call | Nest endpoint | Status |
|---------|------------------------------|---------------|--------|
| `pages/corporate/CorporateOnboardProvider.tsx` — Single tab | `adminApi.getFormOptions()` | `GET /admin/onboarding/form-options` | **Done** |
| Same — submit | `adminApi.createProvider()` | `POST /admin/onboarding` | **Done** |
| `components/WorksiteCombobox.tsx` | `adminApi.searchWorkSites()` | `GET /admin/onboarding/work-sites/search?q=` | **Done** |
| `CorporateOnboardProvider.tsx` — region on site pick | `supabase.from('work_sites').select('region')` | Use region from combobox / form-options (drop call) | **Ready** |
| `CorporateOnboardProvider.tsx` — Bulk Upload + Paste tabs | `supabase.functions.invoke('invite-provider', { providers })` | `POST /admin/onboarding/bulk` (or repeated `POST /admin/onboarding`) | **Build** |

Related: [ADR-0004](./0004-onboard-new-provider.md).

---

### 2. Active providers

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `components/MasterProvidersList.tsx` | `user_roles` → `profiles` → `provider_work_sites` | `GET /admin/providers` | **Ready** |
| Same — Excel export | Client-side from Supabase rows | `GET /admin/providers/export` | **Ready** |
| `pages/corporate/CorporateProviders.tsx` | Uses `MasterProvidersList` | Same | **Ready** |
| `pages/client/ClientProviders.tsx` | Uses `MasterProvidersList` | Same (client filter TBD) | **Ready** |

Related: [ADR-0003](./0003-active-providers-admin-api.md).

---

### 3. Master PTO / availability calendar (admin)

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `pages/corporate/CorporateAvailabilityCalendar.tsx` — load | `profiles` (PRN) + `time_off_requests` | `GET /admin/master-availability` or `GET /admin/master-availability/calendar` | **Ready** |
| Same — filter dropdowns | Hardcoded / derived | `GET /admin/master-availability/filter-options` | **Ready** |
| Same — liaison submission cards | N/A in FE today | `GET /admin/master-availability/submission-progress?company=` | **Ready** |
| Same — export | Custom queries + `work_sites` | `GET /admin/master-availability/export`, `/export/region`, `/export/ace-imo` | **Ready** |
| Same — approve/deny entry | `time_off_requests` update + `notifications` insert | `POST /admin/schedule-change-approvals/requests/:id/approve` or `/deny` | **Ready** |
| `pages/corporate/CorporatePTOCalendar.tsx` | Mock data (no DB) | `GET /admin/master-availability/*` | **Ready** (replace mock) |

Related: [ADR-0005](./0005-master-availability-calendar.md).

---

### 4. PRN availability queue (admin)

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `pages/corporate/CorporatePRNAvailability.tsx` — queue | `profiles` + `time_off_requests` | `GET /admin/prn-availability/queue` | **Ready** |
| Same — summary | FE-derived | `GET /admin/prn-availability/summary` | **Ready** |
| Same — filters | Hardcoded | `GET /admin/prn-availability/filter-options` | **Ready** |
| Same — calendar tab | Same tables | `GET /admin/prn-availability/calendar` | **Ready** |
| Same — approve/deny one | `time_off_requests` update + `notifications` insert | `POST /admin/schedule-change-approvals/requests/:id/approve` or `/deny` | **Ready** |
| Same — bulk approve/deny | Bulk `time_off_requests` update + `notifications` | `POST /admin/schedule-change-approvals/bulk-decide` | **Ready** |

Related: [ADR-0007](./0007-prn-availability-admin.md), [ADR-0006](./0006-schedule-change-approvals.md).

---

### 5. Schedule change / time-off review (admin)

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `pages/corporate/CorporateTimeOffReview.tsx` — list | `time_off_requests` + `profiles` + `provider_work_sites` | `GET /admin/schedule-change-approvals/list` | **Ready** |
| Same — summary | FE-derived | `GET /admin/schedule-change-approvals/summary` | **Ready** |
| Same — calendar | FE-derived | `GET /admin/schedule-change-approvals/calendar` | **Ready** |
| Same — filters | Hardcoded | `GET /admin/schedule-change-approvals/filter-options` | **Ready** |
| Same — single approve/deny | `time_off_requests` update + `notifications` insert | `POST /admin/schedule-change-approvals/requests/:id/approve` or `/deny` | **Ready** |
| Same — bulk deny | Bulk update + `notifications` | `POST /admin/schedule-change-approvals/bulk-decide` | **Ready** |
| Same — PACR view | `documents` + `storage.createSignedUrl` | `GET /admin/schedule-change-approvals/requests/:id/pacr` | **Ready** |
| Same — request detail | Inline row data | `GET /admin/schedule-change-approvals/requests/:id` | **Ready** |

Related: [ADR-0006](./0006-schedule-change-approvals.md).

---

### 6. Provider portal — scheduling

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `hooks/useProviderProfile.ts` | `profiles` + `provider_work_sites` + `work_sites` join | `GET /provider/:providerId/scheduling/context` | **Ready** |
| `pages/provider/ProviderAvailability.tsx` — load PRN month | `time_off_requests`, `holidays`, `monthly_availability_requests` | `GET /provider/:providerId/scheduling/availability?monthYear=` | **Ready** |
| Same — load SET month | Same tables | `GET /provider/:providerId/scheduling/time-off?monthYear=` | **Ready** |
| Same — submit PRN days | delete/insert `time_off_requests`, update `monthly_availability_requests`, insert `notifications` | `POST /provider/:providerId/scheduling/availability/submit` | **Ready** |
| Same — submit SET time-off | Same pattern | `POST /provider/:providerId/scheduling/time-off/submit` | **Ready** |
| Same — “no changes” monthly ack | `monthly_availability_requests` update | Include in PRN submit body or dedicated flag on submit DTO | **Ready** |
| Same — PACR upload | `fetch(…/functions/v1/file-upload)` | `POST /provider/:providerId/documents/upload` (multipart `file`) | **Ready** |
| `pages/provider/ProviderSchedule.tsx` | `time_off_requests` select for month | `GET /provider/:providerId/scheduling/time-off?monthYear=` (SET) or availability GET (PRN) | **Ready** |
| `hooks/useScheduleFinalized.ts` | `monthly_availability_requests` + `time_off_requests` | Derive from scheduling GET responses | **Ready** |
| `hooks/useClosureDates.ts` | `holidays` select | Add `holidays[]` to context or month GET | **Build** |
| `pages/provider/ProviderHolidays.tsx` | `holidays` select | `GET /provider/:providerId/scheduling/context` or shared holidays endpoint | **Build** |

Related: [ADR-0008](./0008-provider-portal-scheduling.md), [ADR-0009](./0009-provider-availability-calendar.md).

---

### 7. Documents

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `ProviderAvailability.tsx` | Edge `file-upload` | `POST /provider/:providerId/documents/upload` | **Ready** |
| `CorporateTimeOffReview.tsx` | `documents` + storage signed URL | `GET /admin/schedule-change-approvals/requests/:id/pacr` | **Ready** |
| (future) provider PACR download | Edge `file-download` | `GET /provider/:providerId/documents/:documentId` | **Build** |

---

### 8. Announcements

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `pages/corporate/CorporateAnnouncements.tsx` — audience query | `profiles`, `provider_work_sites`, `announcements` | `GET /admin/announcements/audience` (or filter-options) | **Build** |
| Same — create | `announcements` insert + `announcement_recipients` insert + `notifications` insert | `POST /admin/announcements` | **Build** |
| Same — email blast | `functions.invoke('send-transactional-email')` | SES via same `POST /admin/announcements` | **Build** |
| `pages/shared/AnnouncementsPage.tsx` — inbox | `announcement_recipients` join `announcements` | `GET /announcements` (role-scoped) | **Build** |
| Same — mark read | `announcement_recipients` update | `PATCH /announcements/recipients/:id/read` | **Build** |

---

### 9. Client portal

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `pages/client/ClientSchedules.tsx` | `profiles` + `provider_work_sites` + `time_off_requests` | `GET /client/schedules` (org-scoped) | **Build** |

Defer other client pages until corporate + provider migrations are complete.

---

### 10. Auth & profile (explicit non-migrations)

| FE file | Current call | Nest endpoint | Status |
|---------|-------------|---------------|--------|
| `contexts/AuthContext.tsx` | `supabase.auth.signInWithPassword`, `signOut`, `getSession` | — | **Keep** |
| Same | `profiles`, `user_roles` select after login | Optional future `GET /me` | **Keep** (or **Build** later) |
| Same | `rpc('log_audit')` on failed login | Optional `POST /auth/audit` | **Keep** |
| `pages/provider/ProviderSettings.tsx` | `auth.updateUser({ password })` | — | **Keep** |
| `pages/AcceptInvite.tsx` | `auth.updateUser({ password })` | Prefer email link to Nest `GET/POST /accept-invite` | **Keep** (SPA path legacy) |

---

### 11. Notifications (optional phase)

| FE file | Current Supabase call | Nest endpoint | Status |
|---------|----------------------|---------------|--------|
| `hooks/useNotifications.ts` — list | `notifications` select | `GET /notifications` | **Build** (optional — may **Keep** with RLS) |
| Same — mark read | `notifications` update | `PATCH /notifications/:id/read` | **Build** (optional) |
| Many pages — insert on approve/submit | `notifications.insert` | Created inside Nest services when writes migrate | **Ready** (remove FE inserts) |

---

## Suggested FE migration order

1. `ProviderAvailability.tsx` + `ProviderSchedule.tsx` → provider scheduling + documents  
2. `CorporateTimeOffReview.tsx` → schedule-change-approvals  
3. `CorporatePRNAvailability.tsx` → prn-availability + approvals  
4. `CorporateAvailabilityCalendar.tsx` + `CorporatePTOCalendar.tsx` → master-availability  
5. `MasterProvidersList.tsx` → admin/providers  
6. `CorporateOnboardProvider.tsx` bulk tab → onboarding bulk  
7. `CorporateAnnouncements.tsx` + `AnnouncementsPage.tsx` → announcements module  
8. `ClientSchedules.tsx` → client module  

---

## Consequences

- One API base URL (`VITE_FRONTERA_API_URL`) for workflow; Supabase URL used only for Auth (and optionally Realtime reads).  
- OpenAPI spec (`openapi/frontera-api.yaml`) is the contract; regenerate after route changes.  
- Each FE PR should delete the Supabase calls it replaces; do not leave dual-write paths.  
- Edge Functions in `frontend/supabase/functions/` become dead code after rows above are **Ready**/**Done** — remove in a follow-up cleanup PR.

**Supersedes:** Nothing. **Related:** ADR-0002, ADR-0003–0009, [api-auth.md](../api-auth.md), [onboarding-invite-flow.md](../onboarding-invite-flow.md).

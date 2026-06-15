---
status: accepted
---

# Scheduling workflow: Nest API owns business rules

The end-to-end scheduling workflow is defined in `docs/scheduling-workflow.md` (from `Scheduling_Workflow-1.pdf`). The Lovable front end implements the UX; this backend (Nest on Lambda + Drizzle + Supabase Postgres) owns **validation, state transitions, audit, storage orchestration, and exports** that the PDF describes as Supabase edge functions.

**Decision:** Implement workflow operations as **Nest REST endpoints** under `src/scheduling/` (and `repository/aws` for S3/SES), not as new Supabase Edge Functions—unless a capability is Auth-only (e.g. password reset) and must stay in Supabase. The PDF’s function names (`submit-availability`, `approve-request`, `deny-request`, `notify-liaison-pacr`, `finalize-month`, `export-master-calendar`) map to Nest routes listed in the workflow doc.

**Why:** Single deployable API aligned with `CONTEXT.md` / `CLAUDE.md`; typed repositories; shared deadline/PACR rules for local dev and Lambda; FE can call one base URL (API Gateway) instead of mixing many edge fn URLs.

**Rules the API must enforce (non-exhaustive):**

- Deadline: last Tuesday of month M−2 for target month M.  
- Post-deadline submit requires `pacr_document_id` and notice windows (add 14d / remove 7d).  
- Deny requires `review_notes`.  
- Approve with PACR after deadline → liaison email (SES) with signed PDF.  
- Review queue exposes warning flags (>14 days or >50% weekly hours)—computed in service layer.  
- Finalization writes `schedule_finalizations` per `work_site_id` + `month_year`.

**Data model:** Keep PDF’s per-day `time_off_requests` rows and existing Drizzle schema (`work_sites`, not a separate `facilities` table). Defer structured weekly JSON vs `work_schedule` text until FE contract is fixed (open question in workflow doc).

**Auth:** Supabase JWT on requests (Q1 guard); RLS remains on Supabase for direct client access if the FE still uses Supabase client for reads—Nest uses service/pooler connection and must mirror org/recruiter scoping in queries.

**Consequences:**

- FE integration work is **route + DTO alignment**, not replicating edge fn signatures.  
- `docs/scheduling-workflow.md` is the living map; update it when endpoints ship.  
- Realtime calendars may still use Supabase Realtime on `time_off_requests` (PDF open question)—compatible if writes go through Nest and Postgres is source of truth.

**Supersedes:** N/A. **Related:** ADR-0001 (Optum-only), `README` Q1–Q4 table.

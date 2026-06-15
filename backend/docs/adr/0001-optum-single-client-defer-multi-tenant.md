---
status: accepted
---

# Optum as sole client for now; defer multi-client tenancy

Frontera launches with **Optum** as the only client. The schema already has multi-client primitives (`organizations`, `org_memberships`, `assignments.client_org_id`, `get_user_org_ids()`), but several names and defaults are Optum-specific (`optum_pocs`, `client_name` default `'Optum'` on `work_sites` and `time_off_requests`). We are **not** generalizing those now.

**Decision:** Ship Optum-only. Use existing org/assignment fields where they already fit; do **not** rename `optum_pocs`, add `work_sites.client_org_id`, or build client-onboarding flows until a second client is committed. New backend code may use `organizations` for scoping when natural, but must not assume a generic client directory or multi-client admin UX.

**Why:** Requirements for client #2 (org shape, contacts, cross-client providers) are unknown. A thin rename now still costs FE/Lovable/Supabase coordination with little near-term benefit. Deferring avoids wrong abstractions while the API surface is still small (e.g. review queue only).

**When revisiting:** Before onboarding a non-Optum client, reopen this ADR and plan at least: generic site contacts (replace or wrap `optum_pocs`), `work_sites.client_org_id` + backfill, org-scoped API filters and RLS, coordinated migration with the frontend Supabase schema. See `CONTEXT.md` (multi-client notes) and workspace ADRs if any bind both repos.

**Consequences:**

- OK to hard-code or default Optum in seeds, copy, and filters for now.
- Do not add parallel per-client tables (`cigna_pocs`, etc.).
- Technical debt is contained if we avoid new `'Optum'` string literals in every new endpoint—prefer `organizations` + assignments where already modeled.

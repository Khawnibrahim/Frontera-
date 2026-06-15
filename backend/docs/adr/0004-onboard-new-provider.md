---
status: accepted
---

# Onboard New Provider — admin screen

Corporate admin form to onboard a provider, attach work sites + weekly schedules, assign recruiter/liaison, and send the portal invite email.

## UI → API

| UI section | API |
|------------|-----|
| Provider details form | `POST /admin/onboarding` body |
| Recruiter / liaison / specialty / company dropdowns | `GET /admin/onboarding/form-options` |
| Facility **dropdown + search** | `GET /admin/onboarding/work-sites` + `GET .../work-sites/search?q=` |
| Region per site row | `form-options.regions` |
| Hours at clinic (add/delete shift) | `form-options.clinicShiftDays` + body `weeklySchedule` |
| Primary site checkbox | `workSites[].isPrimary` (exactly one `true`) |
| **Create provider and send invite** | `POST /admin/onboarding` with `sendInvite: true` (default) |

## Decision summary

- **Single create endpoint** — `POST /admin/onboarding` persists all rows, then sends SES invite when `sendInvite` is true (default). `POST /admin/onboarding/:userId/invite` is **resend only**.
- **Placeholder `auth.users`** row at onboard; password set on Nest `GET/POST /accept-invite` (HTML). See [onboarding-invite-flow.md](../onboarding-invite-flow.md).
- **Pre-submit UX** is client-side; API validates the **final** payload only.

### Data written on create

| Table | Purpose |
|-------|---------|
| `auth.users` | Placeholder until Nest `/accept-invite` POST |
| `profiles` | Provider details, recruiter/liaison names |
| `user_roles` | `provider_user` |
| `provider_work_sites` | Sites + `weekly_schedule` JSON per site |
| `assignments` | `active` — provider ↔ recruiter ↔ client org |
| `provider_invites` | Token, expiry, JSON snapshot of form |

---

## Frontend-only (before POST)

No API calls for these actions — only local form state until **Create provider and send invite**:

| Action | Notes |
|--------|--------|
| Add / remove work site row | Final list sent in `workSites[]` |
| Add / remove shift under “hours at clinic” | Final list in `weeklySchedule` per site |
| Clear weekly schedule preset | Affects default applied to sites without their own shifts |
| Toggle primary on a site | Must end with exactly one `isPrimary: true` before submit |

---

## Approved work sites — API contract

Each `workSites[]` entry:

| Field | Required | Notes |
|-------|----------|--------|
| `workSiteId` | yes | UUID from list/search |
| `facility` | yes | Copy `facilityName` from the selected search/list row |
| `isPrimary` | yes | Exactly one `true` in the array |
| `region` | no | From `form-options.regions`; else catalog `work_sites.region` |
| `weeklySchedule` | no | Else inherits `defaultWeeklySchedule` on the provider |

**API validation (400):**

- `workSites.length >= 1`
- No duplicate `workSiteId`
- Exactly one `isPrimary: true`
- Each `workSiteId` exists in `work_sites`
- `region` (if sent) ∈ `form-options.regions`

---

## Edge cases & expected behavior

Legend: **FE** = Lovable should enforce in the form for good UX. **API** = Nest rejects invalid final payload. **Both** = recommended in FE and enforced on API.

### A. Work sites (facility rows)

| # | Scenario | Expected behavior | Owner |
|---|----------|-------------------|--------|
| A1 | User adds a second work site row | New empty row; facility picker enabled | FE |
| A2 | **Same facility selected on two rows** | Block selection: disable or hide already-chosen `workSiteId`s in other rows’ dropdown/search | **FE** |
| A3 | Submit with duplicate `workSiteId` | `400` — `Duplicate workSiteId in workSites array` | **API** |
| A4 | User removes the only work site row | Block submit or auto-add empty row; need ≥1 site | **FE** |
| A5 | Submit with `workSites: []` | `400` — validation (`ArrayMinSize(1)`) | **API** |
| A6 | **No primary selected** (all `isPrimary: false`) | Block submit with inline error | **FE** |
| A7 | **More than one primary** | When user marks a row primary, clear `isPrimary` on other rows (radio behavior) | **FE** |
| A8 | Submit with 0 or 2+ `isPrimary: true` | `400` — `Exactly one work site must be marked isPrimary` | **API** |
| A9 | User deletes the primary row | If other rows remain, prompt to choose a new primary before submit | **FE** |
| A10 | Facility search returns no results | Show “no facilities”; do not submit until a valid site is chosen | **FE** |
| A11 | Invalid / unknown `workSiteId` (stale UUID) | `400` — `Work site not found: {id}` | **API** |
| A12 | Filter facilities by license state | Optional: `GET .../work-sites?state=TX` to narrow dropdown; FE can pass `licenseState` from provider section | **FE** |
| A13 | User picks facility then changes license state | FE should warn if selected sites are outside filtered state (product choice); API does not re-validate state vs site | **FE** (optional) |

### B. Region (per work site row)

| # | Scenario | Expected behavior | Owner |
|---|----------|-------------------|--------|
| B1 | Region dropdown | Load from `form-options.regions` | FE |
| B2 | Region omitted on POST | Use `work_sites.region` from catalog for that facility | **API** |
| B3 | Invalid region string | `400` — invalid region | **API** |
| B4 | Region differs from catalog site default | Allowed — stored on invite snapshot; `profiles.region` uses **primary** row’s `region` (or site default) | **API** |
| B5 | Primary site’s region drives `profiles.region` | On create, `profiles.region` = primary row’s `region` ?? catalog region | **API** |

### C. Hours at clinic (shifts)

| # | Scenario | Expected behavior | Owner |
|---|----------|-------------------|--------|
| C1 | Apply preset (M-F 8a-5p) | FE copies preset `shifts` into row or `defaultWeeklySchedule` | FE |
| C2 | “Clear” preset | FE clears local shift list | FE |
| C3 | Add shift | Append `{ day, startTime, endTime }`; `day` from `clinicShiftDays` | FE |
| C4 | Delete shift | Remove row from local array only | FE |
| C5 | Site has empty `weeklySchedule` and no default | Stored as `[]`; schedule summary may be empty | **API** |
| C6 | Site omits `weeklySchedule` | Falls back to `defaultWeeklySchedule` on provider body | **API** |
| C7 | **Duplicate day** on same site (two Monday shifts) | Allowed only if times do not overlap (e.g. AM + PM split) | **API** |
| C8 | **Overlapping times** (same site, default vs site, or across sites) | `400` from `validateOnboardingWeeklySchedules` — see below | **API** |
| C8b | Default + explicit site schedule both set | Must not overlap on any shared weekday | **API** |
| C8c | Multiple sites inherit same default | Treated as overlapping across sites (`400`) unless site has its own non-overlapping `weeklySchedule` | **API** |
| C9 | Missing `startTime` / `endTime` / `day` | `400` — DTO validation on POST | **API** |
| C10 | Invalid `day` not in `clinicShiftDays` | Not rejected by API today; **FE** should restrict to dropdown | FE |
| C11 | Per-site hours override default | Per-site `weeklySchedule` wins when non-empty | **API** |
| C12 | Only default schedule, all sites empty | All sites get `defaultWeeklySchedule` | **API** |

### D. Provider details

| # | Scenario | Expected behavior | Owner |
|---|----------|-------------------|--------|
| D1 | Duplicate email (already onboarded) | **Gap today:** may fail on unique constraints or create second row — **FE** should check or handle `409`/DB error; consider future API check | FE / future API |
| D2 | Invalid email format | `400` — validation | **API** |
| D3 | Specialty / company not in dropdown | `400` — use `form-options` values | **API** |
| D4 | `employmentType` | Normalized to `W2` or `1099` | **API** |
| D5 | `scheduleType` | Must be `set` or `prn` | **API** |
| D6 | Missing required fields | `400` — class-validator | **API** |
| D7 | Recruiter / liaison UUID invalid | `400` — recruiter/liaison not found | **API** |
| D8 | Liaison omitted | Allowed — `profiles.liaison_*` null | **API** |

### E. Create + invite

| # | Scenario | Expected behavior | Owner |
|---|----------|-------------------|--------|
| E1 | `sendInvite: false` | Creates DB rows; no email | **API** |
| E2 | `sendInvite: true` (default) but SES / `FRONTERA_APP_URL` missing | Create **succeeds**; response `inviteSent: false`, `inviteError` set | **API** |
| E3 | Invite email succeeds | `inviteSent: true`, `inviteEmailMessageId` | **API** |
| E4 | User closes form after create | Provider already exists; use Active Providers list; resend via `POST .../:userId/invite` | — |
| E5 | Double-click Create | FE disable button during request to avoid duplicate POSTs | **FE** |
| E6 | Second POST same email | Risk duplicate provider — **FE** guard + future idempotency | FE / future API |

### F. Facility dropdown + search (FE implementation guide)

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| F1 | Initial load | `GET /admin/onboarding/work-sites` → populate dropdown |
| F2 | User types in search | Debounce → `GET .../work-sites/search?q=` |
| F3 | **Exclude already-selected facilities** | Filter out `workSiteId`s used in other rows from both list and search results |
| F4 | Display | Use `displayLabel` (facility — city — state — region) |
| F5 | Select facility | Store `workSiteId`; pre-fill region from site payload when present |

---

## Responsibility matrix (summary)

| Concern | FE (UX) | API (final POST) |
|---------|---------|------------------|
| Duplicate facility across rows | Hide / disable | Reject duplicates |
| Exactly one primary | Radio behavior | Count `isPrimary` |
| Min one work site | Disable submit | `ArrayMinSize(1)` |
| Shift add/remove | Local state | Validate shape only |
| Duplicate shift days | Product decision | Allowed unless we add rule later |
| Dropdown values | Load form-options | Reject unknown specialty/company/region |
| Invalid UUIDs | Prevent via dropdowns | 400 not found |

---

## Facility endpoints

- **`GET /admin/onboarding/work-sites`** — catalog for dropdown (`?state=` optional).
- **`GET /admin/onboarding/work-sites/search?q=`** — typeahead.

## Form-options payload (reference)

`recruiters`, `liaisons`, `specialties`, `companies`, `regions`, `clinicShiftDays`, `weeklySchedulePresets`, `employmentTypes`, `scheduleTypes`.

## Invite link

`{FRONTERA_API_PUBLIC_URL}/accept-invite?token={provider_invites.token}` — requires `SES_FROM_EMAIL` and `FRONTERA_API_PUBLIC_URL` (fallback: `FRONTERA_APP_URL`). Redirect after accept: `FRONTERA_APP_URL`.

## Onboarding reference data (DB)

Dropdown/preset values from `onboarding-options.pdf` are stored in Postgres (not hardcoded):

| UI data | Table | Admin CRUD base path |
|---------|-------|----------------------|
| Specialties | `onboarding_specialties` | `form-options` (read) |
| Companies | `onboarding_companies` | `form-options` (read) |
| Regions | `onboarding_regions` | `form-options` (read) |
| Employment types | `onboarding_employment_types` | `form-options` (read) |
| Schedule types | `onboarding_schedule_types` | `form-options` (read) |
| Clinic shift days | `onboarding_clinic_days` | `form-options` (read) |
| Weekly presets | `onboarding_weekly_schedule_presets` | `form-options` (read) |
| Facilities | `work_sites` | `GET /admin/onboarding/work-sites` + `work-sites/search` |

Catalog data is **seeded and read** via `form-options`; admin CRUD routes are deferred until a settings screen exists.

**Seed:** `npm run db:seed:catalog` (after `db:migrate` / `0002_onboarding_catalog.sql`). Facilities JSON: `scripts/seed/onboarding-work-sites.json` (261 sites from PDF).

**Recruiters / liaisons** remain `profiles` + `user_roles` (`internal_staff`); catalog seed creates PDF names as staff.

`GET /admin/onboarding/form-options` reads active catalog rows; legacy profile/work-site values are merged so existing providers stay valid.

## Related

- `docs/onboarding-invite-flow.md` — password / Supabase / accept flow  
- `docs/adr/0003-active-providers-admin-api.md` — list after onboard  
- `scripts/seed/onboarding-catalog-data.ts` — PDF reference lists for seed  

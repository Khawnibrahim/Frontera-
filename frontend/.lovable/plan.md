## Goal

Produce a PDF reference of every selectable option in the **Onboard New Provider** screen — both the **Provider Details** section and the **Approved Work Sites** section.

## What the PDF will contain

**1. Provider Details — fixed dropdowns (from `CorporateOnboardProvider.tsx`)**
- **Specialties** (11): Admin, Audiologist, Chaperone, Psychologist, Dental, Medical Assistant, Nurse Practitioner, Optometrist/Opthalmologist, Physician Assistant, TBI, X-Ray
- **Employment Types** (2): W2, 1099
- **Schedule Types** (2): Set Schedule, PRN (Variable / As-Needed)
- **Companies** (2): Frontera, 4tress *(note: Chaperone specialty locks company to Frontera)*
- **Regions** (7): Region 1, Region 2, Region 3, Region 4, Chaperone, Telehealth, Travel/IMO
- **Recruiters** (from `src/lib/recruiters.ts`)
- **Liaisons** (4): Anthony Kendall, Paige Estes, Veronica Raddi, Stephanie Navarro

**2. Approved Work Sites — facilities (from `work_sites` table)**
- Full list of all facilities, each row showing: Facility Name, City, State, Region, Client
- Grouped by Region for readability, with a count per region and a total at the top

## How

1. Query `work_sites` (all rows, ordered by region then facility_name) and read `src/lib/recruiters.ts` for the canonical recruiter list.
2. Generate the PDF with ReportLab (Platypus): one section per category, tables for the facility list, page numbers, and a generated-on date.
3. Save to `/mnt/documents/onboarding-options.pdf` and surface it as a `presentation-artifact`.
4. Visually QA every page via `pdftoppm` before delivery.

## Out of scope

No code or schema changes — this is a one-off document export.

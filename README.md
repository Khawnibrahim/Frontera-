# Frontera Scheduling API

NestJS (TypeScript) backend for **Frontera provider scheduling** — aligned with the [delivery plan](https://github.com/) (Q1–Q4) and **Lovable `Frontera_Database_Schema.pdf`**.

- **Runtime:** Node **22**
- **API:** NestJS → AWS Lambda + API Gateway (Serverless)
- **Data:** Supabase Postgres + Drizzle ORM
- **Auth:** Supabase JWT (guard module planned Q1)

## Quick start

```bash
cd /Users/hamzajamshed/scaleMorph/frontera
npm install
cp .env.example .env
# Set DATABASE_URL to your Supabase Postgres URL
npm run db:generate   # if schema changed
npm run db:migrate    # apply drizzle migrations
npm run db:seed       # test users, sites, 3 pending review-queue rows
npm run start:dev
```

- Health: `GET http://localhost:3000/health`
- Swagger: `http://localhost:3000/api`
- Sample route: `GET /admin/scheduling/review-queue` (pending `time_off_requests`)

## Database

| Source | Purpose |
|--------|---------|
| `src/repository/persistence/db/schema.ts` | Drizzle models (20 Lovable tables + `schedule_finalizations`) |
| `drizzle/0000_smart_adam_destine.sql` | Generated initial schema migration |
| `drizzle/0001_supabase_rls_functions.sql` | `has_role`, `get_user_org_ids`, `is_assigned_to`, `log_audit` |

### Tables (public)

`profiles`, `user_roles`, `work_sites`, `provider_work_sites`, `time_off_requests`, `monthly_availability_requests`, `pto_requests`, `assignments`, `organizations`, `org_memberships`, `documents`, `audit_log`, `notifications`, `scheduled_emails`, `announcements`, `announcement_recipients`, `provider_invites`, `holidays`, `hr_contacts`, `optum_pocs`, `schedule_finalizations`

## Planned API surface (from delivery plan)

| Phase | Endpoints (Nest) |
|-------|------------------|
| Q1 | JWT guard, scheduling deadline rules, health |
| Q2 | `invite-provider`, `submit-availability` (PRN + set), PACR storage |
| Q3 | `approve-request`, `deny-request`, review queue, liaison email (SES) |
| Q4 | `finalize-month`, `export-master-calendar`, downstream reads |

## Project layout

```
src/
  main.ts, lambda.ts          # HTTP + Lambda entry
  scheduling/                 # Domain module (grows Q1–Q4)
  repository/persistence/   # Drizzle schema + repositories
drizzle/                      # SQL migrations
serverless.yml                # AWS deploy skeleton
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile to `dist/` |
| `npm run start:dev` | Local API |
| `npm run db:generate` | New migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema (dev only) |
| `npm run db:seed` | Seed test data (see `scripts/seed-test-data.ts`) |
| `npm run deploy` | Build + `serverless deploy` (S3 buckets, SES identity, Lambda) |

### SES (email)

Set `SES_FROM_EMAIL` in `.env` before `npm run deploy`. Serverless provisions:

- IAM: `ses:SendEmail`, `ses:SendRawEmail` on the API Lambda
- `AWS::SES::EmailIdentity` for `SES_FROM_EMAIL` (check inbox to verify)
- Configuration set `frontera-{stage}-scheduling`

Code: `src/repository/aws/ses.gateway.ts` (`TOKENS.SesGateway`). Wire from onboarding (invite) and scheduling (liaison PACR) in Q2/Q3.

## Related docs

- [docs/scheduling-workflow.md](./docs/scheduling-workflow.md) — end-to-end workflow map (from `Scheduling_Workflow-1.pdf`)
- [docs/onboarding-invite-flow.md](./docs/onboarding-invite-flow.md) — invite email (HTML) + password form on `/accept-invite`
- [docs/adr/0002-scheduling-workflow-backend-shape.md](./docs/adr/0002-scheduling-workflow-backend-shape.md) — Nest vs edge functions
- `~/Downloads/Frontera_Scheduling_Quotation_and_Delivery_Plan.pdf`
- `~/Downloads/Frontera_Database_Schema.pdf`
- `~/Downloads/Scheduling_Workflow-1.pdf`

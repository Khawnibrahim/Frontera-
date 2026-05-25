# CLAUDE.md

Guidance for AI agents working in this repo. **Read `../CONTEXT.md` (workspace) and `../AGENTS.md` first — they are the source of truth for domain vocabulary and the FE↔BE relationship.** This file covers backend stack conventions only.

Reading order:

1. `../CONTEXT.md` (workspace) — canonical domain glossary
2. `../AGENTS.md` (workspace) — orientation, cross-repo rules
3. `./CONTEXT.md` (this repo) — backend stack addenda
4. `./CLAUDE.md` (this file) — Nest/Drizzle/AWS conventions, feedback loops
5. `../docs/adr/` and `./docs/adr/` — decisions

## What this is

QuoteLogik backend — a NestJS 11 + TypeScript service. Owns extraction, scoring, finding generation, report assembly. See `../CONTEXT.md` for what the product is and `./CONTEXT.md` for the backend-specific architecture (event-driven OCR pipeline, quote-generation pipeline, quoting module structure).

## Stack conventions

- **Framework**: NestJS 11. Modules wire dependencies, controllers stay thin, services hold logic.
- **Dependency injection**: Every service is injected via `TOKENS` from `src/config/tokens.ts` — never `new Foo()` inline. Add a new token when introducing a new service.
- **ORM**: Drizzle. Schema in `src/repository/persistence/db/schema.ts`. Migrations in `drizzle/`. Don't write raw SQL in services — go through the repository.
- **AWS SDK access**: All AWS calls go through `src/repository/aws/`. Use the existing command factory pattern; don't instantiate AWS clients directly in services.
- **Async work**: Long-running tasks (OCR, LLM) run on Lambda via SQS, not inline in HTTP requests. The API Lambda has a short timeout. New long jobs follow the same pattern: enqueue → return 202 → consumer Lambda.
- **Validation**: `class-validator` + `class-transformer` via the global `ValidationPipe` in `main.ts`. DTOs go in each module's folder.
- **Errors**: Throw `Nest` exceptions (`BadRequestException`, `NotFoundException`, etc) from services/controllers; the global filter formats them. Don't return error envelopes manually.
- **Logging**: Inject a typed logger via `TOKENS.*Logger`. Don't `console.log`.

## Architecture

See `./CONTEXT.md` for the event-driven OCR pipeline and quote-generation pipeline diagrams. Don't duplicate them here.

## Local development

- `npm run start:dev` runs Nest locally on `localhost:3000`. Swagger at `/api`.
- **Local Nest still hits real AWS** — the upload endpoint writes to the deployed S3 bucket, and the deployed Textract/SQS/Lambda pipeline picks up the work. There is no AWS mock layer.
- Required env: see `.env.example`. AWS creds come from the `AWS_PROFILE` env var (preferred) or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in `.env`.
- DB: Supabase pooler in `aws-1-ap-south-1`. `npm run db:push` applies schema; `npm run db:seed` creates a deterministic test profile (`OCR_TEST_USER_ID`).

## Deployment

- `npm run deploy` → `scripts/deploy.sh` → `serverless deploy --stage dev --region ap-southeast-2`.
- Stack is `quote-logik-dev` in `ap-southeast-2`. All resources (S3, SQS, SNS, Lambdas, IAM) defined in `serverless.yml`.
- Don't redeploy casually — the deployed resources back local development. Coordinate before destroying.

## Feedback loops

Run before claiming a change is done:

- `npm run build` — TypeScript compiles
- `npm test` — Jest unit tests
- `npm run lint` — ESLint with `--fix`

If any of these are broken on `main`, fix them before doing AI-assisted work in the affected area. AI output quality is capped at feedback-loop quality.

## Agent skills

### Issue tracker

GitHub Issues on `Sassyprogrammer1/QuoteLogik-backend` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Defaults: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context. Canonical glossary at `../CONTEXT.md` (workspace), backend stack addenda at `./CONTEXT.md`. Workspace ADRs at `../docs/adr/`, backend-only ADRs at `./docs/adr/`. See `docs/agents/domain.md` for full read order.

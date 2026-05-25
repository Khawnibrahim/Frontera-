/**
 * Seeds deterministic Frontera test data (Supabase auth + public schema).
 * Run: `npm run db:seed` (requires DATABASE_URL in `.env`).
 *
 * Creates: Optum org, 2 work sites, recruiter + 2 providers, assignments,
 * 3 pending_review time-off rows (review queue), 1 approved row (excluded from queue).
 *
 * If auth.users insert fails (connection role), run `scripts/seed-test-data.sql` in Supabase SQL Editor.
 */

import { Pool, type PoolClient } from 'pg';
import { loadDotEnv } from './seed/load-dotenv';
import { SEED, SEED_EMAIL } from './seed/ids';

async function ensureAuthUser(
  client: PoolClient,
  instanceId: string,
  id: string,
  email: string,
): Promise<void> {
  await client.query(
    `INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      $1::uuid, $2::uuid, 'authenticated', 'authenticated', $3,
      crypt('seed-not-for-login', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now()`,
    [instanceId, id, email],
  );
}

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (set in environment or .env)');
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  const { users, profiles, org, workSites, assignments, providerWorkSites, timeOff, optumPoc } =
    SEED;
  const recruiterUserId = users.recruiter;

  try {
    await client.query('BEGIN');

    const inst = await client.query<{ id: string }>('SELECT id FROM auth.instances LIMIT 1');
    const instanceId = inst.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';

    await ensureAuthUser(client, instanceId, users.recruiter, SEED_EMAIL.recruiter);
    await ensureAuthUser(client, instanceId, users.provider1, SEED_EMAIL.provider1);
    await ensureAuthUser(client, instanceId, users.provider2, SEED_EMAIL.provider2);

    await client.query(
      `INSERT INTO public.organizations (id, name, type, domain)
       VALUES ($1::uuid, 'Optum', 'client', 'optum.seed.local')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [org.optum],
    );

    await client.query(
      `INSERT INTO public.work_sites (id, facility_name, client_name, city, state, region)
       VALUES
         ($1::uuid, 'Dallas Medical Center', 'Optum', 'Dallas', 'TX', 'South'),
         ($2::uuid, 'Houston Clinic', 'Optum', 'Houston', 'TX', 'South')
       ON CONFLICT (id) DO UPDATE SET
         facility_name = EXCLUDED.facility_name,
         updated_at = now()`,
      [workSites.dallas, workSites.houston],
    );

    await client.query(
      `INSERT INTO public.profiles (
        id, user_id, email, full_name, specialty, schedule_type,
        recruiter_id, recruiter_name, recruiter_email, primary_facility_id
      ) VALUES
        ($1::uuid, $2::uuid, $3, 'Sam Recruiter', NULL, 'set', NULL, NULL, NULL, NULL),
        ($4::uuid, $5::uuid, $6, 'Alex Provider', 'Hospitalist', 'set',
         $2::uuid, 'Sam Recruiter', $3, $7::uuid),
        ($8::uuid, $9::uuid, $10, 'Jordan Provider', 'Internal Medicine', 'set',
         $2::uuid, 'Sam Recruiter', $3, $7::uuid)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         recruiter_id = EXCLUDED.recruiter_id,
         primary_facility_id = EXCLUDED.primary_facility_id,
         updated_at = now()`,
      [
        profiles.recruiter,
        recruiterUserId,
        SEED_EMAIL.recruiter,
        profiles.provider1,
        users.provider1,
        SEED_EMAIL.provider1,
        workSites.dallas,
        profiles.provider2,
        users.provider2,
        SEED_EMAIL.provider2,
      ],
    );

    await client.query(
      `INSERT INTO public.user_roles (user_id, role)
       VALUES
         ($1::uuid, 'internal_staff'),
         ($2::uuid, 'provider_user'),
         ($3::uuid, 'provider_user')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [users.recruiter, users.provider1, users.provider2],
    );

    await client.query(
      `INSERT INTO public.org_memberships (user_id, org_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (user_id, org_id) DO NOTHING`,
      [users.recruiter, org.optum],
    );

    await client.query(
      `INSERT INTO public.assignments (
        id, provider_id, recruiter_id, client_org_id, specialty, status
      ) VALUES
        ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'Hospitalist', 'active'),
        ($5::uuid, $6::uuid, $3::uuid, $4::uuid, 'Internal Medicine', 'active')
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
      [
        assignments.provider1,
        users.provider1,
        recruiterUserId,
        org.optum,
        assignments.provider2,
        users.provider2,
      ],
    );

    await client.query(
      `INSERT INTO public.provider_work_sites (id, provider_id, work_site_id, is_primary, weekly_schedule)
       VALUES
         ($1::uuid, $2::uuid, $3::uuid, true, '[]'::jsonb),
         ($4::uuid, $2::uuid, $5::uuid, false, '[]'::jsonb),
         ($6::uuid, $7::uuid, $3::uuid, true, '[]'::jsonb)
       ON CONFLICT (provider_id, work_site_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
      [
        providerWorkSites.p1Dallas,
        users.provider1,
        workSites.dallas,
        providerWorkSites.p1Houston,
        workSites.houston,
        providerWorkSites.p2Dallas,
        users.provider2,
      ],
    );

    await client.query(
      `INSERT INTO public.optum_pocs (id, work_site_id, name, role, email)
       VALUES ($1::uuid, $2::uuid, 'Taylor Site Coordinator', 'Scheduling', 'taylor.poc@optum.seed.local')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [optumPoc, workSites.dallas],
    );

    await client.query(
      `INSERT INTO public.time_off_requests (
        id, provider_id, recruiter_id, work_site_id, request_date,
        change_type, status, client_name, specialty, notes
      ) VALUES
        ($1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE + 7,
         'remove_day', 'pending_review', 'Optum', 'Hospitalist', 'Seed: PTO day removal'),
        ($5::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE + 14,
         'swap', 'pending_review', 'Optum', 'Hospitalist', 'Seed: shift swap'),
        ($6::uuid, $7::uuid, $3::uuid, $8::uuid, CURRENT_DATE + 10,
         'modify_shift', 'pending_review', 'Optum', 'Internal Medicine', 'Seed: Houston site'),
        ($9::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE - 3,
         'remove_day', 'approved', 'Optum', 'Hospitalist', 'Seed: already approved')
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_at = now()`,
      [
        timeOff.pending1,
        users.provider1,
        recruiterUserId,
        workSites.dallas,
        timeOff.pending2,
        timeOff.pendingOtherSite,
        users.provider2,
        workSites.houston,
        timeOff.approved,
      ],
    );

    await client.query('COMMIT');

    console.log('Seed completed.\n');
    console.log('Review queue (3 pending_review):');
    console.log('  GET http://localhost:3000/admin/scheduling/review-queue');
    console.log('  GET .../review-queue?recruiterId=' + recruiterUserId);
    console.log('  GET .../review-queue?workSiteId=' + workSites.dallas);
    console.log('');
    console.log('Seed user IDs (optional in .env for future auth tests):');
    console.log('  FRONTERA_SEED_RECRUITER_USER_ID=' + recruiterUserId);
    console.log('  FRONTERA_SEED_PROVIDER_USER_ID=' + users.provider1);
    console.log('');
    console.log('Emails:', SEED_EMAIL.recruiter, SEED_EMAIL.provider1, SEED_EMAIL.provider2);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(
      'Seed failed. If auth.users insert is not allowed, run scripts/seed-test-data.sql in the Supabase SQL Editor.',
    );
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/**
 * Stable UUIDs for idempotent seed data. Safe to reference in tests and .env.
 * Prefix pattern: a=auth user, b=org, c=work site, d=time off, e=profile, f=assignment/pws/poc
 */

export const SEED = {
  users: {
    recruiter: 'a0000000-0000-4000-8000-000000000001',
    provider1: 'a0000000-0000-4000-8000-000000000002',
    provider2: 'a0000000-0000-4000-8000-000000000003',
  },
  profiles: {
    recruiter: 'e0000000-0000-4000-8000-000000000001',
    provider1: 'e0000000-0000-4000-8000-000000000002',
    provider2: 'e0000000-0000-4000-8000-000000000003',
  },
  org: {
    optum: 'b0000000-0000-4000-8000-000000000001',
  },
  workSites: {
    dallas: 'c0000000-0000-4000-8000-000000000001',
    houston: 'c0000000-0000-4000-8000-000000000002',
  },
  assignments: {
    provider1: 'f0000000-0000-4000-8000-000000000001',
    provider2: 'f0000000-0000-4000-8000-000000000002',
  },
  providerWorkSites: {
    p1Dallas: 'f0000000-0000-4000-8000-000000000011',
    p1Houston: 'f0000000-0000-4000-8000-000000000012',
    p2Dallas: 'f0000000-0000-4000-8000-000000000021',
  },
  timeOff: {
    pending1: 'd0000000-0000-4000-8000-000000000001',
    pending2: 'd0000000-0000-4000-8000-000000000002',
    pendingOtherSite: 'd0000000-0000-4000-8000-000000000003',
    approved: 'd0000000-0000-4000-8000-000000000004',
  },
  optumPoc: 'f0000000-0000-4000-8000-000000000099',
} as const;

export const SEED_EMAIL = {
  recruiter: 'recruiter.seed@frontera.local',
  provider1: 'provider1.seed@frontera.local',
  provider2: 'provider2.seed@frontera.local',
} as const;

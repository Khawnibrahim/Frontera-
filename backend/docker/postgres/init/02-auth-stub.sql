-- Minimal auth schema so Drizzle FKs and npm run db:seed work without Supabase cloud.
-- Not a full GoTrue stack — JWT auth still targets your Supabase project when configured.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.instances (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO auth.instances (id)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth.users (
  instance_id uuid NOT NULL REFERENCES auth.instances (id),
  id uuid PRIMARY KEY,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb
);

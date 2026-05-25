-- Supabase helpers referenced in Frontera_Database_Schema.pdf (apply after 0000 migration).
-- Run against the same Postgres project as Lovable; adjust if Lovable already created these.

-- has_role: used in RLS policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- get_user_org_ids: client visibility
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = _user_id;
$$;

-- is_assigned_to: internal_staff ↔ provider scoping
CREATE OR REPLACE FUNCTION public.is_assigned_to(_staff_id uuid, _provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.recruiter_id = _staff_id AND a.provider_id = _provider_id AND a.status = 'active'
  );
$$;

-- log_audit: append-only audit trail
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id uuid,
  p_action public.audit_action,
  p_resource_type text,
  p_resource_id text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- update_updated_at_column: generic trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

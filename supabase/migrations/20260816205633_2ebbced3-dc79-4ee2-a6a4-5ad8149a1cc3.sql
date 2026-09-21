CREATE TABLE public.coordinator_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX coordinator_scopes_user_spec_idx ON public.coordinator_scopes (user_id, coalesce(specialty, '*'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coordinator_scopes TO authenticated;
GRANT ALL ON public.coordinator_scopes TO service_role;
ALTER TABLE public.coordinator_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY coordinator_scopes_master_all ON public.coordinator_scopes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));
CREATE POLICY coordinator_scopes_select_own ON public.coordinator_scopes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION private.is_coordinator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (select 1 from public.coordinator_scopes where user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.coordinates(_specialty text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists (
    select 1 from public.coordinator_scopes
    where user_id = auth.uid()
      and (specialty is null or specialty = _specialty)
  )
$$;

CREATE POLICY assessments_select_coordinator ON public.assessments FOR SELECT TO authenticated
  USING (status in ('enviado','fechado') AND private.coordinates(specialty));

CREATE POLICY profiles_select_coordinator ON public.profiles FOR SELECT TO authenticated
  USING (specialty is not null AND private.coordinates(specialty));
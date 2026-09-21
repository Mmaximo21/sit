CREATE OR REPLACE FUNCTION private.can_nursing_census()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT private.has_role(auth.uid(), 'master'::app_role)
      OR private.is_coordenacao()
      OR private.my_specialty() IN ('Enfermagem', 'Geriatria')
$$;

CREATE TABLE public.nursing_census (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  census_date date NOT NULL DEFAULT CURRENT_DATE,
  nurse_name text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{"rows": []}'::jsonb,
  author_id uuid NOT NULL REFERENCES auth.users,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (census_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursing_census TO authenticated;
GRANT ALL ON public.nursing_census TO service_role;

ALTER TABLE public.nursing_census ENABLE ROW LEVEL SECURITY;

CREATE POLICY "census_select_allowed" ON public.nursing_census
  FOR SELECT TO authenticated USING (private.can_nursing_census());

CREATE POLICY "census_insert_allowed" ON public.nursing_census
  FOR INSERT TO authenticated WITH CHECK (private.can_nursing_census() AND author_id = auth.uid());

CREATE POLICY "census_update_allowed" ON public.nursing_census
  FOR UPDATE TO authenticated USING (private.can_nursing_census()) WITH CHECK (private.can_nursing_census());

CREATE POLICY "census_delete_master" ON public.nursing_census
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER set_nursing_census_updated_at
  BEFORE UPDATE ON public.nursing_census
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
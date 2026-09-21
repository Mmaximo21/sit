INSERT INTO public.specialties (name, sort_order, active)
SELECT 'Supervisor Administrativo', 90, true
WHERE NOT EXISTS (SELECT 1 FROM public.specialties WHERE name = 'Supervisor Administrativo');

CREATE TABLE IF NOT EXISTS public.shift_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL DEFAULT current_date,
  content text NOT NULL DEFAULT '',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_reports TO authenticated;
GRANT ALL ON public.shift_reports TO service_role;

ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_reports_master_all ON public.shift_reports FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'master'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY shift_reports_select_own_or_supervisor ON public.shift_reports FOR SELECT TO authenticated
USING (author_id = auth.uid() OR private.coordinates('Supervisor Administrativo'));

CREATE POLICY shift_reports_insert_own ON public.shift_reports FOR INSERT TO authenticated
WITH CHECK (private.is_app_member() AND author_id = auth.uid());

CREATE POLICY shift_reports_update_own ON public.shift_reports FOR UPDATE TO authenticated
USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY shift_reports_delete_own ON public.shift_reports FOR DELETE TO authenticated
USING (author_id = auth.uid());

CREATE TRIGGER shift_reports_set_updated_at BEFORE UPDATE ON public.shift_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  resident_name text NOT NULL DEFAULT '',
  specialty text NOT NULL,
  period_label text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  master_notes text,
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_plans TO authenticated;
GRANT ALL ON public.care_plans TO service_role;

ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_plans_master_all ON public.care_plans FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY care_plans_select_own_specialty ON public.care_plans FOR SELECT TO authenticated
  USING ((specialty = private.my_specialty()) AND (author_id = auth.uid()));

CREATE POLICY care_plans_select_specialty_review ON public.care_plans FOR SELECT TO authenticated
  USING ((specialty = private.my_specialty()) AND (status = ANY (ARRAY['enviado'::text, 'fechado'::text])));

CREATE POLICY care_plans_select_coordinator ON public.care_plans FOR SELECT TO authenticated
  USING ((status = ANY (ARRAY['enviado'::text, 'fechado'::text])) AND private.coordinates(specialty));

CREATE POLICY care_plans_select_coordenacao ON public.care_plans FOR SELECT TO authenticated
  USING (private.is_coordenacao());

CREATE POLICY care_plans_insert_own_specialty ON public.care_plans FOR INSERT TO authenticated
  WITH CHECK ((author_id = auth.uid()) AND (specialty = private.my_specialty()));

CREATE POLICY care_plans_update_own_open ON public.care_plans FOR UPDATE TO authenticated
  USING ((author_id = auth.uid()) AND (specialty = private.my_specialty()) AND (status <> 'fechado'::text))
  WITH CHECK ((author_id = auth.uid()) AND (specialty = private.my_specialty()) AND (status <> 'fechado'::text));

CREATE POLICY care_plans_update_coordenacao ON public.care_plans FOR UPDATE TO authenticated
  USING (private.is_coordenacao()) WITH CHECK (private.is_coordenacao());

CREATE POLICY care_plans_delete_own_draft ON public.care_plans FOR DELETE TO authenticated
  USING ((author_id = auth.uid()) AND (status = 'rascunho'::text));

CREATE TRIGGER trg_care_plans_updated BEFORE UPDATE ON public.care_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
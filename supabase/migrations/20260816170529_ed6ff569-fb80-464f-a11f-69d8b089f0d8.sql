CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  birth_date DATE,
  sex TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.residents TO authenticated;
GRANT ALL ON public.residents TO service_role;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "residents_select_auth" ON public.residents FOR SELECT TO authenticated USING (true);
CREATE POLICY "residents_master_all" ON public.residents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE TRIGGER trg_residents_updated BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.assessments ADD COLUMN resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL;
CREATE INDEX idx_assessments_resident ON public.assessments(resident_id);

DROP POLICY IF EXISTS "assessments_select_own_specialty" ON public.assessments;
CREATE POLICY "assessments_select_own_specialty" ON public.assessments FOR SELECT TO authenticated
  USING (specialty = public.my_specialty() AND author_id = auth.uid());
-- roles
CREATE TYPE public.app_role AS ENUM ('master', 'profissional');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  specialty TEXT,
  professional_registry TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.my_specialty()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT specialty FROM public.profiles WHERE id = auth.uid()
$$;

-- profiles policies
CREATE POLICY "profiles_select_own_or_master" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'master'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_master_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "user_roles_select_own_or_master" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

-- periods
CREATE TABLE public.assessment_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'aberto',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_periods TO authenticated;
GRANT ALL ON public.assessment_periods TO service_role;
ALTER TABLE public.assessment_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "periods_select_all_auth" ON public.assessment_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "periods_master_all" ON public.assessment_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE TABLE public.period_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.assessment_periods(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, specialty)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.period_deadlines TO authenticated;
GRANT ALL ON public.period_deadlines TO service_role;
ALTER TABLE public.period_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deadlines_select_all_auth" ON public.period_deadlines FOR SELECT TO authenticated USING (true);
CREATE POLICY "deadlines_master_all" ON public.period_deadlines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

-- assessments
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES public.assessment_periods(id) ON DELETE SET NULL,
  specialty TEXT NOT NULL,
  resident_name TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'rascunho',
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_notes TEXT,
  submitted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessments_select_own_specialty" ON public.assessments FOR SELECT TO authenticated
  USING (specialty = public.my_specialty());
CREATE POLICY "assessments_insert_own_specialty" ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND specialty = public.my_specialty());
CREATE POLICY "assessments_update_own_open" ON public.assessments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND specialty = public.my_specialty() AND status <> 'fechado')
  WITH CHECK (author_id = auth.uid() AND specialty = public.my_specialty() AND status <> 'fechado');
CREATE POLICY "assessments_delete_own_draft" ON public.assessments FOR DELETE TO authenticated
  USING (author_id = auth.uid() AND status = 'rascunho');
CREATE POLICY "assessments_master_all" ON public.assessments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_periods_updated BEFORE UPDATE ON public.assessment_periods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_assessments_specialty ON public.assessments(specialty);
CREATE INDEX idx_assessments_author ON public.assessments(author_id);
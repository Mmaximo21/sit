CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_council text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY specialties_select_members ON public.specialties FOR SELECT TO authenticated USING (private.is_app_member());
CREATE POLICY specialties_master_all ON public.specialties FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'master'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));
CREATE TRIGGER trg_specialties_updated BEFORE UPDATE ON public.specialties FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.councils (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acronym text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.councils TO authenticated;
GRANT ALL ON public.councils TO service_role;
ALTER TABLE public.councils ENABLE ROW LEVEL SECURITY;
CREATE POLICY councils_select_members ON public.councils FOR SELECT TO authenticated USING (private.is_app_member());
CREATE POLICY councils_master_all ON public.councils FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'master'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));
CREATE TRIGGER trg_councils_updated BEFORE UPDATE ON public.councils FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.closing_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty text,
  title text NOT NULL DEFAULT 'Termo de Encerramento e Assinaturas',
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX closing_terms_specialty_key ON public.closing_terms (coalesce(specialty, '__default__'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closing_terms TO authenticated;
GRANT ALL ON public.closing_terms TO service_role;
ALTER TABLE public.closing_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY closing_terms_select_members ON public.closing_terms FOR SELECT TO authenticated USING (private.is_app_member());
CREATE POLICY closing_terms_master_all ON public.closing_terms FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'master'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));
CREATE TRIGGER trg_closing_terms_updated BEFORE UPDATE ON public.closing_terms FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.councils (acronym, name, sort_order) VALUES
  ('CRM', 'Conselho Regional de Medicina', 1),
  ('COREN', 'Conselho Regional de Enfermagem', 2),
  ('CRN', 'Conselho Regional de Nutrição', 3),
  ('CRESS', 'Conselho Regional de Serviço Social', 4),
  ('CRP', 'Conselho Regional de Psicologia', 5),
  ('CREFITO', 'Conselho Regional de Fisioterapia e Terapia Ocupacional', 6),
  ('CRFa', 'Conselho Regional de Fonoaudiologia', 7),
  ('CRF', 'Conselho Regional de Farmácia', 8),
  ('CRO', 'Conselho Regional de Odontologia', 9),
  ('CREF', 'Conselho Regional de Educação Física', 10),
  ('CRBM', 'Conselho Regional de Biomedicina', 11),
  ('CRBio', 'Conselho Regional de Biologia', 12),
  ('COFFITO/Outro', 'Outro conselho', 13);

INSERT INTO public.specialties (name, default_council, sort_order) VALUES
  ('Geriatria', 'CRM', 1),
  ('Nutrição', 'CRN', 2),
  ('Serviço Social', 'CRESS', 3),
  ('Fonoaudiologia', 'CRFa', 4),
  ('Terapia Ocupacional', 'CREFITO', 5),
  ('Fisioterapia', 'CREFITO', 6),
  ('Enfermagem', 'COREN', 7),
  ('Psicologia', 'CRP', 8);

INSERT INTO public.closing_terms (specialty, title, description) VALUES
  (NULL, 'Termo de Encerramento e Assinaturas', 'Preenchimento obrigatório: a avaliação só pode ser enviada com o termo completo.');
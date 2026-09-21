CREATE TABLE public.menus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Cardápio',
  menu_date date,
  notes text,
  data jsonb NOT NULL DEFAULT '{"entries": []}'::jsonb,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menus TO authenticated;
GRANT ALL ON public.menus TO service_role;

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY menus_master_all ON public.menus FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY menus_select_members ON public.menus FOR SELECT TO authenticated
  USING (private.is_app_member());

CREATE POLICY menus_insert_own ON public.menus FOR INSERT TO authenticated
  WITH CHECK (private.is_app_member() AND author_id = auth.uid());

CREATE POLICY menus_update_own ON public.menus FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY menus_delete_own ON public.menus FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE TRIGGER menus_set_updated_at BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
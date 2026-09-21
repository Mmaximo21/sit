CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_select_authenticated" ON public.notices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "notices_insert_master" ON public.notices
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role) AND created_by = auth.uid());

CREATE POLICY "notices_update_master" ON public.notices
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "notices_delete_master" ON public.notices
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER notices_set_updated_at BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
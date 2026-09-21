CREATE TABLE public.user_tab_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tab text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tab_permissions TO authenticated;
GRANT ALL ON public.user_tab_permissions TO service_role;

ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own tab permissions"
ON public.user_tab_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'master'));

CREATE POLICY "masters manage tab permissions"
ON public.user_tab_permissions FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'master'))
WITH CHECK (private.has_role(auth.uid(), 'master'));

CREATE TRIGGER trg_user_tab_permissions_updated
BEFORE UPDATE ON public.user_tab_permissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
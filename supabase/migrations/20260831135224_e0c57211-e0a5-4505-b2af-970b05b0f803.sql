CREATE OR REPLACE FUNCTION private.can_manage_tabs(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, 'master'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_tab_permissions
        WHERE user_id = _user_id AND tab = 'permissoes' AND allowed
      )
$$;

REVOKE ALL ON FUNCTION private.can_manage_tabs(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.can_manage_tabs(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "masters manage tab permissions" ON public.user_tab_permissions;
DROP POLICY IF EXISTS "users read own tab permissions" ON public.user_tab_permissions;

CREATE POLICY "tab managers manage tab permissions"
ON public.user_tab_permissions
FOR ALL
TO authenticated
USING (private.can_manage_tabs(auth.uid()))
WITH CHECK (private.can_manage_tabs(auth.uid()));

CREATE POLICY "users read own tab permissions"
ON public.user_tab_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR private.can_manage_tabs(auth.uid()));
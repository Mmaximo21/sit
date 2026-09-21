CREATE POLICY "profiles_select_tab_managers"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.can_manage_tabs(auth.uid()));

CREATE POLICY "user_roles_select_tab_managers"
ON public.user_roles
FOR SELECT
TO authenticated
USING (private.can_manage_tabs(auth.uid()));

CREATE POLICY "coordinator_scopes_select_tab_managers"
ON public.coordinator_scopes
FOR SELECT
TO authenticated
USING (private.can_manage_tabs(auth.uid()));
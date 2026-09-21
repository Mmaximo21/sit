ALTER TABLE public.assessments
  ADD CONSTRAINT assessments_status_check
  CHECK (status IN ('rascunho', 'enviado', 'fechado'));

ALTER TABLE public.assessment_periods
  ADD CONSTRAINT assessment_periods_status_check
  CHECK (status IN ('aberto', 'fechado'));

CREATE POLICY user_roles_insert_master ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY user_roles_update_master ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY user_roles_delete_master ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'master'::app_role));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
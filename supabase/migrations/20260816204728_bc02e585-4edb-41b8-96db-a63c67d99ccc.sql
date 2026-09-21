-- Storage: restrict access to the private "exames" bucket
CREATE POLICY "exames_select_members"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exames' AND private.is_app_member());

CREATE POLICY "exames_insert_members"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exames' AND private.is_app_member() AND owner = auth.uid());

CREATE POLICY "exames_update_own_or_master"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exames' AND (owner = auth.uid() OR private.has_role(auth.uid(), 'master'::app_role)))
WITH CHECK (bucket_id = 'exames' AND (owner = auth.uid() OR private.has_role(auth.uid(), 'master'::app_role)));

CREATE POLICY "exames_delete_own_or_master"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exames' AND (owner = auth.uid() OR private.has_role(auth.uid(), 'master'::app_role)));

-- Assessments: allow specialty-level review of submitted/closed assessments
CREATE POLICY "assessments_select_specialty_review"
ON public.assessments FOR SELECT TO authenticated
USING (specialty = private.my_specialty() AND status IN ('enviado', 'fechado'));
DROP POLICY IF EXISTS shift_reports_select_own_or_supervisor ON public.shift_reports;
CREATE POLICY shift_reports_select_own_or_supervisor
ON public.shift_reports
FOR SELECT
TO authenticated
USING (
  author_id = auth.uid()
  OR private.coordinates('Supervisor Administrativo'::text)
  OR private.my_specialty() = 'Geriatria'
);
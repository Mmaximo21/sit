CREATE OR REPLACE FUNCTION private.can_nursing_census()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(auth.uid(), 'master'::app_role)
      OR private.is_coordenacao()
      OR private.my_specialty() IN ('Enfermagem', 'Geriatria', 'Técnico de Enfermagem')
$$;